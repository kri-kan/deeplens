# DeepLens Source Code Guide

**Complete reference for the application codebase**

Last Updated: December 17, 2025

---

## Directory Structure

```
src/
 README.md                                    #  This comprehensive guide

  NextGen.Identity (Authentication & Multi-Tenancy)
    NextGen.Identity.Core/                   # Domain entities, DTOs, interfaces
       Entities/
          Tenant.cs                        # Multi-tenant organization entity
          User.cs                          # User accounts with authentication
          RefreshToken.cs                  # JWT refresh token management
          TenantApiKey.cs                  # Programmatic API access keys
       DTOs/
          AuthDTOs.cs                      # Login, Register, Tenant setup DTOs
       Interfaces/
           IServices.cs                     # Service & repository interfaces

    NextGen.Identity.Data/                   # Data access & business logic
       Repositories/
          UserRepository.cs                # Dapper-based user CRUD
          TenantRepository.cs              # Dapper-based tenant CRUD
          RefreshTokenRepository.cs        # Token lifecycle management
       Services/
          AuthenticationService.cs         # Login, registration, token refresh
          TenantService.cs                 # Tenant creation & management
       Migrations/
          001_InitialSchema.sql            # PostgreSQL schema (tenants, users, tokens)
          MigrationRunner.cs               # SQL migration execution engine
       DbConnectionFactory.cs               # PostgreSQL connection factory
       Telemetry.cs                         #  OpenTelemetry ActivitySource & constants

    NextGen.Identity.Api/                    # REST API for authentication
        Program.cs                           # API startup & DI configuration
        appsettings.json                     # Configuration (JWT, DB, etc.)

  DeepLens (Image Search Platform)
    DeepLens.Domain/                         # Core business entities
       Entities/
          Tenant.cs                        # Tenant domain model
          Image.cs                         # Image metadata entity
       ValueObjects/
           ThumbnailSpecification.cs        # Thumbnail generation specs

    DeepLens.Application/                    # Use cases & business logic
       (Pending implementation)             # Command/query handlers

    DeepLens.Infrastructure/                 # External service integrations
       Services/
           VectorStoreService.cs            # Qdrant vector database client

    DeepLens.Contracts/                      # Shared DTOs & events
       Tenants/
          TenantDtos.cs                    # Tenant data transfer objects
       Events/
           KafkaEvents.cs                   # Event definitions for Kafka

     API Services
       DeepLens.SearchApi/                  # Image search endpoints
          Controllers/
             AsyncImageController.cs      # Image upload & search API
          Program.cs                       # Startup configuration

       DeepLens.AdminApi/                   # Administrative operations
          Controllers/
             TenantsController.cs         # Tenant management API
             VectorCollectionController.cs # Qdrant collection management
          Program.cs                       # Startup configuration

       DeepLens.ApiGateway/                 # API gateway & routing
           Program.cs                       # Gateway configuration (Yarp/Ocelot)

     Background Services
       DeepLens.WorkerService/              # Async background processing
           Workers/
              ImageProcessingWorker.cs     # Image upload processing
              FeatureExtractionWorker.cs   # Feature extraction orchestration
              VectorIndexingWorker.cs      # Vector indexing to Qdrant
           Worker.cs                        # Base worker implementation
           Program.cs                       # Worker host configuration

     Python Services
       DeepLens.FeatureExtractionService/   # AI/ML feature extraction
           app/
              main.py                      # FastAPI application
              models/                      # CNN model implementations
              services/                    # Feature extraction logic
              routers/                     # API endpoints
           tests/                           # Pytest test suite
           README.md                        # Service documentation
           QUICKSTART.md                    # Quick start guide
           TESTING.md                       # Testing guide
           TESTING_SUMMARY.md               # Test coverage summary

     Shared Libraries
        DeepLens.Shared.Common/              # Common utilities & helpers
        DeepLens.Shared.Messaging/           # Kafka messaging abstractions
        DeepLens.Shared.Telemetry/           # OpenTelemetry shared setup

  Web UI
    DeepLens.WebUI/                          # React web interface
        src/
           components/                       # Reusable UI components
           pages/                            # Page components
           services/                         # API service layer
           contexts/                         # React contexts
        package.json                         # Dependencies & scripts
        README.md                            # Web UI documentation
```

