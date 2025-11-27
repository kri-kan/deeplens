# DeepLens .NET Solution

This directory contains the complete .NET solution for the DeepLens image similarity search engine.

## Solution Structure

```
src/
├── DeepLens.sln                          # Main solution file
│
├── Core Layer (Domain-Driven Design)
│   ├── DeepLens.Domain/                  # Domain entities, value objects, aggregates
│   ├── DeepLens.Application/             # Business logic, use cases, application services
│   └── DeepLens.Contracts/               # DTOs, API contracts, shared models
│
├── Infrastructure Layer
│   └── DeepLens.Infrastructure/          # Data access, caching, messaging, storage implementations
│
├── API / Service Layer
│   ├── DeepLens.ApiGateway/              # API Gateway
│   │                                     # - Authentication & Authorization
│   │                                     # - Request routing
│   │                                     # - Global rate limiting
│   │                                     # - Circuit breakers
│   │
│   ├── DeepLens.SearchApi/               # Search & Ingestion API
│   │                                     # - Image upload/ingestion
│   │                                     # - Image similarity search
│   │                                     # - Metadata queries
│   │                                     # - Duplicate detection
│   │
│   ├── DeepLens.AdminApi/                # Administrative API
│   │                                     # - Tenant management
│   │                                     # - Rate limit configuration
│   │                                     # - System configuration
│   │                                     # - User/role management
│   │
│   └── DeepLens.OrchestrationService/    # Background Service
│                                         # - Kafka message processing
│                                         # - Workflow orchestration
│                                         # - Background job scheduling
│
└── Shared Libraries
    ├── DeepLens.Shared.Telemetry/        # OpenTelemetry, logging, metrics
    ├── DeepLens.Shared.Messaging/        # Kafka producers/consumers
    └── DeepLens.Shared.Common/           # Utilities, extensions, helpers
```

## Project Dependencies

### Dependency Flow (Clean Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                     │
│  (ApiGateway, SearchApi, AdminApi, OrchestrationService)    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│              (DeepLens.Application)                         │
│         - Use cases, business logic                         │
│         - Interfaces for infrastructure                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                           │
│                (DeepLens.Domain)                            │
│         - Entities, value objects                           │
│         - Domain events, aggregates                         │
│         - No dependencies!                                  │
└─────────────────────────────────────────────────────────────┘
                         ▲
                         │
┌────────────────────────┴────────────────────────────────────┐
│                  Infrastructure Layer                       │
│            (DeepLens.Infrastructure)                        │
│         - Database access (PostgreSQL, Redis)               │
│         - Message queue (Kafka)                             │
│         - Storage (Azure Blob, S3, etc.)                    │
│         - External services                                 │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Rules

1. **Domain** has NO dependencies on other projects
2. **Application** depends ONLY on Domain
3. **Infrastructure** depends on Domain and Application (implements interfaces)
4. **API/Services** depend on Application, Infrastructure, and Shared libraries
5. **Shared libraries** have minimal dependencies

## Building the Solution

```powershell
# Restore all dependencies
dotnet restore

# Build entire solution
dotnet build

# Build specific project
dotnet build DeepLens.SearchApi/DeepLens.SearchApi/DeepLens.SearchApi.csproj

# Run tests (when added)
dotnet test

# Clean solution
dotnet clean
```

## Running Services

### Development Mode

```powershell
# Run API Gateway
cd DeepLens.ApiGateway
dotnet run

# Run Search API
cd DeepLens.SearchApi/DeepLens.SearchApi
dotnet run

# Run Admin API
cd DeepLens.AdminApi
dotnet run

# Run Orchestration Service
cd DeepLens.OrchestrationService
dotnet run
```

### Watch Mode (auto-reload on changes)

```powershell
dotnet watch run --project DeepLens.SearchApi/DeepLens.SearchApi/DeepLens.SearchApi.csproj
```

## Project Responsibilities

### Core Layer

#### DeepLens.Domain

- **Purpose:** Core business entities and domain logic
- **Contains:**
  - `Entities/`: TenantRateLimitConfig, Image, SearchResult, etc.
  - `ValueObjects/`: ImageMetadata, SimilarityScore, etc.
  - `Enums/`: TierType, ImageStatus, etc.
  - `Exceptions/`: Domain-specific exceptions
