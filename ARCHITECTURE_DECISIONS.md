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
- [ADR-007: BYOS (Bring Your Own Storage) with Azure AD-Style RBAC](#adr-007-byos-bring-your-own-storage-with-azure-ad-style-rbac)

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

## ADR-007: BYOS (Bring Your Own Storage) with Azure AD-Style RBAC

**Date:** 2025-11-27  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

DeepLens needs to support enterprise customers who want to:

- Store images in their own cloud storage (Azure Blob, S3, MinIO, etc.)
- Maintain complete data sovereignty and control
- Support multiple storage locations per tenant with different purposes
- Implement fine-grained access control similar to Azure AD RBAC
- Tag storages with flexible metadata (department, tier, environment, etc.)
- Control which users/groups can access which storage locations

### Decision

**Centralized Identity & Permission Management via NextGen.Identity + Flexible Tag-Based Storage**

#### Identity Management Strategy

**Centralized Approach: NextGen.Identity as Identity Provider (IdP)**

NextGen.Identity serves as the **centralized identity and permission service** for all applications in the ecosystem (DeepLens, future applications, etc.).

1. **NextGen.Identity Responsibilities**

   - User authentication (login, MFA, password management)
   - JWT token issuance with claims (including application-specific permissions)
   - Centralized user directory (all tenants, all applications)
   - Group management (organizational groups + application-specific groups)
   - Role definitions (application-scoped roles)
   - Permission assignments (users/groups → roles → applications/resources)
   - SSO integration with external providers (Azure AD, Okta, Google)
   - Audit trail for all identity and permission changes

2. **Application Responsibilities (DeepLens SearchApi, AdminApi, etc.)**

   - Validate JWT tokens (issued by NextGen.Identity)
   - Extract user claims (sub, email, tenant_id, permissions, groups)
   - Enforce permissions for business operations
   - Application-specific business logic
   - Application resource metadata (storage configs, images, etc.)

3. **Token Flow**
   ```
   User → NextGen.Identity (login)
        → JWT Token with claims:
           {
             "sub": "user-id",
             "tenant_id": "tenant-id",
             "email": "user@example.com",
             "groups": ["engineering", "project-alpha"],
             "permissions": {
               "deeplens": ["storage:eng-prod:write", "storage:*:read"],
               "app2": ["project:create", "project:read"]
             }
           }
        → Application validates token
        → Extract permissions from claims
        → Allow/Deny operation
   ```

**Why Centralized?**

- Single source of truth for all identity and permissions
- Users managed once, access granted to multiple applications
- Consistent permission model across all applications
- Centralized audit and compliance reporting
- Simplified onboarding for new applications
- No duplication of user/group data across apps
- Token contains all necessary claims (fewer DB lookups)

#### Multi-Application Permission Model

**Application Registration in NextGen.Identity:**

Each application registers with NextGen.Identity and defines:

- Application ID (e.g., "deeplens", "analytics-app", "reporting-app")
- Resource types (e.g., "storage", "image", "project", "report")
- Actions (e.g., "read", "write", "delete", "manageAccess")
- Role definitions (e.g., "StorageReader", "StorageContributor", "ProjectOwner")

**Permission Format:**

```
{application}:{resource}:{action}
or
{application}:{resource}:{resource-id}:{action}

Examples:
- deeplens:storage:read                    (all storages)
- deeplens:storage:eng-prod:write          (specific storage)
- deeplens:storage:*:read                  (wildcard)
- deeplens:image:delete
- analytics-app:report:create
- reporting-app:dashboard:view
```

#### Storage Configuration Model

1. **Flexible Storage Configurations**

   - Tenants can configure unlimited storage locations
   - Each storage has unique name, description, and flexible metadata tags
   - One storage marked as default when none specified
   - Metadata examples: `{"department": "engineering", "tier": "hot", "environment": "production"}`

2. **Storage Selection Methods**

   - By name: `storageName: "eng-prod-hot"`
   - By metadata: `{"department": "engineering", "tier": "hot"}`
   - Default: Use tenant's default storage

3. **Provider Support**
   - Azure Blob Storage
   - AWS S3
   - Google Cloud Storage
   - MinIO (S3-compatible)
   - Local/Network File System

#### RBAC Model (Azure AD Pattern)

1. **Identity Components**

   - **Users**: Individual people with login credentials
   - **Groups**: Collections of users and/or other groups (departments, teams, projects)
   - **Nested Groups**: Groups can contain groups (hierarchical inheritance)

2. **Permission Model**

   - **Role Definitions**: Built-in roles (StorageReader, StorageContributor, StorageOwner)
   - **Role Assignments**: Assign roles to users or groups for specific storage
   - **Permission Inheritance**: Users inherit permissions from all groups they belong to
   - **Most Permissive Wins**: If any source grants access, access is allowed

3. **Built-in Roles**

   ```
   StorageReader:
     - storage.read, storage.list
     - storage.blob.read

   StorageContributor:
     - storage.read, storage.write, storage.list
     - storage.blob.read, storage.blob.write

   StorageOwner:
     - storage.read, storage.write, storage.delete, storage.list, storage.manageAccess
     - storage.blob.read, storage.blob.write, storage.blob.delete
   ```

4. **Permission Resolution Flow**
   ```
   Request to Application (e.g., DeepLens SearchApi)
          → Validate JWT token (issued by NextGen.Identity)
          → Extract permissions from token claims
          → Check if required permission exists
          → Allow/Deny operation
   ```

### Database Schema

#### NextGen.Identity Database Schema

```sql
-- Tenants (organizations)
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY,
    tenant_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Applications registered with NextGen.Identity
CREATE TABLE applications (
    application_id UUID PRIMARY KEY,
    app_code VARCHAR(50) UNIQUE NOT NULL,  -- 'deeplens', 'analytics-app'
    app_name VARCHAR(100) NOT NULL,
    description TEXT,
    callback_urls TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users (centrally managed)
CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    display_name VARCHAR(255),
    password_hash VARCHAR(500),  -- If using local auth

    -- External SSO integration (optional)
    external_id VARCHAR(255),  -- Azure AD object_id, Google user_id
    identity_provider VARCHAR(50),  -- 'local', 'azure_ad', 'google', 'okta'

    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, email),
    UNIQUE(tenant_id, external_id, identity_provider)
);

-- Groups (centrally managed for all applications)
CREATE TABLE groups (
    group_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    group_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    group_type VARCHAR(50) DEFAULT 'Application',  -- 'Organizational', 'Application', 'Project'

    -- External sync (optional)
    external_group_id VARCHAR(255),
    is_synced_from_provider BOOLEAN DEFAULT FALSE,

    parent_group_id UUID REFERENCES groups(group_id),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, group_name)
);

-- Group memberships
CREATE TABLE group_members (
    group_id UUID NOT NULL REFERENCES groups(group_id),
    member_id UUID NOT NULL,
    member_type VARCHAR(20) NOT NULL,  -- 'user' or 'group'
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    role_in_group VARCHAR(50) DEFAULT 'Member',
    added_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (group_id, member_id, member_type)
);

-- Role definitions (per application, per tenant, per resource type)
CREATE TABLE role_definitions (
    role_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    application_id UUID NOT NULL REFERENCES applications(application_id),
    role_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Resource type this role applies to
    resource_type VARCHAR(50) NOT NULL,  -- 'storage', 'image', 'api', 'keyvault', '*' for cross-resource

    permissions JSONB NOT NULL,
    -- {"actions": ["deeplens:storage:read", "deeplens:storage:write"]}
    is_builtin BOOLEAN DEFAULT FALSE,
    is_custom BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, application_id, role_name, resource_type)
);

CREATE INDEX idx_role_definitions_resource_type
    ON role_definitions(application_id, resource_type);

-- Role assignments (users/groups → roles → specific resource instances)
CREATE TABLE role_assignments (
    assignment_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    application_id UUID NOT NULL REFERENCES applications(application_id),

    principal_id UUID NOT NULL,  -- user_id or group_id
    principal_type VARCHAR(20) NOT NULL,  -- 'user' or 'group'

    role_id UUID NOT NULL REFERENCES role_definitions(role_id),

    -- Specific resource instance (optional - null means all resources of the role's type)
    resource_id VARCHAR(255),   -- 'awss3cold', 'eng-prod-hot', 'image-123', null for all

    assigned_by UUID NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE(tenant_id, application_id, principal_id, principal_type, role_id, resource_id)
);

CREATE INDEX idx_role_assignments_principal
    ON role_assignments(principal_id, principal_type, application_id);
CREATE INDEX idx_role_assignments_role
    ON role_assignments(role_id, resource_id);
```

#### DeepLens Application Database Schema (Application-Specific Data)

```sql
-- Storage configurations (DeepLens-specific, NOT in NextGen.Identity)
CREATE TABLE tenant_storage_configurations (
    storage_config_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    storage_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Provider configuration
    provider_type VARCHAR(50) NOT NULL,
    connection_string TEXT NOT NULL,
    container_name VARCHAR(255),
    bucket_name VARCHAR(255),
    region VARCHAR(50),

    -- Path configuration
    base_path VARCHAR(500) DEFAULT '',
    path_template VARCHAR(500) DEFAULT '{year}/{month}/{day}/',

    -- Flexible metadata (JSONB for querying)
    metadata JSONB NOT NULL DEFAULT '{}',

    UNIQUE(tenant_id, storage_name)
);

-- Images (DeepLens-specific)
CREATE TABLE images (
    image_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    storage_config_id UUID NOT NULL REFERENCES tenant_storage_configurations(storage_config_id),

    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    content_type VARCHAR(100),

    owner_id UUID NOT NULL,  -- User who uploaded (from NextGen.Identity)

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Helper Functions (in NextGen.Identity Database)

```sql
-- Get user's effective permissions for an application with resource context
CREATE OR REPLACE FUNCTION get_user_permissions(
    p_user_id UUID,
    p_tenant_id UUID,
    p_application_id UUID
)
RETURNS TABLE(permission TEXT, resource_type VARCHAR, resource_id VARCHAR) AS $$
BEGIN
    RETURN QUERY
    WITH user_groups AS (
        -- Get all user's groups (direct + nested)
        WITH RECURSIVE group_hierarchy AS (
            SELECT g.group_id, 0 as depth
            FROM groups g
            INNER JOIN group_members gm ON g.group_id = gm.group_id
            WHERE gm.member_id = p_user_id
              AND gm.member_type = 'user'
              AND g.tenant_id = p_tenant_id
              AND g.is_active = TRUE

            UNION ALL

            SELECT g.group_id, gh.depth + 1
            FROM groups g
            INNER JOIN group_members gm ON g.group_id = gm.group_id
            INNER JOIN group_hierarchy gh ON gm.member_id = gh.group_id
            WHERE gm.member_type = 'group'
              AND g.tenant_id = p_tenant_id
              AND g.is_active = TRUE
              AND gh.depth < 10
        )
        SELECT DISTINCT group_id FROM group_hierarchy
    ),
    all_assignments AS (
        -- User's direct role assignments
        SELECT rd.permissions, rd.resource_type, ra.resource_id
        FROM role_assignments ra
        INNER JOIN role_definitions rd ON ra.role_id = rd.role_id
        WHERE ra.principal_id = p_user_id
          AND ra.principal_type = 'user'
          AND ra.tenant_id = p_tenant_id
          AND ra.application_id = p_application_id
          AND ra.is_active = TRUE
          AND (ra.expires_at IS NULL OR ra.expires_at > NOW())

        UNION

        -- User's group role assignments
        SELECT rd.permissions, rd.resource_type, ra.resource_id
        FROM role_assignments ra
        INNER JOIN role_definitions rd ON ra.role_id = rd.role_id
        INNER JOIN user_groups ug ON ra.principal_id = ug.group_id
        WHERE ra.principal_type = 'group'
          AND ra.tenant_id = p_tenant_id
          AND ra.application_id = p_application_id
          AND ra.is_active = TRUE
          AND (ra.expires_at IS NULL OR ra.expires_at > NOW())
    )
    SELECT DISTINCT
        jsonb_array_elements_text(aa.permissions->'actions') as perm,
        aa.resource_type,
        aa.resource_id
    FROM all_assignments aa;
END;
$$ LANGUAGE plpgsql;

-- Check if user has specific permission for a resource
CREATE OR REPLACE FUNCTION has_permission(
    p_user_id UUID,
    p_tenant_id UUID,
    p_application_id UUID,
    p_resource_type VARCHAR,
    p_resource_id VARCHAR,
    p_required_permission TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM get_user_permissions(p_user_id, p_tenant_id, p_application_id) up
        WHERE up.resource_type = p_resource_type
          AND (up.resource_id = p_resource_id OR up.resource_id IS NULL)  -- NULL = all resources
          AND (up.permission = p_required_permission
               OR up.permission = '*'  -- Wildcard permission
               OR p_required_permission LIKE up.permission || '%')  -- Prefix match
    );
END;
$$ LANGUAGE plpgsql;
```

### Implementation Example

#### NextGen.Identity Token Generation

```csharp
public class TokenService : ITokenService
{
    public async Task<string> GenerateTokenAsync(User user, Guid tenantId)
    {
        // Get all applications the user has access to
        var applications = await _applicationRepository
            .GetApplicationsByTenantAsync(tenantId);

        var permissionsClaims = new Dictionary<string, List<string>>();

        foreach (var app in applications)
        {
            // Get user's effective permissions for this application
            var permissions = await _dbContext.Database
                .SqlQueryRaw<string>(
                    "SELECT * FROM get_user_permissions(@userId, @tenantId, @appId)",
                    new[] {
                        new NpgsqlParameter("userId", user.UserId),
                        new NpgsqlParameter("tenantId", tenantId),
                        new NpgsqlParameter("appId", app.ApplicationId)
                    })
                .ToListAsync();

            if (permissions.Any())
            {
                permissionsClaims[app.AppCode] = permissions;
            }
        }

        // Get user's groups
        var groups = await _dbContext.Database
            .SqlQueryRaw<GroupInfo>(
                "SELECT group_name FROM get_user_groups(@userId, @tenantId)",
                new[] {
                    new NpgsqlParameter("userId", user.UserId),
                    new NpgsqlParameter("tenantId", tenantId)
                })
            .Select(g => g.GroupName)
            .ToListAsync();

        // Create JWT with claims
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("tenant_id", tenantId.ToString()),
            new Claim("username", user.Username),
            new Claim("display_name", user.DisplayName ?? user.Username)
        };

        // Add groups
        foreach (var group in groups)
        {
            claims.Add(new Claim("groups", group));
        }

        // Add permissions as JSON claim
        claims.Add(new Claim(
            "permissions",
            JsonSerializer.Serialize(permissionsClaims),
            JsonClaimValueTypes.Json));

        var token = _jwtHandler.CreateToken(claims);
        return token;
    }
}
```

#### DeepLens SearchApi - Permission Check

```csharp
[HttpPost("upload")]
public async Task<IActionResult> UploadImage(
    [FromForm] UploadImageRequest request)
{
    // 1. Extract user info from JWT (issued by NextGen.Identity)
    var userId = Guid.Parse(User.FindFirst(JwtRegisteredClaimNames.Sub).Value);
    var tenantId = Guid.Parse(User.FindFirst("tenant_id").Value);

    // 2. Extract permissions from token
    var permissionsClaim = User.FindFirst("permissions")?.Value;
    var permissions = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(permissionsClaim);
    var deeplensPermissions = permissions.GetValueOrDefault("deeplens", new List<string>());

    // 3. Resolve storage (by name, metadata, or default)
    var storageConfig = await _storageRepository.ResolveStorageAsync(
        tenantId,
        request.StorageName,
        request.Metadata);

    // 4. Check permission
    var requiredPermission = $"deeplens:storage:{storageConfig.StorageName}:write";
    var hasPermission = deeplensPermissions.Contains(requiredPermission)
                     || deeplensPermissions.Contains("deeplens:storage:write")
                     || deeplensPermissions.Contains("deeplens:storage:*:write");

    if (!hasPermission)
        return Forbid($"Missing permission: {requiredPermission}");

    // 5. Upload to storage
    var connector = await _storageFactory.CreateConnectorAsync(storageConfig);
    var storagePath = GenerateStoragePath(storageConfig, request);
    await connector.UploadAsync(request.File.OpenReadStream(), storagePath);

    // 6. Save metadata
    await _imageRepository.CreateAsync(new Image
    {
        ImageId = Guid.NewGuid(),
        TenantId = tenantId,
        StorageConfigId = storageConfig.StorageConfigId,
        FileName = request.File.FileName,
        FilePath = storagePath,
        OwnerId = userId,
        CreatedAt = DateTime.UtcNow
    });

    return Ok(new { imageId, storageName = storageConfig.StorageName });
}
```

#### NextGen.Identity Admin API - Manage Permissions

```bash
# 1. Register application with NextGen.Identity
POST /api/admin/applications
{
  "appCode": "deeplens",
  "appName": "DeepLens Image Search",
  "description": "AI-powered image similarity search"
}