---

## Quick Start

### Prerequisites

- **.NET 9.0 SDK** - https://dot.net
- **Python 3.11+** - For feature extraction service
- **Docker/Podman** - For infrastructure (PostgreSQL, Kafka, Qdrant, etc.)

### Start Infrastructure First

```powershell
cd ../infrastructure
.\setup-containers.ps1 -StartComplete
```

### Run NextGen.Identity API

```powershell
cd NextGen.Identity.Api
dotnet run
# API: http://localhost:5000
```

### Run Python Feature Extraction

```powershell
cd DeepLens.FeatureExtractionService
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
# API: http://localhost:8001
```

---

## Project Reference

### NextGen.Identity System

| Project                   | Type          | Purpose                                   | Dependencies                                                    |
| ------------------------- | ------------- | ----------------------------------------- | --------------------------------------------------------------- |
| **NextGen.Identity.Core** | Class Library | Domain entities, DTOs, interfaces         | OpenTelemetry.Api 1.9.0                                         |
| **NextGen.Identity.Data** | Class Library | Dapper repositories, services, migrations | Core + Dapper 2.1.35, Npgsql 9.0.2, BCrypt 4.0.3, OpenTelemetry |
| **NextGen.Identity.Api**  | Web API       | REST endpoints for authentication         | Data + OpenTelemetry full stack + Serilog                       |

**Database:** PostgreSQL (identity database)  
**Data Access:** Pure Dapper with raw SQL (no EF Core)  
**OpenTelemetry:** Complete instrumentation on all layers

### DeepLens Platform

| Project                               | Type           | Purpose                                      | Key Dependencies                  |
| ------------------------------------- | -------------- | -------------------------------------------- | --------------------------------- |
| **DeepLens.Domain**                   | Class Library  | Core entities & value objects                | (None - pure domain)              |
| **DeepLens.Application**              | Class Library  | Use cases, command/query handlers            | Domain                            |
| **DeepLens.Infrastructure**           | Class Library  | External integrations (Qdrant, MinIO, Kafka) | Application                       |
| **DeepLens.Contracts**                | Class Library  | Shared DTOs & event definitions              | (None - contracts only)           |
| **DeepLens.SearchApi**                | Web API        | Image upload & search                        | Infrastructure, Contracts         |
| **DeepLens.AdminApi**                 | Web API        | Administrative operations                    | Infrastructure, Contracts         |
| **DeepLens.ApiGateway**               | Web API        | API routing & aggregation                    | (Gateway libraries - Yarp/Ocelot) |
| **DeepLens.WorkerService**            | Worker Service | Background processing (Kafka consumers)      | Infrastructure, Contracts         |
| **DeepLens.FeatureExtractionService** | Python/FastAPI | CNN feature extraction                       | PyTorch, FastAPI, OpenTelemetry   |
| **DeepLens.Shared.Common**            | Class Library  | Common utilities                             | (None - utilities only)           |
| **DeepLens.Shared.Messaging**         | Class Library  | Kafka messaging abstractions                 | Confluent.Kafka                   |
| **DeepLens.Shared.Telemetry**         | Class Library  | OpenTelemetry shared setup                   | OpenTelemetry packages            |

### Web UI

| Project            | Type       | Purpose                             | Key Dependencies                           |
| ------------------ | ---------- | ----------------------------------- | ------------------------------------------ |
| **DeepLens.WebUI** | React/Vite | Unified web interface for all roles | React 18, Material-UI 5, TypeScript, Axios |

**Purpose:** Single-page application for system admins, tenant owners, and regular users  
**Features:** Role-based navigation, JWT authentication, tenant/user/image management  
**Technology:** React 18.2 + TypeScript 5.3 + Vite + Material-UI 5.15

---

## Service Endpoints

### NextGen.Identity API (Port 5000)

