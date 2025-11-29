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
- [ADR-008: Hybrid .NET + Python Architecture for Image Similarity](#adr-008-hybrid-net--python-architecture-for-image-similarity)
- [ADR-009: JWT Authentication Strategy (Hybrid Approach)](#adr-009-jwt-authentication-strategy-hybrid-approach)
- [ADR-010: Development-First, Authentication-Later Strategy](#adr-010-development-first-authentication-later-strategy)
- [ADR-011: Asynchronous Processing with Kafka Event Streaming](#adr-011-asynchronous-processing-with-kafka-event-streaming)
- [ADR-012: SAGA Choreography Pattern for Image Processing Pipeline](#adr-012-saga-choreography-pattern-for-image-processing-pipeline)
- [ADR-013: Stateless Service Architecture and Separation of Concerns](#adr-013-stateless-service-architecture-and-separation-of-concerns)
- [ADR-014: Model Versioning and Smart Multi-Model Introduction Strategy](#adr-014-model-versioning-and-smart-multi-model-introduction-strategy)
- [ADR-015: Portable Python Development Environment Strategy](#adr-015-portable-python-development-environment-strategy)

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
│   └── DeepLens.WorkerService/    # Background jobs, workflow management
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

4. **DeepLens.WorkerService** (Background Service)
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

## ADR-008: Hybrid .NET + Python Architecture for Image Similarity

**Date:** 2025-11-27  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

The image similarity service requires:
- AI/ML capabilities (feature extraction, vector operations)
- High-performance APIs for user-facing operations
- Business logic orchestration
- Integration with existing .NET ecosystem

We need to decide whether to:
1. Build everything in .NET (using ML.NET/ONNX Runtime)
2. Build everything in Python (FastAPI + ML libraries)
3. Use a hybrid approach

### Decision

We will implement a **hybrid .NET + Python architecture**:

**🔵 .NET Services (.NET 8) - APIs & Orchestration:**
- API Gateway (YARP) - routing, authentication, rate limiting
- Similarity API - public REST endpoints
- Admin API - system management
- Core business logic - domain models, validation, workflows
- Data persistence - PostgreSQL metadata, Redis caching
- Orchestration - background services, Kafka producers/consumers
- Integration layer - storage connectors, HTTP clients

**🔴 Python Services (FastAPI) - AI/ML Specialized:**
- Feature Extraction Service - ResNet50, CLIP, EfficientNet with ONNX Runtime
- Vector Similarity Service - Qdrant client, cosine similarity, duplicate detection

**Communication:**
- .NET → Python: HTTP/REST APIs with JSON
- Async processing: Kafka events
- Authentication: JWT token propagation

### Architecture Diagram

```
┌─────────────────────────────────────────┐
│     .NET Similarity API                 │
│  • User-facing REST endpoints           │
│  • JWT authentication                   │
│  • Business logic & validation          │
│  • PostgreSQL persistence               │
│  • Kafka event producers                │
└─────────────┬───────────────────────────┘
              │ HTTP/REST
              │ Forward JWT
     ┌────────┼─────────┐
     │                  │
     ▼                  ▼
┌──────────────┐  ┌──────────────┐
│ Python       │  │ Python       │
│ Feature      │  │ Vector       │
│ Extraction   │  │ Similarity   │
│ (FastAPI)    │  │ (FastAPI)    │
│ • ResNet50   │  │ • Qdrant     │
│ • CLIP       │  │ • Cosine Sim │
└──────────────┘  └──────────────┘
```

### Rationale

**Why .NET for APIs:**
- ✅ Better performance for HTTP APIs (Kestrel is faster than uvicorn)
- ✅ Strong typing and compile-time safety
- ✅ Excellent async/await support
- ✅ Native integration with IdentityServer
- ✅ Better tooling (Visual Studio, Rider)
- ✅ Existing team expertise
- ✅ Easier deployment and monitoring

**Why Python for AI/ML:**
- ✅ Superior AI/ML ecosystem (PyTorch, TensorFlow, Hugging Face)
- ✅ Better GPU support and optimization
- ✅ Faster ML model development and experimentation
- ✅ Rich computer vision libraries (OpenCV, Pillow)
- ✅ Direct access to latest models and research
- ✅ ONNX Runtime performs better with Python bindings

**Why NOT pure .NET:**
- ❌ ML.NET limited compared to Python ML ecosystem
- ❌ Fewer pre-trained models available
- ❌ Harder to integrate latest research
- ❌ Less mature computer vision libraries

**Why NOT pure Python:**
- ❌ Slower HTTP API performance
- ❌ Weaker typing (even with type hints)
- ❌ Less robust for large-scale orchestration
- ❌ Integration with .NET identity system is harder
- ❌ Team has more .NET expertise for business logic

### Consequences

**Positive:**
- Best of both worlds - .NET for what it does best, Python for what it does best
- Clear service boundaries
- Independent scaling of services
- Technology choice optimized per use case
- Easier to attract specialists (ML engineers for Python, backend devs for .NET)

**Negative:**
- Multiple technology stacks to maintain
- Cross-language integration complexity
- Need developers familiar with both stacks
- More complex deployment (multiple runtimes)

**Mitigation:**
- Use Docker to standardize deployment
- Clear REST API contracts between services
- Comprehensive integration tests
- Good documentation for both stacks

### Related Decisions
- ADR-009: JWT Authentication Strategy
- ADR-010: Development-First Strategy

---

## ADR-009: JWT Authentication Strategy (Hybrid Approach)

**Date:** 2025-11-27  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

With hybrid .NET + Python architecture, we need to decide authentication between services:

**Options:**
1. **User JWT token propagation** - Forward user's JWT from .NET to Python
2. **Service JWT tokens** - .NET gets service token for Python calls
3. **API Keys** - Simple shared secrets
4. **No authentication** - Trust internal network

We need authentication that:
- Preserves user context for audit trails
- Supports multi-tenancy (tenant isolation)
- Works for both user-initiated and system-initiated operations
- Is secure but not overly complex

### Decision

We will implement a **hybrid JWT authentication strategy**:

**Scenario 1: User-Initiated Operations → User JWT Token**
- User uploads image, searches, views results
- .NET API validates user JWT (from IdentityServer)
- .NET forwards **same JWT** to Python services
- Python services validate **same JWT** against IdentityServer

**Scenario 2: System/Background Operations → Service JWT Token**
- Kafka consumers, scheduled jobs, system tasks
- .NET worker gets **service JWT** (client credentials flow)
- Service calls Python with **service JWT**
- Python validates **service JWT**

### Implementation Details

#### User JWT Flow (Synchronous)
```
User → .NET API (validate JWT) → Python Service (validate same JWT)
         ↓                              ↓
    Check scopes                   Check scopes
    (images:write)                 (images:write)
```

#### Service JWT Flow (Asynchronous)
```
Kafka Event → .NET Worker (get service JWT) → Python Service
                    ↓                              ↓
            Client credentials              Validate service JWT
            (service account)               (internal-service scope)
```

#### Token Validation

Both .NET and Python validate tokens against **same IdentityServer**:

```yaml
# Shared Configuration
IdentityServer: https://identity.deeplens.local
JWKS Endpoint: /.well-known/openid-configuration/jwks
Algorithm: RS256
Audience (User): deeplens-services
Audience (Service): deeplens-internal-services
```

**User Token Claims:**
```json
{
  "sub": "user-123",
  "tenant_id": "tenant-abc",
  "email": "user@example.com",
  "scope": "images:read images:write search:execute",
  "aud": "deeplens-services"
}
```

**Service Token Claims:**
```json
{
  "sub": "deeplens-similarity-api",
  "client_id": "internal-service",
  "scope": "feature-extraction:invoke vector-store:access",
  "aud": "deeplens-internal-services"
}
```

### Rationale

**Why User JWT Propagation:**
- ✅ Preserves user identity across all services
- ✅ Enables proper audit trails (who did what)
- ✅ Enforces tenant isolation (tenant_id in token)
- ✅ User permissions apply consistently
- ✅ Simpler architecture (one token flows through)
- ✅ Better compliance (GDPR, SOC 2)

**Why Service JWT for Background:**
- ✅ No user context for system operations
- ✅ Different permission model (service vs user)
- ✅ Longer token lifetime (no user session)
- ✅ Service identity for audit ("System" did this)
- ✅ Background jobs don't fail if user logs out

**Why NOT API Keys:**
- ❌ No user context
- ❌ All services have same permissions
- ❌ Harder to audit
- ❌ Manual rotation required

**Why NOT no authentication:**
- ❌ Security risk even on internal network
- ❌ No audit trail
- ❌ Zero-trust architecture requirement

### Consequences

**Positive:**
- Clear security model
- User context preserved where it matters
- Service context for background operations
- Supports both synchronous and asynchronous patterns
- Compliance-friendly

**Negative:**
- More complex than API keys
- Both services need JWT validation logic
- Need to manage service accounts in IdentityServer
- Token caching required for performance

**Mitigation:**
- Implement token validation once, reuse
- Cache JWKS responses (1 hour TTL)
- Clear documentation of token types
- Optional auth mode for development (ENABLE_AUTH=false)

### Implementation Phases

**Phase 1 (MVP):**
- ✅ User JWT propagation only
- ✅ Skip service tokens initially
- ✅ Docker network isolation for security

**Phase 2 (Enhanced):**
- ✅ Add service JWT support
- ✅ Implement Kafka consumers with service tokens
- ✅ Background jobs use service accounts

**Phase 3 (Production):**
- ✅ Full dual-token support
- ✅ Token type detection in Python services
- ✅ Comprehensive audit logging

### Related Decisions
- ADR-008: Hybrid .NET + Python Architecture
- ADR-010: Development-First Strategy

---

## ADR-010: Development-First, Authentication-Later Strategy

**Date:** 2025-11-27  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

With Python microservices being built first, we need to decide the order of implementation:

**Options:**
1. **Authentication first** - Build JWT validation, then add features
2. **Features first** - Build core AI/ML, then add authentication
3. **Parallel** - Build both simultaneously

Considerations:
- Time to first working demo
- Testing complexity
- Development velocity
- Team learning curve

### Decision

We will **build core functionality first, add authentication later**:

**Phase 1A: Core Development (No Auth)**
- Build Python feature extraction service (ResNet50, CLIP)
- Build Python vector similarity service (Qdrant, cosine similarity)
- Build .NET API endpoints
- Focus on AI/ML functionality

**Phase 1B: Add Authentication**
- Implement JWT validation in Python services
- Add token forwarding in .NET clients
- Make authentication **optional** via environment variable

### Implementation Pattern

#### Python Services - Optional Auth Middleware

```python
# Environment variable controls auth
ENABLE_AUTH = os.getenv("ENABLE_AUTH", "false").lower() == "true"

async def optional_verify_token(authorization: Optional[str] = Header(None)):
    if not ENABLE_AUTH:
        # Development mode - no auth required
        return {"type": "development", "user_id": "dev-user"}
    
    if not authorization:
        raise HTTPException(401, "Authorization required")
    
    # Production mode - validate JWT
    return await validate_jwt_token(authorization)

@app.post("/extract-features")
async def extract_features(
    image: UploadFile,
    token_data: dict = Depends(optional_verify_token)
):
    # Core logic unchanged
    features = await extractor.extract(image)
    return {"features": features}
```

#### Docker Compose Configuration

```yaml
# Development
services:
  feature-extraction:
    environment:
      - ENABLE_AUTH=false  # No auth in dev

# Production
services:
  feature-extraction:
    environment:
      - ENABLE_AUTH=true   # Auth required in prod
```

### Rationale

**Why Core First:**
- ✅ Faster time to working demo
- ✅ Easier testing (no auth headers in dev)
- ✅ Better debugging (isolate issues)
- ✅ Focus on business value first
- ✅ Auth is infrastructure, not core value
- ✅ Can prove AI/ML functionality independently

**Why Add Auth Later:**
- ✅ Non-breaking change (optional middleware)
- ✅ Core logic remains unchanged
- ✅ Can test with and without auth
- ✅ Production-ready when needed
- ✅ Flexibility to change auth strategy

**Why NOT Auth First:**
- ❌ Slower initial development
- ❌ More complex testing early on
- ❌ Harder to debug (is it auth or the model?)
- ❌ Auth details may change as we learn

**Why NOT Parallel:**
- ❌ Context switching overhead
- ❌ Risk of over-engineering early
- ❌ Harder to change auth strategy later

### Consequences

**Positive:**
- Faster MVP delivery
- Easier onboarding for developers
- Core functionality proven early
- Flexibility in auth strategy
- Can demo without IdentityServer dependency

**Negative:**
- Need to ensure auth is added before production
- Risk of shipping without auth (process mitigation needed)
- Slight code duplication (optional vs required auth)

**Mitigation:**
- Clear checklist for production readiness
- Environment variable enforces auth in production
- Automated tests for auth scenarios
- Documentation on when to enable auth

### Development Timeline

```
Week 1-2: Python Core Services (ENABLE_AUTH=false)
├── Feature extraction with ResNet50
├── Vector similarity with Qdrant
└── Unit tests for core functionality

Week 3-4: .NET Integration (No auth)
├── .NET API endpoints
├── HTTP clients to Python (no auth headers)
└── End-to-end tests

Week 5: Add Authentication (ENABLE_AUTH=true)
├── JWT validation in Python
├── Token forwarding in .NET
└── Integration tests with auth
```

### Production Readiness Checklist

Before production deployment:
- [ ] ENABLE_AUTH=true in all environments except dev
- [ ] JWT validation tested with IdentityServer
- [ ] Token expiration handling implemented
- [ ] Service accounts configured for background jobs
- [ ] Audit logging captures user context
- [ ] Security review completed

### Related Decisions
- ADR-008: Hybrid .NET + Python Architecture
- ADR-009: JWT Authentication Strategy

---

## ADR-011: Asynchronous Processing with Kafka Event Streaming

**Date:** 2025-11-28  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

The initial synchronous image processing pipeline was causing:
- 4-6 second blocking user experiences during upload
- Timeouts under load
- Poor scalability due to tight coupling between upload, ML processing, and vector storage

### Decision

Transform to **asynchronous event-driven architecture** using Kafka:

```
Upload API (< 700ms) → Kafka Event → Background Workers → Vector Storage
```

#### Key Components:
- **Immediate Upload Response**: < 700ms confirmation with correlation ID
- **Kafka Topics**: `image.uploaded`, `feature.extraction.requested`, `vector.indexing.requested`, `processing.completed`
- **SAGA Choreography**: Stateless workers handle pipeline steps independently
- **WorkerService**: Background consumers for ML processing tasks

### Alternatives Considered

1. **Synchronous Processing**: Rejected due to poor UX and scalability
2. **Queue-based (RabbitMQ)**: Rejected in favor of Kafka for event streaming capabilities
3. **Database Polling**: Rejected due to inefficiency

### Consequences

**Positive:**
- 6-9x faster perceived response times (< 700ms vs 4-6s)
- Better scalability and fault tolerance
- Proper separation of concerns between upload and processing

**Negative:**
- Increased system complexity
- Eventually consistent processing
- Requires correlation ID tracking for status updates

---

## ADR-012: SAGA Choreography Pattern for Image Processing Pipeline

**Date:** 2025-11-28  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

The async image processing pipeline requires coordination between multiple services:
- Image upload and validation
- Feature extraction (Python ML service)
- Vector storage (Qdrant)
- Status updates and notifications

### Decision

Implement **SAGA Choreography pattern** where each service:
- Consumes relevant events from Kafka
- Performs its business logic
- Publishes new events for downstream services
- Maintains no central orchestrator

#### Event Flow:
```
ImageUploaded → FeatureExtractionRequested → VectorIndexingRequested → ProcessingCompleted
```

### Alternatives Considered

1. **SAGA Orchestration**: Rejected due to central orchestrator complexity
2. **Direct Service Calls**: Rejected due to tight coupling
3. **Workflow Engines**: Rejected as overkill for linear pipeline

### Consequences

**Positive:**
- Loose coupling between services
- Each service owns its domain logic
- Natural fault isolation
- Easy to add new processing steps

**Negative:**
- Distributed tracing complexity
- Error handling requires compensation events
- No central visibility into pipeline state

---

## ADR-013: Stateless Service Architecture and Separation of Concerns

**Date:** 2025-11-29  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

With hybrid .NET + Python architecture, we need clear boundaries between:
- Stateless compute services (ML inference, API routing)
- Stateful data services (databases, storage, caching)
- Service responsibilities and ownership

### Decision

Implement **strict stateless/stateful service separation**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATELESS SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ Feature Extract │    │   API Gateway   │                    │
│  │                 │    │                 │                    │
│  │ • Pure ML only  │    │ • Route only    │                    │
│  │ • No storage    │    │ • Auth/RateLimit│                    │
│  │ • Horizontally  │    │ • Load Balance  │                    │
│  │   scalable      │    │ • Circuit Break │                    │
│  └─────────────────┘    └─────────────────┘                    │
│      Python FastAPI          .NET YARP                         │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STATEFUL DATA SERVICES                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ Vector Storage  │    │ Metadata Store  │    │ Cache Layer │ │
│  │                 │    │                 │    │             │ │
│  │ • Qdrant Mgmt   │    │ • PostgreSQL    │    │ • Redis     │ │
│  │ • Collection    │    │ • Entity Track  │    │ • Session   │ │
│  │ • Similarity    │    │ • Relationships │    │ • Results   │ │
│  │ • Multi-Tenant  │    │ • Transactions  │    │ • Rate Limit│ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│      .NET Service            .NET EF Core        .NET Service  │
└─────────────────────────────────────────────────────────────────┘
```

### Service Responsibilities

#### Stateless Services (.NET + Python):
- **Feature Extraction (Python)**: Pure ML inference, no data persistence
- **API Gateway (.NET)**: Routing, auth, rate limiting only
- **Background Workers (.NET)**: Event processing, no direct data access

#### Stateful Data Services (.NET):
- **VectorStoreService**: Qdrant management, multi-tenant collections
- **Repository Layer**: PostgreSQL operations, EF Core entities
- **Cache Layer**: Redis session and result caching
│  • Horizontally scale  │    • Orchestration   │   • Retry logic  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STATEFUL DATA SERVICES                      │
├─────────────────────────────────────────────────────────────────┤
│  VectorStoreService    │   Repository Layer   │   Cache Layer   │
│  • Qdrant operations   │   • PostgreSQL ops   │   • Redis ops   │
│  • Multi-tenant colls  │   • EF Core entities │   • Session mgmt │
│  • Collection lifecycle│   • Transactions     │   • Rate limits  │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow Examples

#### Image Upload & Indexing
```
1. Client uploads image to /api/v1/images
   ├─▶ DeepLens.SearchApi (.NET)
       ├─▶ Validate tenant, auth, rate limits
       ├─▶ Store metadata in PostgreSQL
       └─▶ HTTP POST to Python Feature Service
           ├─▶ Generate 2048-dim vector
           └─▶ Return vector + metadata
       ├─▶ VectorStoreService.IndexVectorAsync()
           └─▶ Store in Qdrant collection
       └─▶ Return image ID + status
```

#### Similarity Search
```  
2. Client searches similar images /api/v1/search
   ├─▶ DeepLens.SearchApi (.NET)
       ├─▶ HTTP POST to Python Feature Service
           └─▶ Generate query vector from uploaded image
       ├─▶ VectorStoreService.SearchSimilarAsync()
           ├─▶ Query Qdrant collection
           └─▶ Return top-K matches with scores
       ├─▶ Enrich with metadata from PostgreSQL
       └─▶ Return complete search results
```

### Configuration Strategy

**Python Services (Minimal):**
```python
# Only ML-related configuration
class Settings(BaseSettings):
    service_name: str = "feature-extraction-service"
    model_name: str = "resnet50" 
    vector_dimension: int = 2048
    # NO database or storage configurations
```

**.NET Services (Comprehensive):**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=deeplens;...",
    "Qdrant": "http://localhost:6333",
    "Redis": "localhost:6379"
  },
  "FeatureExtraction": {
    "ServiceUrl": "http://localhost:8001",
    "TimeoutSeconds": 30,
    "RetryCount": 3
  }
}
```

### Consequences

**Positive:**
- Clear separation of concerns between compute and data
- Python services remain lightweight and scalable  
- Data consistency managed in .NET layer
- Easier testing with stateless services
- Technology alignment (ML in Python, business logic in .NET)
- Consistent multi-tenant isolation at data layer

**Negative:**
- More network calls between services
- Requires careful error handling across service boundaries
- Additional complexity in service coordination

---

---

## ADR-014: Model Versioning and Smart Multi-Model Introduction Strategy

**Date:** 2025-11-29  
**Status:** Accepted  
**Decision Makers:** Architecture Team

### Context

As DeepLens grows, we need to introduce new AI models (CLIP, EfficientNet, custom models) without:
- Re-vectorizing millions of existing images ($1000s in compute costs)
- Blocking tenant operations during migration
- Breaking existing search functionality

### Decision

Implement **Smart Model Introduction Strategy** with progressive deployment:

#### Phase 1: Immediate New Model Deployment
- **Dual Extraction**: All NEW images get vectors from both old and new models
- **Smart Sampling**: Strategically re-vectorize 1-2% of existing images for validation
- **Gradual Rollout**: Monitor performance and gradually increase new model usage

#### Phase 2: Optional Background Migration  
- **Low Priority**: Gradually re-vectorize remaining images during off-peak hours
- **Cost Control**: Tenant decides migration speed vs cost trade-offs
- **Interruption Free**: No impact on production operations

#### Phase 3: Model Graduation
- **Performance Based**: Promote new model to primary based on validation results
- **Rollback Capable**: Maintain old vectors until confidence is achieved
- **Clean Migration**: Remove old vectors once new model is stable

### Smart Sampling Strategy

```python
# Representative sample selection across multiple dimensions:
sampling_strategy = {
    "temporal_distribution": {
        "last_30_days": 0.4,      # 40% recent uploads
        "last_6_months": 0.3,     # 30% medium-term  
        "older_than_6m": 0.3      # 30% historical
    },
    "quality_distribution": {
        "high_resolution": 0.4,   # Focus on quality images
        "medium_resolution": 0.4,
        "low_resolution": 0.2
    },
    "usage_distribution": {
        "frequently_searched": 0.5, # Images in search results
        "moderately_searched": 0.3,
        "rarely_searched": 0.2
    }
}
```

### Cost Impact Analysis

| **Approach** | **1M Images** | **10M Images** | **Time** |
|--------------|---------------|----------------|----------|
| **Full Re-vectorization** | $1,000 | $10,000 | 2-4 weeks |
| **Smart Introduction** | $20 | $200 | 2-3 days |
| **Savings** | **98%** | **98%** | **90%** |

### Alternatives Considered

1. **Full Re-vectorization**: Rejected due to cost and downtime
2. **New Collections Only**: Rejected due to operational complexity  
3. **Manual Migration**: Rejected due to operational complexity

### Unified Vector Space Strategy

All models use projection to a unified 2048-dimensional space for consistent search:

```python
# Unified search interface across all models
def search_with_model(query_image, model_name="resnet50"):
    # Extract features using specified model
    features = extract_features(query_image, model_name)
    
    # Project to unified 2048-dimensional space if needed
    unified_query = project_to_2048(features)
    
    # Search unified collection
    results = search_unified_collection(unified_query, tenant_collection)
    return results
```

### Consequences

**Positive:**
- 98% cost reduction for model introduction
- Zero production downtime
- Tenant controls migration pace
- Unified search interface across all models
- Comparable similarity scores between models
- Simplified architecture without complex testing infrastructure

**Negative:**  
- Temporary mixed vector spaces complexity during migration
- Requires careful sampling strategy for validation
- Projection overhead for non-2048 dimensional models

---

## ADR-015: Portable Python Development Environment Strategy

**Date:** 2025-11-29  
**Status:** Accepted  
**Decision Makers:** Development Team

### Context

DeepLens requires Python services for ML inference but faces challenges:
- Windows development environments vary (no Python, different versions)
- Admin rights not always available for system installations
- Multiple Python versions can conflict
- Team needs consistent, reproducible development setup

### Decision

Implement **Portable Python Strategy** with project-local installation:

#### Core Components:
- **Python 3.12.10 Embeddable Package**: Downloaded to `tools/python/`
- **Project-Local Virtual Environment**: Created in service directories
- **Automated Setup Scripts**: PowerShell scripts for consistent setup
- **Multi-Location Detection**: Fallback strategy for Python discovery

#### Setup Process:
```powershell
# 1. Download embeddable Python (if not exists)
Invoke-WebRequest -Uri "python-3.12.10-embed-amd64.zip" -OutFile "python.zip"
Expand-Archive -Path "python.zip" -DestinationPath "tools\python"

# 2. Enable pip (modify python312._pth)
# Uncomment "import site" line

# 3. Install pip and virtualenv
.\tools\python\python.exe get-pip.py
.\tools\python\python.exe -m pip install virtualenv

# 4. Automated service setup
.\setup-dev-environment.ps1 -PythonPath "tools\python\python.exe"
```

#### Python Discovery Priority:
1. Custom path (via parameter)
2. Project `tools\python\` (portable)
3. System PATH
4. Microsoft Store installation  
5. Common directories (`%LOCALAPPDATA%\Programs\Python`)

### Implementation Examples

**File Structure:**
```
deeplens/
  tools/
    python/
      python.exe          # Portable Python 3.12.10
      python312._pth      # Modified: "import site" uncommented
      Scripts/pip.exe
  src/
    DeepLens.FeatureExtractionService/
      setup-dev-environment.ps1   # Automated setup
      venv/                       # Project virtual environment
      requirements.txt
```

**Setup Script Features:**
- Version validation (Python 3.11+ required)
- Automatic dependency installation
- Environment file creation from template
- Optional model download
- VS Code integration setup

### Consequences

**Positive:**
- No admin rights required for Python setup
- Consistent environment across development machines
- Isolated from system Python installations
- Reproducible builds and deployments
- Works offline after initial download

**Negative:**
- Additional 50MB per project (Python embeddable package)
- Requires PowerShell execution policy adjustment
- Initial setup complexity higher than system Python

---

## Future Decisions

The following architectural decisions are pending:

- **ADR-016:** Kubernetes resource allocation and scaling policies
- **ADR-017:** Advanced observability and performance monitoring strategies

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
| 2025-11-27 | 1.5     | Added ADR-008: Hybrid .NET + Python Architecture         | Architecture Team |
| 2025-11-27 | 1.6     | Added ADR-009: JWT Authentication Strategy               | Architecture Team |
| 2025-11-27 | 1.7     | Added ADR-010: Development-First Strategy                | Architecture Team |

```

```