- **Dependencies:** None

#### DeepLens.Application

- **Purpose:** Business logic and use cases
- **Contains:**
  - `Interfaces/`: ITenantRateLimitService, IImageSearchService, etc.
  - `Services/`: Application services (orchestration)
  - `UseCases/`: Specific use case implementations
  - `DTOs/`: Data transfer objects for internal use
- **Dependencies:** Domain

#### DeepLens.Contracts

- **Purpose:** API contracts and shared models
- **Contains:**
  - `Requests/`: API request models
  - `Responses/`: API response models
  - `Events/`: Kafka message contracts
- **Dependencies:** Minimal

### Infrastructure Layer

#### DeepLens.Infrastructure

- **Purpose:** External concerns and infrastructure implementations
- **Description:** This layer implements all interfaces defined in the Application layer and handles communication with external systems. It depends on both Domain and Application layers, but the reverse is NOT true - keeping business logic independent of infrastructure concerns.
- **Contains:**
  - `Data/`: EF Core DbContext, repository implementations (hybrid EF Core + Dapper)
  - `Caching/`: Redis client implementations for distributed caching and rate limiting
  - `Messaging/`: Kafka producers and consumers for event streaming
  - `Storage/`: Blob storage implementations (Azure Blob, S3, or local file system)
  - `Services/`: Concrete implementations of infrastructure services (e.g., `TenantRateLimitService`)