| Endpoint                   | Method | Purpose                    | Request Body                                         | Response                                  |
| -------------------------- | ------ | -------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `/api/auth/login`          | POST   | User login                 | `{ email, password }`                                | `{ accessToken, refreshToken, user }`     |
| `/api/auth/register`       | POST   | User registration          | `{ email, password, firstName, lastName, tenantId }` | `{ user }`                                |
| `/api/auth/refresh`        | POST   | Refresh access token       | `{ refreshToken }`                                   | `{ accessToken, refreshToken }`           |
| `/api/auth/logout`         | POST   | Revoke refresh token       | `{ refreshToken }`                                   | `204 No Content`                          |
| `/api/tenants`             | POST   | Create tenant + admin user | `{ name, adminEmail, adminPassword, ... }`           | `{ tenant, adminUser, tokens }`           |
| `/api/tenants/{id}`        | GET    | Get tenant details         | -                                                    | `{ id, name, slug, infrastructure, ... }` |
| `/api/tenants/slug/{slug}` | GET    | Get tenant by slug         | -                                                    | `{ id, name, slug, ... }`                 |
| `/api/tenants`             | GET    | List all tenants           | -                                                    | `[ {tenant}, ... ]`                       |
| `/api/tenants/{id}`        | PUT    | Update tenant              | `{ description, status, tier }`                      | `{ updated tenant }`                      |

**Authentication:** Bearer JWT token (except `/auth/login`, `/auth/register`, `/tenants` POST)

### DeepLens.SearchApi (Port 5001)

| Endpoint                  | Method | Purpose            | Request               | Response                            |
| ------------------------- | ------ | ------------------ | --------------------- | ----------------------------------- |
| `/api/images/upload`      | POST   | Upload image       | `multipart/form-data` | `{ imageId, status, message }`      |
| `/api/images/search`      | POST   | Semantic search    | `{ image or vector }` | `[ { imageId, similarity }, ... ]`  |
| `/api/images/{id}`        | GET    | Get image metadata | -                     | `{ id, filename, uploadedAt, ... }` |
| `/api/images/{id}/vector` | GET    | Get feature vector | -                     | `{ vector: [float[2048]] }`         |

### DeepLens.AdminApi (Port 5002)

| Endpoint                      | Method | Purpose                 | Request                    | Response                              |
| ----------------------------- | ------ | ----------------------- | -------------------------- | ------------------------------------- |
| `/api/tenants`                | GET    | List tenants            | -                          | `[ {tenant}, ... ]`                   |
| `/api/tenants/{id}/analytics` | GET    | Tenant usage statistics | -                          | `{ storageUsed, apiCallsToday, ... }` |
| `/api/collections`            | GET    | List Qdrant collections | -                          | `[ {collectionName, vectors}, ... ]`  |
| `/api/collections/{name}`     | POST   | Create collection       | `{ vectorSize, distance }` | `{ collectionName, created }`         |
| `/api/collections/{name}`     | DELETE | Delete collection       | -                          | `204 No Content`                      |

### Feature Extraction Service (Port 8001)

| Endpoint   | Method | Purpose                   | Request           | Response                                         |
| ---------- | ------ | ------------------------- | ----------------- | ------------------------------------------------ |
| `/extract` | POST   | Extract CNN features      | Image (multipart) | `{ features: [float[2048]], model: "resnet50" }` |
| `/health`  | GET    | Health check              | -                 | `{ status: "healthy" }`                          |
| `/models`  | GET    | List available models     | -                 | `[ "resnet50", "efficientnet-b0" ]`              |
| `/docs`    | GET    | OpenAPI docs (Swagger UI) | -                 | Interactive API documentation                    |

---

## NextGen.Identity - Deep Dive

### Database Schema

See [NextGen.Identity.Data/Migrations/001_InitialSchema.sql](NextGen.Identity.Data/Migrations/001_InitialSchema.sql) for complete schema.

**Key Tables:**

- `tenants` (17 columns)
  - Identity: id (UUID), name, slug (unique)
  - Infrastructure: database_name, qdrant_container_name, qdrant_http_port, qdrant_grpc_port, minio_endpoint, minio_bucket_name
  - Limits: max_storage_bytes, max_users, max_api_calls_per_day
  - Status: status (Active/Suspended/PendingSetup/Deleted), tier (Free/Professional/Enterprise)
- `users` (16 columns)
  - Identity: id (UUID), tenant_id (FK), email (unique per tenant)
  - Authentication: password_hash (BCrypt), email_confirmed, email_confirmation_token
  - Password reset: password_reset_token, password_reset_token_expiry
  - Authorization: role (User/Admin/TenantOwner)
  - Tracking: last_login_at, created_at, updated_at, deleted_at
