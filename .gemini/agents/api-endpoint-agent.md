---
name: api-endpoint-agent
description: >
  Scaffolds a complete, correctly-patterned API endpoint step-by-step with user
  confirmation at each layer. Covers DeepLens Core (.NET direct service injection + CQRS),
  NextGen Identity (.NET Dapper), and WhatsApp Processor (Node.js/TypeScript).
  Trigger on: "add endpoint", "new route", "add API", "scaffold controller action".
---

# API Endpoint Agent

## When to Activate

Activate when the user wants to add a new HTTP endpoint to any of these services:
- **DeepLens SearchApi / AdminApi** → `.NET` path below
- **NextGen Identity API** → `.NET` path below (Dapper only, no CQRS)
- **WhatsApp Processor** → `Node.js / TypeScript` path below

---

## Step 0: Gather Requirements

Before writing any code, ask the user exactly 4 questions. Do NOT skip these:

```
1. Which service? (SearchApi / AdminApi / Identity / WhatsApp Processor)
2. What does this endpoint do? (one sentence)
3. HTTP method and route? (e.g., GET /api/v1/products/{id}/tags)
4. Does it need to write to the database, call Kafka, or call an external service?
```

Confirm their answers before proceeding to Step 1.

---

## Path A: DeepLens .NET (SearchApi / AdminApi)

The real pattern used in this codebase is **direct service injection** at the controller level.
MediatR/CQRS is used in `DeepLens.Application` only for complex cross-cutting commands (e.g., CreateOrder).
For most endpoints: `Controller → IService → Repository`.

---

### Step 1: Define the Request/Response DTOs

**Location**: `src/DeepLens.Service/DeepLens.SearchApi/DTOs/` (or `DeepLens.Contracts/` for shared contracts)

**Rules (mandatory)**:
- Every public property MUST have `[JsonPropertyName("camelCaseName")]`
- Never omit the attribute — missing it causes silent frontend crashes
- Use `record` types for immutable DTOs

```csharp
// Example: src/DeepLens.Service/DeepLens.SearchApi/DTOs/ProductTagsDto.cs
using System.Text.Json.Serialization;

namespace DeepLens.SearchApi.DTOs;

public record ProductTagsRequest(
    [property: JsonPropertyName("tags")] IEnumerable<string> Tags,
    [property: JsonPropertyName("replace")] bool Replace = false
);

public record ProductTagsResponse(
    [property: JsonPropertyName("productId")] Guid ProductId,
    [property: JsonPropertyName("tags")] IEnumerable<string> Tags,
    [property: JsonPropertyName("updatedAt")] DateTimeOffset UpdatedAt
);
```

> **🛑 STOP — Show the DTO to the user and wait for confirmation before Step 2.**

---

### Step 2: Add the Service Interface Method

**Location**: `src/DeepLens.Service/DeepLens.Application/Abstractions/Services/I{Name}Service.cs`

> **Path note**: The _interface_ always lives in `DeepLens.Application/Abstractions/Services/` (Application layer).
> The _implementation_ lives in `DeepLens.SearchApi/Services/` (API layer). Keep them separate — this is the Clean Architecture dependency rule.

If the interface already exists (check first with `grep -r "IProductService" src/`), add the new method:
```csharp
Task<ProductTagsResponse?> UpdateTagsAsync(Guid productId, IEnumerable<string> tags, bool replace, CancellationToken ct = default);
```

> **🛑 STOP — Confirm with user before Step 3.**

---

### Step 3: Implement the Service Method

**Location**: `src/DeepLens.Service/DeepLens.SearchApi/Services/{Name}Service.cs`

> **Reminder**: This is the _implementation_ of the interface defined in Step 2. The class must implement `I{Name}Service` and be registered in DI as that interface.