# 2. Create role definitions for different resource types

## Storage roles
POST /api/admin/tenants/{tenantId}/applications/deeplens/roles
{
  "roleName": "Contributor",
  "displayName": "Storage Contributor",
  "resourceType": "storage",  # ← Explicit resource type!
  "permissions": {
    "actions": [
      "deeplens:storage:read",
      "deeplens:storage:write",
      "deeplens:storage:list"
    ]
  }
}

POST /api/admin/tenants/{tenantId}/applications/deeplens/roles
{
  "roleName": "Reader",
  "displayName": "Storage Reader",
  "resourceType": "storage",
  "permissions": {
    "actions": [
      "deeplens:storage:read",
      "deeplens:storage:list"
    ]
  }
}

## API roles (different resource type)
POST /api/admin/tenants/{tenantId}/applications/deeplens/roles
{
  "roleName": "Developer",
  "displayName": "API Developer",
  "resourceType": "api",  # ← Different resource type
  "permissions": {
    "actions": [
      "deeplens:api:read",
      "deeplens:api:test",
      "deeplens:api:debug"
    ]
  }
}

# 3. Create group in NextGen.Identity
POST /api/admin/tenants/{tenantId}/groups
{
  "groupName": "engineering-team",
  "displayName": "Engineering Team",
  "groupType": "Organizational"
}