- `refresh_tokens` (10 columns)
  - Identity: id (UUID), user_id (FK), token (unique, indexed)
  - Lifecycle: expires_at, is_revoked, revoked_at, revoked_reason
  - Security: ip_address, user_agent
- `tenant_api_keys` (9 columns)
  - Identity: id (UUID), tenant_id (FK), name
  - Key: key_hash, key_prefix (visible part, e.g., "dl_abc...")
  - Lifecycle: expires_at, last_used_at, is_active

**Indexes:**

- `idx_users_tenant_email` - Unique (tenant_id, email, deleted_at) - Fast user lookup
- `idx_users_tenant_id` - tenant_id - Filter by tenant
- `idx_refresh_tokens_user_id` - user_id - User token queries
- `idx_refresh_tokens_token` - token - Token validation
- `idx_tenants_slug` - slug - Slug lookup
- `idx_tenant_api_keys_tenant_id` - tenant_id - Tenant keys

### OpenTelemetry Instrumentation

**Coverage:** 100% of data layer + service layer

**Example Activity Trace (Login Flow):**

```
user.authenticate (AuthenticationService.LoginAsync)
 db.query (UserRepository.GetByEmailAsync)
    Tags: db.table=users, db.operation=select, user.email=test@example.com
 [BCrypt password verification]
 token.generate (JwtTokenService.GenerateAccessToken)
 db.command (RefreshTokenRepository.CreateAsync)
    Tags: db.table=refresh_tokens, db.operation=insert, user.id, token.type=refresh
 db.command (UserRepository.UpdateAsync - last_login_at)
     Tags: db.table=users, db.operation=update, user.id, tenant.id

Result Tags: auth.result=success, tenant.id, user.id
```

**All Operations Instrumented:**

- Database: Every Dapper query/command
- Authentication: Login, registration, token refresh, logout
- Tenant: Create, query, update
- Token: Generate, validate, revoke

**Error Handling Pattern:**

```csharp
using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.UserAuthentication);
activity?.SetTag(Telemetry.Tags.UserEmail, email);

try
{
    // Operation logic
    activity?.SetTag("auth.result", "success");
}
catch (Exception ex)
{
    activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
    activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
    throw;
}
```

See [OPENTELEMETRY_STATUS.md](../OPENTELEMETRY_STATUS.md) for complete implementation details.

---

## DeepLens Platform - Deep Dive

### Image Processing Pipeline

**1. Upload (SearchApi)**

```
POST /api/images/upload

Validate image format (JPEG, PNG, WebP)

Generate unique ID

Store in MinIO (bucket: deeplens-images)

Insert metadata in PostgreSQL

Publish Kafka event: "image.uploaded"

Return imageId to client
```

**2. Processing (ImageProcessingWorker)**

```
Consume Kafka: "image.uploaded"

Download image from MinIO

Generate thumbnails (256x256, 128x128)

Store thumbnails in MinIO

Update PostgreSQL metadata

Publish Kafka event: "image.validated"
```

**3. Feature Extraction (FeatureExtractionWorker)**

```
Consume Kafka: "image.validated"

Download original image from MinIO

Call Python service: POST /extract

Receive 2048-dim vector (ResNet50)

Publish Kafka event: "features.extracted"
```

**4. Vector Indexing (VectorIndexingWorker)**

```
Consume Kafka: "features.extracted"

Get tenant's Qdrant collection name

Insert vector into Qdrant:
  - Collection: "tenant_{tenantId}_images"
  - Point ID: imageId
  - Vector: [float[2048]]
  - Payload: {filename, uploadedAt, tenantId}

Update PostgreSQL: indexed_at timestamp

Image ready for search!
```

**5. Search (SearchApi)**

```
POST /api/images/search

Extract features from query image (call Python service)

Query Qdrant for similar vectors:
  - Collection: "tenant_{tenantId}_images"
  - Vector: query features
  - Limit: 10
  - Score threshold: 0.7

Retrieve metadata from PostgreSQL

Return results with similarity scores
```

### Python Feature Extraction Service

