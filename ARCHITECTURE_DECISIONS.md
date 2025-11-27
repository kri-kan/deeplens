# DeepLens - Architecture Decisions Record (ADR)

This document captures key architectural decisions made for the DeepLens image similarity search engine project.

---

## Table of Contents

- [ADR-001: .NET Solution Structure](#adr-001-net-solution-structure)
- [ADR-002: API Service Separation](#adr-002-api-service-separation)
- [ADR-003: Image Ingestion Placement](#adr-003-image-ingestion-placement)
- [ADR-004: Rate Limiting Strategy](#adr-004-rate-limiting-strategy)
- [ADR-005: Dynamic Tenant Configuration](#adr-005-dynamic-tenant-configuration)
- [ADR-006: Data Access Strategy (EF Core vs ADO.NET)](#adr-006-data-access-strategy-ef-core-vs-adonet)

---

## ADR-001: .NET Solution Structure

**Date:** 2025-11-27  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

We need to establish a clear .NET solution structure for the DeepLens microservices architecture that supports:

- Clean architecture principles (Domain, Application, Infrastructure)
- Microservices separation
- Shared libraries for cross-cutting concerns
- Scalability and maintainability

### Decision

We will create the following .NET project structure:

```
src/
├── DeepLens.sln                          # Main solution file
├── Core Layer
│   ├── DeepLens.Domain/                  # Domain entities, value objects, enums
│   ├── DeepLens.Application/             # Business logic, use cases, interfaces
│   └── DeepLens.Contracts/               # DTOs, API contracts, shared models
├── Infrastructure Layer
│   └── DeepLens.Infrastructure/          # Data access, caching, messaging, storage
├── API/Service Layer
│   ├── DeepLens.ApiGateway/              # API Gateway (routing, auth, rate limiting)
│   ├── DeepLens.SearchApi/               # Search & Ingestion API
│   ├── DeepLens.AdminApi/                # Administrative API
│   └── DeepLens.OrchestrationService/    # Background jobs, workflow management
└── Shared Libraries
    ├── DeepLens.Shared.Telemetry/        # OpenTelemetry, logging, metrics
    ├── DeepLens.Shared.Messaging/        # Kafka producers/consumers
    └── DeepLens.Shared.Common/           # Utilities, extensions, helpers
```

### Consequences

**Positive:**

- Clear separation of concerns following Clean Architecture
- Easy to test individual layers
- Microservices can be deployed independently
- Shared libraries reduce code duplication
- Follows .NET best practices

**Negative:**

- More projects to manage
- Requires careful dependency management
- Initial setup complexity

**Mitigation:**

- Use solution folders to organize projects
- Establish clear dependency rules (Domain has no dependencies, Application depends only on Domain, etc.)
- Document project responsibilities clearly

---

## ADR-002: API Service Separation

**Date:** 2025-11-27  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

The architecture diagram shows separate API services (Search API, Admin API, Upload API). We need to decide:

1. Should we keep them as separate services?
2. How do we balance separation vs. simplicity?

### Decision

We will implement **THREE main API services**:

1. **DeepLens.ApiGateway**

   - Single entry point for all external requests
   - Authentication & Authorization (OAuth 2.0 / OpenID Connect)
   - Request routing to backend services
   - Global rate limiting per tenant
   - Circuit breakers and resilience patterns
   - Telemetry aggregation

2. **DeepLens.SearchApi** (combines Search + Ingestion)

   - Image upload and ingestion
   - Image similarity search
   - Metadata queries
   - Duplicate detection queries
   - **Rationale:** Upload and search are related user-facing operations

3. **DeepLens.AdminApi**

   - Tenant provisioning and management
   - Rate limit configuration
   - System configuration
   - Storage management
   - Monitoring and health endpoints
   - User/role management

4. **DeepLens.OrchestrationService** (Background Service)
   - Kafka message processing
   - Workflow orchestration
   - Background job scheduling
   - Batch operations

### Alternatives Considered

**Option A: Four separate services (Gateway, Search, Upload, Admin)**

- Rejected: Too much overhead for MVP
- Upload and Search are closely related operations
- Adds deployment complexity without clear benefits

**Option B: Two services (Gateway + Unified API)**

- Rejected: Violates separation of concerns
- Admin and Search have different scaling needs
- Security boundaries become blurred

### Consequences

**Positive:**

- Clear separation between user operations (Search API) and admin operations (Admin API)
- Search API can scale horizontally based on query load
- Admin API runs with fewer instances (low traffic)
- Independent deployment and versioning
- Better security isolation

**Negative:**

- Need to manage 4 deployments (Gateway + 3 services)
- Increased operational complexity
- Service discovery and inter-service communication

---

## ADR-003: Image Ingestion Placement

**Date:** 2025-11-27  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

Image ingestion (upload) is a core operation. We need to decide which API service should handle it:

- Search API
- Admin API
- Separate Upload API

### Decision

**Image ingestion will be part of SearchApi**

### Rationale

1. **User-Facing Operation**: Image upload is a user operation, not an admin operation
2. **Related Functionality**: Users who upload images typically want to search them
3. **Workflow Continuity**: Upload → Process → Search is a natural user flow
4. **Simpler Architecture**: Reduces the number of services (3 instead of 4)
5. **Admin API Focus**: Admin API should focus on system management, not content operations

### Workflow

```
User → API Gateway → SearchApi.Upload()
                        ↓
                   Publish to Kafka (images.uploaded)
                        ↓
                   Background Processing
                        ↓
                   Vector Indexing
                        ↓
User ← API Gateway ← SearchApi.Search()
```

### Consequences

**Positive:**

- Logical grouping of related operations
- Simpler for API consumers (one service for image operations)
- Reduced service mesh complexity

**Negative:**

- Search API has mixed responsibilities (read + write)
- Upload operations are I/O intensive, may affect search latency

**Mitigation:**

- Use separate scaling groups if needed
- Implement proper async patterns for uploads
- Use Kafka for async processing (upload returns immediately)

---

## ADR-004: Rate Limiting Strategy

**Date:** 2025-11-27  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

We need to implement rate limiting to:

- Prevent abuse and DDoS attacks
- Ensure fair resource allocation across tenants
- Support different pricing tiers
- Protect backend services from overload

### Decision

**Multi-Level Rate Limiting Strategy**

#### Level 1: API Gateway (Service-Level Limits)

Rate limits applied **before** requests reach backend services:

```csharp
// Global tenant-based rate limiting
services.AddRateLimiter(options =>
{
    options.AddPolicy("PerTenant", context =>
    {
        var tenantId = context.User.FindFirst("tenant_id")?.Value;
        return RateLimitPartition.GetFixedWindowLimiter(
            tenantId ?? "anonymous",
            _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 1000  // Overall tenant limit
            });
    });
});
```

#### Level 2: Individual Services (Endpoint-Level Limits)

Each service applies endpoint-specific limits:

```csharp
// In SearchApi
[RateLimit("ImageUpload")]  // 50 uploads/min
[HttpPost("upload")]
public async Task<IActionResult> UploadImage() { }

[RateLimit("ImageSearch")]  // 1000 searches/min
[HttpPost("search")]
public async Task<IActionResult> SearchSimilar() { }

[RateLimit("BulkSearch")]  // 10 bulk operations/min
[HttpPost("search/bulk")]
public async Task<IActionResult> BulkSearch() { }
```

### Rate Limit Tiers

| Tier       | Requests/Min | Searches/Min | Uploads/Min | Bulk Ops/Min |
| ---------- | ------------ | ------------ | ----------- | ------------ |
| Free       | 100          | 50           | 5           | 1            |
| Basic      | 1,000        | 500          | 50          | 10           |
| Pro        | 5,000        | 2,500        | 200         | 50           |
| Enterprise | 50,000       | 25,000       | 1,000       | 200          |

### Consequences

**Positive:**

- Defense in depth (multiple layers)
- Flexibility to tune limits per endpoint
- Gateway protects all backend services
- Expensive operations have lower limits

**Negative:**

- More complex configuration
- Need to coordinate limits across layers
- Monitoring multiple rate limit systems

**Mitigation:**

- Use consistent naming conventions
- Centralize configuration
- Monitor rate limit hits in observability stack

---

## ADR-005: Dynamic Tenant Configuration

**Date:** 2025-11-27  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

We need to support:

- Different rate limits per tenant
- Multiple pricing tiers (free, basic, pro, enterprise)
- Runtime configuration changes without service restart
- Tenant upgrades/downgrades
- Custom limits for specific tenants

### Decision

**Database-Backed Dynamic Rate Limiting with Redis Caching**

#### Architecture

```
Request → Get Tenant ID → Check Redis Cache → [Cache Hit]  → Apply Limits
                                ↓
                          [Cache Miss]
                                ↓
                        Query PostgreSQL
                                ↓
                          Cache in Redis (5min TTL)
                                ↓
                          Apply Limits
```

#### Components

1. **PostgreSQL Tables**

   ```sql
   -- Tenant-specific limits
   CREATE TABLE tenant_rate_limits (
       tenant_id UUID PRIMARY KEY,
       tier VARCHAR(50) DEFAULT 'free',
       requests_per_minute INT DEFAULT 1000,
       search_requests_per_minute INT DEFAULT 500,
       upload_requests_per_minute INT DEFAULT 50,
       bulk_operations_per_minute INT DEFAULT 10,
       is_unlimited BOOLEAN DEFAULT FALSE,
       is_suspended BOOLEAN DEFAULT FALSE,
       updated_at TIMESTAMP DEFAULT NOW()
   );

   -- Tier configurations
   CREATE TABLE rate_limit_tiers (
       tier_name VARCHAR(50) PRIMARY KEY,
       requests_per_minute INT,
       search_requests_per_minute INT,
       upload_requests_per_minute INT,
       max_images_per_day INT,
       max_storage_gb DECIMAL
   );
   ```

2. **Redis Cache**

   - Cache key: `ratelimit:tenant:{tenantId}`
   - TTL: 5 minutes
   - Fast lookup (sub-millisecond)
   - Distributed rate limit counters

3. **Service Layer**

   ```csharp
   public interface ITenantRateLimitService
   {
       Task<TenantRateLimitConfig> GetTenantLimitsAsync(string tenantId);
       Task UpdateTenantLimitsAsync(string tenantId, TenantRateLimitConfig config);
   }
   ```

4. **Admin API Endpoints**
   ```
   PUT /api/tenants/{tenantId}/rate-limits  # Update custom limits
   PUT /api/tenants/{tenantId}/tier         # Change pricing tier
   GET /api/tenants/{tenantId}/usage        # View current usage
   ```

### Configuration Flow

1. **Tenant Created** → Assigned default tier limits
2. **Request Received** → Load limits from cache/DB
3. **Admin Updates Limits** → Update DB + Clear cache
4. **Next Request** → Loads new limits (within 5 minutes)
5. **Tier Upgrade** → All limits automatically updated

### Consequences

**Positive:**

- No service restart required for limit changes
- Supports complex pricing models
- Per-tenant customization
- Fast lookup with Redis caching
- Audit trail in database

**Negative:**

- Additional database queries
- Cache invalidation complexity
- Need to sync across multiple Gateway instances

**Mitigation:**

- Redis caching reduces DB load (cache hit rate >95%)
- Use distributed cache for consistency
- Monitor cache hit rates
- Implement cache warming strategies

### Implementation Notes

See [code_examples.md](code_examples.md) for complete code samples including:

- Database schema
- Service implementation
- Dynamic rate limiter
- Admin API endpoints
- Redis integration

---

---

## ADR-006: Data Access Strategy (EF Core vs ADO.NET)

**Date:** 2025-11-27  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

We need to decide on data access patterns for PostgreSQL operations. Different types of operations have different performance and maintainability requirements:

- **Domain entities** require ORM capabilities (change tracking, relationships, migrations)
- **High-frequency operations** (rate limiting, search metadata) need maximum performance
- **Analytics queries** need fine-tuned SQL control
- **Developer productivity** and maintainability are important for long-term success

### Decision

**Hybrid Approach: EF Core for Domain, Dapper for Performance-Critical Paths**

#### Use Entity Framework Core for:

1. **Domain Entities and Aggregates**

   - Tenant management, user management, role assignments
   - Rate limit configurations and tier definitions
   - Complex object graphs with relationships
   - Change tracking for audit logs
   - Schema migrations

2. **Admin Operations** (AdminApi)
   - CRUD operations on tenants, users, configurations
   - Less frequent operations where maintainability > raw performance
   - Benefit from EF Core's productivity features

#### Use ADO.NET (Dapper) for:

1. **High-Performance Queries** (SearchApi)

   - Image metadata queries with complex filters
   - Bulk operations (batch inserts, updates)
   - Search result aggregations
   - Hot path operations where every millisecond counts

2. **Rate Limiting Queries** (ApiGateway, Infrastructure)

   - `TenantRateLimitService` - ultra-fast reads from cache + DB
   - Usage statistics updates (frequent writes, high throughput)
   - Redis cache misses need sub-millisecond DB queries

3. **Analytics and Reporting**
   - Complex joins, aggregations, window functions
   - Read-only reporting where SQL optimization is critical
   - Custom queries that don't map well to EF Core

### Implementation Structure

```
DeepLens.Infrastructure/
├── Data/
│   ├── DeepLensDbContext.cs              # EF Core DbContext
│   ├── Migrations/                        # EF Core migrations
│   ├── Repositories/
│   │   ├── TenantRepository.cs           # EF Core (domain entity)
│   │   ├── UserRepository.cs             # EF Core (domain entity)
│   │   ├── RateLimitConfigRepository.cs  # EF Core (admin operations)
│   │   ├── ImageMetadataRepository.cs    # Dapper (high-performance reads)
│   │   ├── RateLimitQueryRepository.cs   # Dapper (hot path queries)
│   │   └── UsageStatisticsRepository.cs  # Dapper (high-frequency writes)
│   └── Configuration/
│       └── EntityConfigurations/          # EF Core entity mappings
```

### Rationale

- **EF Core provides:**

  - Migrations for schema evolution
  - LINQ for type-safe queries
  - Change tracking for transactional operations
  - Productivity for standard CRUD
  - Object graph loading with includes

- **Dapper provides:**
  - ~50-100x faster than EF Core for simple queries
  - Zero overhead object mapping
  - Full SQL control for complex queries
  - Better for high-throughput scenarios

### Consequences

**Positive:**

- Best of both worlds: productivity + performance
- EF Core migrations manage schema for entire database
- Dapper used only where performance is proven critical
- Clear separation: domain operations vs high-frequency queries

**Negative:**

- Two data access patterns to maintain
- Developers need to know both EF Core and Dapper
- No change tracking in Dapper repositories
- Must manually keep Dapper queries in sync with schema

**Mitigation:**

- Document clear guidelines on when to use each
- Use EF Core by default, switch to Dapper only after profiling
- Share entity classes between EF Core and Dapper
- Use EF Core migrations to generate schema for both patterns
- Code reviews enforce appropriate technology choice

### Performance Guidelines

**Use Dapper when:**

- Query executes >10,000 times per minute
- Query latency must be <5ms at p99
- Bulk operations (>1000 records)
- Profiling shows EF Core as bottleneck

**Use EF Core when:**

- Standard CRUD operations
- Complex entity relationships
- Developer productivity is priority
- Query frequency <1,000 per minute

### Example Comparison

```csharp
// EF Core - Good for domain operations
public async Task<Tenant> GetTenantWithUsersAsync(Guid tenantId)
{
    return await _context.Tenants
        .Include(t => t.Users)
        .Include(t => t.RateLimitConfig)
        .FirstOrDefaultAsync(t => t.Id == tenantId);
}

// Dapper - Good for high-frequency queries
public async Task<RateLimitInfo> GetRateLimitInfoAsync(Guid tenantId)
{
    const string sql = @"
        SELECT request_limit, time_window_seconds, tier_name
        FROM tenant_rate_limits
        WHERE tenant_id = @TenantId AND is_active = true";

    return await _connection.QueryFirstOrDefaultAsync<RateLimitInfo>(
        sql, new { TenantId = tenantId });
}
```

---

## Future Decisions

The following architectural decisions are pending:

- **ADR-007:** Vector database selection (Qdrant vs alternatives)
- **ADR-008:** Storage strategy (BYOS implementation details)
- **ADR-009:** Identity service (Duende vs Keycloak vs Auth0)
- **ADR-010:** AI model selection and deployment
- **ADR-011:** Kubernetes vs Docker Swarm for orchestration

---

## Revision History

| Date       | Version | Changes                       | Author            |
| ---------- | ------- | ----------------------------- | ----------------- |
| 2025-11-27 | 1.0     | Initial ADR creation          | Architecture Team |
| 2025-11-27 | 1.0     | Added ADR-001 through ADR-005 | Architecture Team |
| 2025-11-27 | 1.1     | Added ADR-006 (Data Access)   | Architecture Team |