# 4. Add users to group
POST /api/admin/tenants/{tenantId}/groups/{groupId}/members
{
  "userId": "{user-id}",
  "memberType": "user"
}

# 5. Assign storage role to group for specific storage
POST /api/admin/tenants/{tenantId}/applications/deeplens/role-assignments
{
  "principalId": "{engineering-group-id}",
  "principalType": "group",
  "roleId": "{storage-contributor-role-id}",  # Role already has resource_type="storage"
  "resourceId": "awss3cold"  # ← Only specify which storage instance
}

# 6. Assign another storage with same role
POST /api/admin/tenants/{tenantId}/applications/deeplens/role-assignments
{
  "principalId": "{engineering-group-id}",
  "principalType": "group",
  "roleId": "{storage-contributor-role-id}",  # Same role
  "resourceId": "azureblob-hot"  # ← Different storage instance
}

# 7. Assign API role to same group
POST /api/admin/tenants/{tenantId}/applications/deeplens/role-assignments
{
  "principalId": "{engineering-group-id}",
  "principalType": "group",
  "roleId": "{api-developer-role-id}",  # Different role (API resource type)
  "resourceId": "search-api"  # ← API resource instance
}

# 8. Wildcard: Grant access to ALL storages
POST /api/admin/tenants/{tenantId}/applications/deeplens/role-assignments
{
  "principalId": "{admin-group-id}",
  "principalType": "group",
  "roleId": "{storage-contributor-role-id}",
  "resourceId": null  # ← null = all storages
}

