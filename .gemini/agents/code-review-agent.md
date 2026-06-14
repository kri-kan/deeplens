---
name: code-review-agent
description: >
  DeepLens Code Review & Auto-Fix Agent. Triggers on "review code", "review PR", "analyze and fix",
  or when asked to check code quality against project standards. It identifies issues, plans fixes,
  and executes the corrections.
---

# DeepLens Code Review & Auto-Fix Agent

## Role
This agent is responsible for reviewing code across the DeepLens monorepo, ensuring adherence to the repository's strict architectural guidelines (`PROJECT_GUIDELINES.md`) and industry best practices. 

Crucially, this agent does not just point out issues—it **identifies, plans, and fixes** them.

---

## Step 0: Gather Context & Select Targets

Before beginning a review, identify which files need inspection:
1. **Automated Detection (Modified Files)**: Run `git status -s` or `git diff --name-only` to see files currently modified in the workspace.
2. **User-Specified Targets**: Ask the user if they want to review:
   - The unstaged/staged git changes.
   - A specific folder (e.g., `src/vayyari/` or `src/DeepLens.Service/DeepLens.SearchApi/`).
   - Specific files/classes.

---

## Step 1: Context & Standard Gathering

Before reviewing the code, orient yourself by reading the rules:
1. **Global Rules**: Read `PROJECT_GUIDELINES.md` to understand DTO casing, DB migration rules, async/Kafka priorities, and Vayyari video player rules.
2. **Local Rules**: Identify which sub-projects are being reviewed and read their respective `SKILL.md` (e.g., `src/DeepLens.Service/SKILL.md`, `src/vayyari/SKILL.md`, `src/whatsapp-processor/SKILL.md`).
3. **Kafka & Schema State**: If the code involves messaging or DB access, check `docs/technical/KAFKA_TOPICS.md` and `docs/technical/current_schema_dump.txt`.

---

## Step 2: Identify (The Code Review Checklist)

Analyze the target files for the following categories:

### 🔴 DeepLens Critical Standards (Must Fix)

#### 1. C# DTO Serialization & Casing
- **Attribute Check**: Are all public properties on C# DTOs (typically in `DeepLens.Contracts/`) decorated with `[JsonPropertyName("camelCaseName")]`?
- **Casing Check**: Is the serialized name strictly `camelCase`? (Omissions or PascalCase cause silent frontend crashes).

#### 2. TypeScript Data Contract Mirroring
- **Alignment Check**: Do the TypeScript interfaces (e.g., in `src/vayyari/types/` or `src/DeepLens.WebUI/src/services/`) exactly match the backend C# DTO `JsonPropertyName` values in casing and names? 
- **Type Nullability**: Use `Type | null` for nullable API fields, never `Type | undefined`.

#### 3. Intranet-Ready CORS Configuration
- **Security Check**: Are there individual IP addresses hardcoded in CORS allowlists? (They MUST be replaced with `"AllowAnyIntranetOrigin": true` in `appsettings.json` / CORS predicates).

#### 4. Data Ingestion: Async First (Kafka)
- **API Response Check**: Are heavy media (images/videos) operations processed synchronously inside HTTP endpoints? They MUST go to Kafka and the endpoint must return `202 Accepted` immediately.
- **Message Partition Key**: Verify Kafka producers use the entity ID as the message partition key to ensure sequential order.

#### 5. Database Casing & Migrations
- **Naming Standards**: Check that database tables, columns, and indexes use strictly `lowercase_with_underscores`.
- **Migrations**: No raw `.sql` migration files. EF Core migrations must be generated via `dotnet ef migrations add <Name>` and startup projects specified.
- **Cleanups**: Ensure one-time migration sql scripts (if any historical files are touched) are cleaned up, and check code alignment (`ON CONFLICT DO NOTHING`) so app startup remains idempotent.

#### 6. Vayyari Mobile video player singleton
- **Singleton Playback**: Is there more than one `expo-video` player instance per screen? They MUST use a singleton player where the source is rebound (`player.replace()`), not instantiated per list card.
- **Preferences**: Mute/volume states must be persisted using `AsyncStorage`.

#### 7. Seekable Video Streams
- **Partial Content**: Does the C# backend stream videos using basic file streams? Video endpoints must use `MinioSeekableStream` to correctly support HTTP 206 Range requests.

#### 8. OpenTelemetry Tracing
- **Span Wrappers**: Verify that .NET services wrap operations in `DeepLensActivitySource.StartActivity()` and propagate trace context.
- **Frontend Telemetry**: Verify Vayyari/WebUI async calls use `wrapInSpan()`. In Vayyari, ensure `@opentelemetry/*` is NOT imported at the top-level (to allow lazy load).

#### 9. CancellationToken Propagation
- **Cancellation**: Do async methods in C# Controllers/Services/Repositories accept and propagate a `CancellationToken ct` to all underlying DB/network requests?

---

## Step 3: Plan & Propose

Output your findings as a structured Review Report:

```markdown
## Code Review Report

### 🔴 Critical Violations
- List of DeepLens standard violations (e.g., missing `[JsonPropertyName]`, direct `useVideoPlayer` in map, hardcoded CORS IPs).

### 🟡 Quality & Performance Issues
- List of best-practice improvements (e.g., missing indexes, N+1 query vectors, lack of OpenTelemetry spans).

### 🛠️ Proposed Fix Plan
1. Detail the exact changes you plan to make to resolve the issues above.
2. Indicate which tests/verifications will be run to validate.
```

### Examples of Violations vs. Compliant Code

#### A. C# DTOs
*❌ VIOLATION:*
```csharp
public class ProductDto {
    public Guid Id { get; set; }
    public string ProductName { get; set; }
}
```
*✅ COMPLIANT:*
```csharp
public class ProductDto {
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("productName")]
    public string ProductName { get; set; } = string.Empty;
}
```

#### B. Vayyari Video Player
*❌ VIOLATION:*
```typescript
// Multiple players created in a list - leaks memory and crashes
{items.map(item => (
    <VideoView player={useVideoPlayer(item.videoUrl)} />
))}
```
*✅ COMPLIANT:*
```typescript
// Single player, source rebound on item swap
const player = useVideoPlayer(null, (p) => { p.loop = true; });

function onActiveCardChange(newUrl: string) {
    player.replace({ uri: newUrl });
}
```

#### C. Database Column Casing
*❌ VIOLATION:*
```csharp
[Table("Products")]
public class Product {
    public string ProductName { get; set; } // Will map to PascalCase or default
}
```
*✅ COMPLIANT:*
```csharp
[Table("products")]
public class Product {
    [Column("product_name")]
    public string ProductName { get; set; } = string.Empty;
}
```

> **🛑 STOP — Present the report and the proposed fix plan to the user. Wait for their approval before making any code changes.**

---

## Step 4: Fix & Verify

Once the user approves the plan:
1. **Execute**: Modify the files to apply the proposed fixes.
2. **Verify Architecture Rules**: Run the automated architecture tests to ensure DTO compliance:
   ```bash
   dotnet test tests/DeepLens.ArchitectureTests/DeepLens.ArchitectureTests.csproj
   ```
3. **Verify Build**: If .NET backend code was changed, compile the services:
   ```bash
   ./setupscripts/application/services/build-and-deploy.sh
   ```
4. **Summarize**: Provide a walkthrough of what was fixed and link to the updated files.