**Technology:**

- FastAPI 0.115.5 - Async web framework
- PyTorch 2.5.1 - Deep learning library
- Torchvision 0.20.1 - Pre-trained models
- Pillow 11.0.0 - Image processing

**Models:**

- **ResNet50 (default)** - 2048-dimensional features

  - Pre-trained on ImageNet (1000 classes)
  - Layer: avgpool (before final FC)
  - Input: 224x224 RGB
  - Performance: ~200ms CPU, ~50ms GPU

- **EfficientNet-B0** - 1280-dimensional features
  - More efficient, smaller vectors
  - Input: 224x224 RGB
  - Performance: ~150ms CPU, ~40ms GPU

**API Usage:**

```bash
curl -X POST http://localhost:8001/extract \
  -F "file=@image.jpg" \
  -F "model=resnet50"

Response:
{
  "features": [0.123, -0.456, ...],  # 2048 floats
  "model": "resnet50",
  "shape": [2048],
  "processing_time_ms": 234.5
}
```

**Testing:**

- 93% code coverage
- 15 test cases (endpoint, model loading, feature extraction)
- CI/CD ready (pytest in GitHub Actions)

See [DeepLens.FeatureExtractionService/README.md](DeepLens.FeatureExtractionService/README.md) for details.

---

## Development Guide

### Adding a New Repository (Dapper)

1. **Define interface in Core:**

```csharp
// NextGen.Identity.Core/Interfaces/IServices.cs
public interface IImageRepository
{
    Task<Image?> GetByIdAsync(Guid id);
    Task<Image> CreateAsync(Image image);
}
```

2. **Implement with OpenTelemetry:**

```csharp
// NextGen.Identity.Data/Repositories/ImageRepository.cs
using System.Diagnostics;
using Dapper;

public class ImageRepository : IImageRepository
{
    private readonly DbConnectionFactory _connectionFactory;

    public ImageRepository(DbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<Image?> GetByIdAsync(Guid id)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseQuery);
        activity?.SetTag(Telemetry.Tags.DbTable, "images");
        activity?.SetTag(Telemetry.Tags.DbOperation, "select");

        const string sql = @"
            SELECT id, filename, uploaded_at AS uploadedat
            FROM images
            WHERE id = @Id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<Image>(sql, new { Id = id });
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }
}
```

3. **Register in DI:**

```csharp
// NextGen.Identity.Api/Program.cs
builder.Services.AddScoped<IImageRepository, ImageRepository>();
```

### Adding a New Service with Telemetry

```csharp
// NextGen.Identity.Data/Services/ImageService.cs
using System.Diagnostics;

public class ImageService : IImageService
{
    private readonly IImageRepository _imageRepository;

    public ImageService(IImageRepository imageRepository)
    {
        _imageRepository = imageRepository;
    }

    public async Task<ImageResponse> GetImageAsync(Guid id)
    {
        using var activity = Telemetry.ActivitySource.StartActivity("image.query");
        activity?.SetTag("image.id", id);

        try
        {
            var image = await _imageRepository.GetByIdAsync(id);
            if (image == null)
            {
                activity?.SetTag("query.result", "not_found");
                throw new NotFoundException($"Image {id} not found");
            }

            activity?.SetTag("query.result", "found");
            return MapToResponse(image);
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }
}
```

### Running Tests

**NextGen.Identity:**

```powershell
cd NextGen.Identity.Tests
dotnet test --logger "console;verbosity=detailed"
```

**Python Feature Extraction:**

```powershell
cd DeepLens.FeatureExtractionService
pytest --cov=app --cov-report=html
# Open htmlcov/index.html
```

---

## Observability

### Access Monitoring Tools

| Tool       | URL                    | Credentials        | Purpose                    |
| ---------- | ---------------------- | ------------------ | -------------------------- |
| Grafana    | http://localhost:3000  | admin/DeepLens123! | Dashboards & visualization |
| Prometheus | http://localhost:9090  | -                  | Metrics queries            |
| Jaeger     | http://localhost:16686 | -                  | Distributed traces         |
| Kafka UI   | http://localhost:8080  | -                  | Kafka monitoring           |

### Example Grafana Queries

**Login Attempts (last hour):**