# 9. User logs in → NextGen.Identity generates JWT with permissions
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "********"
}

# Response includes JWT with all permissions
{
  "token": "eyJ...",
  "claims": {
    "sub": "user-id",
    "tenant_id": "tenant-id",
    "permissions": {
      "deeplens": [
        "deeplens:storage:awss3cold:write",
        "deeplens:storage:awss3cold:read",
        "deeplens:storage:azureblob-hot:write",
        "deeplens:storage:azureblob-hot:read",
        "deeplens:api:search-api:read",
        "deeplens:api:search-api:test"
      ]
    }
  }
}
```

### Consequences

**Positive:**

- **Centralized Identity**: Single source of truth for users, groups, and permissions across all applications
- **Simplified Onboarding**: New applications register with NextGen.Identity and get RBAC for free
- **Consistent Security**: Same permission model across all applications in the ecosystem
- **JWT Contains Permissions**: Fast permission checks without database lookups
- **Multi-Application Support**: Users managed once, granted access to multiple apps
- **Audit Trail**: Centralized logging of all identity and permission changes
- **SSO Support**: Integrate with external providers (Azure AD, Okta, Google) once
- **Data Sovereignty**: Applications still control their own business data
- **Flexibility**: Unlimited storage configurations per tenant with flexible metadata
- **Granular Control**: Per-resource permissions with wildcard support

**Negative:**

- **Token Size**: JWT tokens can become large with many permissions
- **NextGen.Identity Dependency**: Applications depend on NextGen.Identity being available
- **Permission Changes**: Require new token (or implement token refresh/invalidation)
- **Complexity**: More complex architecture with centralized identity service
- **Database Performance**: Recursive queries for deep group hierarchies in NextGen.Identity
- **Initial Setup**: Requires application registration and role definition

**Mitigation:**

- Cache JWT tokens in applications (validate signature, check expiration)
- Implement token refresh mechanism (short-lived access tokens + refresh tokens)
- Use Redis in NextGen.Identity to cache permission lookups
- Limit group nesting depth to 10 levels
- Compress permissions in JWT using abbreviations if needed
- Implement circuit breaker pattern in applications for NextGen.Identity calls
- Provide admin UI in NextGen.Identity for easy application onboarding
- Use database connection pooling and read replicas
- Implement webhook notifications for permission changes (optional real-time updates)
- Support both JWT validation (fast) and API fallback (if token expired)
  ExternalGroupId = azureGroup.Id,
  GroupName = azureGroup.Name,
  DisplayName = azureGroup.DisplayName,
  GroupType = "Corporate",
  IsSyncedFromProvider = true
  };
  \_dbContext.Groups.Add(group);
  }
  else
  {
  group.DisplayName = azureGroup.DisplayName;
  group.LastSyncedAt = DateTime.UtcNow;
  }
  }

          await _dbContext.SaveChangesAsync();
      }

  }

````

#### Admin Operations```bash