Pattern:
```csharp
public async Task<ProductTagsResponse?> UpdateTagsAsync(Guid productId, IEnumerable<string> tags, bool replace, CancellationToken ct = default)
{
    using var activity = DeepLensActivitySource.StartActivity("ProductService.UpdateTags");
    activity?.SetTag("product.id", productId.ToString());

    try
    {
        var result = await _repository.UpdateTagsAsync(productId, tags, replace, ct);
        activity?.SetStatus(ActivityStatusCode.Ok);
        return result;
    }
    catch (Exception ex)
    {
        activity?.RecordException(ex);
        activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
        _logger.LogError(ex, "Failed to update tags for product {ProductId}", productId);
        throw;
    }
}
```

**Key rules**:
- Always wrap in `DeepLensActivitySource.StartActivity(...)` for OpenTelemetry tracing
- Always inject `ILogger<T>` and log errors at `LogError` level
- Propagate `CancellationToken` down to DB calls

> **🛑 STOP — Confirm with user before Step 4.**

---

### Step 4: Add Repository Method (if DB access needed)

**Check first**: Does a method already exist in the relevant repository?

**Location**: `src/DeepLens.Service/DeepLens.Infrastructure/Repositories/`

Use **Dapper** for reads, **EF Core** for writes:
```csharp
// Dapper (reads)
public async Task<ProductTagsResponse?> GetTagsAsync(Guid productId)
{
    const string sql = "SELECT * FROM product_tags WHERE product_id = @ProductId";
    return await _connection.QueryFirstOrDefaultAsync<ProductTagsResponse>(sql, new { ProductId = productId });
}

// EF Core (writes)
public async Task UpdateTagsAsync(Guid productId, IEnumerable<string> tags, bool replace, CancellationToken ct)
{
    var entity = await _context.Products.FindAsync([productId], ct)
        ?? throw new KeyNotFoundException($"Product {productId} not found");
    
    if (replace) entity.Tags = tags.ToList();
    else entity.Tags = entity.Tags.Union(tags).ToList();
    
    await _context.SaveChangesAsync(ct);
}
```

> **🛑 STOP — Confirm with user before Step 5.**

---

### Step 5: Add the Controller Action

**Find the right controller** in `src/DeepLens.Service/DeepLens.SearchApi/Controllers/`:
- Products → `ProductsController.cs`
- Media → `MediaController.cs`
- Catalog → `CatalogController.cs`
- If none fits → create a new controller

**Pattern**:
```csharp
[HttpPatch("{id}/tags")]
[ProducesResponseType(typeof(ProductTagsResponse), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
public async Task<IActionResult> UpdateTags(Guid id, [FromBody] ProductTagsRequest request, CancellationToken ct)
{
    var result = await _productService.UpdateTagsAsync(id, request.Tags, request.Replace, ct);
    return result != null ? Ok(result) : NotFound();
}
```

**Rules**:
- Always declare `[ProducesResponseType]` attributes for Swagger accuracy
- Always accept `CancellationToken ct` as the last parameter
- Return `IActionResult` (not `ActionResult<T>`) for consistency

> **🛑 STOP — Confirm with user before Step 6.**

---

### Step 6: Post-Scaffold Checklist

After user confirms all layers, output this checklist:

```markdown
## ✅ Endpoint Scaffold Complete — Final Checklist

- [ ] All DTO properties have [JsonPropertyName("camelCaseName")] ← VERIFY
- [ ] OpenTelemetry activity span added in service method ← VERIFY  
- [ ] CancellationToken flows from controller → service → repository ← VERIFY
- [ ] ProducesResponseType attributes match actual return types ← VERIFY
- [ ] If new TypeScript types needed → add to Vayyari: src/vayyari/types/ or WebUI: src/services/
- [ ] Run deployment: ./setupscripts/application/services/build-and-deploy.sh
```

---

## Path B: NextGen Identity API (.NET / Dapper-only)

Same flow as Path A **except**:
- **No EF Core** — all DB access uses Dapper + raw SQL only
- Repository location: `src/NextGen.Identity/NextGen.Identity.Data/Repositories/`
- Service location: `src/NextGen.Identity/NextGen.Identity.Api/` (thin service layer)
- Controller location: `src/NextGen.Identity/NextGen.Identity.Api/Controllers/`
- No MediatR — direct injection only