- **Dependencies:** Domain, Application, External packages (EF Core, Dapper, StackExchange.Redis, Confluent.Kafka)
- **Data Access:** Hybrid approach - EF Core for domain entities (with migrations), Dapper for high-performance queries (see [ADR-006](../ARCHITECTURE_DECISIONS.md#adr-006-data-access-strategy-ef-core-vs-adonet))

### API / Service Layer

#### DeepLens.ApiGateway

- **Port:** 5000 (HTTP), 5001 (HTTPS)
- **Purpose:** Single entry point for all requests
- **Responsibilities:**
  - Authentication & JWT validation
  - Request routing to backend services
  - Global rate limiting
  - Circuit breakers
  - CORS handling

#### DeepLens.SearchApi

- **Port:** 5010 (HTTP), 5011 (HTTPS)
- **Purpose:** Image operations (upload + search)
- **Endpoints:**
  - `POST /api/images/upload` - Upload image
  - `POST /api/search/similar` - Find similar images
  - `POST /api/search/bulk` - Bulk similarity search
  - `GET /api/images/{id}` - Get image metadata
  - `DELETE /api/images/{id}` - Delete image

#### DeepLens.AdminApi

- **Port:** 5020 (HTTP), 5021 (HTTPS)
- **Purpose:** System administration
- **Endpoints:**
  - `POST /api/admin/tenants` - Create tenant
  - `PUT /api/admin/tenants/{id}/rate-limits` - Update rate limits
  - `PUT /api/admin/tenants/{id}/tier` - Change pricing tier
  - `POST /api/admin/tenants/{id}/suspend` - Suspend tenant
  - `GET /api/admin/system/health` - System health

#### DeepLens.OrchestrationService

- **Type:** Background Worker Service (not an API)
- **Purpose:** Asynchronous processing and workflow orchestration
- **Description:** Runs continuously as a background service to handle operations that shouldn't block API responses. This keeps APIs fast and responsive while complex processing happens asynchronously.
- **Responsibilities:**
  - **Kafka Message Processing**: Consumes events from Kafka topics (e.g., `ImageUploadedEvent`, `SearchRequestedEvent`)
  - **Workflow Orchestration**: Coordinates multi-step workflows across services
  - **Background Jobs**: Scheduled tasks like cleanup, reporting, or batch processing
  - **Long-Running Operations**: Image embedding generation, bulk processing, etc.
- **Example Flow:**
  1. User uploads image via SearchApi
  2. SearchApi publishes `ImageUploadedEvent` to Kafka and returns immediately (fast response)
  3. OrchestrationService consumes the event
  4. Orchestrates: generate embeddings → store in Qdrant → update metadata in PostgreSQL → publish `ImageProcessedEvent`

### Shared Libraries

#### DeepLens.Shared.Telemetry

- OpenTelemetry configuration
- Structured logging
- Metrics and tracing
- Health checks

#### DeepLens.Shared.Messaging

- Kafka producer/consumer abstractions
- Message serialization
- Retry policies
- Dead letter queue handling

#### DeepLens.Shared.Common

- Extension methods
- Utility classes
- Constants
- Helper functions

## Configuration

### Common Configuration Files

Each project has:

- `appsettings.json` - Default configuration
- `appsettings.Development.json` - Development overrides
- `appsettings.Production.json` - Production overrides

### Environment Variables

```bash
# Connection Strings
DEEPLENS_POSTGRES_CONNECTION="Host=localhost;Database=deeplens;..."
DEEPLENS_REDIS_CONNECTION="localhost:6379"

# Kafka
DEEPLENS_KAFKA_BOOTSTRAP_SERVERS="localhost:9092"

# Auth
DEEPLENS_AUTH_AUTHORITY="https://auth.deeplens.com"
DEEPLENS_AUTH_AUDIENCE="deeplens-api"

# Storage
DEEPLENS_STORAGE_TYPE="AzureBlob|S3|MinIO|FileSystem"
DEEPLENS_STORAGE_CONNECTION="<connection-string>"
```

## Adding New Projects

```powershell
# Add new class library
dotnet new classlib -n DeepLens.NewProject -f net9.0

# Add to solution
dotnet sln add DeepLens.NewProject/DeepLens.NewProject.csproj

# Add project reference
dotnet add DeepLens.SearchApi/DeepLens.SearchApi/DeepLens.SearchApi.csproj reference DeepLens.NewProject/DeepLens.NewProject.csproj
```

## Testing Strategy

### Unit Tests

- `DeepLens.Domain.Tests` - Domain logic tests
- `DeepLens.Application.Tests` - Business logic tests
- `DeepLens.Infrastructure.Tests` - Infrastructure tests

### Integration Tests

- `DeepLens.SearchApi.IntegrationTests` - API integration tests
- `DeepLens.AdminApi.IntegrationTests` - Admin API integration tests

### E2E Tests

- `DeepLens.E2E.Tests` - End-to-end scenarios

## Docker Support

Each API project will include a `Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["DeepLens.SearchApi/DeepLens.SearchApi.csproj", "DeepLens.SearchApi/"]
RUN dotnet restore
COPY . .
WORKDIR "/src/DeepLens.SearchApi"
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "DeepLens.SearchApi.dll"]
```

## Architecture Decisions

See [ARCHITECTURE_DECISIONS.md](../ARCHITECTURE_DECISIONS.md) for detailed architectural decisions including:

- ADR-001: .NET Solution Structure
- ADR-002: API Service Separation
- ADR-003: Image Ingestion Placement
- ADR-004: Rate Limiting Strategy
- ADR-005: Dynamic Tenant Configuration

## Related Documentation

- [PROJECT_PLAN.md](../PROJECT_PLAN.md) - Overall project architecture
- [ARCHITECTURE_DECISIONS.md](../ARCHITECTURE_DECISIONS.md) - ADR records
- [code_examples.md](../code_examples.md) - Code samples
- [docs/RATE_LIMITING_IMPLEMENTATION.md](../docs/RATE_LIMITING_IMPLEMENTATION.md) - Rate limiting details

## Next Steps

1. ✅ Solution structure created
2. ⏳ Add project references between layers
3. ⏳ Add NuGet packages (Entity Framework, Redis, Kafka, etc.)
4. ⏳ Implement domain entities
5. ⏳ Create repository interfaces and implementations
6. ⏳ Add authentication middleware
7. ⏳ Implement rate limiting
8. ⏳ Add Docker files
9. ⏳ Set up CI/CD pipelines

## Support

For questions or issues:

- See [PROJECT_PLAN.md](../PROJECT_PLAN.md) for overall architecture
- Check [ARCHITECTURE_DECISIONS.md](../ARCHITECTURE_DECISIONS.md) for design decisions
- Review [code_examples.md](../code_examples.md) for implementation examples