# Sync user on first login (automatic)

# Happens during JWT validation middleware

# Create application-specific group (not in Azure AD)

POST /api/admin/tenants/{tenantId}/groups
{
"groupName": "project-alpha-team",
"displayName": "Project Alpha Team",
"groupType": "Project"
}

# Add users to application group

POST /api/admin/tenants/{tenantId}/groups/{groupId}/members
{ "userId": "{user-id}", "roleInGroup": "Member" }

# Assign storage role to group

POST /api/admin/tenants/{tenantId}/storages/eng-prod-hot/role-assignments
{
"principalId": "{project-alpha-group-id}",
"principalType": "group",
"roleName": "StorageContributor"
}

# Optional: Manually sync corporate groups from Azure AD

POST /api/admin/tenants/{tenantId}/sync-groups

# This creates shadow group records with is_synced_from_provider = true

````

### Consequences

**Positive:**

- **Hybrid Identity**: Best of both worlds (auth provider + local control)
- **Fast Permissions**: No external API calls during image operations
- **Data Sovereignty**: Customers control where data is stored
- **Flexibility**: Unlimited storage configurations per tenant
- **Familiar RBAC**: Industry-standard Azure AD pattern
- **Efficient Inheritance**: Recursive CTEs for nested groups
- **Granular Control**: Per-storage permissions with role-based access
- **Scalability**: Supports complex organizational hierarchies
- **Compliance**: Meets enterprise security requirements
- **Auditability**: Complete trail of who can access what
- **Offline Capable**: Works after initial user/group sync