```csharp
// Repository (Dapper only)
public async Task<TenantDto?> GetBySlugAsync(string slug)
{
    const string sql = "SELECT * FROM tenants WHERE slug = @Slug AND is_active = TRUE";
    return await _connection.QuerySingleOrDefaultAsync<TenantDto>(sql, new { Slug = slug });
}
```

---

## Path C: WhatsApp Processor (Node.js / TypeScript)

Direct service injection: `Route → Controller → Service → Repository`

---

### Step 1: Define TypeScript Types

**Location**: `src/whatsapp-processor/src/types/`

```typescript
// types/vendor.types.ts
export interface UpdateVendorRequest {
    name: string;
    contactJid?: string;
    isActive?: boolean;
}

export interface VendorDto {
    id: number;
    name: string;
    contactJid: string | null;
    isActive: boolean;
    createdAt: string;
}
```

> **🛑 STOP — Confirm before Step 2.**

---

### Step 2: Add Repository Method

**Location**: `src/whatsapp-processor/src/repositories/`

```typescript
// repositories/vendor.repository.ts
async updateVendor(id: number, data: UpdateVendorRequest): Promise<VendorDto | null> {
    const result = await this.db.query(
        `UPDATE vendors 
         SET name = $1, contact_jid = $2, is_active = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [data.name, data.contactJid ?? null, data.isActive ?? true, id]
    );
    return result.rows[0] ?? null;
}
```

> **🛑 STOP — Confirm before Step 3.**

---

### Step 3: Add Service Method

**Location**: `src/whatsapp-processor/src/services/`

```typescript
// services/vendor.service.ts
async updateVendor(id: number, data: UpdateVendorRequest): Promise<VendorDto | null> {
    return this.repository.updateVendor(id, data);
}
```

> **🛑 STOP — Confirm before Step 4.**

---

### Step 4: Add Controller Method

**Location**: `src/whatsapp-processor/src/controllers/`

```typescript
// controllers/vendor.controller.ts (add to existing class)
async updateVendor(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const data: UpdateVendorRequest = req.body;

    if (!data.name) {
        return res.status(400).json({ error: 'name is required' });
    }

    try {
        const result = await this.service.updateVendor(id, data);
        if (!result) return res.status(404).json({ error: 'Vendor not found' });
        res.json(result);
    } catch (err: any) {
        logger.error({ err, id }, 'Failed to update vendor');
        res.status(500).json({ error: err.message });
    }
}
```

> **🛑 STOP — Confirm before Step 5.**

---

### Step 5: Register Route

**Location**: `src/whatsapp-processor/src/routes/`

```typescript
// routes/vendor.routes.ts
router.patch('/:id', (req, res) => controller.updateVendor(req, res));
```

Check if the router is already registered in `src/index.ts` — if not, add:
```typescript
app.use('/api/vendors', createVendorRouter(db));
```

### Step 6: Post-Scaffold Checklist

```markdown
## ✅ Endpoint Scaffold Complete — Final Checklist

- [ ] Input validation on required fields ← VERIFY
- [ ] URL-encoded params decoded where needed (JIDs): decodeURIComponent() ← VERIFY
- [ ] Error logging with logger.error({ err }, 'message') ← VERIFY
- [ ] TypeScript types added to types/ directory ← VERIFY
- [ ] Route registered in index.ts or the correct router file ← VERIFY
- [ ] Run: npm run build:all
```

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| Hardcoding `200` status | Use `Ok()`, `NotFound()`, `Accepted()` etc. |
| Omitting `[JsonPropertyName]` on DTOs | Every. Single. Property. |
| Creating a new IService without checking existing ones | Always `grep -r "IProductService"` first |
| Not propagating CancellationToken | Accept `ct` in controller and pass to every async call |
| Using `var` for JID params without decoding | `var jid = decodeURIComponent(req.params.jid)` |
| Missing 404 handling | Always check for `null` return from service |
