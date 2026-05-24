---
name: deeplens-dotnet-core
description: >
  Patterns, conventions, and guardrails for the DeepLens .NET 9 services (Search API,
  Admin API, Worker Service, Infrastructure). Activate when working in src/DeepLens.Service/
  or src/NextGen.Identity/.
---

# DeepLens .NET Core — Developer Skill

## Overview

DeepLens Core is built with **.NET 9** following Clean Architecture. It consists of:

| Project | Type | Port | Purpose |
|---|---|---|---|
| `DeepLens.SearchApi` | ASP.NET Core API | 5000 | Image upload, search, ingestion |
| `DeepLens.AdminApi` | ASP.NET Core API | — | Tenant & resource management |
| `DeepLens.WorkerService` | Background Worker | — | Kafka consumers |
| `DeepLens.Application` | Class Library | — | CQRS handlers, business logic |
| `DeepLens.Domain` | Class Library | — | Entities, value objects |
| `DeepLens.Infrastructure` | Class Library | — | DB, MinIO, Qdrant, Kafka drivers |
| `DeepLens.Contracts` | Class Library | — | Kafka event contracts & DTOs |
| `DeepLens.Shared.*` | Shared Libraries | — | Common utilities, messaging, telemetry |
| `NextGen.Identity.Api` | ASP.NET Core API | 5198 | Auth, JWT, tenant provisioning |

Solution file: `src/DeepLens.Service/DeepLens.sln`

---

## Clean Architecture Layers

Always follow this dependency direction:

```
Domain ← Application ← Infrastructure ← API/Worker
```

- **Domain** (`DeepLens.Domain`): Entities, value objects, domain events. No dependencies.
- **Application** (`DeepLens.Application`): CQRS commands/queries/handlers, interfaces. Depends only on Domain.
- **Infrastructure** (`DeepLens.Infrastructure`): EF Core, Dapper, MinIO, Qdrant, Kafka implementations. Depends on Application.
- **API** (`DeepLens.SearchApi`, `DeepLens.AdminApi`): Controllers, middleware, DI wiring. Depends on Application + Infrastructure.
- **Worker** (`DeepLens.WorkerService`): Kafka consumer workers. Depends on Application + Infrastructure.

---

## DTO Rules — MANDATORY

Every public DTO property **MUST** have an explicit `[JsonPropertyName]` attribute.

```csharp
// ✅ CORRECT
public class ImageDto
{
    [JsonPropertyName("imageId")]
    public Guid ImageId { get; set; }

    [JsonPropertyName("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    [JsonPropertyName("storagePath")]
    public string StoragePath { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public int Status { get; set; }
}

// ❌ WRONG — will cause frontend property-access crashes
public class ImageDto
{
    public Guid ImageId { get; set; }
    public string TenantId { get; set; } = string.Empty;
}
```

All DTOs live in `DeepLens.Contracts/`. TypeScript interfaces in the frontend **must** mirror the `JsonPropertyName` values exactly.

---

## Data Access: Dapper vs EF Core

| Scenario | Use |
|---|---|
| High-frequency search queries (GET by ID, list, filter) | **Dapper** — raw SQL, maximum performance |
| Domain model writes (insert, update, delete) | **EF Core** — type-safe, migration-tracked |
| Complex domain models with relationships | **EF Core** |
| Simple read queries in Identity service | **Dapper** |

### Dapper pattern (Identity service)
```csharp
public async Task<User?> GetByEmailAsync(string email)
{
    const string sql = "SELECT * FROM users WHERE email = @Email";
    return await _connection.QuerySingleOrDefaultAsync<User>(sql, new { Email = email });
}
```

### EF Core pattern
```csharp
// Use DbContext via dependency injection
public async Task<Image?> GetByIdAsync(Guid id, CancellationToken ct)
{
    return await _context.Images
        .Where(i => i.Id == id)
        .FirstOrDefaultAsync(ct);
}
```

---

## Database Schema Rules

- Table names: `lowercase_with_underscores` (e.g., `tenant_api_keys`, `refresh_tokens`)
- Column names: `lowercase_with_underscores` (e.g., `created_at`, `tenant_id`)
- **Never write raw SQL migration files** — always use EF Core Migrations

```bash
# From the project root
cd src/DeepLens.Service/DeepLens.Infrastructure
dotnet ef migrations add <MigrationName> --startup-project ../DeepLens.SearchApi
dotnet ef database update --startup-project ../DeepLens.SearchApi
```

---

## Kafka Event Contracts

All event types are defined in `DeepLens.Contracts/Events/KafkaEvents.cs`.

### Adding a new event
1. Check `docs/technical/KAFKA_TOPICS.md` — topic may already exist
2. Add the topic name constant:
```csharp
// DeepLens.Contracts/Events/KafkaEvents.cs
public static class KafkaTopics
{
    public const string ImagesUploaded = "deeplens.images.uploaded";
    // Add your new topic here:
    public const string MyNewEvent = "deeplens.domain.action";
}
```
3. Create the event payload class in `DeepLens.Contracts/Events/`:
```csharp
public class MyNewEvent
{
    [JsonPropertyName("imageId")]
    public string ImageId { get; set; } = string.Empty;

    [JsonPropertyName("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public DateTimeOffset Timestamp { get; set; }
}
```
4. Produce in the emitting service using `DeepLens.Shared.Messaging`
5. Consume in `DeepLens.WorkerService` — create a new Worker class
6. Update `docs/technical/KAFKA_TOPICS.md`