**Negative:**

- **Sync Complexity**: Must sync users/groups from auth provider
- **Dual Source of Truth**: Users exist in both provider and app database
- **Stale Data Risk**: Local groups may be out of sync
- **Complexity**: More tables and relationships to manage
- **Performance**: Recursive queries for deep group hierarchies
- **Cache Requirements**: Must cache effective permissions (5-min TTL)
- **Setup Overhead**: Requires initial configuration per tenant

**Mitigation:**

- Sync users on first login automatically (JWT middleware)
- Cache JWT tokens in applications (validate signature, check expiration)
- Implement token refresh mechanism (short-lived access tokens + refresh tokens)
- Use Redis in NextGen.Identity to cache permission lookups
- Limit group nesting depth to 10 levels
- Compress permissions in JWT using abbreviations if needed
- Implement circuit breaker pattern in applications for NextGen.Identity calls
- Provide admin UI in NextGen.Identity for easy application onboarding
- Use database connection pooling and read replicas
- Implement webhook notifications for permission changes (optional real-time updates)
- Support both JWT validation (fast) and API fallback (if token expired)

### Design Rationale

**Why Centralized Identity Management?**

- **Single Source of Truth**: All users, groups, and permissions managed in one place
- **Multi-Application Ecosystem**: Add new applications without rebuilding identity infrastructure
- **Consistent Experience**: Same login, same permissions, across all applications
- **Reduced Duplication**: Users don't have separate accounts for each application
- **Centralized Audit**: All access changes tracked in one system for compliance
- **Future-Proof**: Easy to add new applications as business grows

