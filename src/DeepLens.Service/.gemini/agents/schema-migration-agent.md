---
name: schema-migration-agent
description: >
  Guides DB schema changes safely through all layers: EF Core migration → C# domain model
  → DTO → TypeScript interface → schema dump update. Trigger on: "add column", "new table",
  "rename column", "change schema", "database migration".
---

# Schema Migration Agent

## When to Activate

Activate when the user wants to **change the database schema** — adding a column, creating a table, changing a data type, etc.

> ⚠️ **Hard rule**: Never write raw `.sql` migration files. Always use `dotnet ef migrations add`. EF Core is the single source of truth for schema changes.

---

## Step 0: Gather Requirements

Ask the user:
```
1. Which database? (tenant DB / identity DB / platform DB)
2. Which table? (or is this a new table?)
3. What's the change? (add column X of type Y, new table with columns A/B/C, etc.)
4. Is this nullable? Does it have a default value?
5. Does this field need to be exposed in the API? If yes — which endpoints?
```

Then read `docs/technical/current_schema_dump.txt` to understand the current state of the relevant table before suggesting any changes.

> **🛑 STOP — Confirm the schema change plan with user before Step 1.**

---

## Step 1: Update the Domain Entity

**Location**: `src/DeepLens.Service/DeepLens.Domain/Entities/`

```csharp
// Example: Adding a "tags" column to the products table
public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    // ... existing properties ...

    // NEW: adding tags as a JSON array column
    public List<string> Tags { get; set; } = [];
    public DateTimeOffset? TagsUpdatedAt { get; set; }
}
```

**EF Core column naming** (always snake_case via configuration):
```csharp
// In DeepLens.Infrastructure/Configurations/ProductConfiguration.cs
builder.Property(p => p.Tags)
    .HasColumnName("tags")
    .HasColumnType("jsonb");   // Use jsonb for JSON arrays in PostgreSQL

builder.Property(p => p.TagsUpdatedAt)
    .HasColumnName("tags_updated_at");
```

> **🛑 STOP — Confirm domain model change before Step 2.**

---

## Step 2: Run the EF Core Migration

From the correct project directory:

```bash
# Navigate to the Infrastructure project
cd src/DeepLens.Service/DeepLens.Infrastructure

# Generate the migration
dotnet ef migrations add Add_Tags_To_Products \
    --startup-project ../DeepLens.SearchApi

# Review the generated migration file before applying!
# Check: src/DeepLens.Service/DeepLens.Infrastructure/Migrations/
```

**Naming convention for migrations**: `{Verb}_{Description}_{To}_{Entity}`
- ✅ `Add_Tags_To_Products`
- ✅ `Add_VendorId_To_Messages`
- ✅ `Create_ProductTags_Table`
- ❌ `Migration1`, `FixDB`, `Update`

**Apply the migration**:
```bash
dotnet ef database update \
    --startup-project ../DeepLens.SearchApi
```

> **🛑 STOP — Show the user the generated migration file content and wait for approval before applying.**

---

## Step 3: Update the DTO

**Location**: `src/DeepLens.Service/DeepLens.SearchApi/DTOs/` or `DeepLens.Contracts/`

Add the new field to all relevant DTOs. Every property **MUST** have `[JsonPropertyName]`:

```csharp
public class ProductDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    // ... existing properties with [JsonPropertyName] ...

    // NEW:
    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = [];

    [JsonPropertyName("tagsUpdatedAt")]
    public DateTimeOffset? TagsUpdatedAt { get; set; }
}
```

> **🛑 STOP — Confirm DTO changes before Step 4.**

---

## Step 4: Update TypeScript Interface(s)

TypeScript interfaces **must exactly mirror** the `[JsonPropertyName]` values — same casing, same field names.

**DeepLens Web UI** (`src/DeepLens.WebUI/src/`):
```typescript
// services/products.types.ts
export interface Product {
    id: string;
    name: string;
    // ... existing fields ...
    tags: string[];            // mirrors [JsonPropertyName("tags")]
    tagsUpdatedAt: string | null;  // mirrors [JsonPropertyName("tagsUpdatedAt")]
}
```

**Vayyari mobile** (`src/vayyari/types/`):
```typescript
// types/product.ts
export interface Product {
    id: string;
    name: string;
    // ... existing fields ...
    tags: string[];
    tagsUpdatedAt: string | null;
}
```

> Ask the user: "Is this field needed in Vayyari as well, or only the Web UI?"

> **🛑 STOP — Confirm TS types before Step 5.**

---

## Step 5: Update the Schema Dump

After the migration runs successfully, regenerate the schema dump so future AI sessions have accurate context:

```bash
# Dump the current schema (requires psql access to the remote DB)
PGPASSWORD=Krikank1$ pg_dump \
    -h 192.168.0.170 -U postgres \
    --schema-only \
    --no-owner \
    -d {tenant_or_platform_db} \
    > docs/technical/current_schema_dump.txt
```

Or if pg_dump is not available locally, use the DeepLens CLI:
```bash
dotnet run --project tools/DeepLens.CLI -- dump-schema > docs/technical/current_schema_dump.txt
```

---

## Final Checklist

```markdown
## ✅ Schema Migration Complete

- [ ] Domain entity updated with new property ← VERIFY
- [ ] EF Core configuration maps to snake_case column name ← VERIFY
- [ ] Migration generated (not hand-written) with descriptive name ← VERIFY
- [ ] Migration reviewed before applying (no dropped columns!) ← VERIFY
- [ ] Migration applied to dev database ← VERIFY
- [ ] DTO updated: new property has [JsonPropertyName] ← VERIFY
- [ ] TypeScript interface(s) updated to match DTO field names exactly ← VERIFY
- [ ] docs/technical/current_schema_dump.txt regenerated ← VERIFY
- [ ] Deploy: ./setupscripts/application/services/build-and-deploy.sh
```

---

## Special Cases

### Adding a NOT NULL column to an existing table with data
EF Core will error if you add a non-nullable column without a default. Two options:

**Option A — Add with default value (preferred)**:
```csharp
builder.Property(p => p.Tags)
    .HasColumnName("tags")
    .HasDefaultValueSql("'[]'::jsonb")  // PostgreSQL default
    .IsRequired();
```

**Option B — Add as nullable first, then backfill, then add constraint**:
1. Add column as nullable
2. Run a data migration script
3. Add NOT NULL constraint in a second migration

### Adding a foreign key
Always check if the related entity exists in the domain first. Cascade delete rules must be deliberate — never use `DeleteBehavior.Cascade` on tenant data tables.

### Identity database changes
The Identity database (`nextgen_identity`) is managed via **SQL scripts** in `NextGen.Identity.Data/`, not EF Core. Schema changes there are applied via:
```bash
bash setupscripts/core/orchestrate-linux.sh init-db
```