```promql
sum(rate(identity_login_attempts_total[5m])) by (result)
```

**Database Query Duration (p95):**

```promql
histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))
```

**Active Tenants:**

```promql
count(tenant_status{status="Active"})
```

### Viewing Traces in Jaeger

1. Open http://localhost:16686
2. Service: Select "NextGen.Identity"
3. Operation: Select "user.authenticate"
4. Find Traces: Click search
5. View trace: Click on any trace to see full span tree

Example trace shows:

- Total duration: 145ms
- Spans: 5 (1 service + 4 database operations)
- Tags: user.id, tenant.id, auth.result=success

---

## Additional Documentation

- **Infrastructure:** [../infrastructure/README.md](../infrastructure/README.md)
- **Tenant Management:** [../infrastructure/README-TENANT-MANAGEMENT.md](../infrastructure/README-TENANT-MANAGEMENT.md)
- **Project Plan:** [../PROJECT_PLAN.md](../PROJECT_PLAN.md)
- **OpenTelemetry Status:** [../OPENTELEMETRY_STATUS.md](../OPENTELEMETRY_STATUS.md)
- **Architecture Decisions:** [../docs/adr/](../docs/adr/)
- **Python Service:**
  - [DeepLens.FeatureExtractionService/README.md](DeepLens.FeatureExtractionService/README.md)
  - [DeepLens.FeatureExtractionService/QUICKSTART.md](DeepLens.FeatureExtractionService/QUICKSTART.md)
  - [DeepLens.FeatureExtractionService/TESTING.md](DeepLens.FeatureExtractionService/TESTING.md)

---

## Development Status

### Completed

- [x] Infrastructure provisioning (PowerShell + Docker Compose)
- [x] NextGen.Identity domain entities & DTOs
- [x] Dapper repositories with OpenTelemetry (User, Tenant, RefreshToken)
- [x] Authentication service (login, register, token refresh)
- [x] Tenant service (create, query, update)
- [x] Database schema & migrations (PostgreSQL)
- [x] OpenTelemetry complete instrumentation (data + service layers)
- [x] Python feature extraction service (FastAPI + PyTorch)
- [x] Feature extraction testing (93% coverage)

### In Progress

- [ ] NextGen.Identity API controllers
- [ ] JWT token service implementation
- [ ] Tenant provisioning service (PowerShell integration)
- [ ] API Program.cs OpenTelemetry configuration

### Pending

- [ ] DeepLens application use cases
- [ ] Kafka event handlers in workers
- [ ] API Gateway (Yarp/Ocelot)
- [ ] Rate limiting per tenant
- [ ] Grafana business dashboards
- [ ] End-to-end integration tests
- [ ] API documentation (Swagger)

---

## Contributing

**Guidelines:**

1. Follow Clean Architecture principles (Domain Application Infrastructure API)
2. Use Dapper for data access (no EF Core per project requirements)
3. Add OpenTelemetry instrumentation to ALL new code
4. Write unit tests for business logic (target: 80%+ coverage)
5. Update this README when adding projects/features
6. Follow semantic versioning for releases

**Code Style:**

- C#: Follow Microsoft coding conventions
- Python: PEP 8 with Black formatter
- SQL: Snake_case for tables/columns

---

## Notes

**Key Decisions:**

- **Data Access:** Pure Dapper with raw SQL (no EF Core)
- **Multi-Tenancy:** Isolated infrastructure per tenant (Qdrant, MinIO, database)
- **Observability:** OpenTelemetry on all layers (traces, metrics, logs)
- **Event-Driven:** Kafka for async processing pipeline

**Tenant Tiers:**

- **Free:** 1GB storage, 5 users, 1K API calls/day
- **Professional:** 50GB storage, 50 users, 50K API calls/day
- **Enterprise:** 500GB storage, 1000 users, 1M API calls/day

**Infrastructure Requirements:**

- PostgreSQL 16+ (shared across tenants)
- Redis 7+ (shared cache)
- Kafka 3.5+ (event streaming)
- Qdrant 1.7+ (per-tenant vector database)
- MinIO (per-tenant object storage buckets)

---

**Last Updated:** December 17, 2025  
**Version:** 0.1.0-alpha  
**Maintainers:** DeepLens Development Team