### Existing topics (8 total)
| Topic | Producer → Consumer |
|---|---|
| `deeplens.images.uploaded` | SearchAPI → WorkerService (ImageProcessingWorker) |
| `deeplens.videos.uploaded` | SearchAPI → WorkerService (VideoProcessingWorker) |
| `deeplens.features.extraction` | WorkerService → PythonService |
| `deeplens.vectors.indexing` | PythonService → WorkerService (VectorIndexingWorker) |
| `deeplens.processing.completed` | WorkerService → SearchAPI |
| `deeplens.processing.failed` | WorkerService (any) → SearchAPI |
| `deeplens.images.maintenance` | SearchAPI → WorkerService (MaintenanceWorker) |
| `whatsapp-ready-messages` | WhatsApp Processor → MessageQueueService |

---

## Multi-Tenant Architecture

DeepLens isolates tenants via prefix-isolated databases and dedicated MinIO buckets.

- **Tenant metadata DB**: Separate PostgreSQL database per tenant
- **Platform DB**: Shared `nextgen_identity` and `deeplens_platform` databases
- **MinIO**: Dedicated bucket per tenant (`tenant-{uuid}`)
- **Qdrant**: Isolated collection per tenant

### Tenant-scoped DB access
```csharp
// Always resolve the tenant context from the current HTTP request
// Use IHttpContextAccessor + tenant ID from JWT claims
// Infrastructure layer resolves the correct connection string per tenant
```

---

## OpenTelemetry — Mandatory Instrumentation

Every critical operation must have an Activity span.

```csharp
using var activity = DeepLensActivitySource.StartActivity("OperationName");
activity?.SetTag("image.id", imageId.ToString());
activity?.SetTag("tenant.id", tenantId);

try
{
    // ... your logic
    activity?.SetStatus(ActivityStatusCode.Ok);
}
catch (Exception ex)
{
    activity?.RecordException(ex);
    activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
    throw;
}
```

`DeepLensActivitySource` is defined in `DeepLens.Shared.Telemetry`.

---

## API Design Rules

- Uploads return `202 Accepted` — never `200 OK` for async operations
- Use `Result<T>` pattern in Application layer — avoid throwing exceptions for domain failures
- Always propagate `CancellationToken ct` down to DB and HTTP calls

```csharp
// Controller pattern
[HttpPost("upload")]
[ProducesResponseType(StatusCodes.Status202Accepted)]
public async Task<IActionResult> Upload([FromForm] UploadRequest request, CancellationToken ct)
{
    var result = await _mediator.Send(new UploadImageCommand(request), ct);
    return Accepted(new { imageId = result.ImageId });
}
```

---

## CORS (Intranet-Ready)

Do **not** add explicit IP addresses to the CORS allowlist. The intranet CORS predicate handles all RFC1918 addresses automatically:

```json
// appsettings.json — use this toggle, not individual IPs
{
  "Cors": {
    "AllowAnyIntranetOrigin": true
  }
}
```

---

## Deployment (Mandatory)

After **any** backend C# or service-layer change, run:
```bash
./setupscripts/application/services/build-and-deploy.sh
```

To deploy a specific service:
```bash
./setupscripts/application/services/build-and-deploy.sh --service searchapi
```

---

## Running Locally

```bash
# Identity API (required first — issues JWTs)
dotnet run --project src/NextGen.Identity/NextGen.Identity.Api/NextGen.Identity.Api.csproj \
    --urls http://localhost:5198

# Search API
dotnet run --project src/DeepLens.Service/DeepLens.SearchApi/DeepLens.SearchApi.csproj \
    --urls http://localhost:5000

# Worker Service (Kafka consumers)
dotnet run --project src/DeepLens.Service/DeepLens.WorkerService/DeepLens.WorkerService.csproj
```

---

## Common Gotchas

1. **EF Core migration context**: Always specify `--startup-project` when running migrations — the Infrastructure project doesn't have a `Program.cs`
2. **Tenant connection resolution**: Multi-tenant DB drivers resolve connections lazily from the HTTP context — never cache or share connections across requests
3. **Kafka offset commit**: Workers auto-commit after processing — if you throw inside a handler, the message will be retried. Use idempotent handlers.
4. **MinIO `MinioSeekableStream`**: Required for video streaming — ensures HTTP 206 Partial Content support. Never use a regular stream for video delivery.
5. **ASPNETCORE_ENVIRONMENT**: Set to `Development` locally to enable detailed errors and Swagger UI

---

## Related Documentation
- `docs/architecture/system-overview.md` — System architecture & ADRs
- `docs/technical/KAFKA_TOPICS.md` — All Kafka topics
- `docs/technical/SECURITY.md` — JWT, RBAC, OAuth 2.0 details
- `docs/technical/database-standards.md` — DB naming rules
- `docs/architecture/dto_standards.md` — DTO camelCase rules
- `docs/technical/current_schema_dump.txt` — Current DB schema