**Why Include Permissions in JWT?**

- **Performance**: No database lookup needed for every request
- **Scalability**: Applications can validate tokens locally (JWT signature verification)
- **Offline Capability**: Applications work even if NextGen.Identity temporarily unavailable
- **Low Latency**: Permission checks are instant (already in token claims)

**NextGen.Identity vs External Providers (Azure AD, Okta):**

- NextGen.Identity can **wrap** external providers (SSO federation)
- Add custom business logic on top of external identity
- Support multiple identity providers simultaneously
- Manage application-specific permissions not supported by external provider
- Own your identity infrastructure without vendor lock-in

**Why Separate Application Business Data?**

- **Decoupling**: Applications own their domain data (images, storage configs)
- **Performance**: Application databases optimized for their specific queries
- **Scalability**: Scale application databases independently
- **Data Sovereignty**: Business data stays in application's control

**Why Application Registration?**

- Each application declares its resources and actions explicitly
- Type-safe permission strings (e.g., `deeplens:storage:write`)
- Easy to discover what permissions exist across ecosystem
- Prevents permission naming conflicts between applications

**Why Resource Type in Role Definition (Not in Assignment)?**

- **Type Safety**: Can't accidentally assign StorageContributor role to an API resource
- **Clarity**: Role definition explicitly declares what resource type it applies to
- **Less Redundancy**: Resource type stored once per role, not repeated in every assignment
- **Simpler Assignments**: Only need to specify the resource instance ID
- **Industry Standard**: Matches Azure RBAC pattern (e.g., "Storage Blob Data Contributor")
- **Reusability**: Same role can be assigned to multiple instances of the same resource type

**Example Benefits:**

```sql
-- Role tied to resource type
StorageContributor (resource_type='storage')

-- Assignments just specify which storage instance
- engineering-team → StorageContributor → awss3cold
- engineering-team → StorageContributor → azureblob-hot
- qa-team → StorageContributor → test-storage

-- Can't accidentally do this (type mismatch caught at role assignment):
- engineering-team → StorageContributor → search-api  ❌ (API, not storage!)
```

**Why Tag-Based Storage Selection?**

- Maximum flexibility for diverse use cases
- No rigid schema (department, tier, project, etc.)
- Easy to query and filter
- Supports evolving organizational structures

**Why Separate Users and Groups Tables?**

- Industry standard (Azure AD, AWS IAM, Google Cloud)
- Better query performance (no sparse columns)
- Stronger type safety with foreign keys
- Clearer semantics and easier to understand
- More efficient indexing

---

## Future Decisions

The following architectural decisions are pending:

- **ADR-008:** Vector database selection (Qdrant vs alternatives)
- **ADR-009:** External identity provider integration strategy (Azure AD vs Okta vs Google)
- **ADR-010:** AI model selection and deployment
- **ADR-011:** Kubernetes vs Docker Swarm for orchestration

---

## Revision History

| Date       | Version | Changes                                                  | Author            |
| ---------- | ------- | -------------------------------------------------------- | ----------------- |
| 2025-11-27 | 1.0     | Initial ADR creation                                     | Architecture Team |
| 2025-11-27 | 1.0     | Added ADR-001 through ADR-005                            | Architecture Team |
| 2025-11-27 | 1.1     | Added ADR-006 (Data Access)                              | Architecture Team |
| 2025-11-27 | 1.2     | Added ADR-007 (BYOS + RBAC Strategy)                     | Architecture Team |
| 2025-11-27 | 1.3     | Updated ADR-007 to Centralized Identity via NextGen      | Architecture Team |
| 2025-11-27 | 1.4     | Updated ADR-007: Added resource_type to role definitions | Architecture Team |

```

```
