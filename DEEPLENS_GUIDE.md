# DeepLens Complete Documentation Guide

**Generated:** 2025-12-19 01:18:55
**Purpose:** Single-file comprehensive documentation for distribution

This document consolidates all markdown documentation from the DeepLens repository into one distributable file.

---

## Table of Contents

This guide includes content from all documentation files in the repository. Use Ctrl+F to search for specific topics.

---


# Documentation: ARCHITECTURE_DECISIONS.md

---

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


#### Level 2: Individual Services (Endpoint-Level Limits)

Each service applies endpoint-specific limits:


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


#### DeepLens Application Database Schema (Application-Specific Data)


#### Helper Functions (in NextGen.Identity Database)


### Implementation Example

#### NextGen.Identity Token Generation


#### DeepLens SearchApi - Permission Check


#### NextGen.Identity Admin API - Manage Permissions


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

#### Service JWT Flow (Asynchronous)

#### Token Validation

Both .NET and Python validate tokens against **same IdentityServer**:


**User Token Claims:**

**Service Token Claims:**

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


#### Docker Compose Configuration


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
2. Client searches similar images /api/v1/search
   ├─▶ DeepLens.SearchApi (.NET)
       ├─▶ HTTP POST to Python Feature Service
           └─▶ Generate query vector from uploaded image
       ├─▶ VectorStoreService.SearchSimilarAsync()
           ├─▶ Query Qdrant collection
           └─▶ Return top-K matches with scores
       ├─▶ Enrich with metadata from PostgreSQL
       └─▶ Return complete search results
# Only ML-related configuration
class Settings(BaseSettings):
    service_name: str = "feature-extraction-service"
    model_name: str = "resnet50" 
    vector_dimension: int = 2048
    # NO database or storage configurations
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
# Unified search interface across all models
def search_with_model(query_image, model_name="resnet50"):
    # Extract features using specified model
    features = extract_features(query_image, model_name)
    
    # Project to unified 2048-dimensional space if needed
    unified_query = project_to_2048(features)
    
    # Search unified collection
    results = search_unified_collection(unified_query, tenant_collection)
    return results
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



# Documentation: CREDENTIALS.md

---

# DeepLens Development Credentials Reference

**⚠️ DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION**

This document lists all standardized credentials for local development. All passwords use `DeepLens123!` for consistency.

---

## PostgreSQL

### Main Database (postgres superuser)

- **User:** `postgres`
- **Password:** `DeepLensPassword123`
- **Host Port:** `5433` (mapped to container port 5432)
- **Connection:** `Host=localhost;Port=5433;Database=postgres;Username=postgres;Password=DeepLensPassword123`

### Service Users (created by init scripts)

#### NextGen Identity Service

- **User:** `nextgen_identity_service`
- **Password:** `DeepLensPassword123`
- **Database:** `nextgen_identity`
- **Connection:** `Host=localhost;Port=5433;Database=nextgen_identity;Username=nextgen_identity_service;Password=DeepLensPassword123`

#### Platform Service

- **User:** `platform_service`
- **Password:** `DeepLensPassword123`
- **Database:** `deeplens_platform`
- **Connection:** `Host=localhost;Port=5433;Database=deeplens_platform;Username=platform_service;Password=DeepLensPassword123`

#### Tenant Service

- **User:** `tenant_service`
- **Password:** `DeepLensPassword123`
- **Privileges:** CREATEDB
- **Connection:** `Host=localhost;Port=5433;Database=tenant_metadata_template;Username=tenant_service;Password=DeepLensPassword123`

#### Analytics User (Read-Only)

- **User:** `analytics_readonly`
- **Password:** `DeepLensPassword123`
- **Access:** Read-only to `deeplens_platform`

---

## Identity API (NextGen.Identity.Api)

### Admin User (Created on First Run)

- **Email:** `admin@deeplens.local`
- **Password:** `DeepLens@Admin123!`
- **Tenant:** `deeplens-admin`
- **Role:** `Admin`

### IdentityServer Clients

#### WebUI Client (SPA with PKCE)

- **Client ID:** `deeplens-webui`
- **Client Secret:** None (public client)
- **Redirect URI:** `http://localhost:3000/callback`
- **Grant Types:** `authorization_code`, `refresh_token`, `password`
- **Scopes:** `openid`, `profile`, `email`, `roles`, `deeplens.api`, `offline_access`

#### Mobile Client

- **Client ID:** `deeplens-mobile`
- **Client Secret:** `mobile-secret-change-in-production`
- **Grant Types:** `authorization_code`, `refresh_token`

#### Machine-to-Machine Client

- **Client ID:** `deeplens-m2m`
- **Client Secret:** `m2m-secret-change-in-production`
- **Grant Types:** `client_credentials`

#### API Gateway Client

- **Client ID:** `deeplens-gateway`
- **Client Secret:** `gateway-secret-change-in-production`
- **Grant Types:** `client_credentials`, `delegation`

---

## MinIO (Object Storage)

### Single Instance Architecture

MinIO uses **bucket-based multi-tenancy** with one shared instance.

### Root Admin Credentials

- **Access Key:** `admin`
- **Secret Key:** `DeepLensPassword123`
- **Console:** `http://localhost:9001`
- **API Endpoint:** `http://localhost:9000`

### Tenant Access Pattern

Each tenant gets:

- Dedicated bucket (e.g., `deeplens-admin`, `deeplens-tenant1`)
- Unique IAM user with access key/secret
- Restricted policy (access only to their bucket)

**Example Tenant Credentials:**

- **Bucket:** `deeplens-admin`
- **Access Key:** `admin-access-key-{random}`
- **Secret Key:** `{generated-secure-secret}`
- **Policy:** Read/write access to `deeplens-admin/*` only

---

## Redis

### No Authentication (Development)

- **Host:** `localhost`
- **Port:** `6379`
- **Connection:** `localhost:6379`

---

## Qdrant (Vector Database)

### No Authentication (Development)

- **Host:** `localhost`
- **HTTP Port:** `6333`
- **gRPC Port:** `6334`
- **Dashboard:** `http://localhost:6333/dashboard`

---

## Kafka

### No Authentication (Development)

- **Bootstrap Servers:** `localhost:9092`
- **Zookeeper:** `localhost:2181`

---

## Grafana (Monitoring)

### Admin User

- **Username:** `admin`
- **Password:** `DeepLens123!`
- **URL:** `http://localhost:3001`

---

## Prometheus

### No Authentication (Development)

- **URL:** `http://localhost:9090`

---

## Loki (Logging)

### No Authentication (Development)

- **URL:** `http://localhost:3100`

---

## Jaeger (Tracing)

### No Authentication (Development)

- **UI:** `http://localhost:16686`
- **Collector:** `localhost:14250`

---

## OpenTelemetry Collector

### No Authentication (Development)

- **gRPC:** `localhost:4317`
- **HTTP:** `localhost:4318`

---

## Quick Start Commands

### PostgreSQL Container (Clean Start)


### Test PostgreSQL Connection


### Identity API


### WebUI


---

## Password Policy (Development)

All development passwords follow this pattern:

- **Format:** `ServiceName123!`
- **Examples:**
  - PostgreSQL: `DeepLens123!`
  - Admin User: `DeepLens@Admin123!`
  - Grafana: `DeepLens123!`

**⚠️ Production Note:** All these credentials MUST be changed for production deployments using proper secrets management (Azure Key Vault, HashiCorp Vault, etc.)

---

## Environment Variables

### For Identity API


### For Infrastructure Setup


---

**Last Updated:** December 18, 2025


# Documentation: DEVELOPMENT_PLAN.md

---

# DeepLens Image Similarity Service - Development Plan

**Project:** Core Image Similarity Search Service  
**Start Date:** November 27, 2025  
**Status:** Planning Phase  
**Architecture:** Hybrid .NET + Python Microservices

---

## 🎯 Project Overview

Build a production-ready image similarity search service using:
- **.NET 8** for APIs, orchestration, and business logic
- **Python (FastAPI)** for AI/ML feature extraction and vector operations
- **Qdrant** for vector storage and similarity search
- **PostgreSQL** for metadata persistence
- **Redis** for caching
- **Kafka** for event-driven processing

---

## 📋 Current Status

### ✅ Completed
- [x] Architecture review and decision
- [x] Security strategy (hybrid JWT approach)
- [x] Service boundaries definition
- [x] Technology stack confirmation

### 🔄 In Progress
- [ ] Development plan creation
- [ ] ADR documentation

### ⏳ Upcoming
- [ ] Python Feature Extraction Service implementation
- [ ] Python Vector Similarity Service implementation

---

## 🗓️ Development Timeline (12 Weeks)

### **Phase 1A: Python Core Services (Weeks 1-2)**

**Goal:** Working AI/ML services without authentication

#### Week 1: Feature Extraction Service
- **Day 1-2:** Project setup & dependencies
  - FastAPI project structure
  - ONNX Runtime setup
  - Docker container configuration
  
- **Day 3-4:** ResNet50 implementation
  - Model loading from ONNX
  - Image preprocessing pipeline
  - Feature extraction endpoint
  
- **Day 5:** Testing & optimization
  - Unit tests with pytest
  - Performance benchmarks
  - Error handling

**Deliverables:**
- ✅ Working `/extract-features` endpoint
- ✅ ResNet50 model inference
- ✅ Docker image
- ✅ Unit tests

#### Week 2: Vector Similarity Service
- **Day 1-2:** Qdrant integration
  - Qdrant client setup
  - Collection management
  - Vector indexing
  
- **Day 3-4:** Similarity algorithms
  - Cosine similarity implementation
  - Search endpoints
  - Batch operations
  
- **Day 5:** Testing & documentation
  - Unit tests
  - Integration tests
  - API documentation

**Deliverables:**
- ✅ Working `/index-vector` endpoint
- ✅ Working `/search-similar` endpoint
- ✅ Qdrant integration
- ✅ Unit tests

---

### **Phase 1B: .NET Service Layer (Weeks 3-4)**

**Goal:** .NET services that orchestrate Python microservices

#### Week 3: Domain & Application Layers
- **Day 1-2:** Domain layer
  - Entities (ImageEntity)
  - Value objects (FeatureVector, ImageMetadata, ImageHash)
  - Domain logic
  
- **Day 3-4:** Application layer
  - Interfaces (IFeatureExtractionClient, ISimilaritySearchService)
  - Use cases (SearchSimilarImagesUseCase, ExtractFeaturesUseCase)
  - DTOs and mapping
  
- **Day 5:** Testing
  - Domain unit tests
  - Application layer tests

**Deliverables:**
- ✅ DeepLens.Similarity.Domain project
- ✅ DeepLens.Similarity.Application project
- ✅ DeepLens.Similarity.Contracts project
- ✅ Unit tests (xUnit)

#### Week 4: Infrastructure & API
- **Day 1-2:** Infrastructure layer
  - HTTP clients to Python services
  - EF Core repositories
  - Redis caching
  
- **Day 3-4:** API layer
  - REST endpoints
  - Request validation
  - Response mapping
  
- **Day 5:** Integration testing
  - End-to-end tests
  - Docker Compose setup
  - Integration tests

**Deliverables:**
- ✅ DeepLens.Similarity.Infrastructure project
- ✅ DeepLens.Similarity.Api project
- ✅ Working end-to-end flow
- ✅ Docker Compose environment

---

### **Phase 2A: Authentication & Security (Weeks 5-6)**

**Goal:** JWT-based authentication for all services

#### Week 5: Python Service Authentication
- **Day 1-2:** JWT validation middleware
  - PyJWT integration
  - JWKS fetching
  - Token validation
  
- **Day 3-4:** Optional auth mode
  - Environment variable configuration
  - Development vs production modes
  - Token parsing and claims extraction
  
- **Day 5:** Testing with auth
  - Auth integration tests
  - Mock JWT tokens
  - Error scenarios

**Deliverables:**
- ✅ JWT validation in Python services
- ✅ Optional auth mode (ENABLE_AUTH flag)
- ✅ Integration tests with auth

#### Week 6: .NET Authentication Integration
- **Day 1-2:** IdentityServer integration
  - JWT validation in .NET API
  - Token forwarding to Python services
  - User context extraction
  
- **Day 3-4:** Authorization policies
  - Scope-based authorization
  - Tenant isolation
  - Admin permissions
  
- **Day 5:** End-to-end auth testing
  - Full authentication flow tests
  - Authorization tests
  - Token refresh scenarios

**Deliverables:**
- ✅ JWT authentication in .NET API
- ✅ Token propagation to Python services
- ✅ Authorization policies
- ✅ Integration tests

---

### **Phase 2B: Advanced Features (Weeks 7-8)**

**Goal:** Enhanced AI capabilities and performance optimization

#### Week 7: Multiple Model Support
- **Day 1-3:** CLIP integration
  - CLIP model loading
  - Text-to-image search
  - Multi-modal features
  
- **Day 4-5:** Model management
  - Model switching
  - Model versioning
  - Performance comparison

**Deliverables:**
- ✅ CLIP model integration
- ✅ Multi-model support
- ✅ Model selection API

#### Week 8: Performance & Caching
- **Day 1-2:** Redis caching
  - Feature vector caching
  - Search result caching
  - Cache invalidation
  
- **Day 3-4:** Performance optimization
  - Batch processing
  - Connection pooling
  - Async operations
  
- **Day 5:** Load testing
  - Performance benchmarks
  - Stress testing
  - Optimization

**Deliverables:**
- ✅ Redis caching layer
- ✅ Performance optimizations
- ✅ Load test results

---

### **Phase 3: Production Readiness (Weeks 9-10)**

**Goal:** Observability, monitoring, and deployment

#### Week 9: Observability
- **Day 1-2:** Structured logging
  - Serilog configuration
  - Python logging setup
  - Log correlation
  
- **Day 3-4:** Metrics & tracing
  - OpenTelemetry integration
  - Prometheus metrics
  - Jaeger tracing
  
- **Day 5:** Dashboards
  - Grafana dashboards
  - Alert rules
  - Health checks

**Deliverables:**
- ✅ Structured logging
- ✅ OpenTelemetry integration
- ✅ Grafana dashboards

#### Week 10: Deployment & CI/CD
- **Day 1-2:** Kubernetes manifests
  - Deployment configs
  - Service definitions
  - ConfigMaps and Secrets
  
- **Day 3-4:** CI/CD pipeline
  - GitHub Actions workflows
  - Docker image builds
  - Automated testing
  
- **Day 5:** Documentation
  - API documentation
  - Deployment guides
  - Runbooks

**Deliverables:**
- ✅ Kubernetes deployment
- ✅ CI/CD pipeline
- ✅ Complete documentation

---

### **Phase 4: Kafka Integration (Weeks 11-12)**

**Goal:** Event-driven asynchronous processing

#### Week 11: Kafka Producers
- **Day 1-2:** Event publishing
  - ImageUploadedEvent
  - ImageProcessedEvent
  - Event schemas
  
- **Day 3-4:** .NET Kafka integration
  - Producer configuration
  - Event serialization
  - Error handling
  
- **Day 5:** Testing
  - Event publishing tests
  - Kafka integration tests

**Deliverables:**
- ✅ Kafka event producers
- ✅ Event schemas
- ✅ Integration tests

#### Week 12: Kafka Consumers
- **Day 1-3:** Background workers
  - Feature extraction consumer
  - Vector indexing consumer
  - Service token authentication
  
- **Day 4-5:** Testing & documentation
  - End-to-end async flow tests
  - Performance testing
  - Final documentation

**Deliverables:**
- ✅ Kafka consumers
- ✅ Background processing
- ✅ Complete system documentation

---

## 🎯 Immediate Tasks (This Week)

### 🔴 High Priority - Do Now

1. **Create Python Feature Extraction Service Structure**
   - [ ] Create project directory structure
   - [ ] Setup FastAPI app skeleton
   - [ ] Configure dependencies (requirements.txt)
   - [ ] Create Dockerfile
   - **Estimated:** 2 hours
   - **Assigned:** Next session

2. **Implement ResNet50 Feature Extractor**
   - [ ] Download ResNet50 ONNX model
   - [ ] Create feature extractor class
   - [ ] Implement image preprocessing
   - [ ] Add error handling
   - **Estimated:** 4 hours
   - **Assigned:** Next session

3. **Create Feature Extraction Endpoint**
   - [ ] POST /extract-features endpoint
   - [ ] Request/response models
   - [ ] Image upload handling
   - [ ] Basic validation
   - **Estimated:** 3 hours
   - **Assigned:** Next session

### 🟡 Medium Priority - This Week

4. **Update ADR Documentation**
   - [ ] ADR-001: Hybrid .NET + Python Architecture
   - [ ] ADR-002: JWT Authentication Strategy
   - [ ] ADR-003: Service Communication Pattern
   - **Estimated:** 2 hours
   - **Assigned:** Parallel to development

5. **Setup Python Unit Tests**
   - [ ] Configure pytest
   - [ ] Create test fixtures
   - [ ] Write model loading tests
   - **Estimated:** 2 hours
   - **Assigned:** After core implementation

---

## 📌 Next Tasks (Next Week)

1. **Python Vector Similarity Service**
   - [ ] Setup FastAPI structure
   - [ ] Integrate Qdrant client
   - [ ] Implement similarity algorithms
   - [ ] Create search endpoints

2. **Docker Compose Development Environment**
   - [ ] Python services
   - [ ] Qdrant
   - [ ] PostgreSQL
   - [ ] Redis

3. **Start .NET Domain Layer**
   - [ ] Create project structure
   - [ ] Define entities
   - [ ] Define value objects

---

## 🏗️ Architecture Decisions to Document

### Pending ADRs

1. **ADR-001: Hybrid .NET + Python Architecture** ⏳
   - Decision: Use .NET for APIs/orchestration, Python for AI/ML
   - Status: Agreed, needs documentation

2. **ADR-002: JWT Authentication Strategy** ⏳
   - Decision: Hybrid approach (user JWT + service JWT)
   - Phase 1: User JWT propagation only
   - Phase 2: Add service JWT for background jobs
   - Status: Agreed, needs documentation

3. **ADR-003: Development First, Auth Later** ⏳
   - Decision: Build core functionality first, add JWT validation later
   - Use ENABLE_AUTH environment variable for optional auth
   - Status: Agreed, needs documentation

4. **ADR-004: Service Communication Pattern** ⏳
   - Decision: HTTP/REST for synchronous, Kafka for async
   - Token forwarding via Authorization header
   - Status: Agreed, needs documentation

---

## 📊 Success Metrics

### Phase 1 (Weeks 1-4)
- ✅ Feature extraction latency < 500ms
- ✅ API response time < 1s
- ✅ Test coverage > 80%
- ✅ Docker images < 500MB

### Phase 2 (Weeks 5-8)
- ✅ Support 100 requests/second
- ✅ JWT validation < 50ms
- ✅ Cache hit rate > 70%
- ✅ Multiple model support

### Phase 3 (Weeks 9-12)
- ✅ 99.9% uptime
- ✅ Full observability stack
- ✅ Automated deployments
- ✅ Complete documentation

---

## 🚧 Risks & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| ONNX model performance issues | High | Medium | Benchmark early, optimize or switch to TorchServe |
| Qdrant scaling limitations | High | Low | Start with proven config, monitor performance |
| JWT validation overhead | Medium | Medium | Implement caching, use optional auth in dev |
| Docker image size | Low | High | Multi-stage builds, optimize dependencies |

### Schedule Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Underestimated AI/ML complexity | High | Medium | Phase 1 focus on ResNet50 only, add CLIP later |
| Authentication integration delays | Medium | Low | Build without auth first, add as middleware |
| Infrastructure setup time | Medium | Medium | Use existing infrastructure from PROJECT_PLAN |

---

## 📝 Notes & Decisions

### November 27, 2025
- ✅ Decided on hybrid .NET + Python architecture
- ✅ Agreed on JWT authentication strategy (user JWT + service JWT)
- ✅ Chose development-first approach (core before auth)
- ✅ Confirmed Python services will accept user JWT tokens
- ⏳ Need to create ADRs for architecture decisions

---

## 🔗 Related Documents

- [PROJECT_PLAN.md](PROJECT_PLAN.md) - Overall project vision and phases
- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - ADR log (needs update)
- [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md) - System architecture
- [docs/RBAC_PLAN.md](docs/RBAC_PLAN.md) - Authentication and authorization
- [README.md](README.md) - Project overview

---

## 📞 Team & Contacts

- **Architecture Lead:** TBD
- **Backend Developer (.NET):** TBD
- **ML Engineer (Python):** TBD
- **DevOps Engineer:** TBD

---

**Last Updated:** November 27, 2025  
**Next Review:** After Phase 1A completion (Week 2)


# Documentation: docs/ADMIN_IMPERSONATION_PLAN.md

---

# DeepLens Admin & Impersonation Features

This document details the design and implementation of admin access, impersonation, and tenant context switching in DeepLens.

## Admin Access Model

- **Global Admins**: Can access and manage any tenant, including viewing tenant-specific interfaces and resources. Bypass resource-level assignments for universal access, with all actions logged for audit.
- **Tenant Admins**: Restricted to their own tenant’s resources and interface.

## Impersonation

- Product admins can impersonate any user for debugging and support.
- Impersonation sets a runtime context (user id, name, roles, permissions, tenant) but does not change actual assignments.
- All impersonation actions are logged and clearly indicated in the UI.

## Tenant Context Switching

- Global admins can select and view any tenant’s interface using a tenant selector.
- The backend and frontend use this context to filter and display data accordingly.

## Audit Trail

- All admin and impersonation actions are logged for compliance and troubleshooting.

## Implementation Notes

- Database: Store impersonation logs, admin actions, and context switches.
- API: Provide endpoints for impersonation start/stop, tenant selection, and audit retrieval.
- UI: Clearly indicate impersonation mode and provide tenant selection for global admins.

---

For further details, see the main `PROJECT_PLAN.md` and architecture decisions in `ARCHITECTURE_DECISIONS.md`.


# Documentation: docs/ARCHITECTURE_OVERVIEW.md

---

# DeepLens Architecture Overview

This document provides a high-level overview of the DeepLens system architecture, design principles, and diagrams.

## Design Principles
- Unified .NET Backend
- Platform Agnostic
- Horizontal Scaling
- Load Balancing
- Fault Tolerance
- Service Decoupling
- Observable by Design
- Cloud-Native

## Architecture Diagrams

Refer to [PROJECT_PLAN.md](../PROJECT_PLAN.md) for project goals and milestones.

---

For RBAC details, see [RBAC_PLAN.md](RBAC_PLAN.md).
For admin features, see [ADMIN_IMPERSONATION_PLAN.md](ADMIN_IMPERSONATION_PLAN.md).
For storage, see [STORAGE_ARCHITECTURE.md](STORAGE_ARCHITECTURE.md).


# Documentation: docs/DATABASE_SCHEMA.md

---

# DeepLens Identity Database Schema Reference

**Last Updated:** December 18, 2025  
**Database:** PostgreSQL 16  
**ORM:** Dapper (Micro-ORM)

---

## Schema Overview

The NextGen Identity database uses a simple, normalized schema for authentication and tenant management.

### Tables

1. **tenants** - Organization/tenant configurations
2. **users** - User accounts and authentication
3. **refresh_tokens** - OAuth refresh tokens
4. **tenant_api_keys** - Programmatic API access keys

---

## Data Type Mapping

### PostgreSQL → C# Type Reference

| PostgreSQL Type | C# Type    | Notes                                       |
| --------------- | ---------- | ------------------------------------------- |
| `UUID`          | `Guid`     | Use `Guid.NewGuid()` or `gen_random_uuid()` |
| `VARCHAR(n)`    | `string`   | Use `required` or `?` for nullability       |
| `TEXT`          | `string?`  | Large text, usually nullable                |
| `INTEGER`       | `int`      | 32-bit signed integer                       |
| `BIGINT`        | `long`     | 64-bit signed integer                       |
| `SMALLINT`      | `short`    | 16-bit signed (use for enums)               |
| `BOOLEAN`       | `bool`     | True/false values                           |
| `TIMESTAMP`     | `DateTime` | UTC timestamps recommended                  |

### Important Notes:

- ⚠️ **Dapper does NOT auto-convert types** - must match exactly
- ⚠️ **SMALLINT** used for enums (cast in queries: `(int)status`)
- ⚠️ **All timestamps** should be `DateTime.UtcNow` in C#
- ⚠️ **NULL in SQL** = `null` or `?` in C#

---

## Table: `tenants`

### Purpose

Stores tenant/organization configuration and resource limits.

### Schema Definition


### C# Model


### Column Details

| Column                  | Type         | Required | Default             | Description                                      |
| ----------------------- | ------------ | -------- | ------------------- | ------------------------------------------------ |
| `id`                    | UUID         | Yes      | `gen_random_uuid()` | Primary key                                      |
| `name`                  | VARCHAR(255) | Yes      | -                   | Display name                                     |
| `description`           | TEXT         | No       | NULL                | Optional description                             |
| `slug`                  | VARCHAR(100) | Yes      | -                   | URL-safe identifier (unique)                     |
| `database_name`         | VARCHAR(100) | Yes      | -                   | Tenant's database name                           |
| `connection_string`     | TEXT         | No       | NULL                | Optional custom connection                       |
| `qdrant_container_name` | VARCHAR(100) | Yes      | -                   | Qdrant container name                            |
| `qdrant_http_port`      | INTEGER      | Yes      | -                   | Qdrant HTTP port                                 |
| `qdrant_grpc_port`      | INTEGER      | Yes      | -                   | Qdrant gRPC port                                 |
| `minio_endpoint`        | VARCHAR(255) | Yes      | -                   | MinIO endpoint (e.g., `localhost:9000`)          |
| `minio_bucket_name`     | VARCHAR(100) | Yes      | -                   | Tenant's S3 bucket                               |
| `status`                | SMALLINT     | Yes      | 1                   | 1=Active, 2=Suspended, 3=PendingSetup, 4=Deleted |
| `tier`                  | SMALLINT     | Yes      | 1                   | 1=Free, 2=Professional, 3=Enterprise             |
| `max_storage_bytes`     | BIGINT       | Yes      | 10737418240         | Storage quota (10 GB default)                    |
| `max_users`             | INTEGER      | Yes      | 10                  | User limit                                       |
| `max_api_calls_per_day` | INTEGER      | Yes      | 10000               | API rate limit                                   |
| `created_at`            | TIMESTAMP    | Yes      | `CURRENT_TIMESTAMP` | Creation timestamp (UTC)                         |
| `updated_at`            | TIMESTAMP    | No       | NULL                | Last update timestamp                            |
| `deleted_at`            | TIMESTAMP    | No       | NULL                | Soft delete timestamp                            |
| `created_by`            | UUID         | No       | NULL                | User ID who created (NULL for system)            |

### Indexes


---

## Table: `users`

### Purpose

User accounts with authentication and authorization.

### Schema Definition


### C# Model


### Column Details

| Column                            | Type         | Required | Default             | Description                    |
| --------------------------------- | ------------ | -------- | ------------------- | ------------------------------ |
| `id`                              | UUID         | Yes      | `gen_random_uuid()` | Primary key                    |
| `tenant_id`                       | UUID         | Yes      | -                   | Foreign key to tenants         |
| `email`                           | VARCHAR(255) | Yes      | -                   | User email (unique per tenant) |
| `password_hash`                   | VARCHAR(255) | Yes      | -                   | BCrypt hashed password         |
| `first_name`                      | VARCHAR(100) | Yes      | -                   | User's first name              |
| `last_name`                       | VARCHAR(100) | Yes      | -                   | User's last name               |
| `email_confirmed`                 | BOOLEAN      | Yes      | FALSE               | Email verification status      |
| `email_confirmation_token`        | VARCHAR(255) | No       | NULL                | Verification token             |
| `email_confirmation_token_expiry` | TIMESTAMP    | No       | NULL                | Token expiration               |
| `password_reset_token`            | VARCHAR(255) | No       | NULL                | Reset token                    |
| `password_reset_token_expiry`     | TIMESTAMP    | No       | NULL                | Reset expiration               |
| `role`                            | SMALLINT     | Yes      | 1                   | 1=User, 2=Admin, 3=TenantOwner |
| `is_active`                       | BOOLEAN      | Yes      | TRUE                | Account active status          |
| `created_at`                      | TIMESTAMP    | Yes      | `CURRENT_TIMESTAMP` | Account creation (UTC)         |
| `last_login_at`                   | TIMESTAMP    | No       | NULL                | Last successful login          |
| `updated_at`                      | TIMESTAMP    | No       | NULL                | Last update                    |
| `deleted_at`                      | TIMESTAMP    | No       | NULL                | Soft delete                    |

### Indexes


---

## Table: `refresh_tokens`

### Purpose

OAuth 2.0 refresh tokens for token rotation.

### Schema Definition


### C# Model


---

## Table: `tenant_api_keys`

### Purpose

API keys for machine-to-machine authentication.

### Schema Definition


### C# Model


---

## Seeding Strategy

### Default Admin Tenant


### Default Admin User


---

## Best Practices

### 1. Always Use UTC Timestamps


### 2. Enum Casting in SQL


### 3. Soft Deletes


### 4. Guid Generation


---

## Migration Checklist

When adding new columns:

- [ ] Add column to SQL migration
- [ ] Add property to C# model
- [ ] Ensure types match exactly
- [ ] Update repository queries
- [ ] Update seeding if needed
- [ ] Test with Dapper (no auto-conversion)

---

## Common Pitfalls

### ❌ Type Mismatch


### ❌ Enum Without Cast


### ❌ Missing Timezone


---

**Status:** ✅ All models aligned with schema (December 18, 2025)


# Documentation: docs/KAFKA_USAGE_PLAN.md

---

# DeepLens Kafka Usage Plan

## 🎯 **Purpose**

Define exactly how and where Kafka will be used in DeepLens architecture.

## 📋 **Kafka Topics Design**

### **Core Processing Topics**


## 🏗️ **Service Integration**

### **1. Image Ingestion API**


### **2. Processing Worker Service**


### **3. Feature Extraction Service (Python)**


## 🔄 **Event Flow**


## 🎛️ **Configuration**

### **Producer Configuration**


### **Consumer Configuration**


## 📊 **Monitoring & Observability**

### **Key Metrics to Track**

- **Message throughput**: Messages/second per topic
- **Consumer lag**: How far behind consumers are
- **Processing time**: Time from upload to indexed
- **Error rates**: Failed message percentage
- **Topic sizes**: Disk usage per topic

### **Alerts**

- Consumer lag > 10,000 messages
- Error rate > 5% over 5 minutes
- Disk usage > 80% on Kafka brokers
- Processing time > 2 minutes for standard images

## 🚀 **Implementation Priority**

### **Phase 1: Basic Event Flow** (Week 1-2)

1. ✅ Kafka infrastructure (already done)
2. 🔨 Image upload → Kafka producer
3. 🔨 Simple processing worker consumer
4. 🔨 Basic error handling

### **Phase 2: Full Pipeline** (Week 3-4)

1. 🔨 Feature extraction integration
2. 🔨 Vector indexing consumer
3. 🔨 Duplicate detection consumer
4. 🔨 Comprehensive error handling

### **Phase 3: Advanced Features** (Week 5+)

1. 🔨 Dead letter queues
2. 🔨 Message retry strategies
3. 🔨 Consumer group scaling
4. 🔨 Advanced monitoring dashboards

## 🤔 **Alternative: Start Simple**

If Kafka feels too complex initially, we could:

1. **Phase 0**: Use **Redis Streams** for simpler queuing
2. **Phase 1**: Migrate to Kafka when we need advanced features
3. **Keep Kafka Infrastructure**: Ready for when we need it

## 🎯 **Decision Point**

**Should we:**

- **A)** Implement Kafka usage immediately (recommended)
- **B)** Start with Redis Streams, migrate later
- **C)** Remove Kafka from infrastructure for now

**My Recommendation: Option A** - The infrastructure is ready, and event-driven architecture will be essential as DeepLens scales.


# Documentation: docs/MINIO_MULTI_TENANCY.md

---

# MinIO Multi-Tenancy Architecture

**Last Updated:** December 18, 2025  
**Architecture:** Single Instance with Bucket-Based Isolation

---

## Overview

DeepLens uses a **single MinIO instance** to serve all tenants with bucket-based isolation, following industry best practices for S3-compatible object storage multi-tenancy.

### Why Single Instance?

✅ **Resource Efficient** - One service instead of N services  
✅ **Industry Standard** - How AWS S3, Azure Blob, GCS work  
✅ **Simpler Operations** - One service to monitor, backup, scale  
✅ **Better Performance** - MinIO optimized for multi-bucket workloads  
✅ **Cost Effective** - Lower memory and CPU overhead

---

## Architecture Diagram


---

## Tenant Isolation Strategy

### 1. Bucket Isolation

Each tenant gets a dedicated bucket with naming convention:


**Examples:**

- `deeplens-admin` - System administration bucket
- `deeplens-acme` - ACME Corporation tenant
- `deeplens-contoso` - Contoso Ltd tenant

### 2. IAM User Per Tenant

Each tenant has unique access credentials:


### 3. Bucket Policies

Enforce tenant-only access via IAM policies:


### 4. Access Key Restrictions

- Tenant users can **only** access their bucket
- No cross-tenant visibility
- Admin user has full access to all buckets

---

## Setup Instructions

### 1. Start MinIO Container


**Verification:**


---

### 2. Install MinIO Client (mc)

**Windows (Chocolatey):**


**Windows (Manual):**


**Linux/Mac:**


---

### 3. Configure MinIO Alias


---

### 4. Provision New Tenant

**Automated Script (Recommended):**


**Manual Steps:**


---

## Application Integration

### Connection Configuration

**In Tenant Entity:**


**Creating MinIO Client:**


---

## Security Best Practices

### 1. Access Key Rotation


### 2. Encryption at Rest


### 3. Versioning


### 4. Lifecycle Policies


---

## Monitoring & Operations

### Health Check


### Usage Metrics


### Backup Strategy


---

## Migration from Per-Tenant Instances

If you previously had separate MinIO instances per tenant:


---

## Troubleshooting

### Access Denied Errors


### Bucket Not Found


---

## Performance Considerations

### Single Instance Limits

- **Buckets:** No practical limit (millions)
- **Objects per Bucket:** Unlimited
- **Concurrent Connections:** 10,000+ (depends on hardware)
- **Throughput:** Limited by network and disk I/O

### When to Scale

- Consider **MinIO cluster** (distributed mode) when:
  - Storage exceeds single server capacity (10TB+)
  - Need high availability (multiple servers)
  - Throughput requirements > 10 Gbps

---

## References

- [MinIO Multi-Tenancy Guide](https://min.io/docs/minio/linux/administration/identity-access-management/policy-based-access-control.html)
- [MinIO IAM Policies](https://min.io/docs/minio/linux/administration/identity-access-management/iam-overview.html)
- [MinIO Client (mc) Documentation](https://min.io/docs/minio/linux/reference/minio-mc.html)

---

**Note:** This architecture is production-ready and follows MinIO's recommended multi-tenancy patterns.


# Documentation: docs/OAUTH_TESTING_GUIDE.md

---

# OAuth 2.0/OIDC Testing Guide for DeepLens

**Date:** December 18, 2025  
**Purpose:** Comprehensive test scenarios to verify authentication system functionality  
**Identity Server:** Duende IdentityServer 7.1.0 on http://localhost:5198

---

## Prerequisites

Before running these tests, ensure:

1. **PostgreSQL is running:**

   ```powershell
   podman ps | Select-String "deeplens-postgres"
   ```

2. **Identity API is running:**

   ```powershell
   # Should see process on port 5198
   netstat -ano | findstr :5198
   ```

3. **Admin user exists:**
   - Email: `admin@deeplens.local`
   - Password: `DeepLens@Admin123!`
   - Tenant ID: `9f63da1a-135d-4725-b26c-296d76df2338`

---

## Test 1: Discovery Document

**Purpose:** Verify IdentityServer is responding and properly configured

**Command:**


**Expected Result:**


**What This Verifies:**

- ✅ IdentityServer is running and responding
- ✅ Token endpoint is accessible
- ✅ Password grant type is supported
- ✅ All required scopes are available
- ✅ Refresh token support is enabled (grant_types_supported includes "refresh_token")

**Troubleshooting:**

- **Error: Unable to connect** → Check if Identity API is running on port 5198
- **Missing grant types** → Check IdentityServerConfig.cs client configuration
- **Missing scopes** → Check ApiScopes and IdentityResources in IdentityServerConfig.cs

---

## Test 2: Password Grant Flow (Login)

**Purpose:** Verify user authentication with email/password

**Command:**


**Expected Result:**


**What This Verifies:**

- ✅ Password authentication works
- ✅ User credentials are validated correctly
- ✅ BCrypt password hashing is working
- ✅ Access token (JWT) is issued
- ✅ Refresh token is issued (for offline_access scope)
- ✅ Token expiration is set (3600 seconds = 1 hour)
- ✅ All requested scopes are granted

**Troubleshooting:**

- **Error 400: invalid_grant** → Wrong username or password
- **Error 400: invalid_client** → Client ID doesn't exist (check IdentityServerConfig.cs)
- **Error 400: invalid_scope** → Requested scope not configured for client
- **No refresh_token in response** → Check offline_access scope is requested
- **Database connection error** → Check PostgreSQL is running

**Save Tokens for Next Tests:**


---

## Test 3: JWT Token Inspection

**Purpose:** Verify JWT contains correct claims and user information

**Command:**


**Expected Result:**


**What This Verifies:**

- ✅ DeepLensProfileService is populating custom claims
- ✅ User ID (sub) matches database
- ✅ Tenant isolation is working (tenant_id claim)
- ✅ Role-based authorization is possible (role claim)
- ✅ Email is included for user identification
- ✅ Issuer matches IdentityServer URL
- ✅ Audience is set correctly (deeplens-api)
- ✅ Expiration timestamp is in the future

**Verify Token Expiration:**


**Troubleshooting:**

- **Missing custom claims** → Check DeepLensProfileService.GetProfileDataAsync()
- **Wrong tenant_id** → Check user record in database
- **exp is in the past** → Check system clock or token was already used
- **Wrong aud (audience)** → Check ApiResources configuration

---

## Test 4: Refresh Token Flow

**Purpose:** Verify sliding refresh token behavior and token renewal

**Command:**


**Expected Result:**


**What This Verifies:**

- ✅ Refresh token flow works without re-authentication
- ✅ **Refresh token is reused** (TokenUsage.ReUse mode)
- ✅ **Sliding expiration resets** (15-day window restarts)
- ✅ New access token is generated with updated claims
- ✅ Access token lifetime is reset (new 1-hour expiration)
- ✅ User stays logged in as long as they're active

**Sliding Expiration Behavior:**


**Configuration Reference:**


**Troubleshooting:**

- **Error 400: invalid_grant** → Refresh token expired or doesn't exist
- **Refresh token changes** → Check TokenUsage is set to ReUse (not OneTimeOnly)
- **Access token is same** → IdentityServer bug, should always generate new JWT
- **Claims not updated** → Check UpdateAccessTokenClaimsOnRefresh = true

---

## Test 5: Token Revocation (Logout)

**Purpose:** Verify logout properly invalidates refresh tokens

**Command:**


**Expected Result:**


**What This Verifies:**

- ✅ Token revocation endpoint works
- ✅ Refresh tokens are properly invalidated
- ✅ Revoked tokens cannot be used to get new access tokens
- ✅ Proper error handling (400 Bad Request)
- ✅ Logout flow prevents session continuation

**Important Notes:**

1. **Revocation affects refresh tokens only** - Existing access tokens remain valid until expiration (1 hour)
2. **Stateless JWT problem** - Server cannot invalidate JWTs that are already issued
3. **Security consideration** - For critical operations, implement token blacklist or use shorter access token lifetimes

**Complete Logout Flow:**


**Troubleshooting:**

- **Revocation always returns 200** → This is correct per RFC 7009 (even for invalid tokens)
- **Token still works after revocation** → Check refresh token repository database queries
- **Error 400 on revocation** → Check client_id matches the one used to issue token

---

## Test 6: Multiple Refresh Cycles (Sliding Expiration)

**Purpose:** Verify that refresh window truly resets on each use

**Command:**


**Expected Result:**


**What This Verifies:**

- ✅ Refresh token doesn't expire during active use
- ✅ Sliding window mechanism works correctly
- ✅ Same refresh token can be used multiple times
- ✅ Each use extends the session lifetime
- ✅ No degradation or issues after multiple refreshes

---

## Test 7: Invalid Credentials

**Purpose:** Verify proper error handling for authentication failures

**Command:**


**Expected Result:**


**What This Verifies:**

- ✅ Password validation works (BCrypt comparison)
- ✅ User lookup works correctly
- ✅ Client validation prevents unauthorized clients
- ✅ Scope validation prevents privilege escalation
- ✅ Proper error responses (400 Bad Request)
- ✅ No sensitive information leaked in errors

---

## Test 8: Token Expiration Test

**Purpose:** Verify access token expiration enforcement (requires waiting 1 hour or manual time manipulation)

**Quick Test (Manual Verification):**


**Expected Result:**


**What This Verifies:**

- ✅ Token expiration timestamp is accurate
- ✅ expires_in matches actual JWT expiration
- ✅ Access token lifetime is 1 hour as configured
- ✅ Token will be rejected after expiration (API validation)

---

## Test 9: CORS Preflight (WebUI Integration)

**Purpose:** Verify CORS is configured for WebUI origin

**Command:**


**Expected Result:**


**What This Verifies:**

- ✅ CORS middleware is active
- ✅ WebUI origin (localhost:3000) is allowed
- ✅ POST method is permitted
- ✅ Content-Type header is allowed
- ✅ Browser won't block token requests from WebUI

---

## Test 10: Complete Authentication Flow

**Purpose:** End-to-end test simulating real user session

**Command:**


**Expected Result:**


**What This Verifies:**

- ✅ Complete user authentication lifecycle
- ✅ All major OAuth flows work together
- ✅ Token management is correct
- ✅ Logout properly terminates sessions

---

## Quick Health Check Script

**Purpose:** Fast verification that everything is working

**Command:**


---

## Troubleshooting Guide

### Common Issues

**1. Connection Refused / Cannot connect to localhost:5198**


**2. Database connection errors**


**3. Password authentication fails**

- Check user exists in database
- Verify password is exactly: `DeepLens@Admin123!`
- Check BCrypt hashing is working
- Review Identity API logs

**4. Missing claims in JWT**

- Check DeepLensProfileService implementation
- Verify user record has all required fields
- Check IUserRepository.GetByIdAsync() returns complete data

**5. Refresh token doesn't work**

- Verify offline_access scope was requested during login
- Check refresh token exists in database
- Verify client_id matches original login
- Check token hasn't expired (15 days)

---

## Performance Benchmarks

**Token Generation (avg of 10 runs):**

- Password grant: ~200-300ms
- Refresh token: ~100-150ms
- Token revocation: ~50-100ms

**If significantly slower:**

- Check database connection pool
- Review query performance
- Check BCrypt work factor (currently 12)

---

## Security Checklist

Before going to production, verify:

- [ ] HTTPS enabled (not HTTP)
- [ ] Production signing certificate configured
- [ ] Database credentials secured (not in source code)
- [ ] CORS restricted to production domains only
- [ ] Rate limiting implemented
- [ ] Duende license obtained (if using paid features)
- [ ] Token lifetime appropriate for use case
- [ ] Persistent grant store configured (not in-memory)
- [ ] Logging and monitoring enabled
- [ ] Password grant disabled (use PKCE instead)

---

## Reference

**Test Credentials:**

- Email: `admin@deeplens.local`
- Password: `DeepLens@Admin123!`
- Tenant: `9f63da1a-135d-4725-b26c-296d76df2338`

**Endpoints:**

- Discovery: `GET http://localhost:5198/.well-known/openid-configuration`
- Token: `POST http://localhost:5198/connect/token`
- Revocation: `POST http://localhost:5198/connect/revocation`

**Client IDs:**

- Development: `deeplens-webui-dev` (password grant)
- Production: `deeplens-webui` (authorization code + PKCE)

**Scopes:**

- OpenID: `openid`, `profile`, `email`, `roles`
- API: `deeplens.api`, `deeplens.search`, `deeplens.admin`, `deeplens.identity`
- Refresh: `offline_access`

---

**Last Updated:** December 18, 2025  
**Tested Against:** Duende IdentityServer 7.1.0, PostgreSQL 16, .NET 9.0


# Documentation: docs/RATE_LIMITING_IMPLEMENTATION.md

---

# Rate Limiting Implementation Guide

This document provides the complete implementation details for DeepLens's dynamic, database-backed rate limiting system.

**Related Documentation:**

- [ARCHITECTURE_DECISIONS.md](../ARCHITECTURE_DECISIONS.md) - ADR-004 and ADR-005
- [PROJECT_PLAN.md](../PROJECT_PLAN.md) - Overall system architecture

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Domain Models](#domain-models)
4. [Service Layer](#service-layer)
5. [API Gateway Integration](#api-gateway-integration)
6. [Endpoint-Specific Rate Limiting](#endpoint-specific-rate-limiting)
7. [Admin API](#admin-api)
8. [Configuration](#configuration)
9. [Testing](#testing)

---

## Architecture Overview

### Multi-Level Rate Limiting


### Data Flow


---

## Database Schema


---

## Domain Models


---

## Service Layer


For the complete service implementation with caching, see the full source in `DeepLens.Infrastructure/Services/TenantRateLimitService.cs`.

**Key Implementation Points:**

1. **Redis Caching:** 5-minute TTL for tenant configs
2. **Fallback Logic:** Returns free tier if tenant not found
3. **Distributed Counters:** Redis atomic increment for rate checks
4. **Error Handling:** Fails open on Redis errors (allows request)
5. **Logging:** Comprehensive logging for debugging and monitoring

---

## API Gateway Integration


---

## Endpoint-Specific Rate Limiting


---

## Admin API


---

## Configuration


---

## Testing

### Unit Tests


### Integration Tests


---

## Monitoring

### Key Metrics


### Grafana Dashboard

Create dashboards for:

- Rate limit hits per tenant
- Cache hit rates
- Most rate-limited endpoints
- Tier distribution
- Revenue by tier

---

## Troubleshooting

### Issue: Rate limits not applied

**Solution:** Check JWT contains `tenant_id` claim

### Issue: All requests return 429

**Solution:** Check Redis connection and counter keys

### Issue: Config changes not reflected

**Solution:** Wait up to 5 minutes for cache expiration or manually clear cache

### Issue: Unlimited tenant still rate limited

**Solution:** Verify `is_unlimited` flag in database

---

## Performance Considerations

1. **Cache Hit Rate:** Target >95% to minimize database load
2. **Redis Latency:** Keep <5ms for rate checks
3. **Database Queries:** Use connection pooling, prepared statements
4. **Monitoring:** Track P99 latency for rate limit checks

---

## Security Notes

1. **Admin Operations:** Require `SuperAdmin` role for custom limits
2. **Audit Logging:** Log all rate limit configuration changes
3. **DDoS Protection:** API Gateway provides first line of defense
4. **Tenant Isolation:** Redis keys include tenant_id to prevent leakage


# Documentation: docs/RBAC_PLAN.md

---

# DeepLens Role-Based Access Control (RBAC) Plan

This document details the RBAC model, roles, permissions, and implementation for DeepLens.

## Overview
- Centralized RBAC using NextGen.Identity
- Roles, permissions, resource types, and assignments

## Implementation Details
- See [CODE_EXAMPLES.md](../CODE_EXAMPLES.md#role-based-access-control-rbac) for code samples
- For admin and impersonation, see [ADMIN_IMPERSONATION_PLAN.md](ADMIN_IMPERSONATION_PLAN.md)
- For architecture, see [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)

## Role Definitions
- Global Admin
- Tenant Admin
- Contributor
- Reader
- Developer

## Resource Types
- Storage
- API

## Assignment Model
- Direct user assignments
- Group assignments
- Wildcard and per-resource assignments

---

For storage architecture, see [STORAGE_ARCHITECTURE.md](STORAGE_ARCHITECTURE.md).


# Documentation: docs/STORAGE_ARCHITECTURE.md

---

# DeepLens Storage Architecture

This document describes the multi-tenant storage model, BYOS (Bring Your Own Storage), and database schema for DeepLens.

## Storage Model
- Platform-wide and tenant-specific databases
- Tenant-owned storage (Azure Blob, AWS S3, Google Cloud, NFS, MinIO)

## Database Schema
- PostgreSQL for metadata
- Qdrant for vector storage
- Redis for caching

## Provisioning Model
- Each tenant gets a cloned metadata database
- Isolated vector spaces per tenant

## Example Queries
- Find all pods for a tenant across clusters
- Capacity planning for nodes

---

For RBAC, see [RBAC_PLAN.md](RBAC_PLAN.md).
For architecture, see [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md).
For admin features, see [ADMIN_IMPERSONATION_PLAN.md](ADMIN_IMPERSONATION_PLAN.md).


# Documentation: docs/THUMBNAILS.md

---

# Thumbnail Management System

## Overview

DeepLens uses a flexible, tenant-configurable thumbnail generation system that preserves aspect ratios (Google Image Search style) and supports multiple modern image formats. Thumbnails are generated on-demand and managed automatically based on tenant configuration.

## Configuration

### Tenant-Level Configuration

Each tenant can configure their thumbnail generation preferences through the API:


### Specification Attributes

#### Common Attributes (All Formats)

| Attribute         | Type   | Description                                   | Default  |
| ----------------- | ------ | --------------------------------------------- | -------- |
| `name`            | string | Unique identifier for this specification      | Required |
| `maxWidth`        | int    | Maximum width in pixels                       | Required |
| `maxHeight`       | int    | Maximum height in pixels                      | Required |
| `format`          | enum   | Output format: Jpeg, WebP, Png, Avif, JpegXL  | WebP     |
| `fitMode`         | enum   | Resize mode: Inside, Cover, Contain           | Inside   |
| `stripMetadata`   | bool   | Remove EXIF metadata                          | true     |
| `backgroundColor` | string | Background color for transparent images (hex) | #FFFFFF  |

#### Format-Specific Options

**JPEG Options**


**WebP Options**


**PNG Options**


**AVIF Options**


**JPEG XL Options**


## Behavior and Outcomes

### Aspect Ratio Preservation (Google Image Search Style)

All thumbnails preserve the original image's aspect ratio using `FitMode.Inside`:

| Original Image      | Specification | Result            |
| ------------------- | ------------- | ----------------- |
| 600x900 (portrait)  | 300x300 max   | 200x300 thumbnail |
| 900x600 (landscape) | 300x300 max   | 300x200 thumbnail |
| 800x800 (square)    | 300x300 max   | 300x300 thumbnail |
| 1200x400 (wide)     | 300x300 max   | 300x100 thumbnail |

**Display**: Thumbnails displayed in CSS grid with `object-fit` to maintain spacing while preserving aspect ratios.

### Transparent Images

Images with transparency (PNG, WebP with alpha) are handled as follows:

- **Preserve transparency**: If output format supports alpha (WebP, PNG, AVIF)
- **Flatten to background**: If output format doesn't support alpha (JPEG)
- **Background color**: Uses `backgroundColor` from specification (default: white)

### Metadata Handling

- **EXIF Data**: Stripped from thumbnails by default (`stripMetadata: true`)
- **Benefits**: Reduced file size, privacy protection (removes GPS, camera info, etc.)
- **Original**: EXIF preserved in original image, stored in database

## Thumbnail Creation

### Initial Upload Flow

1. **Image uploaded** → Stored in blob storage
2. **Validation service** reads tenant thumbnail configuration
3. **If `generateOnUpload: true`**:
   - Generate all configured thumbnail specifications
   - Store in: `{tenant_id}/thumbnails/{image_id}_{spec_name}.{format}`
   - Example: `abc123/thumbnails/img456_small.webp`
4. **Publish Kafka event**: `images.validated`

### On-Demand Generation

When a thumbnail is requested but doesn't exist:

1. **Request**: `GET /api/v1/images/{id}/thumbnail?spec=medium`
2. **Check storage**: Does `{tenant_id}/thumbnails/{image_id}_medium.webp` exist?
3. **If not found**:
   - Fetch original image from storage
   - Read tenant's "medium" specification
   - Generate thumbnail according to spec
   - Store in blob storage
   - Cache in Redis (if enabled)
   - Return to client
4. **If found**: Return from storage (possibly cached in Redis)

### Storage Path Convention


**No database tracking required** - paths are predictable and constructed on-demand.

## Configuration Changes

### Adding New Specifications

**Scenario**: Tenant adds a new specification "xlarge" to their configuration.

**Behavior**:

1. Update tenant configuration via API
2. **Existing images**: Thumbnails generated on-demand when first requested
3. **New images**: All thumbnails (including xlarge) generated on upload if `generateOnUpload: true`
4. **No immediate action**: No background job needed - lazy generation

**Example**:


### Removing Specifications

**Scenario**: Tenant removes "large" specification from their configuration.

**Behavior**:

1. Update tenant configuration via API
2. Call cleanup endpoint:


3. **Background job triggered**:
   - Iterates through all tenant's images
   - Tags thumbnails in MinIO with `deleted=true` metadata
   - Soft delete: `{tenant_id}/thumbnails/{image_id}_large.*`
4. **MinIO lifecycle rules**: Permanently delete after 30 days

**Recovery window**: 30 days to restore if removal was accidental.

### Modifying Specifications

**Scenario**: Tenant changes "medium" specification from WebP 85% to JPEG 90%.

**Behavior**:

1. Update tenant configuration via API
2. **Existing thumbnails**: Remain unchanged until regenerated
3. **Regeneration triggers**:
   - Explicitly: Call thumbnail regeneration API
   - Automatically: Delete old thumbnail → next request generates new one
   - Batch: Background job to regenerate all thumbnails

**Options**:


## Thumbnail Deletion

### Individual Image Deletion

When an image is deleted:

1. **Soft delete image**: Set `deleted_at` timestamp in database
2. **Tag in MinIO**: Add `deleted=true` metadata to image and all thumbnails
3. **MinIO lifecycle rules**: Permanently delete after 30-day retention period

**Storage paths affected**:


### Specification Removal

See "Removing Specifications" section above.

### Tenant Deletion

When a tenant is deleted:

1. **Soft delete tenant**: Set `deleted_at` timestamp
2. **Tag all objects**: MinIO tag `deleted=true` on entire tenant bucket/prefix
3. **MinIO lifecycle rules**: Permanently delete after 30 days
4. **Recovery**: Can restore tenant and all data within 30-day window

## Caching Strategy

### Redis Caching (Optional)

If `enableCaching: true` in tenant configuration:

**Cache Key Pattern**: `thumbnail:{tenant_id}:{image_id}:{spec_name}`

**Flow**:

1. **Request**: GET thumbnail
2. **Check Redis**: Key exists?
3. **If cached**: Return from Redis
4. **If not cached**:
   - Fetch from blob storage (or generate if missing)
   - Store in Redis with TTL (`cacheTtlSeconds`)
   - Return to client

**Cache Invalidation**:

- **TTL expiry**: Automatic after `cacheTtlSeconds` (default: 24 hours)
- **Explicit**: When thumbnail regenerated or deleted
- **Pattern delete**: When specification removed from config

**Cache Settings**:


### CDN Integration (Future)

Thumbnails are CDN-friendly:

- Static URLs based on image ID and spec name
- Long cache headers (immutable once generated)
- Origin server: MinIO/blob storage
- Cache purge: Only on explicit regeneration

## API Endpoints

### Retrieve Thumbnails


### Manage Thumbnails


### Configure Tenant Thumbnails


## Performance Considerations

### Generation Performance

**Factors affecting generation time**:

- Original image size (larger = slower)
- Output format (WebP lossy < PNG < WebP lossless)
- Quality/compression settings (higher = slower)
- Number of specifications (more = longer)

**Optimization strategies**:

1. **Parallel generation**: Generate multiple specs concurrently
2. **GPU acceleration**: Use GPU for format encoding (especially AVIF, WebP)
3. **Smart caching**: Cache hot thumbnails in Redis
4. **Lazy loading**: Generate on-demand for infrequently accessed images

### Storage Considerations

**Storage usage per image** (approximate):

| Specification    | Format | Quality | Size (for 2MB original) |
| ---------------- | ------ | ------- | ----------------------- |
| small (150x150)  | WebP   | 80      | 3-8 KB                  |
| medium (300x300) | WebP   | 85      | 10-25 KB                |
| large (600x600)  | WebP   | 90      | 35-85 KB                |
| **Total**        |        |         | **~50-120 KB**          |

**For 1 million images**:

- Original images: 2TB (assuming 2MB average)
- Thumbnails: 50-120GB (2.5-6% of original size)

### MinIO Lifecycle Rules


## Best Practices

### Recommended Presets

**E-commerce / Product Images**


**Photo Gallery**


**Medical Imaging (High Fidelity)**


### Format Selection Guidelines

| Use Case               | Recommended Format   | Rationale                                    |
| ---------------------- | -------------------- | -------------------------------------------- |
| General web thumbnails | WebP                 | Best compression/quality ratio, wide support |
| Legacy browser support | JPEG                 | Universal compatibility                      |
| High quality/archival  | PNG or WebP lossless | Perfect quality preservation                 |
| Cutting-edge web apps  | AVIF                 | Best compression, modern browsers            |
| Future-proof           | JPEG XL              | Excellent compression, future standard       |

### Configuration Tips

1. **Start with 3 sizes**: small (150px), medium (300px), large (600px)
2. **Use WebP by default**: Best balance of quality and size
3. **Enable caching**: Significant performance boost for frequently accessed images
4. **Generate on upload**: Better UX than on-demand for high-traffic sites
5. **Monitor storage**: Set up alerts when thumbnail storage exceeds thresholds
6. **Test specifications**: Validate quality/size tradeoffs with sample images
7. **Document custom specs**: Keep track of why specific specifications exist

## Troubleshooting

### Thumbnail Not Found

**Symptoms**: 404 when requesting thumbnail

**Possible causes**:

1. Image doesn't exist
2. Specification name doesn't match tenant config
3. Generation failed (check logs)
4. Storage backend unavailable

**Resolution**:

- Check image exists in database
- Verify specification name in tenant config
- Check error logs for generation failures
- Verify MinIO/storage connectivity

### Poor Thumbnail Quality

**Symptoms**: Thumbnails appear blurry or pixelated

**Possible causes**:

1. Quality setting too low
2. Source image low quality
3. Format not optimal for image type

**Resolution**:

- Increase quality setting (try 85-92 for WebP)
- Check original image quality
- Try different format (PNG for graphics, WebP for photos)

### Slow Thumbnail Generation

**Symptoms**: Long delays when accessing thumbnails

**Possible causes**:

1. Large source images
2. Complex format settings (high quality, lossless)
3. No caching enabled
4. Sequential generation instead of parallel

**Resolution**:

- Enable Redis caching
- Generate on upload instead of on-demand
- Use parallel thumbnail generation
- Consider lower quality/faster formats for less critical specs

### Storage Growing Too Fast

**Symptoms**: Thumbnail storage exceeding expectations

**Possible causes**:

1. Too many specifications configured
2. Large thumbnail dimensions
3. High quality settings
4. Lifecycle rules not working

**Resolution**:

- Review and consolidate specifications
- Reduce max dimensions if acceptable
- Lower quality settings slightly
- Verify MinIO lifecycle rules are active
- Implement cold storage transitions for old thumbnails
# Thumbnail Path Convention

## Overview

DeepLens uses a **convention-over-configuration** approach for thumbnail storage. Instead of tracking each thumbnail in the database, we derive thumbnail paths programmatically from the original image path and specification name.

## Design Principles

1. **No Database Tracking**: Thumbnails are not stored as separate database entities
2. **Programmatic Path Generation**: Thumbnail paths are calculated on-demand from image ID + specification name
3. **Same Storage Backend**: Thumbnails always reside in the same storage configuration as the original image
4. **Consistent Naming**: Predictable paths enable caching, CDN integration, and direct access

## Path Convention

### Original Image Path


### Thumbnail Path Pattern


### Path Components

| Component        | Description                   | Example                             |
| ---------------- | ----------------------------- | ----------------------------------- |
| `{bucket}`       | Storage bucket/container name | `deeplens`                          |
| `{tenant-id}`    | Tenant's unique identifier    | `550e8400-e29b-...`                 |
| `{spec-name}`    | Thumbnail specification name  | `small-webp`, `medium-jpeg`         |
| `{year}/{month}` | Upload date partitioning      | `2024/12`                           |
| `{image-id}`     | Original image's GUID         | `7c9e6679-...`                      |
| `{format}`       | Output format extension       | `webp`, `jpg`, `png`, `avif`, `jxl` |

## Upload Flow

When a user uploads an image:

1. **Storage Selection**:

   - User optionally specifies `StorageConfigurationId` in upload request
   - If not specified, use tenant's default storage configuration
   - Store `StorageConfigurationId` in `Image.StorageConfigurationId` field

2. **Original Image Storage**:

   ```
   POST /api/v1/images/upload
   Body: {
     "storageConfigurationId": "azure-primary",  // Optional
     "file": <binary>
   }
   ```

   - Save original to: `{bucket}/{tenant-id}/images/{year}/{month}/{image-id}.{ext}`
   - Record `StoragePath` and `StorageConfigurationId` in database

3. **Thumbnail Generation**:

   - Read tenant's active `ThumbnailConfiguration.Specifications[]`
   - For each enabled specification:
     - Generate thumbnail according to format options
     - Save to: `{bucket}/{tenant-id}/thumbnails/{spec-name}/{year}/{month}/{image-id}.{format}`
   - All thumbnails stored in **same storage backend** as original

4. **Database Record**:
   ```json
   {
     "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
     "tenantId": "550e8400-e29b-41d4-a716-446655440000",
     "storageConfigurationId": "azure-primary",
     "storagePath": "images/2024/12/7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg",
     "originalFilename": "vacation-photo.jpg"
   }
   ```

## Retrieval Flow

### Get Thumbnail by Specification Name


**Server-side logic**:

1. Query `Image` table for `imageId`
2. Get `StorageConfigurationId` to determine which storage backend
3. Extract year/month from `CreatedAt` or parse from `StoragePath`
4. Calculate thumbnail path:
   ```
   path = $"{tenantId}/thumbnails/{specName}/{year}/{month}/{imageId}.{format}"
   ```
5. Check Redis cache first: `thumbnail:{imageId}:{specName}`
6. If not cached, fetch from storage backend using calculated path
7. Cache in Redis with TTL (default 24h)
8. Return thumbnail

### List All Thumbnails for an Image


**Server-side logic**:

1. Query `Image` table for `imageId` and `TenantId`
2. Query `Tenant` table for `ThumbnailConfiguration.Specifications[]`
3. For each specification, calculate expected path
4. Optionally verify existence in storage (list operation)
5. Return array of available thumbnails with URLs

## Code Example


## Benefits

### 1. **Simplicity**

- No junction tables or thumbnail tracking
- Single source of truth: original image record
- Reduced database size and complexity

### 2. **Performance**

- Direct path calculation (no database joins)
- Predictable paths enable CDN/cache pre-warming
- Storage provider can list thumbnails by prefix

### 3. **Consistency**

- Thumbnails always in same storage as original
- No orphaned thumbnail records
- Easy cleanup: delete original = delete all thumbnails

### 4. **Flexibility**

- Add new thumbnail specs without migration
- On-demand generation for missing thumbnails
- Storage migration moves entire image set together

### 5. **Scalability**

- No database bloat (1 record per image, not N per thumbnail spec)
- Storage operations parallelizable by prefix
- Cache keys predictable for distributed caching

## Edge Cases

### Missing Thumbnails

If a thumbnail doesn't exist (e.g., spec added after upload):

1. Return 404 or trigger on-demand generation
2. Generate thumbnail from original
3. Store at calculated path
4. Return generated thumbnail

### Storage Migration

When moving images between storage backends:

1. Copy original image to new storage
2. Copy all thumbnails (list by prefix pattern)
3. Update `Image.StorageConfigurationId`
4. Invalidate cache entries
5. Delete from old storage (optional, after verification)

### Tenant Config Changes

When thumbnail specifications change:

- New specs: Generated on-demand when requested
- Removed specs: Use MinIO lifecycle rules to auto-delete after 30 days
- Modified specs: Regenerate via batch job or on-demand

## MinIO Lifecycle Rules

Configure lifecycle policies to manage thumbnails:


## API Response Examples

### Get Thumbnail


### List Available Thumbnails


## Summary

By using a programmatic path convention, DeepLens achieves:

- ✅ **Zero database overhead** for thumbnail tracking
- ✅ **Predictable storage paths** for CDN/cache optimization
- ✅ **Simple multi-storage support** (thumbnails follow original)
- ✅ **Easy cleanup** via storage lifecycle rules
- ✅ **On-demand generation** for missing thumbnails
- ✅ **Scalable architecture** without database bloat

The image ID + specification name is sufficient to calculate any thumbnail's location programmatically.
# Database Schema for Thumbnail Specifications

## Design Approach: JSON Storage for Flexibility

Instead of creating separate columns for each format's attributes, we use **JSON columns** in PostgreSQL to store the complex `ThumbnailSpecification` objects. This provides maximum flexibility without schema migrations when adding new formats.

## Schema Design

### Tenants Table


### Images Table


## Benefits of JSON Storage

### ✅ **Flexibility**

- Add new image formats (JPEG XL, AVIF) without schema migration
- Each format can have unique attributes
- Easy to add new specifications without altering tables

### ✅ **Query Capability**


### ✅ **Validation**

- C# models provide strong typing
- JSON serialization ensures data integrity
- Database constraints on outer structure

## Entity Framework Core Configuration


## Thumbnail File Naming Convention

No database tracking needed - thumbnails stored with predictable paths:


## Adding New Formats

To add a new format (e.g., JPEG 2000):

1. Add enum value: `public enum ThumbnailFormat { Jpeg, WebP, Png, Avif, JpegXL, Jpeg2000 }`
2. Add options class: `public class Jpeg2000Options { public int Quality { get; set; } }`
3. Add to FormatOptions: `public Jpeg2000Options? Jpeg2000 { get; set; }`
4. **No database migration needed!**

The JSON column automatically accommodates the new structure.


# Documentation: docs/TOKEN_LIFECYCLE.md

---

# Token Lifecycle and Refresh Token Behavior

**Date:** December 18, 2025  
**Status:** Implemented and Tested

---

## Overview

DeepLens uses Duende IdentityServer 7.1.0 for OAuth 2.0/OpenID Connect authentication. The token lifecycle is designed to balance security and user experience through a sliding refresh token mechanism.

---

## Token Types

### 1. **Access Token (JWT)**

- **Lifetime:** 1 hour (3600 seconds)
- **Purpose:** Authorizes API requests
- **Contains:** User claims (sub, email, name, role, tenant_id, is_active)
- **Format:** Bearer token (JWT)
- **Audience:** `deeplens-api`

**Example Claims:**


### 2. **Refresh Token**

- **Lifetime:** 15 days (1,296,000 seconds) **SLIDING**
- **Purpose:** Obtains new access tokens without re-authentication
- **Format:** Opaque reference token
- **Usage:** `TokenUsage.ReUse` (same token used multiple times)
- **Expiration:** `TokenExpiration.Sliding` (resets on each use)

### 3. **Identity Token**

- **Lifetime:** 5 minutes (300 seconds)
- **Purpose:** Contains user identity information for the client
- **Format:** JWT
- **Note:** Only issued in authorization code flow (not password grant)

---

## Sliding Refresh Token Behavior

### How It Works

**Configuration:**


**Behavior:**

1. User logs in → Receives access token + refresh token
2. Access token expires after 1 hour
3. Client uses refresh token to get new access token
4. **Sliding window resets to 15 days from the refresh request**
5. Same refresh token is reused (not rotated)
6. New access token is issued with updated claims

### Active Session Benefit

✅ **Yes, the token lifetime DOES increase as the user session stays active!**

- **Initial login:** Refresh token valid for 15 days from login time
- **After 7 days:** User refreshes → Refresh token now valid for 15 days from day 7
- **After 14 days:** User refreshes → Refresh token now valid for 15 days from day 14
- **Result:** As long as the user is active, their session never expires

**Inactivity timeout:**

- If user doesn't use the app for 15 days → Refresh token expires
- User must re-authenticate with email/password

---

## Token Refresh Flow

### Successful Refresh

**Request:**


**Response:**


**Observations:**

- ✅ Access token changes (new JWT with updated claims)
- ✅ Refresh token stays the same (ReUse mode)
- ✅ Sliding window resets to 15 days
- ✅ All user claims are updated (UpdateAccessTokenClaimsOnRefresh = true)

---

## Token Revocation (Logout)

### How to Revoke

**Request:**


**Response:**

- HTTP 200 OK (even if token doesn't exist)
- No response body

**Effects:**

- ✅ Refresh token is invalidated
- ✅ Cannot be used to get new access tokens
- ⚠️ Existing access tokens remain valid until expiration (1 hour)
- ⚠️ Server cannot invalidate JWTs (stateless by design)

### Best Practices for Logout

1. **Client-side:**

   - Clear all tokens from storage (localStorage/sessionStorage)
   - Clear AuthContext state
   - Redirect to login page

2. **Server-side:**

   - Revoke refresh token via `/connect/revocation`
   - Log the logout event

3. **Security note:**
   - Access tokens remain valid for 1 hour after logout
   - For critical operations, implement server-side token blacklist
   - Or use shorter access token lifetimes (e.g., 15 minutes)

---

## Testing Results

### Test 1: Refresh Token Flow


### Test 2: Token Revocation


---

## Security Considerations

### Why Sliding Refresh Tokens?

**Pros:**

- ✅ Better UX: Active users never logged out
- ✅ Automatic session extension
- ✅ Simplicity: No token rotation complexity

**Cons:**

- ⚠️ If refresh token is stolen, attacker can maintain access indefinitely
- ⚠️ No detection of token theft (rotation would detect this)

### Mitigation Strategies

1. **Use HTTPS only** (prevents token interception)
2. **Implement token binding** (bind refresh token to device/IP)
3. **Monitor refresh patterns** (alert on unusual refresh frequency)
4. **Absolute maximum lifetime** (even with sliding, enforce 90-day max)
5. **Require re-authentication for sensitive operations** (password change, etc.)

---

## Configuration Options

### Current Production Config


### Alternative: OneTime Refresh Tokens (More Secure)


**Behavior:**

- Each refresh issues a new refresh token
- Old refresh token is invalidated
- Can detect token theft (parallel refresh attempts)
- More complex for clients (must handle rotation)

---

## API Endpoints

### Token Endpoint

- **URL:** `POST http://localhost:5198/connect/token`
- **Grants:** `password`, `refresh_token`, `client_credentials`
- **Authentication:** Client credentials (for confidential clients)

### Revocation Endpoint

- **URL:** `POST http://localhost:5198/connect/revocation`
- **Purpose:** Revoke refresh tokens
- **Response:** Always 200 OK

### Introspection Endpoint (Future)

- **URL:** `POST http://localhost:5198/connect/introspect`
- **Purpose:** Check token validity and claims
- **Note:** Not yet configured

### Discovery Endpoint

- **URL:** `GET http://localhost:5198/.well-known/openid-configuration`
- **Purpose:** OIDC metadata (endpoints, scopes, grant types)

---

## WebUI Integration

### AuthContext Implementation

**Token Storage:**


**Automatic Refresh:**


**Logout:**


---

## Monitoring and Metrics

### Recommended Telemetry

1. **Token issuance rate** (logins per hour)
2. **Refresh token usage** (refreshes per user per day)
3. **Token revocation rate** (logouts per hour)
4. **Failed refresh attempts** (expired/revoked tokens)
5. **Average session duration** (time between login and last refresh)

### OpenTelemetry Integration


---

## Future Improvements

1. **Implement absolute maximum session duration** (90 days)
2. **Add token binding** (device fingerprinting)
3. **Switch to PKCE flow** (more secure than password grant)
4. **Add persistent grant store** (PostgreSQL instead of in-memory)
5. **Implement token theft detection** (parallel refresh monitoring)
6. **Add refresh token audit log** (track all refresh events)

---

## Credentials

**Admin User:**

- Email: `admin@deeplens.local`
- Password: `DeepLens@Admin123!`
- Tenant ID: `9f63da1a-135d-4725-b26c-296d76df2338`
- User ID: `53d03827-a474-4502-9a94-e885eb7bebd1`

---

## References

- [Duende IdentityServer Documentation](https://docs.duendesoftware.com/identityserver/v7)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [Token Revocation RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009)


# Documentation: docs/working-notes/archive/AB_TESTING_STRATEGY.md

---

"""
A/B Testing Strategy for Multi-Model Vector Systems

This document addresses the challenge: "In A/B testing, an image is vectorized 
into only one embedding initially - how do we compare across models?"
"""

## 🚨 The A/B Testing Challenge

### Traditional A/B Testing Problem

## 💡 Solution Strategies

### Strategy 1: Dual Vectorization (Recommended)

#### During A/B Test Period: Extract with BOTH Models

#### Search During A/B Test: Compare Both Results

### Strategy 2: Representative Sample Approach

#### Build Test Collection from Sample

### Strategy 3: Progressive Migration Approach

#### Gradual Collection Building

## 📊 A/B Test Implementation Framework

### Configuration Management

### Metrics Collection

## 🎯 Recommended Implementation

### Phase 1: Start with Dual Vectorization (Week 1)

### Phase 2: Add Sample-Based Testing (Week 2) 

### Phase 3: Progressive Migration (Ongoing)

## Key Implementation Points

### ✅ What Works:
- **Dual Vectorization**: Extract with both models for new images
- **Sample Testing**: Use representative subset for comparison  
- **Progressive Migration**: Gradual background re-processing
- **Hash-Based Traffic Splitting**: Consistent user assignment

### ❌ What Doesn't Work:
- Trying to compare vectors across different model dimensions
- Re-processing entire datasets synchronously 
- A/B testing without sufficient sample size
- Ignoring statistical significance in results

### 🔧 Practical A/B Test Workflow:

1. **Setup**: Configure dual extraction for test period
2. **Collection Building**: Use sample or progressive migration
3. **Traffic Splitting**: Route users deterministically 
4. **Metrics Collection**: Track performance and user satisfaction
5. **Analysis**: Statistical comparison of results
6. **Decision**: Choose winning model and migrate fully

This approach solves the "single vectorization" problem while maintaining production stability! 🎯


# Documentation: docs/working-notes/archive/ASYNC_IMPLEMENTATION_COMPLETE.md

---

# DeepLens Async Architecture Implementation Complete

## 🎯 Executive Summary

We've successfully transformed DeepLens from a **synchronous blocking system** to a **high-performance asynchronous platform** using Kafka-based event streaming. This provides immediate upload confirmation while handling time-consuming ML operations in the background.

### Key Transformation
- **Before**: 4-6 seconds blocking upload → feature extraction → vector storage → response
- **After**: < 700ms immediate upload confirmation → async background processing → real-time status updates

## 🏗️ Architecture Overview


## 📁 Implementation Files Created

### Core Architecture Files

### Configuration Updates

## 🔄 Data Flow Implementation

### 1. Image Upload Flow (< 700ms)

**Response (Immediate):**

### 2. Background Processing Events

#### Event 1: Image Upload Triggers Processing
**↓ Published to:** `deeplens.images.uploaded`
**↓ Consumed by:** `ImageProcessingWorker`

#### Event 2: Feature Extraction Request
**↓ Published to:** `deeplens.features.extraction`
**↓ Consumed by:** `FeatureExtractionWorker`
**↓ Calls:** Python FastAPI service at `http://localhost:8001/extract-features`

#### Event 3: Vector Indexing Request  
**↓ Published to:** `deeplens.vectors.indexing`  
**↓ Consumed by:** `VectorIndexingWorker`
**↓ Calls:** `VectorStoreService.IndexVectorAsync()`

#### Event 4: Processing Completed
**↓ Published to:** `deeplens.processing.completed`
**↓ Triggers:** WebSocket notification to client, status update in DB

## 📊 Status Tracking Implementation

### Real-time Status Check

**Response (During Processing):**

**Response (Completed):**

## 🎯 Service Responsibilities (Final)

### 🐍 Python Feature Extraction Service
- **Role**: Pure ML inference, completely stateless
- **Input**: Image bytes via HTTP POST  
- **Output**: 2048-dimensional ResNet50 feature vector + metadata
- **No Storage**: Zero database connections, no Qdrant operations
- **Scaling**: Horizontal scaling with load balancer

### 🔵 .NET VectorStoreService
- **Role**: All Qdrant operations with multi-tenant isolation
- **Operations**: Collection management, vector indexing, similarity search
- **Collections**: `tenant_{tenantId}_{modelName}_vectors`
- **Scaling**: Connection pooling, optimized for database operations

### 🔧 PowerShell Tenant Manager
- **Role**: High-level tenant provisioning orchestration
- **Integration**: Calls .NET AdminApi instead of direct Qdrant HTTP
- **Operations**: Database creation, collection setup, health checks

### ⚡ Kafka Workers (.NET)
- **ImageProcessingWorker**: Routes upload events to feature extraction
- **FeatureExtractionWorker**: Calls Python service, publishes vector indexing events  
- **VectorIndexingWorker**: Stores vectors in Qdrant, publishes completion events
- **Error Handling**: Retry policies, dead letter queues, comprehensive logging

## 🚀 Performance Characteristics

### Upload Performance
| Metric | Before (Sync) | After (Async) | Improvement |
|--------|---------------|---------------|-------------|
| **Upload Response Time** | 4-6 seconds | < 700ms | **6-9x faster** |
| **User Perception** | Blocking wait | Immediate confirmation | **Instant feedback** |
| **Error Impact** | Full request fails | Upload succeeds, processing retries | **Resilient** |
| **Scalability** | Limited by ML processing | Independent upload scaling | **Highly scalable** |

### System Resilience
- **ML Service Outage**: Uploads continue, processing resumes when service recovers
- **Qdrant Outage**: Uploads and feature extraction continue, indexing resumes when Qdrant recovers
- **Partial Failures**: Individual steps fail and retry without affecting completed steps
- **Load Spikes**: Upload API scales independently from processing workers

### Resource Optimization
- **CPU**: ML processing isolated to dedicated workers
- **Memory**: Kafka provides natural backpressure and flow control
- **Database**: Connection pooling optimized per service type
- **Network**: Asynchronous processing reduces API timeout issues

## 🔧 Deployment Configuration

### Kafka Topics (Production Ready)

### Worker Scaling

## 🎉 Benefits Achieved

### User Experience
✅ **Instant Upload Feedback**: < 700ms response time
✅ **Real-time Progress**: WebSocket status updates  
✅ **No Timeouts**: Users never wait for ML processing
✅ **Graceful Errors**: Clear error messages with retry information

### System Architecture
✅ **Microservices Best Practices**: Clear service boundaries
✅ **Horizontal Scalability**: Independent scaling per service type
✅ **Fault Tolerance**: Component failures don't cascade
✅ **Event-driven**: Loose coupling via Kafka events

### Operational Excellence  
✅ **Monitoring**: Full event traceability via correlation IDs
✅ **Debugging**: Comprehensive logging at each processing step
✅ **Performance**: Optimized resource utilization
✅ **Maintainability**: Clean separation of ML, storage, and business logic

This async architecture transforms DeepLens into a production-ready, scalable image similarity platform that provides excellent user experience while handling the complexities of ML processing in the background.


# Documentation: docs/working-notes/archive/ASYNC_KAFKA_PIPELINE.md

---

# DeepLens Async Processing Pipeline with Kafka

This document describes the Kafka-based asynchronous processing architecture for DeepLens, enabling immediate upload confirmation while handling time-consuming ML operations in the background.

## 🚀 Async Pipeline Architecture

### Current Problem

### New Async Solution

## 📨 Kafka Event Schema Design

### Topic Structure

### Event Schemas

#### 1. ImageUploadedEvent

#### 2. FeatureExtractionRequestedEvent  

#### 3. VectorIndexingRequestedEvent

#### 4. ProcessingCompletedEvent

## 🔄 Processing Flow Implementation

### 1. Upload API (Immediate Response)

### 2. Orchestration Service (Kafka Consumers)

### 3. Feature Extraction Consumer

### 4. Vector Indexing Consumer

## 📊 Benefits of Async Architecture

### User Experience
- **Immediate Feedback**: Upload confirmation in < 700ms
- **Progress Tracking**: Real-time status via WebSocket or polling
- **No Timeouts**: Users don't wait for ML processing

### System Performance  
- **Scalability**: Independent scaling of upload vs processing
- **Resilience**: Failed ML operations don't block uploads
- **Resource Optimization**: CPU-intensive tasks run on dedicated workers

### Operational Benefits
- **Monitoring**: Each step tracked via Kafka events
- **Retry Logic**: Built-in error handling and retries  
- **Dead Letter Queues**: Failed messages for investigation
- **Backpressure**: Natural flow control via Kafka

## 🔍 Status Tracking Implementation

### Status Check API

### WebSocket Real-time Updates

This async architecture transforms DeepLens from a blocking synchronous system to a responsive, scalable platform that handles ML workloads gracefully while providing excellent user experience.


# Documentation: docs/working-notes/archive/code_examples.md

---

# DeepLens - Code Examples & Pseudo Code

This file contains all implementation code samples, pseudo code, and configuration examples for the DeepLens project, organized by technology stack and functional area.

**Note:** For system architecture diagrams and design details, see [PROJECT_PLAN.md](PROJECT_PLAN.md).

---

## Table of Contents

- [⚡ Rate Limiting & Tenant Management](#-rate-limiting--tenant-management)
- [🏛️ Database Integration](#️-database-integration)
- [🏢 Multi-Tenant Architecture](#-multi-tenant-architecture)
- [🤖 AI/ML Services](#-aiml-services)
- [🔐 Authentication & Security](#-authentication--security)
- [🐳 Docker & Infrastructure](#-docker--infrastructure)
- [📊 Observability & Telemetry](#-observability--telemetry)

---

## ⚡ Rate Limiting & Tenant Management

### Overview

DeepLens implements a **multi-level, database-backed rate limiting system** that supports:

- Dynamic per-tenant rate limits
- Multiple pricing tiers (free, basic, pro, enterprise)
- Runtime configuration updates without service restart
- Endpoint-specific limits
- Redis caching for performance

**Related ADR:** See [ARCHITECTURE_DECISIONS.md#adr-004](ARCHITECTURE_DECISIONS.md#adr-004) and [ADR-005](ARCHITECTURE_DECISIONS.md#adr-005)

For complete implementation details including database schema, service layer, and API endpoints, see the dedicated [Rate Limiting Implementation Guide](docs/RATE_LIMITING_IMPLEMENTATION.md).

**Key Components:**

- PostgreSQL tables for tenant limits and tier configurations
- Redis caching with 5-minute TTL for fast lookups
- Dynamic rate limiter policy for API Gateway
- Endpoint-specific rate checks in individual services
- Admin API for runtime configuration updates

**Example Tiers:**

| Tier       | Requests/Min | Searches/Min | Uploads/Min | Monthly Price |
| ---------- | ------------ | ------------ | ----------- | ------------- |
| Free       | 100          | 50           | 5           | $0            |
| Basic      | 1,000        | 500          | 50          | $29           |
| Pro        | 5,000        | 2,500        | 200         | $99           |
| Enterprise | 50,000       | 25,000       | 1,000       | $499          |

---

## 🏛️ Database Integration

### Duende IdentityServer Integration


### IdentityServer Configuration


### Docker Compose Configuration


### API Authentication Examples


### Authentication Flow with Duende IdentityServer


### User Management Features


### Role-Based Access Control (RBAC)


---

## 📊 Observability & Telemetry

### .NET Core Services Instrumentation


### Node.js Service Instrumentation


### Python AI Service Instrumentation


### Prometheus Configuration


### Alert Rules


---

## 🚀 Core Engine Components (Pseudo Code)

### Image Ingestion Pipeline


### Feature Extraction Engine


### Similarity Matching Engine


### Storage Connectors


### Scalable Image Processor


### Scaling Metrics


---

## 🗄️ Database Schema Design

### Vector Storage


### Metadata Storage


---

## 🌐 API Design

### REST Endpoints


### Request/Response Examples


---

## 🐳 Deployment Configuration

### Kubernetes HPA Configuration


### Redis Cluster Configuration


### Kubernetes Deployment


---

## 📊 Database Integration & Analytics

### InfluxDB Business Metrics Service


### Kubernetes Metadata Queries (PostgreSQL)


### Infisical Secret Management Integration


---

## 🏢 Multi-Tenant Architecture Examples

### Tenant Context Service


### BYOS Storage Factory Pattern


### Tenant Management API


---

## 🤖 AI/ML Service Integration

### High-Performance .NET API with AI Service Integration


### AI Microservice in Node.js/TypeScript


### Python FastAPI AI Service


---

## 🔐 Authentication & Security Examples

### Duende IdentityServer Integration


### JWT Token Validation & Custom Authorization


### Role-Based Access Control (RBAC)


### Custom User Store & Profile Service


---

## 🐳 Docker & Infrastructure Configurations

### Prometheus Configuration


### Alert Rules Configuration


### Kafka Processing Queue Configuration


### Kafka Producer/Consumer Examples

#### .NET Kafka Producer (Image Upload API)


#### .NET Kafka Consumer (Validation Service)


#### Python Kafka Consumer (Feature Extraction Service)


#### Kafka Startup Configuration


#### Kafka Health Checks


### Kubernetes Horizontal Pod Autoscaler


### Redis Cluster Configuration


### Cloud-Native Kubernetes Deployment


---

## 💻 Development Environment Setup

### .NET Core Development


### Node.js Development


### System Dependencies


---

## 📁 Project Structure

The complete project structure is defined in PROJECT_PLAN.md under "Hybrid Multi-Language Project Structure" section, including:

- **dotnet-services/**: .NET Core services (APIs, IdentityServer, Core, Infrastructure)
- **python-services/**: Python AI/ML services (feature extraction, similarity matching)
- **deployment/**: Kubernetes, Docker, Terraform configurations
- **docs/**: API documentation and guides
- **scripts/**: Build and deployment scripts
- **monitoring/**: Prometheus, Grafana configurations

---

**Note**: This file contains extracted pseudo code and examples for reference during development. Actual implementation should follow the detailed specifications in PROJECT_PLAN.md and to_define.md.


# Documentation: docs/working-notes/archive/SETUP_EXPERIENCE_REPORT.md

---

# Setup Experience Report - Python Feature Extraction Service

## Date: November 27, 2025

This document captures the actual setup experience, issues encountered, and solutions implemented for the Python Feature Extraction Service with portable Python on Windows.

---

## Initial Goal

Set up a Python-based FastAPI service for image feature extraction WITHOUT requiring system-wide Python installation on Windows, enabling:
- Local development with full debugging support
- No admin rights required
- No system PATH modifications
- Portable, project-local Python environment

---

## Steps Taken

### 1. **Python Service Structure Created**
- Created `src/DeepLens.FeatureExtractionService/` directory
- Implemented FastAPI application with:
  - `main.py` - FastAPI app with `/extract-features` endpoint
  - `feature_extractor.py` - ResNet50 ONNX model integration
  - `models.py` - Pydantic request/response models
  - `config.py` - Environment-based configuration
  - `requirements.txt` - Python dependencies

### 2. **Port Allocation Strategy**
- Reviewed existing service ports (.NET APIs use 5xxx range)
- Allocated port 8001 for Python Feature Extraction Service
- Established convention: Python services use 8xxx range

### 3. **Portable Python Setup**
- Created `tools/python/` directory for portable Python installation
- Downloaded Python 3.12.10 embeddable package (64-bit)
  - URL: https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip
- Extracted directly to `tools/python/python.exe` (no version subfolder)
- Modified `python312._pth` to enable pip:
  - Uncommented `import site` line
- Installed pip manually:
  ```powershell
  Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile "tools\python\get-pip.py"
  .\tools\python\python.exe tools\python\get-pip.py
  ```

### 4. **Setup Script Development**
Created `setup-dev-environment.ps1` with features:
- **Multi-location Python detection** (in priority order):
  1. Custom path (via `-PythonPath` parameter)
  2. System PATH
  3. Project `tools\python\` (portable)
  4. Microsoft Store installation
  5. Common directories (`%LOCALAPPDATA%\Programs\Python`, `C:\Python3xx`)
- **Version validation** (Python 3.11+ required)
- **Automatic dependency installation**
- **Optional model download**
- **Environment file creation** from template

---

## Issues Encountered & Solutions

### Issue 1: Unicode Characters in PowerShell Scripts
**Problem:**  
PowerShell parser failed with Unicode characters (✓, ✗, →, ⚠) in Write-Host commands.

**Error:**

**Solution:**  
Manually removed all Unicode characters from:
- `setup-dev-environment.ps1`
- `download-model.ps1`

**Lesson:** Use ASCII-only characters in PowerShell scripts for maximum compatibility.

---

### Issue 2: Embeddable Python Missing `venv` Module
**Problem:**  
Python embeddable package doesn't include the `venv` module.

**Error:**

**Solution:**  
1. Installed `virtualenv` package: `.\tools\python\python.exe -m pip install virtualenv`
2. Updated setup script to fallback to `virtualenv` when `venv` fails:

**Lesson:** Embeddable Python requires `virtualenv` instead of built-in `venv`.

---

### Issue 3: ONNX Runtime Version Incompatibility
**Problem:**  
`onnxruntime==1.16.3` not available for Python 3.12.

**Error:**

**Solution:**  
Updated `requirements.txt`:

**Lesson:** Always check package compatibility with target Python version. Python 3.12 is relatively new, some packages may have limited version availability.

---

### Issue 4: ResNet50 Model Download URL Changed
**Problem:**  
Original ONNX model URL returned 404.

**Old URL (broken):**

**Solution:**  
Updated to correct URL with `/validated/` path:

**Lesson:** ONNX Models repository restructured with "validated" subdirectory.

---

### Issue 5: Python Detection Priority
**Problem:**  
Setup script found non-existent "python" in PATH before checking portable installation.

**Solution:**  
Reordered search locations and added proper error handling:
1. Custom path (if specified)
2. Project `tools\python\` 
3. System locations
4. PATH (last resort)

Added verification that Python actually works before returning path.

**Lesson:** Always verify executable exists AND works, not just that command succeeds.

---

## Final Working Setup

### File Structure

### Successful Setup Command

### What Works Now
✅ Portable Python detection  
✅ Virtual environment creation (via virtualenv)  
✅ All dependencies installed  
✅ `.env` file created  
✅ ResNet50 model downloaded  
✅ Ready for development  

---

## Key Takeaways for Future Projects

### 1. **Portable Python Setup Checklist**
- [ ] Download Python embeddable package (not installer)
- [ ] Extract to project-local directory (no version subfolder)
- [ ] Edit `python3xx._pth` - uncomment `import site`
- [ ] Install pip: `python.exe get-pip.py`
- [ ] Install virtualenv: `python.exe -m pip install virtualenv`
- [ ] Test: `python.exe --version` and `python.exe -m pip --version`

### 2. **PowerShell Script Best Practices**
- Use ASCII-only characters (avoid Unicode symbols)
- Test scripts on fresh PowerShell sessions
- Add proper error handling for external commands:
  ```powershell
  $ErrorActionPreference = "SilentlyContinue"
  $result = & command 2>&1
  $ErrorActionPreference = "Stop"
  if ($LASTEXITCODE -ne 0) { # handle error }
  ```

### 3. **Python Version Compatibility**
- Check PyPI for package availability on target Python version
- Python 3.12 support still limited for some packages
- Python 3.11 recommended for broader compatibility
- Always pin dependency versions in `requirements.txt`

### 4. **Development Environment**
- Provide multiple Python detection methods (portable, system, Microsoft Store)
- Accept custom Python path via parameter
- Give clear error messages with installation instructions
- Include `.gitignore` for portable Python directory
- Document portable setup in `tools/python/README.md`

### 5. **VS Code Integration**
- Include `.vscode/launch.json` for F5 debugging
- Include `.vscode/settings.json` for Python environment detection
- Include `.vscode/extensions.json` for recommended extensions
- These files help new developers get started immediately

---

## Time Investment

- Initial service creation: ~30 minutes
- Portable Python documentation: ~15 minutes
- Setup script development: ~45 minutes
- Troubleshooting Unicode issues: ~20 minutes
- Fixing embeddable Python venv issue: ~25 minutes
- Dependency version fixes: ~10 minutes
- Model download URL fix: ~5 minutes

**Total:** ~2.5 hours (includes documentation)

---

## Next Steps (Not Yet Done)

1. **Test the Service**
   ```powershell
   cd src\DeepLens.FeatureExtractionService
   .\venv\Scripts\Activate.ps1
   python main.py
   # Visit http://localhost:8001/docs
   ```

2. **Verify Feature Extraction**
   - Upload test image via Swagger UI
   - Verify 2048-dimensional vector returned
   - Check processing time

3. **VS Code Debugging**
   - Open project in VS Code
   - Install Python extension (ms-python.python)
   - Press F5 - should start with debugger attached

4. **Create Docker Image**
   ```powershell
   docker build -t feature-extraction-service:latest .
   docker run -p 8001:8001 -v ${PWD}\models:/app/models feature-extraction-service
   ```

5. **Implement Vector Similarity Service** (Task 2)

6. **Add Unit Tests** (Task 3)

---

## Commands Reference

### Portable Python Setup

### Service Setup

### Docker

---

## Resources

- **Python Downloads:** https://www.python.org/downloads/windows/
- **ONNX Models:** https://github.com/onnx/models
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **ONNX Runtime:** https://onnxruntime.ai/docs/api/python/
- **Virtualenv:** https://virtualenv.pypa.io/

---

## Contact

For questions or issues with this setup, refer to:
- `src/DeepLens.FeatureExtractionService/README.md` - Full service documentation
- `src/DeepLens.FeatureExtractionService/QUICKSTART.md` - 5-minute quick start
- `tools/python/README.md` - Portable Python detailed setup
- `DEVELOPMENT_PLAN.md` - Overall project roadmap

---

**Document Status:** Complete  
**Last Updated:** November 27, 2025  
**Tested On:** Windows 11, PowerShell 5.1, Python 3.12.10


# Documentation: docs/working-notes/archive/STATELESS_SERVICE_ARCHITECTURE.md

---

# DeepLens Stateless Service Architecture

This document describes the proper separation of concerns between Python feature extraction and .NET data layer services in DeepLens.

## 🏗️ Architecture Principles

### Stateless vs Stateful Services


## 🔄 Data Flow Architecture

### Phase 1: Single Model Flow (Current Implementation)


### Service Responsibilities

#### 🐍 Python Feature Extraction Service (Port 8001)

**Responsibilities:**
- ✅ Load and run ML model (ResNet50)
- ✅ Image preprocessing (resize, normalize)
- ✅ Feature vector generation (2048 dims)
- ✅ Basic image metadata (width, height, format)
- ❌ NO vector storage
- ❌ NO similarity search
- ❌ NO tenant management

#### 🔵 .NET Vector Store Service (DeepLens.Infrastructure)

**Responsibilities:**
- ✅ Qdrant collection management
- ✅ Multi-tenant isolation (`tenant_{id}_{model}_vectors`)
- ✅ Vector indexing and batch operations
- ✅ Similarity search with filtering
- ✅ Collection optimization and maintenance
- ✅ Error handling and logging

#### 🔧 PowerShell Tenant Manager (Infrastructure Orchestration)

**Responsibilities:**
- ✅ Tenant provisioning orchestration
- ✅ Database creation (PostgreSQL)
- ✅ Collection setup via .NET API calls
- ✅ Health checks and monitoring
- ❌ NO direct Qdrant HTTP calls
- ❌ NO direct database operations

## 🔄 Request Flow Examples

### Image Upload & Indexing

### Similarity Search

### Tenant Provisioning

## 🎯 Benefits of This Architecture

### Scalability
- **Python Services**: Stateless → horizontal scaling with load balancer
- **.NET Services**: Stateful → optimized connection pooling, caching
- **Database Layer**: Proper connection management and transactions

### Maintainability  
- **Clear Boundaries**: Each service has single responsibility
- **Technology Alignment**: ML in Python, business logic in .NET
- **Testability**: Easy to mock interfaces and unit test

### Performance
- **Python**: Optimized for ML inference only
- **.NET**: Efficient database operations with EF Core
- **Caching**: Redis integration at the .NET layer

### Multi-Tenancy
- **Consistent Naming**: `tenant_{id}_{model}_vectors`
- **Isolation**: Tenant context passed through all layers
- **Security**: Authentication and authorization in .NET layer

## 🔧 Configuration Integration

### appsettings.json (.NET Services)

### config.py (Python Service)

## 🚀 Migration Strategy

### Phase 1: Current State → Target State
1. ✅ **VectorStoreService**: Implement .NET service (DONE)
2. ✅ **Python Cleanup**: Remove Qdrant code (Already stateless)
3. 🔄 **PowerShell Update**: Call .NET APIs instead of HTTP
4. 📝 **Documentation**: Update all integration examples

### Phase 2: Production Hardening
1. **Error Handling**: Comprehensive retry policies
2. **Monitoring**: OpenTelemetry across all services
3. **Performance**: Connection pooling, caching strategies
4. **Security**: mTLS between services, API keys

This architecture ensures that each service does what it does best while maintaining clear boundaries and responsibilities.


# Documentation: docs/working-notes/archive/to_define.md

---

# DeepLens - Items To Define

This document tracks planning items that need further definition and refinement. As each item is completed, it will be moved to the PROJECT_PLAN.md.

**Last Updated**: November 19, 2025
**Status**: Active Planning Items

---

## 📦 Data Management & Storage Strategy

### Database Strategy ✅ DECIDED - MOVED TO PROJECT_PLAN.md

- [x] **Database Vendors**: PostgreSQL (Identity + Metadata), Qdrant (Vectors), InfluxDB (Time-series), Kafka (Messaging)
- [x] **Container Strategy**: All databases containerized with persistent volumes
- [ ] **Migration Strategy**: Database schema evolution and versioning approach
- [ ] **Data Retention Policies**: How long to keep image metadata, vectors, and user data
- [ ] **Backup Strategy**: Automated backup schedules and recovery procedures
- [ ] **Disaster Recovery**: Cross-region backup and failover procedures
- [ ] **Data Archival**: Cold storage strategies for older images and metadata

### Vector Database Optimization (Qdrant) ✅ VENDOR SELECTED

- [x] **Vendor Selection**: Qdrant chosen for vector database
- [ ] **Sizing Guidelines**: Memory and storage requirements per million images
- [ ] **Partitioning Strategy**: How to partition vectors across shards/nodes
- [ ] **Index Optimization**: HNSW parameters, recall vs performance trade-offs
- [ ] **Replication Strategy**: Read replicas and consistency models
- [ ] **Migration Procedures**: How to upgrade vector databases without downtime

### Compliance & Data Governance

- [ ] **GDPR Compliance**: User data deletion, data portability, consent management
- [ ] **Data Classification**: Sensitive vs non-sensitive data handling
- [ ] **Audit Logging**: What actions to log for compliance
- [ ] **Data Residency**: Regional data storage requirements
- [ ] **Data Lineage**: Tracking data sources and transformations

---

## 🛡️ Security Deep Dive

### Event-Driven Architecture ✅ DEFINED - KAFKA INTEGRATION COMPLETE

- [x] **Message Queue**: Apache Kafka 7.5.0 with Zookeeper
- [x] **Topic Design**: 7 core topics for image processing pipeline
- [x] **Event Flow**: Upload → Validation → Feature Extraction → Indexing
- [x] **Producer/Consumer**: .NET and Python service integration patterns
- [x] **Error Handling**: Failed events routing and dead letter queues
- [x] **Monitoring**: Kafka metrics integrated with Prometheus/Grafana
- [x] **Scalability**: Partitioned topics for parallel processing

### Image Ingestion API ✅ DEFINED - ADDED TO PROJECT_PLAN.md

- [x] **API Endpoints**: Upload, batch, URL ingestion, status tracking, deletion
- [x] **Multi-Tenant Storage**: NFS, Azure Blob, AWS S3, GCS, MinIO support
- [x] **Processing Pipeline**: Kafka-driven validation, routing, feature extraction, indexing
- [x] **Batch Processing**: Parallel processing via Kafka topic partitions
- [x] **Error Handling**: Kafka-based retry mechanisms and dead letter queues
- [ ] **File Format Support**: Extended formats (RAW, HEIC, SVG, animated GIF)
- [ ] **Compression Strategies**: Lossless compression for originals, optimization for web
- [ ] **Duplicate Prevention**: Advanced duplicate detection before storage
- [ ] **Quota Management**: Per-tenant storage limits and usage tracking
- [ ] **Content Moderation**: NSFW detection, copyright infringement checking

### API Security

- [ ] **Rate Limiting Specifics**: Limits per endpoint, user tier, and time window
  - Search API: X requests per minute per user
  - Upload API: Y requests per hour per user
  - Admin API: Z requests per day per admin
  - Ingestion API: Z uploads per hour per tenant
- [ ] **Throttling Policies**: Burst limits and progressive penalties
- [ ] **API Versioning Security**: Deprecation and security patches for old versions
- [ ] **Request Validation**: Input sanitization and size limits

### Data Protection & Secret Management ✅ INFISICAL INTEGRATED

- [x] **Secret Management**: Infisical self-hosted vault for secrets and configuration
- [x] **Key Management**: Infisical for database passwords, API keys, JWT secrets
- [x] **Environment Separation**: Development, staging, production secret isolation
- [ ] **Encryption at Rest**: Database encryption, file storage encryption keys
- [ ] **Encryption in Transit**: TLS versions, certificate management
- [ ] **Secrets Rotation**: Automated rotation of database passwords, API keys
- [ ] **Certificate Management**: SSL certificate renewal and deployment

### Security Testing & Monitoring

- [ ] **Vulnerability Scanning**: Automated SAST/DAST tools integration
- [ ] **Penetration Testing**: Scheduled security assessments
- [ ] **Security Monitoring**: Intrusion detection and anomaly detection
- [ ] **Incident Response**: Security incident escalation procedures
- [ ] **Compliance Scanning**: SOC 2, ISO 27001 compliance checks

### Network Security

- [ ] **Network Policies**: Kubernetes network policies, firewall rules
- [ ] **Service Mesh Security**: mTLS, service-to-service authentication
- [ ] **VPN/Private Network**: Corporate network integration requirements
- [ ] **DDoS Protection**: CloudFlare, AWS Shield, or similar integration
- [ ] **IP Whitelisting**: Admin panel and API access restrictions

---

## ⚡ Performance & Capacity Planning

### Resource Sizing Guidelines

- [ ] **Compute Resources**: CPU/RAM requirements per concurrent user
  - Light users (< 10 searches/day): X resources
  - Power users (> 100 searches/day): Y resources
  - Batch processing: Z resources per 1000 images/hour
- [ ] **Storage Scaling**: Disk space growth projections
- [ ] **Network Bandwidth**: Expected traffic patterns and CDN requirements

### Database Performance

- [ ] **Query Optimization**: Indexing strategies for metadata searches
- [ ] **Connection Pooling**: Optimal pool sizes for different workloads
- [ ] **Read Replicas**: When and how to scale read operations
- [ ] **Caching Strategy**: Redis cache sizing and eviction policies
- [ ] **Database Maintenance**: Index rebuilding, statistics updates

### Vector Search Optimization

- [ ] **Model Selection**: Performance vs accuracy trade-offs for different models
- [ ] **Batch Processing**: Optimal batch sizes for feature extraction
- [ ] **GPU Utilization**: GPU memory management and batch optimization
- [ ] **Vector Compression**: Trade-offs between storage and search accuracy
- [ ] **Search Algorithms**: HNSW vs IVF vs other algorithms performance

### Load Testing & Benchmarks

- [ ] **Performance Baselines**: Expected response times under different loads
- [ ] **Load Testing Scenarios**: Realistic user behavior simulation
- [ ] **Stress Testing**: System breaking points and graceful degradation
- [ ] **Capacity Planning**: When to scale horizontally vs vertically
- [ ] **Performance Monitoring**: Key metrics and alert thresholds

---

## 🔧 Operational Procedures

### Deployment & Release Management

- [ ] **Blue-Green Deployment**: Zero-downtime deployment procedures
- [ ] **Canary Releases**: Gradual rollout strategies and rollback triggers
- [ ] **Database Migrations**: Safe migration procedures during deployments
- [ ] **Configuration Management**: Environment-specific configurations
- [ ] **Rollback Procedures**: Automated and manual rollback strategies

### Monitoring & Alerting

- [ ] **Alert Thresholds**: Specific values for CPU, memory, response time alerts
- [ ] **Escalation Procedures**: Who gets notified when and how
- [ ] **On-Call Rotation**: Team responsibilities and response expectations
- [ ] **Runbook Creation**: Step-by-step troubleshooting guides
- [ ] **Dashboard Design**: Key metrics visualization for different personas

### Maintenance & Updates

- [ ] **Maintenance Windows**: Scheduled downtime procedures
- [ ] **Security Updates**: Patch management and testing procedures
- [ ] **Data Cleanup**: Automated cleanup of expired data and logs
- [ ] **Performance Tuning**: Regular optimization procedures
- [ ] **Capacity Reviews**: Monthly/quarterly capacity assessment

### Incident Response

- [ ] **Incident Classification**: Severity levels and response times
- [ ] **Communication Plan**: How to communicate outages to users
- [ ] **Post-Mortem Process**: Learning from incidents and improvements
- [ ] **Disaster Recovery Testing**: Regular DR drill procedures
- [ ] **Business Continuity**: Essential vs non-essential service prioritization

---

## 🎯 Business Logic Refinement

### Image Similarity Algorithms

- [ ] **Similarity Thresholds**: Default thresholds for different use cases
  - Exact duplicates: > 0.95 similarity
  - Near duplicates: 0.85-0.95 similarity
  - Similar images: 0.70-0.85 similarity
- [ ] **Algorithm Selection**: When to use perceptual hashing vs deep features
- [ ] **Ensemble Methods**: Combining multiple similarity scores
- [ ] **User Customization**: Allowing users to tune similarity thresholds

### Image Processing Pipeline

- [ ] **Supported Formats**: JPEG, PNG, WebP, TIFF, RAW support levels
- [ ] **Size Limitations**: Maximum image size and resolution limits
- [ ] **Format Conversion**: When and how to convert between formats
- [ ] **Quality Settings**: Compression and quality trade-offs
- [ ] **Metadata Extraction**: EXIF, IPTC, XMP data handling priorities

### User Management & Quotas

- [ ] **User Tiers**: Free, Pro, Enterprise feature differences
- [ ] **Storage Quotas**: Per-user storage limits and enforcement
- [ ] **API Rate Limits**: Different limits for different user tiers
- [ ] **Usage Analytics**: What metrics to track per user
- [ ] **Billing Integration**: Usage-based billing calculations

### Search & Discovery Features

- [ ] **Search Ranking**: How to rank similarity results
- [ ] **Filters**: Date, size, format, location filtering options
- [ ] **Faceted Search**: Category-based search refinement
- [ ] **Search History**: User search history and recommendations
- [ ] **Bulk Operations**: Batch duplicate removal, bulk tagging

---

## 🏗️ Infrastructure & DevOps

### Container Strategy

- [ ] **Image Optimization**: Multi-stage builds, layer caching strategies
- [ ] **Registry Management**: Image tagging, vulnerability scanning, retention
- [ ] **Resource Limits**: Container CPU/memory limits and requests
- [ ] **Health Checks**: Liveness and readiness probe configurations
- [ ] **Security Scanning**: Container image vulnerability assessment

### Kubernetes Configuration

- [ ] **Namespace Strategy**: How to organize services across namespaces
- [ ] **RBAC Policies**: Service account permissions and access controls
- [ ] **Network Policies**: Pod-to-pod communication restrictions
- [ ] **Storage Classes**: Persistent volume strategies for different data types
- [ ] **Ingress Configuration**: Load balancer and SSL termination setup

### CI/CD Pipeline

- [ ] **Build Pipeline**: Automated testing, building, and packaging
- [ ] **Test Automation**: Unit, integration, and end-to-end test strategies
- [ ] **Quality Gates**: Code coverage, security scanning requirements
- [ ] **Deployment Automation**: GitOps vs push-based deployment strategies
- [ ] **Environment Promotion**: Dev → Staging → Production workflows

### Cloud Provider Strategy

- [ ] **Multi-Cloud Support**: AWS, Azure, GCP deployment differences
- [ ] **Cost Optimization**: Reserved instances, spot instances strategies
- [ ] **Service Selection**: When to use managed vs self-hosted services
- [ ] **Migration Strategy**: Moving between cloud providers
- [ ] **Hybrid Deployment**: On-premises + cloud hybrid strategies

---

## 📊 Analytics & Business Intelligence

### Usage Analytics

- [ ] **Metrics Collection**: What user behavior to track
- [ ] **Analytics Platform**: Google Analytics, Mixpanel, or custom solution
- [ ] **Privacy Compliance**: Analytics data collection with GDPR compliance
- [ ] **Real-time Dashboards**: Business metrics visualization
- [ ] **Reporting Automation**: Automated reports for stakeholders

### Performance Analytics

- [ ] **APM Integration**: Application performance monitoring setup
- [ ] **User Experience Metrics**: Core Web Vitals, page load times
- [ ] **API Performance**: Response time percentiles, error rates
- [ ] **Infrastructure Metrics**: Resource utilization and cost analytics
- [ ] **Alerting Integration**: Performance alerts and notifications

### Business Metrics

- [ ] **KPI Definition**: Key performance indicators for success
- [ ] **Revenue Tracking**: Subscription, usage-based billing metrics
- [ ] **User Engagement**: DAU, MAU, retention rate calculations
- [ ] **Feature Usage**: Which features are most/least used
- [ ] **Customer Satisfaction**: NPS, support ticket analysis

---

## 🧪 Testing Strategy

### Test Coverage

- [ ] **Unit Testing**: Target coverage percentages and critical path testing
- [ ] **Integration Testing**: Service-to-service communication testing
- [ ] **API Testing**: Contract testing, schema validation
- [ ] **UI Testing**: End-to-end user journey testing
- [ ] **Performance Testing**: Load, stress, and endurance testing

### Test Automation

- [ ] **CI Integration**: Automated test execution in pipelines
- [ ] **Test Data Management**: Test data generation and cleanup
- [ ] **Environment Management**: Test environment provisioning
- [ ] **Test Reporting**: Test results aggregation and reporting
- [ ] **Regression Testing**: Automated regression test suites

### Quality Assurance

- [ ] **Code Review Process**: Review requirements and approval workflows
- [ ] **Static Analysis**: Code quality and security analysis tools
- [ ] **Dependency Scanning**: Third-party library vulnerability scanning
- [ ] **Performance Profiling**: Application performance analysis
- [ ] **Accessibility Testing**: WCAG compliance and accessibility testing

---

## 📚 Documentation Strategy

### Technical Documentation

- [ ] **API Documentation**: OpenAPI/Swagger documentation automation
- [ ] **Architecture Documentation**: System design and decision records
- [ ] **Deployment Guides**: Step-by-step deployment instructions
- [ ] **Troubleshooting Guides**: Common issues and solutions
- [ ] **Development Setup**: Local development environment setup

### User Documentation

- [ ] **User Guides**: End-user documentation and tutorials
- [ ] **Admin Documentation**: System administration guides
- [ ] **FAQ Section**: Common questions and answers
- [ ] **Video Tutorials**: Screen recordings and walkthroughs
- [ ] **Change Logs**: Release notes and feature announcements

### Process Documentation

- [ ] **Development Processes**: Coding standards, review processes
- [ ] **Operational Procedures**: Maintenance and support procedures
- [ ] **Incident Response**: Emergency procedures and contacts
- [ ] **Onboarding**: New team member onboarding procedures
- [ ] **Knowledge Base**: Internal wiki and knowledge sharing

---

## ✅ Completion Tracking

**Progress**: 0/85 items defined (0%)

### By Category:

- **Data Management**: 0/15 items (0%)
- **Security**: 0/18 items (0%)
- **Performance**: 0/15 items (0%)
- **Operations**: 0/15 items (0%)
- **Business Logic**: 0/12 items (0%)
- **Infrastructure**: 0/15 items (0%)
- **Analytics**: 0/9 items (0%)
- **Testing**: 0/12 items (0%)
- **Documentation**: 0/15 items (0%)

---

## 🎯 Prioritization

### High Priority (Start Development Blockers)

1. **Resource Sizing Guidelines** - Need for initial deployment
2. **Rate Limiting Specifics** - Critical for API security
3. **Database Migration Strategy** - Required for schema management
4. **Alert Thresholds** - Essential for production monitoring

### Medium Priority (Phase 1 Requirements)

1. **Image Processing Pipeline** - Core functionality decisions
2. **User Management & Quotas** - Multi-tenancy requirements
3. **Container Strategy** - Deployment optimization
4. **Performance Baselines** - Quality gates

### Low Priority (Phase 2+ Enhancements)

1. **Advanced Analytics** - Nice-to-have features
2. **Multi-Cloud Support** - Future scalability
3. **Advanced Security Features** - Enhanced security posture
4. **Business Intelligence** - Data-driven insights

---

**Note**: This is a living document. Items will be moved to PROJECT_PLAN.md as they are defined and refined. Some items may be combined, split, or reprioritized based on development learnings.


# Documentation: DOCS_INDEX.md

---

# DeepLens Documentation Index

**Your complete guide to navigating the DeepLens documentation**

Last Updated: December 18, 2025

---

## 🎯 Start Here

### New to DeepLens?

1. Read [README.md](README.md) - Project overview and high-level architecture
2. Follow [handover.md](handover.md) - Current state and quick start guide
3. Check [CREDENTIALS.md](CREDENTIALS.md) - All development credentials in one place
4. Reference [PORTS.md](PORTS.md) - Service port mappings and conflicts

### Want to Develop?

1. Start with [src/README.md](src/README.md) - Complete codebase structure
2. Review [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - Development workflow
3. Check [infrastructure/README.md](infrastructure/README.md) - Container setup

---

## 📚 Documentation Categories

### 🏗️ Architecture & Design

| Document                                                       | Purpose                            | When to Read                      |
| -------------------------------------------------------------- | ---------------------------------- | --------------------------------- |
| [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md)         | Key architectural decisions (ADRs) | When understanding design choices |
| [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md) | Detailed system architecture       | When understanding system design  |
| [docs/STORAGE_ARCHITECTURE.md](docs/STORAGE_ARCHITECTURE.md)   | Storage strategy & multi-tenancy   | When working with data storage    |
| [PROJECT_PLAN.md](PROJECT_PLAN.md)                             | Complete project specifications    | When planning features            |

### 🔐 Authentication & Security

| Document                                                             | Purpose                          | When to Read                     |
| -------------------------------------------------------------------- | -------------------------------- | -------------------------------- |
| [docs/TOKEN_LIFECYCLE.md](docs/TOKEN_LIFECYCLE.md)                   | Token behavior & refresh flow    | When implementing/debugging auth |
| [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md)           | Complete OAuth test suite        | When testing authentication      |
| [docs/RBAC_PLAN.md](docs/RBAC_PLAN.md)                               | Role-based access control design | When implementing permissions    |
| [docs/ADMIN_IMPERSONATION_PLAN.md](docs/ADMIN_IMPERSONATION_PLAN.md) | Admin impersonation feature      | When implementing admin features |
| [CREDENTIALS.md](CREDENTIALS.md)                                     | All development credentials      | When accessing services          |

### 🐳 Infrastructure & Operations

| Document                                                                                 | Purpose                                                       | When to Read                               |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| [infrastructure/README.md](infrastructure/README.md)                                     | Complete infrastructure guide                                 | When setting up services                   |
| [infrastructure/README-TENANT-MANAGEMENT.md](infrastructure/README-TENANT-MANAGEMENT.md) | Tenant provisioning & storage (BYOS + Platform-Managed MinIO) | When managing tenants or storage           |
| [infrastructure/README-TENANT-BACKUP.md](infrastructure/README-TENANT-BACKUP.md)         | Complete backup & DR guide (PostgreSQL, Qdrant, MinIO)        | When managing backups or disaster recovery |
| [infrastructure/README-NFS-MIGRATION.md](infrastructure/README-NFS-MIGRATION.md)         | NFS storage migration                                         | When migrating to NFS                      |
| [PORTS.md](PORTS.md)                                                                     | Service port reference                                        | When resolving port conflicts              |

### 💻 Development

| Document                                                                                           | Purpose                          | When to Read                 |
| -------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------- |
| [src/README.md](src/README.md)                                                                     | Complete codebase structure      | When navigating code         |
| [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)                                                         | Development workflow & practices | When starting development    |
| [handover.md](handover.md)                                                                         | Current state & next steps       | Daily/weekly                 |
| [src/DeepLens.FeatureExtractionService/README.md](src/DeepLens.FeatureExtractionService/README.md) | Python AI service guide          | When working with ML service |

### 📊 Observability & Monitoring

| Document                                                                                     | Purpose                             | When to Read                    |
| -------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------- |
| [OBSERVABILITY_PLAN.md](OBSERVABILITY_PLAN.md)                                               | Complete monitoring strategy        | When implementing observability |
| [OPENTELEMETRY_STATUS.md](OPENTELEMETRY_STATUS.md)                                           | OpenTelemetry implementation status | When working with telemetry     |
| [infrastructure/docker-compose.monitoring.yml](infrastructure/docker-compose.monitoring.yml) | Monitoring stack config             | When configuring monitoring     |

### 🏢 Multi-Tenancy & Storage

| Document                                                     | Purpose                       | When to Read                            |
| ------------------------------------------------------------ | ----------------------------- | --------------------------------------- |
| [docs/STORAGE_ARCHITECTURE.md](docs/STORAGE_ARCHITECTURE.md) | Multi-tenant storage design   | When understanding tenant isolation     |
| [docs/MINIO_MULTI_TENANCY.md](docs/MINIO_MULTI_TENANCY.md)   | MinIO tenant isolation        | When implementing S3-compatible storage |
| [docs/THUMBNAILS.md](docs/THUMBNAILS.md)                     | Thumbnail generation strategy | When implementing image thumbnails      |

### 📡 Messaging & Events

| Document                                                     | Purpose                       | When to Read                     |
| ------------------------------------------------------------ | ----------------------------- | -------------------------------- |
| [docs/KAFKA_USAGE_PLAN.md](docs/KAFKA_USAGE_PLAN.md)         | Kafka architecture & patterns | When working with events         |
| [DeepLens.Shared.Messaging/](src/DeepLens.Shared.Messaging/) | Messaging abstractions        | When implementing event handlers |

### 🚦 Rate Limiting & API Management

| Document                                                                     | Purpose                | When to Read                     |
| ---------------------------------------------------------------------------- | ---------------------- | -------------------------------- |
| [docs/RATE_LIMITING_IMPLEMENTATION.md](docs/RATE_LIMITING_IMPLEMENTATION.md) | Rate limiting strategy | When implementing API throttling |

---

## 🗂️ Documentation Structure

### Root Level (High-Level Guidance)

- **README.md** - Project overview and quick start
- **handover.md** - Current state and immediate next steps
- **CREDENTIALS.md** - All development credentials
- **PORTS.md** - Service port reference
- **PROJECT_PLAN.md** - Complete project specifications
- **ARCHITECTURE_DECISIONS.md** - Key design decisions (ADRs)
- **DEVELOPMENT_PLAN.md** - Development workflow
- **OBSERVABILITY_PLAN.md** - Monitoring and tracing
- **OPENTELEMETRY_STATUS.md** - Telemetry implementation status

### docs/ (Detailed Implementation Guides)

- **ARCHITECTURE_OVERVIEW.md** - Detailed system architecture
- **STORAGE_ARCHITECTURE.md** - Storage and multi-tenancy
- **TOKEN_LIFECYCLE.md** - Authentication token behavior
- **OAUTH_TESTING_GUIDE.md** - Complete OAuth test suite
- **RBAC_PLAN.md** - Role-based access control
- **ADMIN_IMPERSONATION_PLAN.md** - Admin impersonation feature
- **KAFKA_USAGE_PLAN.md** - Kafka patterns and best practices
- **RATE_LIMITING_IMPLEMENTATION.md** - API throttling
- **MINIO_MULTI_TENANCY.md** - Object storage isolation
- **THUMBNAILS.md** - Image thumbnail generation

### infrastructure/ (Container & Service Setup)

- **README.md** - Complete infrastructure guide
- **README-TENANT-MANAGEMENT.md** - Tenant provisioning & storage (BYOS + Platform-Managed MinIO)
- **README-TENANT-BACKUP.md** - Complete backup & disaster recovery (PostgreSQL, Qdrant, MinIO)
- **README-NFS-MIGRATION.md** - NFS migration guide
- **CHANGELOG-2025-12-17.md** - Infrastructure changes

### src/ (Code-Level Documentation)

- **README.md** - Complete codebase structure
- **DeepLens.FeatureExtractionService/README.md** - Python ML service
- **DeepLens.FeatureExtractionService/QUICKSTART.md** - ML service quick start
- **DeepLens.FeatureExtractionService/TESTING.md** - ML service tests
- **DeepLens.WebUI/README.md** - React frontend guide

---

## 🔍 Quick Reference

### Common Tasks

| Task                                | Document                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| **Login to any service**            | [CREDENTIALS.md](CREDENTIALS.md)                                                         |
| **Check which port a service uses** | [PORTS.md](PORTS.md)                                                                     |
| **Test OAuth authentication**       | [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md)                               |
| **Start infrastructure services**   | [infrastructure/README.md](infrastructure/README.md)                                     |
| **Create a new tenant**             | [infrastructure/README-TENANT-MANAGEMENT.md](infrastructure/README-TENANT-MANAGEMENT.md) |
| **Understand token refresh**        | [docs/TOKEN_LIFECYCLE.md](docs/TOKEN_LIFECYCLE.md)                                       |
| **Configure monitoring**            | [OBSERVABILITY_PLAN.md](OBSERVABILITY_PLAN.md)                                           |
| **Navigate the codebase**           | [src/README.md](src/README.md)                                                           |

### Troubleshooting

| Problem                        | Document                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| **Port conflict error**        | [PORTS.md](PORTS.md) - See "Port Conflicts" section                                |
| **Authentication not working** | [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md) - See "Troubleshooting" |
| **Token expired too soon**     | [docs/TOKEN_LIFECYCLE.md](docs/TOKEN_LIFECYCLE.md) - Check configuration           |
| **Container won't start**      | [infrastructure/README.md](infrastructure/README.md) - See "Troubleshooting"       |
| **Can't connect to database**  | [CREDENTIALS.md](CREDENTIALS.md) + [PORTS.md](PORTS.md)                            |

---

## 📝 Documentation Conventions

### File Naming

- **ALL_CAPS.md** - High-level planning and reference documents (root level)
- **PascalCase.md** - Detailed technical documentation (docs/ folder)
- **kebab-case.md** - Infrastructure-specific guides (infrastructure/ folder)

### Link Format

- Use relative paths: `[Link](docs/FILE.md)` not `[Link](/absolute/path/to/FILE.md)`
- Include line numbers for code references: `[file.cs](file.cs#L10)`
- Cross-reference related documents at the top of each file

### Update Frequency

- **Daily**: [handover.md](handover.md) - Updated after each work session
- **Weekly**: [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - Updated with progress
- **As Needed**: All other documents - Updated when implementation changes

---

## 🎓 Learning Path

### Week 1: Getting Started

1. Day 1: [README.md](README.md) + [handover.md](handover.md)
2. Day 2: [infrastructure/README.md](infrastructure/README.md) - Set up local environment
3. Day 3: [src/README.md](src/README.md) - Understand codebase structure
4. Day 4: [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md) - Test authentication
5. Day 5: [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - Understand workflow

### Week 2: Deep Dive

1. [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - Understand key decisions
2. [docs/STORAGE_ARCHITECTURE.md](docs/STORAGE_ARCHITECTURE.md) - Multi-tenancy
3. [docs/KAFKA_USAGE_PLAN.md](docs/KAFKA_USAGE_PLAN.md) - Event-driven architecture
4. [OBSERVABILITY_PLAN.md](OBSERVABILITY_PLAN.md) - Monitoring stack
5. [PROJECT_PLAN.md](PROJECT_PLAN.md) - Complete specifications

---

## 💡 Contributing to Documentation

### Before Creating New Docs

1. Check this index - does a similar document exist?
2. Review [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - is this an ADR?
3. Consider adding to existing docs rather than creating new files

### Documentation Standards

- Start with a clear title and purpose statement
- Include "Last Updated" date at the top
- Cross-reference related documents
- Use consistent formatting (see above)
- Update this index when adding new documentation

### Review Checklist

- [ ] Clear title and purpose
- [ ] "Last Updated" date included
- [ ] Cross-references to related docs
- [ ] Code examples are tested
- [ ] Added to DOCS_INDEX.md
- [ ] Links use relative paths
- [ ] Spelling and grammar checked

---

## 📞 Get Help

If you can't find what you need:

1. Check [handover.md](handover.md) for the latest status
2. Review [docs/working-notes/](docs/working-notes/) for recent explorations
3. Search across all .md files: `grep -r "your search term" *.md`
4. Ask the team in #deeplens-dev Slack channel

---

**This index is your map to the DeepLens documentation. Bookmark it and refer back often!**


# Documentation: handover.md

---

# DeepLens Development Handover

**Date:** December 18, 2025  
**Status:** ✅ Authentication Complete | 📚 Documentation Consolidated

---

## 🎯 Current State

### ✅ Completed in This Session

**1. Authentication System (Fully Operational)**

- ✅ PostgreSQL 16 on localhost:5433 with `nextgen_identity` database
- ✅ Identity API running on http://localhost:5198 with Duende IdentityServer 7.1.0
- ✅ OAuth 2.0/OIDC with password grant + PKCE flows
- ✅ Sliding refresh tokens (15-day window, extends on use)
- ✅ Multi-tenant support with tenant_id in JWT
- ✅ Admin user seeded: admin@deeplens.local

**2. Comprehensive Testing Documentation**

- ✅ Created [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md) - 10 complete test scenarios
- ✅ Created [docs/TOKEN_LIFECYCLE.md](docs/TOKEN_LIFECYCLE.md) - Token behavior deep dive
- ✅ All OAuth flows tested and verified working

**3. Documentation Consolidation (Major Cleanup)**

- ✅ Created **[DOCS_INDEX.md](DOCS_INDEX.md)** - Complete documentation navigation
- ✅ Streamlined **[handover.md](handover.md)** - This file (was 501 lines, now concise)
- ✅ Created **[infrastructure/README-TENANT-BACKUP.md](infrastructure/README-TENANT-BACKUP.md)** - Comprehensive backup guide covering:
  - PostgreSQL automated backups
  - Qdrant snapshot backups (NEW - was missing!)
  - MinIO versioning and mirroring
  - Complete disaster recovery procedures
  - PowerShell functions for backup/restore
- ✅ Consolidated tenant management:
  - Merged MinIO provisioning into [infrastructure/README-TENANT-MANAGEMENT.md](infrastructure/README-TENANT-MANAGEMENT.md)
  - Clear distinction: BYOS storage vs Platform-Managed MinIO
- ✅ **Deleted redundant files:**
  - ❌ README-TENANT-POSTGRESQL-BACKUP.md (merged into comprehensive backup guide)
  - ❌ README-TENANT-MINIO-PROVISIONING.md (merged into tenant management)
- ✅ Updated **[README.md](README.md)** with navigation paths for different user types

### What's Running Now:

- ✅ **PostgreSQL 16**: localhost:5433 with `nextgen_identity` database
- ✅ **Identity API**: http://localhost:5198 (Duende IdentityServer 7.1.0)
- ⏸️ **WebUI Dev Server**: Not currently running (start with `npm run dev` in DeepLens.WebUI)

---

## 📚 Documentation Structure (After Cleanup)

**Key Documentation Files:**

1. **[DOCS_INDEX.md](DOCS_INDEX.md)** ⭐ - Start here! Complete documentation map
2. **[README.md](README.md)** - Project overview with navigation paths
3. **[handover.md](handover.md)** - This file (current state & next steps)
4. **[CREDENTIALS.md](CREDENTIALS.md)** - All service credentials
5. **[PORTS.md](PORTS.md)** - Port mappings

**Infrastructure Documentation:**

- **[infrastructure/README.md](infrastructure/README.md)** - Complete infrastructure guide
- **[infrastructure/README-TENANT-MANAGEMENT.md](infrastructure/README-TENANT-MANAGEMENT.md)** - Tenant provisioning & storage (BYOS + Platform-Managed MinIO)
- **[infrastructure/README-TENANT-BACKUP.md](infrastructure/README-TENANT-BACKUP.md)** - Complete backup & DR (PostgreSQL + Qdrant + MinIO)
- **[infrastructure/README-NFS-MIGRATION.md](infrastructure/README-NFS-MIGRATION.md)** - NFS storage migration

**Authentication Documentation:**

- **[docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md)** - Complete OAuth test suite (10 scenarios)
- **[docs/TOKEN_LIFECYCLE.md](docs/TOKEN_LIFECYCLE.md)** - Token behavior & refresh flow

**Code Documentation:**

- **[src/README.md](src/README.md)** - Complete codebase structure

---

## 🚀 Quick Start (Next Session)

### Option 1: Continue Authentication Work


### Option 2: Work on Other Services


---

## 📋 Next Steps

### Immediate Authentication Tasks:

1. ⏳ **Test WebUI login** - Start WebUI (`npm run dev`) and verify login at http://localhost:3000/login
2. ⏳ **Add JWT auth to APIs** - Implement JWT authentication in SearchApi and AdminApi
3. ⏳ **Switch to PKCE flow** - Update WebUI to use authorization code + PKCE (remove password grant)

### Production Readiness:

1. ⏳ **Persistent grant store** - Move from in-memory to PostgreSQL operational store
2. ⏳ **HTTPS configuration** - Configure SSL/TLS with valid certificates
3. ⏳ **Duende license** - Obtain production license or configure for non-commercial use
4. ⏳ **Rate limiting** - Add rate limiting on token endpoints
5. ⏳ **Absolute session max** - Implement 90-day maximum session duration

### Infrastructure & Operations:

1. ⏳ **Implement Qdrant backup** - Use new backup guide to set up automated Qdrant snapshots
2. ⏳ **Test backup/restore** - Verify tenant backup procedures work end-to-end
3. ⏳ **Complete monitoring** - Finish OpenTelemetry instrumentation (see OPENTELEMETRY_STATUS.md)

### Feature Development:

1. ⏳ **User management API** - Create endpoints for user CRUD operations
2. ⏳ **Tenant provisioning API** - Expose tenant management through REST API
3. ⏳ **API Gateway integration** - Configure gateway as OAuth client
4. ⏳ **Multi-tenant testing** - Create second tenant and verify isolation

---

## 🔑 Quick Reference

### Credentials

- **Admin:** admin@deeplens.local / DeepLens@Admin123!
- **PostgreSQL:** postgres / DeepLensPassword123 @ localhost:5433
- **Full list:** [CREDENTIALS.md](CREDENTIALS.md)

### Key URLs

- **Identity API:** http://localhost:5198
- **Discovery:** http://localhost:5198/.well-known/openid-configuration
- **WebUI:** http://localhost:3000 (when running)
- **Grafana:** http://localhost:3000 (monitoring - not running)

### Important Files

- **Connection String:** `src/NextGen.Identity.Api/appsettings.Development.json`
- **JWT Config:** `src/NextGen.Identity.Api/Program.cs` (IdentityServer section)
- **OAuth Clients:** `src/NextGen.Identity.Api/Configuration/IdentityServerConfig.cs`
- **Database Schema:** `src/NextGen.Identity.Data/Migrations/001_InitialSchema.sql`

---

## 🧪 Testing Commands

### Quick Health Check


### Complete Test Suite

See **[docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md)** for:

- 10 comprehensive test scenarios
- PowerShell test functions
- Expected results for each test
- Troubleshooting guide

---

## 📊 Session Summary

**Time Spent:** ~4 hours  
**Files Created:** 3 (DOCS_INDEX.md, OAUTH_TESTING_GUIDE.md, README-TENANT-BACKUP.md)  
**Files Consolidated:** 2 (deleted PostgreSQL backup, merged MinIO provisioning)  
**Files Updated:** 5+ (README.md, handover.md, various documentation references)

**Key Outcomes:**

1. ✅ Authentication system fully operational and tested
2. ✅ Comprehensive testing documentation for future verification
3. ✅ Documentation consolidated from ~45 files to clearer structure
4. ✅ Filled critical gap: Qdrant backup strategy (was completely missing)
5. ✅ Clearer navigation with DOCS_INDEX.md and updated README.md

**Technical Debt Resolved:**

- ✅ No more redundant PostgreSQL backup documentation
- ✅ No more confusing split between tenant management and MinIO provisioning
- ✅ Qdrant backup plan created (was completely missing before)
- ✅ Sliding refresh tokens verified and documented

---

## ⚠️ Important Notes

### Token Lifecycle

- **Access Token:** 1 hour lifetime, new JWT issued on each refresh
- **Refresh Token:** 15-day sliding window (resets on each use)
- **Behavior:** Active sessions extend indefinitely; inactive sessions expire after 15 days
- **Details:** See [docs/TOKEN_LIFECYCLE.md](docs/TOKEN_LIFECYCLE.md)

### Known Limitations

- ⚠️ Using password grant for development (switch to PKCE for production)
- ⚠️ Grants stored in-memory (will be lost on restart)
- ⚠️ Using developer signing credentials (need production keys)
- ⚠️ No rate limiting on token endpoints yet
- ⚠️ No absolute maximum session duration

### Database State

- PostgreSQL container: `deeplens-postgres` on port 5433
- Database: `nextgen_identity`
- Admin tenant ID: `9f63da1a-135d-4725-b26c-296d76df2338`
- Admin user ID: `53d03827-a474-4502-9a94-e885eb7bebd1`

---

## 🔗 Essential Links

- **[DOCS_INDEX.md](DOCS_INDEX.md)** - Complete documentation map (START HERE!)
- **[docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md)** - How to test authentication
- **[CREDENTIALS.md](CREDENTIALS.md)** - All service credentials
- **[infrastructure/README-TENANT-BACKUP.md](infrastructure/README-TENANT-BACKUP.md)** - Complete backup strategy

---

**Ready for next session! Start with Quick Start commands above or check DOCS_INDEX.md for what you need.** 🚀

### Run Complete OAuth Test Suite

All authentication scenarios are documented with PowerShell commands:


**Test Coverage:**

1. ✅ Discovery document validation
2. ✅ Password grant flow (dev)
3. ✅ JWT token inspection
4. ✅ Refresh token flow
5. ✅ Token revocation
6. ✅ Multiple refresh cycles (sliding window)
7. ✅ Invalid credentials handling
8. ✅ Token expiration
9. ✅ CORS preflight requests
10. ✅ Complete authorization flow

**📖 Full Testing Guide:** See [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md)

---

## 📖 Additional Documentation

For comprehensive information, see:

- **[DOCS_INDEX.md](DOCS_INDEX.md)** - Complete documentation index
- **[docs/TOKEN_LIFECYCLE.md](docs/TOKEN_LIFECYCLE.md)** - Deep dive on token behavior
- **[src/README.md](src/README.md)** - Codebase structure
- **[infrastructure/README.md](infrastructure/README.md)** - Container and service setup

---

## ⚠️ Important Notes

### Token Lifecycle

- **Access Token**: 1 hour lifetime, new JWT on each refresh
- **Refresh Token**: 15-day sliding window (resets on each use)
- **Active sessions never expire** as long as user is active within 15 days
- **Inactive sessions** expire after 15 days of no activity

### Production Readiness Checklist

- [ ] Switch to PKCE flow (remove password grant)
- [ ] Add persistent grant store (currently in-memory)
- [ ] Configure HTTPS with valid certificates
- [ ] Obtain Duende IdentityServer license
- [ ] Implement absolute max session duration
- [ ] Add rate limiting on token endpoints

### Known Limitations

- Using password grant for development (PKCE preferred for production)
- Grants stored in-memory (will be lost on restart)
- Using developer signing credentials (need production keys)
- No rate limiting on token endpoints yet

---

**For questions or issues, refer to [DOCS_INDEX.md](DOCS_INDEX.md) for the complete documentation map.**


# Documentation: infrastructure/CHANGELOG-2025-12-17.md

---

# Infrastructure Enhancement Changelog

## December 16-17, 2025

### 🎯 Objective Achieved

Implemented **fully portable infrastructure** with NFS/bind mount support for easy migration between machines, and automated PostgreSQL backup provisioning for multi-tenant deployments.

---

## 📦 Deliverables

### Documentation (1,500+ lines)

1. **[README-NFS-MIGRATION.md](README-NFS-MIGRATION.md)** (500+ lines)

   - Storage strategy for Windows dev vs Linux production
   - Complete migration procedures (Windows→Windows, Linux→Linux, Windows→Linux)
   - NFS configuration for Windows and Linux
   - Backup/recovery procedures
   - Troubleshooting guide
   - Security considerations

2. **[README-TENANT-POSTGRESQL-BACKUP.md](README-TENANT-POSTGRESQL-BACKUP.md)** (700+ lines)

   - Automated backup provisioning architecture
   - Function reference (New-TenantPostgreSQLBackup, Remove, Get-Status, Get-All)
   - Complete workflow examples
   - NFS requirements and configuration
   - Monitoring and management
   - Troubleshooting guide
   - Restore procedures

3. **[README-TENANT-MINIO-PROVISIONING.md](README-TENANT-MINIO-PROVISIONING.md)** (300+ lines)
   - MinIO storage provisioning for tenants
   - NFS-backed storage architecture
   - Credential management
   - Security best practices

### Infrastructure Scripts

1. **[setup-with-nfs.ps1](setup-with-nfs.ps1)** (195 lines)

   - Main infrastructure management script
   - Functions: Start-Infrastructure, Stop-Infrastructure, Show-Status, Clean-All
   - Default path: `C:\productivity\deeplensData`
   - Parameters: `-DataBasePath`, `-Stop`, `-Status`, `-Clean`
   - Usage examples:
     ```powershell
     .\setup-with-nfs.ps1                  # Start infrastructure
     .\setup-with-nfs.ps1 -Status          # Check status
     .\setup-with-nfs.ps1 -Stop            # Stop all
     .\setup-with-nfs.ps1 -Clean           # Remove everything (with confirmation)
     ```

2. **[provision-tenant-backup.ps1](provision-tenant-backup.ps1)** (140 lines)

   - Automated PostgreSQL backup container provisioning
   - Creates backup script inside container (avoids Windows line ending issues)
   - Parameters: `-TenantName`, `-BackupPath`, `-Schedule`, `-RetentionDays`, `-TestBackup`
   - Default schedule: Daily at 2 AM
   - Default retention: 30 days
   - Usage:
     ```powershell
     .\provision-tenant-backup.ps1 -TenantName "vayyari" -TestBackup
     ```

3. **[export-infrastructure-state.ps1](export-infrastructure-state.ps1)** (150 lines)

   - Export all infrastructure state for migration
   - Exports: core data, tenant data, configuration, metadata
   - Creates restoration script automatically
   - Usage:
     ```powershell
     .\export-infrastructure-state.ps1 -ExportPath "C:\backup\deeplens" -StopContainers
     ```

4. **[restore-infrastructure.ps1](restore-infrastructure.ps1)** (180 lines)

   - Restore infrastructure on new machine
   - Recreates directory structure
   - Restores volumes, databases, backup containers
   - Usage:
     ```powershell
     .\restore-infrastructure.ps1 -ExportPath "C:\backup\deeplens" -NewDataRoot "D:\deeplens"
     ```

5. **[test-vayyari-setup.ps1](test-vayyari-setup.ps1)** (120 lines)
   - Validation script for tenant setup
   - Tests core infrastructure, database creation, backup provisioning
   - Comprehensive dry-run with status checks

### Code Fixes

**[powershell/DeepLensTenantManager.psm1](powershell/DeepLensTenantManager.psm1)** (1,899 lines)

Fixed PowerShell parsing errors:

- **Line 252, 405**: Converted inline if statements to separate variable assignments
- **Lines 397-403**: Changed SQL here-string from `@"` to `@'` (prevents PowerShell from interpreting `@provider` as array operator)
- **Line 1658**: Converted ternary operator to if/else statement
- **Unicode fix**: Replaced all curly quotes (U+2018, U+2019) with straight quotes (U+0027)

Added 4 new functions (lines 1450-1810):

- `New-TenantPostgreSQLBackup` - Create automated backup
- `Remove-TenantPostgreSQLBackup` - Remove backup configuration
- `Get-TenantPostgreSQLBackupStatus` - Check backup status
- `Get-AllTenantPostgreSQLBackups` - List all backups

**[docker-compose.infrastructure.yml](docker-compose.infrastructure.yml)** (398 lines)

Updates:

- Added `DEEPLENS_DATA_PATH` and `DEEPLENS_LOGS_PATH` environment variables
- All volume definitions support custom paths: `${DEEPLENS_DATA_PATH:-./data}/postgres:/var/lib/postgresql/data`
- Removed ~50 lines of static named volume definitions
- Updated all 11 services for bind mount support

---

## 🏗️ Architecture

### Storage Strategy

**Windows Development (Podman 5.7.0)**


**Linux Production (Docker/Podman)**


### Why Hybrid on Windows?

PostgreSQL requires `chmod 700` on `/var/lib/postgresql/data`:

- Windows filesystem cannot honor Unix permissions from Linux containers
- Bind mounts fail with: `initdb: error: could not change permissions of directory`
- **Solution**: Named volumes work perfectly; tenant files use bind mounts

### Backup Container Architecture


**Why backup container works with bind mounts**:

- Runs crond, NOT PostgreSQL database server
- Uses pg_dump CLIENT to connect over network
- Only writes regular `.sql.gz` files (no chmod required)

---

## ✅ Production Validation

### Infrastructure Status


### Databases Created

- `deeplens` (default)
- `nextgen_identity` (identity management)
- `deeplens_platform` (platform database)
- `tenant_vayyari_metadata` ✅ (tenant database)

### Volumes

- `deeplens_postgres_data` (PostgreSQL data)
- `deeplens_redis_data` (Redis data)
- `deeplens_qdrant_data` (Qdrant vectors)

### Tenant Data

- Backups: `C:\productivity\deeplensData\tenants\vayyari\backups`
- Schedule: Daily at 2 AM
- Retention: 30 days
- Compression: gzip enabled

---

## 📊 Metrics

**Total Lines of Code**: 5,166 insertions

- Documentation: 1,500+ lines
- Scripts: 785 lines
- Module fixes: 360 lines changed
- Docker compose: 50 lines changed

**Files Changed**: 12

- 8 new files created
- 4 files modified

**Commit**: `7748357` - "feat: Portable infrastructure with NFS/backup support"

---

## 🔄 Migration Examples

### Windows to Windows


### Linux to Linux


---

## 🎓 Lessons Learned

1. **Windows + Podman Limitation**: Cannot bind mount PostgreSQL data directories

   - Root cause: `chmod 700` requirement on data directory
   - Windows filesystem cannot honor Unix permissions
   - Solution: Named volumes + export/import

2. **Line Ending Issues**: Windows creates CRLF, containers expect LF

   - Solution: Create scripts inside container using `podman exec`

3. **PowerShell Parser**: Very strict about syntax

   - Curly quotes cause failures
   - SQL `@parameters` in here-strings need single quotes `@'...'@`
   - Ternary operators not supported

4. **Backup vs Database Files**: Different permission requirements
   - Database files: Need chmod for initialization
   - Backup files: Regular files, no special permissions

---

## 🚀 Future Enhancements

- [ ] WSL2 + Docker integration for full bind mount support on Windows
- [ ] Prometheus metrics for backup monitoring
- [ ] Grafana dashboards for storage usage
- [ ] Automated backup verification tests
- [ ] Multi-region NFS replication
- [ ] Encryption at rest for backup files
- [ ] Backup rotation policies per tenant
- [ ] S3-compatible backup storage option

---

## 📚 Related Documentation

- [Main Infrastructure README](README.md)
- [NFS Migration Guide](README-NFS-MIGRATION.md)
- [PostgreSQL Backup Guide](README-TENANT-POSTGRESQL-BACKUP.md)
- [MinIO Provisioning Guide](README-TENANT-MINIO-PROVISIONING.md)
- [Project Plan](../PROJECT_PLAN.md)

---

**Prepared by**: GitHub Copilot  
**Date**: December 17, 2025  
**Status**: ✅ Complete and Production Validated


# Documentation: infrastructure/README.md

---

# DeepLens Infrastructure Guide

**Complete reference for the containerized infrastructure setup**

Last Updated: December 16, 2025

---

## 📁 Directory Structure


---

## 🚀 Quick Start

### First-Time Setup


### Daily Operations


---

## 🐳 Docker Compose Files

### docker-compose.infrastructure.yml (11 Services)

**Purpose:** Core data storage, message queues, and secret management

| Service                | Port(s)                    | Purpose                                                       | Resource Limits |
| ---------------------- | -------------------------- | ------------------------------------------------------------- | --------------- |
| **postgres**           | 5432                       | Primary database (3 DBs: identity, platform, tenant_template) | 2GB RAM, 1 CPU  |
| **qdrant**             | 6333 (HTTP), 6334 (gRPC)   | Vector similarity search                                      | 4GB RAM         |
| **influxdb**           | 8086                       | Time-series metrics storage                                   | 2GB RAM         |
| **kafka**              | 9092                       | Message queue & event streaming                               | 2GB RAM         |
| **zookeeper**          | 2181                       | Kafka coordination                                            | 512MB RAM       |
| **redis**              | 6379                       | Cache & session storage                                       | 1GB RAM         |
| **minio**              | 9000 (API), 9001 (Console) | S3-compatible object storage (for BYOS testing)               | 1GB RAM         |
| **kafka-ui**           | 8080                       | Kafka management interface                                    | 512MB RAM       |
| **infisical**          | 8082                       | Self-hosted secret management                                 | 1GB RAM         |
| **infisical-postgres** | 5433                       | Dedicated DB for Infisical                                    | 512MB RAM       |
| **infisical-redis**    | 6380                       | Dedicated cache for Infisical                                 | 256MB RAM       |

**Health Checks:** All services have 10-30s health check intervals  
**Networking:** Custom bridge network `deeplens-network`  
**Storage:** Persistent Docker volumes for all data services

### docker-compose.monitoring.yml (8 Services)

**Purpose:** Observability, metrics, logs, and tracing

| Service            | Port(s)                                  | Purpose                                         | Resource Limits |
| ------------------ | ---------------------------------------- | ----------------------------------------------- | --------------- |
| **prometheus**     | 9090                                     | Metrics collection & storage (30-day retention) | 2GB RAM         |
| **grafana**        | 3000                                     | Visualization dashboards                        | 1GB RAM         |
| **jaeger**         | 16686 (UI), 14250 (gRPC)                 | Distributed tracing                             | 1GB RAM         |
| **loki**           | 3100                                     | Log aggregation                                 | 1GB RAM         |
| **promtail**       | 9080                                     | Log shipping agent                              | 256MB RAM       |
| **cadvisor**       | 8081                                     | Container metrics exporter                      | 256MB RAM       |
| **node-exporter**  | 9100                                     | Host metrics exporter                           | 128MB RAM       |
| **alertmanager**   | 9093                                     | Alert routing & management                      | 256MB RAM       |
| **otel-collector** | 4317 (gRPC), 4318 (HTTP), 8888 (metrics) | OpenTelemetry receiver                          | 512MB RAM       |
| **portainer**      | 9443                                     | Container management UI                         | 512MB RAM       |

**Pre-configured Dashboards:** Grafana includes infrastructure, application, and container metrics dashboards  
**Alert Rules:** Prometheus has pre-configured alerts for service health and resource usage

---

## 📊 Service Endpoints

### Infrastructure Services

| Service        | Port | Admin UI                        | Credentials             |
| -------------- | ---- | ------------------------------- | ----------------------- |
| **PostgreSQL** | 5432 | -                               | `deeplens/DeepLens123!` |
| **Qdrant**     | 6333 | http://localhost:6333/dashboard | -                       |
| **InfluxDB**   | 8086 | http://localhost:8086           | `admin/DeepLens123!`    |
| **Kafka**      | 9092 | -                               | -                       |
| **Kafka UI**   | 8080 | http://localhost:8080           | -                       |
| **Redis**      | 6379 | -                               | -                       |
| **MinIO**      | 9000 | http://localhost:9001           | `deeplens/DeepLens123!` |
| **Infisical**  | 8082 | http://localhost:8082           | Create on first visit   |

### Monitoring & Observability Services

| Service           | Port      | Admin UI               | Credentials           |
| ----------------- | --------- | ---------------------- | --------------------- |
| **Grafana**       | 3000      | http://localhost:3000  | `admin/DeepLens123!`  |
| **Prometheus**    | 9090      | http://localhost:9090  | -                     |
| **Jaeger**        | 16686     | http://localhost:16686 | -                     |
| **Loki**          | 3100      | -                      | -                     |
| **AlertManager**  | 9093      | http://localhost:9093  | -                     |
| **Portainer**     | 9443      | https://localhost:9443 | Create on first visit |
| **cAdvisor**      | 8081      | http://localhost:8081  | -                     |
| **OpenTelemetry** | 4317/4318 | -                      | -                     |

---

## ⚙️ Configuration Files

### .env.example

**Purpose:** Template for all environment variables

**Key Sections:**

- **Database Credentials:** PostgreSQL, InfluxDB usernames/passwords
- **Service Configuration:** Kafka partitions, Redis memory, Qdrant API keys
- **Secret Management:** Infisical encryption keys and JWT secrets
- **Network & Volumes:** Custom network name and volume mappings
- **Resource Limits:** Production tuning parameters

**⚠️ Security Note:**  
Default credentials are for **development only**. Change all passwords, tokens, and encryption keys before production deployment.


---

## 🔧 Setup Scripts

### setup-containers.ps1 (Container Runtime Manager)

**Responsibility:** Manages the container platform (Docker/Podman)

**Features:**

- Auto-detects Docker or Podman runtime
- Validates container daemon status
- Initializes Podman machines with Kubernetes support
- Orchestrates docker-compose/podman-compose commands
- Shows container resource usage (CPU, memory, network)

**Usage:**


**Dependencies:**

- Docker Desktop OR Podman
- docker-compose OR podman-compose
- Import: `DeepLensInfrastructure.psm1`

### setup-infrastructure.ps1 (Service Manager)

**Responsibility:** Manages DeepLens infrastructure services

**Features:**

- Starts/stops infrastructure services (excludes monitoring)
- Tests service health with connectivity checks
- Resets development environment (removes volumes)
- Interactive menu for common operations

**Usage:**


**Dependencies:**

- Import: `DeepLensInfrastructure.psm1`
- Delegates to module functions

**Relationship with setup-containers.ps1:**

- **Independent:** Can be used separately
- **Complementary:** setup-containers.ps1 is the recommended entry point
- **Scope:** setup-infrastructure.ps1 focuses only on data services

---

## 📦 PowerShell Modules

### DeepLensInfrastructure.psm1 (Core Module)

**Purpose:** Core infrastructure management functions

**Exported Functions:**

#### Service Lifecycle


#### Health Checks


#### Database Operations


#### Service-Specific Operations


#### Environment Management


**Usage:**


### DeepLensTenantManager.psm1 (Tenant Management)

**Purpose:** Multi-tenant provisioning and BYOS configuration

**Location:** `powershell/DeepLensTenantManager.psm1`

**Key Classes:**

#### DeepLensConfig


#### StorageProviderConfig

- Azure Blob Storage configuration
- AWS S3 configuration
- Google Cloud Storage configuration
- MinIO configuration
- NFS/SMB configuration

**Exported Functions:**

#### Tenant Provisioning


#### Storage Management


#### Plan Management


#### Managed MinIO Storage Provisioning


See [README-TENANT-MINIO-PROVISIONING.md](README-TENANT-MINIO-PROVISIONING.md) for complete documentation.

#### Tenant PostgreSQL Backup Provisioning


See [README-TENANT-BACKUP.md](README-TENANT-BACKUP.md) for complete backup and disaster recovery documentation (PostgreSQL, Qdrant, MinIO).

**Usage Examples:**


**Plan Types & Limits:**

| Plan           | Storage Quota | Images/Month | Search Queries/Day | Price          |
| -------------- | ------------- | ------------ | ------------------ | -------------- |
| **free**       | 5 GB          | 1,000        | 100                | Free           |
| **premium**    | 100 GB        | 50,000       | 10,000             | $29/month      |
| **enterprise** | Unlimited     | Unlimited    | Unlimited          | Custom pricing |

**See Also:** [README-TENANT-MANAGEMENT.md](README-TENANT-MANAGEMENT.md)

---

## 🗄️ Database Initialization Scripts

### init-scripts/postgres/01-init-databases.sql

**Purpose:** Initialize PostgreSQL databases, users, and permissions

**Executes:** Automatically on first PostgreSQL container startup

**Creates:**

#### Databases (3)

1. **nextgen_identity** - Authentication and user management
2. **deeplens_platform** - Tenant registry and BYOS configurations
3. **tenant_metadata_template** - Template for tenant-specific databases

#### Users (4)

1. **identity_service** - NextGen Identity service account
2. **platform_service** - DeepLens Platform service account
3. **tenant_service** - Tenant management service account
4. **readonly_user** - Read-only analytics/reporting access

**Extensions Enabled:**

- `uuid-ossp` - UUID generation
- `pgcrypto` - Encryption functions
- `pg_trgm` - Text similarity search

**Permissions:**

- Owner permissions for service accounts on respective databases
- Read-only permissions for analytics user
- Schema-level access controls

**Schema Structure:**


### init-scripts/postgres/02-tenant-provisioning.sql

**Purpose:** Stored procedures for runtime tenant provisioning

**Functions:**

#### create_tenant_database


#### provision_tenant_schema


#### cleanup_tenant_database


**Usage (Internal):**
These functions are called automatically by `DeepLensTenantManager.psm1` during tenant creation/deletion.

---

## 📊 Service Configurations

### config/prometheus/

**Files:**

- `prometheus.yml` - Scraping rules, alerting rules, service discovery
- `alerts.yml` - Alert definitions for service health and resource usage

**Scrape Targets:**

- PostgreSQL (postgres-exporter)
- Redis (redis-exporter)
- Kafka (kafka-exporter)
- cAdvisor (container metrics)
- Node Exporter (host metrics)

**Alert Rules:**

- Service down alerts (critical)
- High CPU/memory usage (warning)
- Disk space thresholds (critical)
- Response time degradation (warning)

### config/grafana/

**Files:**

- `datasources.yml` - Pre-configured datasources (Prometheus, Loki, Jaeger)
- `dashboards.yml` - Dashboard provisioning config
- `dashboards/` - JSON dashboard definitions

**Included Dashboards:**

- Infrastructure Overview
- Container Metrics (cAdvisor)
- Application Performance
- Database Performance (PostgreSQL)
- Kafka Monitoring
- Redis Monitoring

**Default Credentials:**

- Username: `admin`
- Password: `DeepLens123!`

### config/loki/

**Files:**

- `loki-config.yml` - Log ingestion, storage, retention

**Configuration:**

- Retention: 30 days
- Storage: Local filesystem
- Ingestion rate limits configured

### config/otel-collector/

**Files:**

- `otel-collector-config.yml` - OpenTelemetry pipeline configuration

**Receivers:**

- OTLP (gRPC: 4317, HTTP: 4318)
- Prometheus receiver
- Jaeger receiver

**Exporters:**

- Prometheus (metrics)
- Jaeger (traces)
- Loki (logs)

### config/alertmanager/

**Files:**

- `alertmanager.yml` - Alert routing and notification rules

**Notification Channels:**

- Email (SMTP)
- Webhook (for Slack/Teams integration)
- PagerDuty (critical alerts)

### config/qdrant/

**Purpose:** Vector database configuration

**Settings:**

- Memory limit: 4GB
- Collection creation on-demand
- Quantization enabled for performance

### config/redis/

**Purpose:** Cache and session storage configuration

**Settings:**

- Max memory: 1GB
- Eviction policy: allkeys-lru
- Persistence: RDB snapshots every 15 minutes

---

## 💾 Persistent Volumes

All data is stored in Docker volumes:


---

## 🔐 Security Considerations

### Development Environment

**Default Credentials (⚠️ CHANGE IN PRODUCTION):**

- PostgreSQL: `deeplens` / `DeepLens123!`
- InfluxDB: `admin` / `DeepLens123!`
- Grafana: `admin` / `DeepLens123!`
- MinIO: `deeplens` / `DeepLens123!`
- Redis: `DeepLens123!`

### Production Hardening Checklist

- [ ] Change all default passwords and API keys
- [ ] Generate secure encryption keys for Infisical (32+ character random)
- [ ] Generate unique JWT secrets for Infisical
- [ ] Enable TLS/SSL for all external endpoints
- [ ] Use secrets management (Infisical or external provider)
- [ ] Configure firewall rules (restrict ports to internal network)
- [ ] Enable authentication on Redis and Kafka
- [ ] Implement network segmentation
- [ ] Set up automated backups with encryption
- [ ] Configure log retention policies
- [ ] Enable audit logging
- [ ] Implement rate limiting

### Encryption Keys Generation


---

## 📊 Resource Requirements

### Minimum System Requirements (Development)

- **CPU:** 4 cores
- **RAM:** 16 GB
- **Disk:** 50 GB free space
- **OS:** Windows 10/11, macOS 12+, Linux (Ubuntu 20.04+)

### Recommended System Requirements (Production)

- **CPU:** 8+ cores
- **RAM:** 32 GB+
- **Disk:** 500 GB+ SSD (NVMe preferred)
- **Network:** 1 Gbps+

### Container Resource Usage (Approximate)

| Component                   | CPU       | RAM      | Storage  |
| --------------------------- | --------- | -------- | -------- |
| **Infrastructure Services** | 2-3 cores | 8-10 GB  | 20-50 GB |
| **Monitoring Stack**        | 1-2 cores | 4-6 GB   | 10-30 GB |
| **Total**                   | 3-5 cores | 12-16 GB | 30-80 GB |

### Docker Desktop Settings


### Podman Machine Configuration


---

## 🔄 Backup & Recovery

### Manual Backup


### Automated Backup Script


### Restore from Backup


### Volume Backup


---

## 🐛 Troubleshooting

### Services Won't Start


### Port Conflicts


### Database Connection Issues


### Health Check Failures


### Container Resource Issues


### Kafka Issues


### Reset Everything


---

## 📈 Monitoring & Observability

### Access Dashboards

| Service           | URL                             | Credentials             |
| ----------------- | ------------------------------- | ----------------------- |
| **Grafana**       | http://localhost:3000           | admin / DeepLens123!    |
| **Prometheus**    | http://localhost:9090           | -                       |
| **Jaeger**        | http://localhost:16686          | -                       |
| **Portainer**     | https://localhost:9443          | Create on first login   |
| **Kafka UI**      | http://localhost:8080           | -                       |
| **InfluxDB**      | http://localhost:8086           | admin / DeepLens123!    |
| **Qdrant**        | http://localhost:6333/dashboard | -                       |
| **MinIO Console** | http://localhost:9001           | deeplens / DeepLens123! |

### Key Metrics to Monitor

**Infrastructure Health:**

- Container CPU/memory usage (cAdvisor)
- Disk I/O and space (Node Exporter)
- Network throughput (cAdvisor)

**Database Performance:**

- PostgreSQL connection pool usage
- Query execution time (slow query log)
- Cache hit ratio

**Application Metrics:**

- API response times
- Request rate (throughput)
- Error rates
- Queue depth (Kafka lag)

**Business Metrics:**

- Active tenants
- Images processed per day
- Search queries per hour
- Storage usage per tenant

### Custom Metrics


---

## 🔗 Integration Points

### Application Connection Strings


### OpenTelemetry Integration


---

## 📚 Additional Documentation

- [README-TENANT-MANAGEMENT.md](README-TENANT-MANAGEMENT.md) - Complete tenant provisioning guide
- [docker-compose.infrastructure.yml](docker-compose.infrastructure.yml) - Infrastructure service definitions
- [docker-compose.monitoring.yml](docker-compose.monitoring.yml) - Monitoring service definitions
- [.env.example](.env.example) - Environment variable reference

---

## 🎯 Common Workflows

### Development Workflow


### Tenant Onboarding Workflow

#### Option 1: Tenant Brings Their Own Storage (BYOS)


#### Option 2: Platform-Managed MinIO Storage (NEW)

**Use Case:** When tenant doesn't have cloud storage but has NFS infrastructure


#### Managed MinIO Features

**What DeepLens Provisions:**

- Dedicated containerized MinIO instance per tenant
- Auto-generated secure credentials (32-byte secret key)
- Auto-assigned ports (9100+ for API, 9200+ for Console)
- NFS-backed Docker volume for data persistence
- Default 'images' bucket pre-created
- Health checks and auto-restart policy
- Connected to `deeplens-network` for service integration

**What Tenant Provides:**

- NFS server hostname/IP (e.g., `nfs.vayyari.com` or `10.0.1.100`)
- NFS export path (e.g., `/exports/deeplens-storage`)
- Read/write access permissions on NFS export
- Network connectivity to NFS server (port 2049)

**NFS Configuration Examples:**


**Managing Tenant MinIO Instances:**


**Troubleshooting MinIO Provisioning:**


### Monitoring Workflow


### Troubleshooting Workflow


---

## 🚀 Performance Tuning

### PostgreSQL Optimization


### Redis Optimization


### Kafka Optimization


---

## 📞 Support & Contribution

### Getting Help

1. Check this README first
2. Review service logs: `docker logs <container-name>`
3. Check Grafana dashboards for metrics
4. Review [Troubleshooting](#-troubleshooting) section

### Contributing

1. Test changes in development environment
2. Update this README for infrastructure changes
3. Add/update health checks for new services
4. Document new configuration options

### Version History

- **v1.0.0** (December 16, 2025) - Initial comprehensive documentation
  - 19 containerized services (11 infrastructure + 8 monitoring)
  - Multi-tenant provisioning with BYOS support
  - Complete automation with PowerShell modules
  - Pre-configured monitoring dashboards

---

**Last Updated:** December 16, 2025  
**Maintainer:** DeepLens Team  
**License:** Proprietary

1. **Container Orchestration**: Use Kubernetes with StatefulSets
2. **Observability**: Current monitoring stack is production-ready
3. **Security**: Replace development credentials with proper secrets
4. **High Availability**: Configure database clustering and replication
5. **Backup Strategies**: Automated backups for all persistent data
6. **Managed Services**: Consider cloud-managed databases for scale
7. **TLS/SSL**: Enable encryption for all service communications

### Monitoring Production Readiness ✅

- **Metrics Collection**: Prometheus with 30-day retention
- **Distributed Tracing**: Jaeger with OpenTelemetry integration
- **Log Aggregation**: Loki with structured logging
- **Alerting**: AlertManager with customizable routing
- **Visualization**: Grafana with pre-built dashboards
- **Resource Monitoring**: cAdvisor + Node Exporter for complete visibility

## 📚 Next Steps

1. **Start Infrastructure**: Use `setup-containers.ps1 -StartComplete` or `setup-infrastructure.ps1 -Start`
2. **Verify Services**: Check health with `setup-containers.ps1 -Status` or PowerShell module `Test-DeepLensServices`
3. **Import Management Module**: `Import-Module .\DeepLensInfrastructure.psm1` for advanced operations
4. **Database Setup**: Run migrations for Identity and Metadata databases
5. **Initialize Collections**: Set up Qdrant vector collections for image search
6. **Access Monitoring**: Visit Grafana at http://localhost:3000 (admin/DeepLens123!)
7. **Start Development**: Begin building DeepLens services with full observability support

### PowerShell Module Functions



# Documentation: infrastructure/README-NFS-MIGRATION.md

---

# DeepLens NFS/Portable Storage Migration Guide

## Overview

This guide explains how to run DeepLens infrastructure with portable storage that can be easily migrated between machines.

## Storage Strategy

### Windows + Podman Development

Due to Windows filesystem permission limitations with Podman, we use a **hybrid approach**:

- **Core Infrastructure (PostgreSQL, Redis, Qdrant)**: Uses Podman **named volumes**

  - Stored in Podman machine VM
  - Portable via export/import commands
  - Solves permission issues on Windows

- **Tenant Data (Backups, MinIO)**: Uses **bind mounts** to NFS path
  - Stored at configurable path (e.g., `C:\productivity\deeplensData\tenants`)
  - Can be on NFS mount
  - Directly portable by copying directories

### Linux Production

On Linux, **all services** can use bind mounts to NFS paths without permission issues.

---

## Quick Start

### Starting Infrastructure


---

## Migration Between Machines

### Method 1: For Windows Development (Named Volumes)

**On Source Machine:**


**On Target Machine:**


### Method 2: For Linux Production (Pure NFS)

**On Source Machine:**


**On Target Machine:**


### Method 3: Mixed Environment (Windows Dev → Linux Prod)

**Step 1: Export from Windows**


**Step 2: Convert to Linux**


---

## Storage Architecture

### Directory Structure


### Volume Mapping

**Windows Development (Podman):**


**Linux Production (Docker):**


---

## NFS Configuration

### Windows NFS Client Setup


### Linux NFS Client Setup


### NFS Server Export Configuration


---

## Backup and Recovery

### Full System Backup

**Windows:**


**Linux:**


### Recovery from Backup

**Windows:**


**Linux:**


---

## Monitoring Storage

### Check Volume Sizes

**Windows:**


**Linux:**


### Space Monitoring Script


---

## Troubleshooting

### Permission Errors on Windows

**Problem:** `chmod: Operation not permitted` when using bind mounts

**Solution:** Use named volumes for core infrastructure on Windows. This is already the default in `setup-with-nfs.ps1`.

### Missing Data After Migration

**Problem:** Containers start but data is missing

**Solution:**


### NFS Mount Issues

**Problem:** Cannot mount NFS share on Windows

**Solution:**


### Performance Issues with NFS

**Problem:** Slow database operations on NFS

**Solution:**

- Use named volumes for core databases (already default on Windows)
- For Linux production, ensure NFS server has:
  - `async` for better write performance (or `sync` for safety)
  - Sufficient network bandwidth (1 Gbps+)
  - Low latency connection to NFS server

---

## Best Practices

1. **Windows Development:**

   - Use named volumes for databases (default)
   - Use bind mounts for tenant data
   - Regular volume exports for backup

2. **Linux Production:**

   - Use NFS bind mounts for all data
   - Configure proper NFS export options
   - Use `no_root_squash` for correct permissions

3. **Migration:**

   - Test migration in staging environment first
   - Verify data integrity after import
   - Document custom configurations

4. **Backups:**

   - Automated volume exports weekly
   - Tenant data synced to backup NFS share
   - Store configuration files in version control

5. **Monitoring:**
   - Monitor NFS mount availability
   - Alert on storage capacity thresholds
   - Track database sizes over time

---

## Security Considerations

### NFS Security


### Data Encryption


---

## Summary

- **Windows Dev:** Hybrid approach with named volumes for core + bind mounts for tenants
- **Linux Prod:** Pure bind mounts to NFS for everything
- **Migration:** Export/import volumes or copy NFS directories
- **Portability:** Tenant data always portable, core data portable via export/import on Windows
- **Production:** Use Linux with NFS for full bind mount support

For questions or issues, refer to the main [README.md](README.md) or tenant-specific documentation.


# Documentation: infrastructure/README-TENANT-BACKUP.md

---

# DeepLens Tenant Backup & Disaster Recovery Guide

**Comprehensive backup strategy for all tenant-specific resources**

Last Updated: December 18, 2025

---

## 📋 Overview

Each DeepLens tenant has three critical data stores that require backup:

| Resource       | Data Type                    | Backup Priority | Recovery Impact                            |
| -------------- | ---------------------------- | --------------- | ------------------------------------------ |
| **PostgreSQL** | Metadata, users, collections | 🔴 Critical     | Cannot operate without it                  |
| **Qdrant**     | Vector embeddings            | 🔴 Critical     | Expensive to regenerate (hours/days)       |
| **MinIO**      | Original images              | 🟡 High         | Can regenerate vectors, but lose originals |

**Why All Three Matter:**

- **PostgreSQL** contains metadata that links images to vectors
- **Qdrant** contains vector embeddings (expensive to regenerate)
- **MinIO** contains original images (source of truth)
- **Losing any one breaks the system completely**

---

## 🎯 Backup Architecture

### Backup Strategy


### Backup Schedules

| Resource       | Frequency    | Method                   | Retention                |
| -------------- | ------------ | ------------------------ | ------------------------ |
| **PostgreSQL** | Daily (2 AM) | `pg_dump` + WAL          | 30 days full, 7 days WAL |
| **Qdrant**     | Daily (3 AM) | Snapshot API             | 30 days                  |
| **MinIO**      | Continuous   | Versioning + `mc mirror` | 30 days versions         |

---

## 🐘 PostgreSQL Backup

### Automated Backup Container

The backup container runs `pg_dump` on a schedule and manages retention.

#### Provision PostgreSQL Backup


#### Manual Backup


#### Restore PostgreSQL


#### Backup Verification


### Point-in-Time Recovery (PITR)

For critical tenants, enable WAL archiving:


---

## 🔍 Qdrant Backup

Qdrant stores vector embeddings that are expensive to regenerate. Native snapshot API provides efficient backups.

### Automated Qdrant Backup

#### Create Backup Script

Create `provision-tenant-qdrant-backup.ps1`:


#### Manual Qdrant Backup


#### Restore Qdrant


#### List Qdrant Collections


---

## 🪣 MinIO Backup

MinIO backup strategy depends on storage backend:

- **NFS-backed MinIO**: NFS-level snapshots + `mc mirror`
- **Cloud-backed MinIO**: Object versioning + replication
- **Local volumes**: Volume snapshots + `mc mirror`

### Enable MinIO Versioning


### Automated MinIO Backup with mc mirror


### Restore MinIO


### NFS-Level Backup (Recommended)

If MinIO uses NFS backend, leverage NFS snapshots:


---

## 🔄 Complete Tenant Backup Procedure

### Full Tenant Backup


### Full Tenant Restore


---

## 📊 Monitoring & Validation

### Backup Health Check


### Backup Size Monitoring


---

## 🚨 Disaster Recovery Plan

### RPO (Recovery Point Objective)

| Scenario           | PostgreSQL  | Qdrant     | MinIO      | Total Data Loss      |
| ------------------ | ----------- | ---------- | ---------- | -------------------- |
| **Daily Backup**   | < 24 hours  | < 24 hours | < 24 hours | Up to 1 day of data  |
| **Hourly Backup**  | < 1 hour    | < 1 hour   | Versioned  | Up to 1 hour of data |
| **Continuous WAL** | < 5 minutes | < 24 hours | Versioned  | 5 min to 24 hours    |

### RTO (Recovery Time Objective)

| Data Size  | PostgreSQL | Qdrant     | MinIO      | Total Recovery Time |
| ---------- | ---------- | ---------- | ---------- | ------------------- |
| **10 GB**  | 2 minutes  | 1 minute   | 5 minutes  | ~8 minutes          |
| **100 GB** | 15 minutes | 10 minutes | 45 minutes | ~70 minutes         |
| **1 TB**   | 2 hours    | 1.5 hours  | 8 hours    | ~11.5 hours         |

### Recovery Scenarios

#### Scenario 1: Single Container Failure


#### Scenario 2: Complete Host Failure


#### Scenario 3: Data Center Disaster


### Testing Recovery

**Monthly DR Test:**


---

## 📋 Best Practices

### Backup Configuration

✅ **DO:**

- Automate all backups (cron jobs, scheduled tasks)
- Monitor backup success/failure (alerting)
- Test restores monthly
- Keep backups off-site (different datacenter/cloud)
- Encrypt backups at rest and in transit
- Document recovery procedures
- Version backup scripts in Git

❌ **DON'T:**

- Rely on single backup location
- Skip backup testing
- Store backups on same host as data
- Ignore backup failures
- Keep backups forever without retention policy

### Retention Policy


### Security

- Encrypt PostgreSQL dumps: `pg_dump | gpg -e > backup.dump.gpg`
- Encrypt Qdrant snapshots: `gzip backup.snapshot && gpg -e backup.snapshot.gz`
- Use MinIO encryption: `mc encrypt set sse-s3 vayyari/images`
- Restrict backup access with IAM policies
- Rotate backup encryption keys quarterly

---

## 🔗 Related Documentation

- [Tenant Management](README-TENANT-MANAGEMENT.md) - Tenant provisioning & storage
- [Infrastructure Guide](README.md) - Complete infrastructure documentation
- [NFS Migration](README-NFS-MIGRATION.md) - Storage migration guide

---

## 📞 Support

For backup issues or questions:

1. Check backup container logs: `podman logs deeplens-backup-<tenant>`
2. Review [DOCS_INDEX.md](../DOCS_INDEX.md) for troubleshooting
3. Contact DevOps team: devops@deeplens.local

---

**Last Updated:** December 18, 2025  
**Version:** 1.0.0


# Documentation: infrastructure/README-TENANT-MANAGEMENT.md

---

# DeepLens Multi-Tenant Management

This directory contains the complete multi-tenant management system for DeepLens, providing database isolation, storage configuration (BYOS), and tenant provisioning capabilities.

## 🏗️ Architecture Overview

### Multi-Tenant Data Separation

**Platform Database (`deeplens_platform`)**

- Tenant registry and metadata
- Storage configurations (encrypted)
- API usage tracking
- Platform-wide settings

**Tenant Template Database (`tenant_metadata_template`)**

- Template for new tenant databases
- Contains schema for image collections, search analytics, user preferences
- Cloned for each new tenant with Row Level Security (RLS)

**Identity Database (`deeplens_identity`)**

- Shared authentication service (NextGen Identity)
- User accounts, roles, and permissions
- Multi-tenant user isolation

### Bring Your Own Storage (BYOS)

Each tenant can configure their own storage provider:

- **Azure Blob Storage**: Enterprise-grade cloud storage
- **AWS S3**: Scalable object storage
- **Google Cloud Storage**: Multi-regional storage
- **MinIO**: Self-hosted S3-compatible storage
- **NFS/SMB**: Network file system shares

## 📁 Directory Structure


## 🚀 Quick Start

### 1. Initialize Infrastructure


### 2. Create Your First Tenant


### 3. Manage Tenants


## 🗄️ Database Schema

### Platform Tables

#### `tenants`

- Tenant registry with plan types and usage limits
- Domain and subdomain mapping
- Activity status and metadata

#### `tenant_storage_configs`

- BYOS storage configurations (encrypted)
- Provider-specific settings
- Connection test status and results

#### `tenant_databases`

- Registry of tenant-specific databases
- Connection strings and metadata
- Database type mapping (metadata, vectors, cache)

#### `api_usage_logs`

- Cross-tenant API usage tracking
- Performance metrics and quotas
- Billing and analytics data

### Tenant Tables (Template)

#### `image_collections`

- Tenant-specific image collections
- User-created organization structures
- Collection metadata and settings

#### `images`

- Image registry with tenant isolation
- Storage paths in tenant's BYOS
- Processing status and AI analysis
- Checksums and deduplication

#### `search_sessions` & `search_queries`

- Analytics for search behavior
- Performance optimization data
- User experience metrics

#### `user_preferences`

- Tenant-specific user settings
- Customization and preferences
- Feature flags and configurations

#### `usage_statistics`

- Tenant usage metrics
- Storage consumption tracking
- API call statistics

## 🔒 Security Features

### Row Level Security (RLS)

- Automatic tenant data isolation
- Policy-based access control
- Context-aware filtering

### Encrypted Storage Configurations

- Storage credentials encrypted at rest
- PostgreSQL `pgcrypto` extension
- Configurable encryption keys

### Database User Separation

- `platform_service`: Platform management operations
- `tenant_service`: Tenant data access with RLS
- Minimal privilege principles

## 📊 Plan Types and Limits

### Free Tier

- **Storage**: 1 GB
- **API Calls**: 1,000/month
- **Collections**: 5 maximum
- **Support**: Community

### Premium Tier

- **Storage**: 100 GB
- **API Calls**: 100,000/month
- **Collections**: 50 maximum
- **Support**: Email

### Enterprise Tier

- **Storage**: 1,000 GB
- **API Calls**: 1,000,000/month
- **Collections**: 500 maximum
- **Support**: Dedicated

## 🔧 Storage Provider Configuration

### Azure Blob Storage


### AWS S3


### Google Cloud Storage


### MinIO (BYOS - Tenant-Managed)

When tenant provides their own MinIO instance:


### NFS/SMB Network Storage


---

## 🗄️ Platform-Managed MinIO Storage

For tenants who don't have cloud storage (Azure/AWS/GCS) but have existing NFS infrastructure, DeepLens can provision dedicated MinIO instances. This provides a middle ground between full BYOS and shared storage.

### Use Cases

- **Enterprise customers with on-premise NFS storage**
- **Customers wanting data sovereignty without cloud costs**
- **Development/testing environments with local NFS**
- **Customers transitioning from on-premise to cloud**

### Architecture


### Key Benefits

✅ **Data Sovereignty:** Tenant data stays on their infrastructure  
✅ **Flexible:** Works with existing NFS investments  
✅ **Isolated:** Each tenant gets dedicated MinIO instance  
✅ **Managed:** DeepLens handles MinIO lifecycle  
✅ **Secure:** Auto-generated credentials, isolated containers  
✅ **Cost-Effective:** No cloud storage costs

### Provision Platform-Managed MinIO


**Output:**


### Platform-Managed MinIO Functions

#### New-TenantMinIOStorage

Creates a dedicated MinIO instance for a tenant with NFS storage backend.

**Parameters:**

| Parameter     | Required | Default             | Description                             |
| ------------- | -------- | ------------------- | --------------------------------------- |
| `TenantId`    | Yes      | -                   | Tenant UUID                             |
| `TenantName`  | Yes      | -                   | Tenant name (used for container naming) |
| `NFSPath`     | Yes      | -                   | NFS path (format: `server:/path`)       |
| `MinIOPort`   | No       | Auto (9100+)        | API port for MinIO                      |
| `ConsolePort` | No       | Auto (9200+)        | Console UI port                         |
| `AccessKey`   | No       | Auto-generated      | MinIO access key                        |
| `SecretKey`   | No       | Auto-generated      | MinIO secret key (32 bytes)             |
| `NFSOptions`  | No       | `rw,sync,hard,intr` | NFS mount options                       |

**Examples:**


#### Get-TenantMinIOStatus

Retrieves status and configuration of a tenant's MinIO instance.


**Output:**


#### Get-AllTenantMinIOInstances

Lists all tenant MinIO instances across the platform.


#### Remove-TenantMinIOStorage

Removes a tenant's MinIO instance and optionally the NFS volume.


⚠️ **Note:** Removing the volume only unmounts the NFS share from Docker. The data on the NFS server remains intact.

### Tenant NFS Requirements

**NFS Server Setup:**

- Running NFS server (Linux: `nfs-kernel-server`, Windows: NFS Server role)
- Exported file system accessible from Docker host
- Adequate storage space (estimate: 100GB+ per tenant)
- Network connectivity from Docker host

**NFS Export Configuration Example (Linux):**


**Testing NFS Access:**


---

## 🚀 API Integration

### Setting Tenant Context


### Storage Factory Pattern


## 📈 Monitoring and Analytics

### Platform Metrics

- Total tenant count by plan type
- Storage usage across all tenants
- API call distribution and performance
- Database performance metrics

### Tenant Metrics

- Individual tenant storage consumption
- Search query patterns and performance
- User activity and engagement
- Image processing statistics

### Grafana Dashboards

- Platform overview dashboard
- Tenant-specific performance dashboard
- Storage utilization trends
- API performance metrics

## 🔄 Backup and Recovery

### Database Backup Strategy


### Storage Backup

- Each tenant manages their own storage backups
- Platform provides backup status monitoring
- Integration with cloud provider backup services

## 🔧 Troubleshooting

### Common Issues

#### Tenant Creation Fails


#### Storage Configuration Test Fails


#### RLS Not Working


### Performance Optimization

#### Database Indexing

- All tenant tables have tenant_id indexes
- Composite indexes for common query patterns
- Regular ANALYZE and VACUUM operations

#### Connection Pooling

- Use connection pooling for tenant databases
- Separate connection pools per tenant
- Monitor connection usage and limits

## 📚 Additional Resources

- [PostgreSQL Row Level Security Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-Tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/)
- [BYOS Implementation Best Practices](https://cloud.google.com/architecture/saas-tenant-isolation-strategies)

## 🤝 Contributing

When adding new tenant features:

1. **Update Template Database**: Add tables to `tenant_metadata_template`
2. **Add RLS Policies**: Ensure proper tenant isolation
3. **Update Management Functions**: Extend provisioning scripts
4. **Test Isolation**: Verify data separation between tenants
5. **Document Changes**: Update this README and API documentation

## 📞 Support

For technical support with the multi-tenant system:

- Review the troubleshooting section above
- Check application logs and database query logs
- Verify tenant isolation with test queries
- Monitor storage provider connectivity and credentials


# Documentation: OBSERVABILITY_PLAN.md

---

# DeepLens Observability & Monitoring Plan

**Last Updated**: November 20, 2025  
**Version**: 1.0  
**Status**: Production Ready

---

## 📋 Table of Contents

- [🎯 Executive Summary](#-executive-summary)
- [🏗️ Architecture Overview](#️-architecture-overview)
- [🔧 Service Components](#-service-components)
- [📊 Data Flow & Processing](#-data-flow--processing)
- [🚀 Implementation Strategy](#-implementation-strategy)
- [⚙️ Configuration Management](#️-configuration-management)
- [🔍 Monitoring & Alerting](#-monitoring--alerting)
- [📈 Performance & Scalability](#-performance--scalability)
- [🛠️ Operations & Maintenance](#️-operations--maintenance)
- [🔄 Integration Patterns](#-integration-patterns)

---

## 🎯 Executive Summary

DeepLens implements a **comprehensive, production-ready observability stack** that provides complete visibility into application performance, infrastructure health, and business metrics. Our observability strategy follows the **three pillars of observability**: Metrics, Logs, and Traces, with **OpenTelemetry** as the unified telemetry standard.

### Key Capabilities

- **📊 Full-Stack Monitoring**: Application, infrastructure, and business metrics
- **🔍 Distributed Tracing**: End-to-end request tracing across microservices
- **📝 Centralized Logging**: Structured logs with correlation IDs
- **🚨 Intelligent Alerting**: Rule-based alerts with escalation policies
- **📈 Real-Time Dashboards**: Custom Grafana dashboards for all stakeholders
- **🔄 Auto-Discovery**: Dynamic service discovery and metric collection

---

## 🏗️ Architecture Overview

### Observable Architecture Design


### Telemetry Data Flow


---

## 🔧 Service Components

### Core Monitoring Services

| Service                     | Version | Purpose                          | Port      | Resource Limit      |
| --------------------------- | ------- | -------------------------------- | --------- | ------------------- |
| **Prometheus**              | v2.47.0 | Metrics collection and alerting  | 9090      | 1GB RAM, 1 CPU      |
| **Grafana**                 | 10.1.0  | Visualization dashboards         | 3000      | 512MB RAM, 0.5 CPU  |
| **OpenTelemetry Collector** | v0.88.0 | Centralized telemetry collection | 4317/4318 | 512MB RAM, 0.5 CPU  |
| **Jaeger**                  | v1.49   | Distributed tracing              | 16686     | 512MB RAM, 0.5 CPU  |
| **Loki**                    | v2.9.0  | Log aggregation                  | 3100      | 512MB RAM, 0.5 CPU  |
| **AlertManager**            | v0.25.0 | Alert routing                    | 9093      | 256MB RAM, 0.25 CPU |

### System Metrics & Exporters

| Service                 | Version | Purpose              | Port | Resource Limit      |
| ----------------------- | ------- | -------------------- | ---- | ------------------- |
| **cAdvisor**            | v0.47.0 | Container metrics    | 8081 | 512MB RAM, 0.5 CPU  |
| **Node Exporter**       | v1.6.1  | System metrics       | 9100 | 256MB RAM, 0.25 CPU |
| **Redis Exporter**      | v1.55.0 | Redis metrics        | 9121 | 128MB RAM, 0.1 CPU  |
| **PostgreSQL Exporter** | v0.15.0 | Database metrics     | 9187 | 128MB RAM, 0.1 CPU  |
| **Promtail**            | v2.9.0  | Log collection agent | -    | 256MB RAM, 0.25 CPU |

### Management Tools

| Service       | Version | Purpose                 | Port | Resource Limit      |
| ------------- | ------- | ----------------------- | ---- | ------------------- |
| **Portainer** | v2.19.1 | Container management UI | 9443 | 256MB RAM, 0.25 CPU |

---

## 📊 Data Flow & Processing

### Metrics Collection Strategy

#### **1. Application Metrics**

- **Custom Business Metrics**: Search requests, processing times, error rates
- **Framework Metrics**: ASP.NET Core, FastAPI, Node.js runtime metrics
- **Database Metrics**: Connection pools, query performance, cache hit rates

#### **2. Infrastructure Metrics**

- **Container Metrics**: CPU, memory, network, disk I/O per container
- **System Metrics**: Host CPU, memory, disk usage, network stats
- **Service Health**: Health checks, uptime, response times

#### **3. OpenTelemetry Integration**


### Log Processing Pipeline

#### **Structured Logging Standards**


#### **Log Aggregation Flow**

1. **Applications** → Structured logs via Serilog/structlog
2. **Promtail** → Collects container logs and application files
3. **Loki** → Stores logs with labels and indexes
4. **Grafana** → Visualizes logs with correlation to metrics/traces

---

## 🚀 Implementation Strategy

### Service-Specific Instrumentation

#### **.NET Core Services**


#### **Python AI Services**


#### **Node.js Services**


---

## ⚙️ Configuration Management

### Prometheus Configuration


### Grafana Datasources


---

## 🔍 Monitoring & Alerting

### Critical Alert Rules

#### **Infrastructure Alerts**


#### **Application Alerts**


### AlertManager Configuration


---

## 📈 Performance & Scalability

### Resource Allocation

#### **Production Resource Recommendations**

| Service       | CPU Cores | Memory | Storage   | Scaling Strategy                   |
| ------------- | --------- | ------ | --------- | ---------------------------------- |
| Prometheus    | 2-4       | 4-8GB  | 100GB SSD | Vertical, Federation               |
| Grafana       | 1-2       | 2-4GB  | 10GB      | Horizontal (Load Balanced)         |
| OpenTelemetry | 2-4       | 2-4GB  | -         | Horizontal (Multiple Collectors)   |
| Jaeger        | 2-4       | 4-8GB  | 50GB SSD  | Horizontal (Elasticsearch backend) |
| Loki          | 2-4       | 4-8GB  | 100GB SSD | Horizontal (Object Storage)        |

#### **Data Retention Strategy**

- **Prometheus**: 30 days (configurable)
- **Jaeger**: 7 days (memory), unlimited (persistent storage)
- **Loki**: 30 days (configurable)
- **Long-term Storage**: InfluxDB for business metrics (1 year+)

#### **Performance Optimization**

1. **Metric Sampling**: Reduce high-cardinality metrics
2. **Trace Sampling**: Intelligent sampling based on error rates
3. **Log Filtering**: Filter noisy logs at collection time
4. **Dashboard Optimization**: Efficient PromQL queries
5. **Storage Compression**: Enable compression for time-series data

---

## 🛠️ Operations & Maintenance

### Deployment & Startup

#### **Quick Start Commands**


#### **PowerShell Management Module**


### Backup & Recovery

#### **Critical Data Backup**


#### **Configuration Management**

- **Infrastructure as Code**: All configurations in Git
- **Version Control**: Tagged releases for configuration changes
- **Environment Parity**: Dev/staging/prod configuration consistency
- **Secret Management**: Infisical integration for sensitive data

---

## 🔄 Integration Patterns

### OpenTelemetry Integration

#### **Collector Configuration**


### Business Intelligence Integration

#### **InfluxDB Business Metrics**


### Dashboard Templates

#### **Key Performance Indicators (KPIs)**

1. **System Health Dashboard**

   - Service uptime and availability
   - Resource utilization (CPU, memory, disk)
   - Container health status

2. **Application Performance Dashboard**

   - Request/response times
   - Error rates and types
   - Database query performance

3. **Business Metrics Dashboard**

   - Search request volume
   - User engagement metrics
   - Tenant usage statistics

4. **Security & Compliance Dashboard**
   - Authentication success/failure rates
   - API rate limiting stats
   - Audit trail metrics

---

## 🎯 Monitoring Maturity Roadmap

### Current State (Phase 1) ✅

- [x] Complete infrastructure monitoring
- [x] Application performance monitoring
- [x] Distributed tracing implementation
- [x] Centralized logging
- [x] Basic alerting rules

### Phase 2 (Planned)

- [ ] Machine learning-based anomaly detection
- [ ] Advanced SLI/SLO tracking
- [ ] Custom business metrics dashboards
- [ ] Automated remediation workflows
- [ ] Cost optimization insights

### Phase 3 (Future)

- [ ] Predictive scaling based on metrics
- [ ] Advanced root cause analysis
- [ ] Cross-service dependency mapping
- [ ] Performance regression detection
- [ ] Business intelligence integration

---

## 📞 Contact & Support

**Observability Team**: observability@deeplens.local  
**Documentation**: [Internal Wiki](http://wiki.deeplens.local/observability)  
**Runbooks**: [Operational Procedures](http://runbooks.deeplens.local)

---

_This document is maintained by the DeepLens Platform Team and updated with each infrastructure release._


# Documentation: OPENTELEMETRY_STATUS.md

---

# OpenTelemetry Integration - NextGen.Identity

## Overview

OpenTelemetry has been integrated across **all layers** of the NextGen.Identity system, providing comprehensive observability for:

- Database operations (Dapper queries)
- Authentication flows
- Tenant provisioning
- Token management
- Service layer operations

## Architecture

### Packages Added

**NextGen.Identity.Core**

- OpenTelemetry.Api 1.9.0

**NextGen.Identity.Data**

- OpenTelemetry.Api 1.9.0
- Npgsql.OpenTelemetry 9.0.2 (PostgreSQL tracing)

**NextGen.Identity.Api**

- OpenTelemetry.Extensions.Hosting 1.9.0
- OpenTelemetry.Instrumentation.AspNetCore 1.9.0
- OpenTelemetry.Instrumentation.Http 1.9.0
- OpenTelemetry.Exporter.OpenTelemetryProtocol 1.9.0
- OpenTelemetry.Exporter.Prometheus.AspNetCore 1.9.0-beta.2
- Serilog.AspNetCore 8.0.3
- Serilog.Sinks.OpenTelemetry 4.1.0

## Instrumentation Details

### 1. Telemetry Infrastructure (`Telemetry.cs`)

**ActivitySource**: `NextGen.Identity` v1.0.0

**Operation Names**:

- `db.query` - Database SELECT operations
- `db.command` - Database INSERT/UPDATE/DELETE operations
- `user.authenticate` - Login operations
- `user.register` - User registration
- `token.generate` - Token generation
- `token.validate` - Token validation
- `tenant.provision` - Infrastructure provisioning
- `tenant.create` - Tenant creation
- `tenant.update` - Tenant updates
- `tenant.query` - Tenant queries

**Standard Tags**:

- `tenant.id` - Tenant identifier
- `user.id` - User identifier
- `user.email` - User email
- `db.table` - Database table name
- `db.operation` - SQL operation type
- `token.type` - Token type (access/refresh)
- `error.code` - Error code
- `error.message` - Error message

### 2. Data Layer Instrumentation

#### UserRepository

All methods instrumented with:

- `GetByIdAsync(Guid id)`
  - Activity: `db.query`
  - Tags: `db.table=users`, `db.operation=select`, `user.id`
- `GetByEmailAsync(string email)`
  - Activity: `db.query`
  - Tags: `db.table=users`, `db.operation=select`, `user.email`
- `CreateAsync(User user)`
  - Activity: `db.command`
  - Tags: `db.table=users`, `db.operation=insert`, `tenant.id`, `user.email`
- `UpdateAsync(User user)`
  - Activity: `db.command`
  - Tags: `db.table=users`, `db.operation=update`, `user.id`, `tenant.id`

**Error Handling**: All methods include try-catch with:


#### TenantRepository

All methods instrumented with:

- `GetByIdAsync(Guid id)` - Query by ID with tenant.id tag
- `GetBySlugAsync(string slug)` - Query by slug with tenant.slug tag
- `GetAllAsync()` - Query all with result.count tag
- `CreateAsync(Tenant tenant)` - Insert with tenant.slug tag
- `UpdateAsync(Tenant tenant)` - Update with tenant.id tag

#### RefreshTokenRepository

All methods instrumented with:

- `GetByTokenAsync(string token)` - Query with token.type=refresh
- `CreateAsync(RefreshToken token)` - Insert with user.id, token.type
- `UpdateAsync(RefreshToken token)` - Update with token.type
- `RevokeAllForUserAsync(Guid userId)` - Bulk revocation with user.id

### 3. Service Layer Instrumentation

#### AuthenticationService

**LoginAsync**:

- Activity: `user.authenticate`
- Tags: `user.email`, `ip.address`, `user.id`, `tenant.id`
- Custom tags: `auth.result` (user_not_found, invalid_password, user_inactive, success)
- Tracks: Password verification, token generation, last login update

**RefreshTokenAsync**:

- Activity: `token.validate`
- Tags: `token.type=refresh`, `ip.address`, `user.id`, `tenant.id`
- Custom tags: `token.result` (invalid_or_expired, user_not_found_or_inactive, refreshed_successfully)
- Tracks: Token revocation, new token generation

**RegisterUserAsync**:

- Activity: `user.register`
- Tags: `user.email`, `tenant.id`, `user.id`
- Custom tags: `registration.result` (email_already_exists, success)
- Tracks: Email uniqueness check, password hashing, user creation

**RevokeRefreshTokenAsync**:

- Activity: `token.validate`
- Tags: `token.type=refresh`, `token.action=revoke`, `user.id`
- Custom tags: `revoke.result` (token_not_found, success)

**ValidateTokenAsync**:

- Activity: `token.validate`
- Tags: `token.type=access`
- Custom tags: `validation.result` (valid, invalid)

#### TenantService

**CreateTenantWithAdminAsync**:

- Activity: `tenant.create`
- Tags: `tenant.name`, `user.email`, `tenant.slug`, `tenant.id`, `user.id`
- Custom tags: `create.result` (slug_already_exists, success)
- Tracks: Slug generation, infrastructure provisioning, admin user creation, token generation

**GetTenantByIdAsync**:

- Activity: `tenant.query`
- Tags: `tenant.id`, `query.type=by_id`
- Custom tags: `query.result` (not_found, found)

**GetTenantBySlugAsync**:

- Activity: `tenant.query`
- Tags: `tenant.slug`, `query.type=by_slug`
- Custom tags: `query.result` (not_found, found)

**GetAllTenantsAsync**:

- Activity: `tenant.query`
- Tags: `query.type=all`, `result.count`

**UpdateTenantAsync**:

- Activity: `tenant.update`
- Tags: `tenant.id`
- Custom tags: `update.result` (not_found, success)

## Activity Patterns

### Standard Activity Creation


### Error Handling Pattern


### Success Tracking


## Next Steps for Complete Observability

### 1. API Layer Configuration (Program.cs)


### 2. Metrics to Add

- `identity_login_attempts_total` (counter)
- `identity_login_duration_ms` (histogram)
- `identity_registration_total` (counter)
- `identity_token_generation_total` (counter)
- `identity_tenant_creation_total` (counter)
- `identity_tenant_provisioning_duration_ms` (histogram)
- `identity_db_query_duration_ms` (histogram)

### 3. Missing Implementations

- [ ] JwtTokenService with telemetry
- [ ] TenantProvisioningService with telemetry
- [ ] API Controllers with automatic ASP.NET Core instrumentation
- [ ] Middleware for correlation ID propagation
- [ ] Health checks with OpenTelemetry metrics

### 4. Infrastructure Stack

Deploy observability backend:

- **Jaeger**: Distributed tracing (port 16686 UI, 4317 OTLP)
- **Prometheus**: Metrics collection (port 9090)
- **Grafana**: Dashboards (port 3000)
- **Loki**: Log aggregation

## Benefits

### 1. Distributed Tracing

- Track requests across authentication → database → token generation
- Visualize tenant creation flow: API → Service → Repository → PowerShell provisioning
- Identify slow database queries

### 2. Error Tracking

- Automatic error capture with stack traces
- Error rate monitoring per operation
- Failed login attempt tracking

### 3. Performance Monitoring

- Database query duration
- Authentication flow latency
- Tenant provisioning time

### 4. Business Metrics

- Login success/failure rates
- New tenant signups
- Active user counts per tenant

### 5. Log Correlation

- Automatic trace/span ID injection into logs
- Single pane of glass for traces + logs
- Drill down from trace to related logs

## OpenTelemetry Semantic Conventions Followed

- **Database**: `db.table`, `db.operation`
- **User**: `user.id`, `user.email`
- **Tenant**: `tenant.id` (custom)
- **Error**: `error.message`, `error.code`
- **Network**: `ip.address`

## Example Trace Flow

**POST /api/tenants (Create Tenant)**


Every operation is tracked, timed, and correlated!

## Summary

✅ **Complete Data Layer instrumentation** - All Dapper repositories trace database operations  
✅ **Complete Service Layer instrumentation** - Authentication and Tenant services fully traced  
✅ **Error handling** - All operations capture and report errors  
✅ **Semantic tags** - Consistent tagging across all layers  
✅ **OpenTelemetry packages** - All projects have required dependencies  
⏳ **API Layer** - Ready for Program.cs configuration and controller implementation  
⏳ **JWT Service** - Interface defined, implementation pending  
⏳ **Provisioning Service** - Interface defined, implementation pending

**Next immediate task**: Configure API Program.cs with OpenTelemetry exporters and implement API controllers.


# Documentation: PORTS.md

---

# DeepLens Service Ports Reference

**Last Updated:** December 18, 2025  
**Environment:** Local Development

This document provides a comprehensive reference of all service ports used in the DeepLens platform, including their default assignments, configurable ranges, and conflict resolution strategies.

---

## 📋 Quick Reference Table

| Service               | Host Port | Container Port | Protocol | Configurable Range | Notes                                                  |
| --------------------- | --------- | -------------- | -------- | ------------------ | ------------------------------------------------------ |
| PostgreSQL            | 5433      | 5432           | TCP      | 5433-5439          | Changed from 5432 to avoid Windows PostgreSQL conflict |
| Redis                 | 6379      | 6379           | TCP      | 6379-6389          | Standard Redis port                                    |
| Qdrant (HTTP)         | 6333      | 6333           | HTTP     | 6333-6343          | Vector database REST API                               |
| Qdrant (gRPC)         | 6334      | 6334           | gRPC     | 6334-6344          | Vector database gRPC                                   |
| MinIO API             | 9000      | 9000           | HTTP     | N/A                | Single instance, bucket-based multi-tenancy            |
| MinIO Console         | 9001      | 9001           | HTTP     | N/A                | Single instance web UI                                 |
| Kafka                 | 9092      | 9092           | TCP      | 9092-9095          | Broker port                                            |
| Zookeeper             | 2181      | 2181           | TCP      | 2181-2185          | Kafka coordination                                     |
| Grafana               | 3001      | 3000           | HTTP     | 3001-3010          | Monitoring dashboards                                  |
| Prometheus            | 9090      | 9090           | HTTP     | 9090-9099          | Metrics collection                                     |
| Loki                  | 3100      | 3100           | HTTP     | 3100-3110          | Log aggregation                                        |
| Promtail              | 9080      | 9080           | HTTP     | 9080-9089          | Log shipper                                            |
| Jaeger UI             | 16686     | 16686          | HTTP     | 16686-16696        | Distributed tracing                                    |
| Jaeger Collector      | 14250     | 14250          | gRPC     | 14250-14260        | Trace ingestion                                        |
| OTEL Collector (gRPC) | 4317      | 4317           | gRPC     | 4317-4327          | OpenTelemetry gRPC                                     |
| OTEL Collector (HTTP) | 4318      | 4318           | HTTP     | 4318-4328          | OpenTelemetry HTTP                                     |
| Alertmanager          | 9093      | 9093           | HTTP     | 9093-9099          | Alert management                                       |

---

## 🔧 Core Services

### PostgreSQL Database

**Primary Service:** Relational database for platform and tenant data

- **Host Port:** `5433` (⚠️ **CHANGED from 5432**)
- **Container Port:** `5432`
- **Protocol:** TCP (PostgreSQL wire protocol)
- **Configurable Range:** `5433-5439`
- **Default in Production:** `5432`

**Why Port 5433?**

- Avoids conflict with Windows/macOS native PostgreSQL installations
- Container internally uses standard port 5432
- Application connection strings use 5433

**Connection Examples:**


---

### Redis (Caching & Session Store)

**Primary Service:** In-memory data structure store

- **Host Port:** `6379`
- **Container Port:** `6379`
- **Protocol:** TCP (RESP)
- **Configurable Range:** `6379-6389`
- **Cluster Ports:** `16379-16389` (Redis Cluster bus)

**Connection Examples:**


---

### Qdrant (Vector Database)

**Primary Service:** Vector similarity search for embeddings

- **HTTP API Port:** `6333`
- **gRPC Port:** `6334`
- **Container Ports:** `6333` (HTTP), `6334` (gRPC)
- **Protocol:** HTTP/REST and gRPC
- **Configurable Range:** `6333-6343` (HTTP), `6334-6344` (gRPC)

**Per-Tenant Deployment:**

- Each tenant gets dedicated Qdrant instance
- Ports allocated sequentially: `6333`, `6335`, `6337`...
- Container naming: `deeplens-{tenant-slug}-qdrant`

**Connection Examples:**


---

### MinIO (Object Storage)

**Primary Service:** S3-compatible object storage for images/files

- **API Port:** `9000`
- **Console Port:** `9001`
- **Container Ports:** `9000` (API), `9001` (Console)
- **Protocol:** HTTP (S3 API)
- **Multi-Tenancy:** Bucket-based isolation

**Single Instance Architecture:**

- One MinIO instance serves all tenants
- Each tenant gets a dedicated bucket
- IAM policies enforce tenant isolation
- Per-tenant access keys for security

**Bucket Naming Convention:**
| Tenant | Bucket Name | Access Key Pattern |
|--------|-------------|--------------------|
| Admin | `deeplens-admin` | `admin-{random}` |
| Tenant 1 | `deeplens-tenant1` | `tenant1-{random}` |
| Tenant 2 | `deeplens-tenant2` | `tenant2-{random}` |

**Connection Examples:**


---

## 🔄 Messaging & Streaming

### Apache Kafka

**Primary Service:** Event streaming platform

- **Broker Port:** `9092`
- **Container Port:** `9092`
- **Protocol:** Kafka protocol (TCP)
- **Configurable Range:** `9092-9095`
- **JMX Port:** `9999` (monitoring)

**Connection Examples:**


### Zookeeper (Kafka Dependency)

**Primary Service:** Distributed coordination for Kafka

- **Client Port:** `2181`
- **Container Port:** `2181`
- **Protocol:** TCP (Zookeeper protocol)
- **Configurable Range:** `2181-2185`
- **Peer Port:** `2888`, **Leader Port:** `3888`

---

## 📊 Observability Stack

### Grafana (Dashboards)

**Primary Service:** Metrics visualization and monitoring

- **Host Port:** `3001` (⚠️ **CHANGED from 3000**)
- **Container Port:** `3000`
- **Protocol:** HTTP
- **Configurable Range:** `3001-3010`
- **Default Port:** `3000` (conflicts with React dev server)

**Why Port 3001?**

- React WebUI runs on port 3000
- Grafana moved to 3001 to avoid conflict

**Connection Examples:**


### Prometheus (Metrics)

**Primary Service:** Time-series metrics database

- **Host Port:** `9090`
- **Container Port:** `9090`
- **Protocol:** HTTP
- **Configurable Range:** `9090-9099`

**Connection Examples:**


### Loki (Logs)

**Primary Service:** Log aggregation system

- **Host Port:** `3100`
- **Container Port:** `3100`
- **Protocol:** HTTP
- **Configurable Range:** `3100-3110`

**Connection Examples:**


### Jaeger (Distributed Tracing)

**Primary Service:** End-to-end distributed tracing

- **UI Port:** `16686`
- **Collector gRPC:** `14250`
- **Collector HTTP:** `14268`
- **Agent Thrift:** `6831` (UDP)
- **Protocol:** HTTP (UI), gRPC (collector)
- **Configurable Range:** `16686-16696` (UI)

**Connection Examples:**


### OpenTelemetry Collector

**Primary Service:** Vendor-agnostic telemetry collection

- **gRPC Port:** `4317`
- **HTTP Port:** `4318`
- **Protocol:** OTLP (gRPC/HTTP)
- **Configurable Range:** `4317-4327` (gRPC), `4318-4328` (HTTP)
- **Prometheus Exporter:** `8889`
- **Health Check:** `13133`

**Connection Examples:**


---

## 🌐 Application Services

### NextGen Identity API (Duende IdentityServer)

**Primary Service:** OAuth 2.0 / OpenID Connect authentication

- **HTTP Port:** `5001`
- **Protocol:** HTTP
- **Configurable Range:** `5001-5010`
- **HTTPS Port (Production):** `5443`

**Endpoints:**


### DeepLens WebUI (React SPA)

**Primary Service:** Web user interface

- **Dev Server Port:** `3000`
- **Protocol:** HTTP
- **Configurable Range:** `3000-3005`
- **Production Port:** Varies (behind reverse proxy)

**Connection:**


### DeepLens API Gateway

**Primary Service:** API routing and gateway

- **HTTP Port:** `5100`
- **Protocol:** HTTP
- **Configurable Range:** `5100-5110`

### DeepLens Admin API

**Primary Service:** Platform administration

- **HTTP Port:** `5200`
- **Protocol:** HTTP
- **Configurable Range:** `5200-5210`

### DeepLens Search API

**Primary Service:** Vector search and retrieval

- **HTTP Port:** `5300`
- **Protocol:** HTTP
- **Configurable Range:** `5300-5310`

---

## 🔒 Port Allocation Strategy

### Fixed Ports (Never Change)

- PostgreSQL: `5433` (dev), `5432` (prod)
- Redis: `6379`
- Kafka: `9092`
- Identity API: `5001`

### Dynamic Ports (Tenant-Specific)

- Qdrant HTTP: `6333 + (tenantId * 2)`
- Qdrant gRPC: `6334 + (tenantId * 2)`

**Note:** MinIO uses bucket-based multi-tenancy with a single instance (no dynamic ports)

### Conflict Resolution

If a port is in use:

1. **Check process:** `netstat -ano | findstr :PORT` (Windows) or `lsof -i :PORT` (Linux/Mac)
2. **Stop service:** `podman stop <container>`
3. **Change port:** Update environment variable or config
4. **Update docs:** Reflect the change in this file

---

## 📝 Configuration Files

### Docker Compose


### Environment Variables


---

## 🚨 Common Port Conflicts

### Port 5432 (PostgreSQL)

**Conflict:** Windows/macOS PostgreSQL installation  
**Solution:** Use port `5433` for containerized PostgreSQL

### Port 3000 (React/Grafana)

**Conflict:** React dev server and Grafana  
**Solution:** Grafana on `3001`, React on `3000`

### Port 9000 (MinIO/SonarQube)

**Conflict:** Multiple services use 9000  
**Solution:** MinIO tenant ports start at `9000` with gaps

### Port 8080 (Common HTTP)

**Conflict:** Many dev tools use 8080  
**Solution:** Avoid 8080, use 5xxx for APIs

---

## 📦 Port Ranges by Category

### Database Layer (5xxx, 6xxx)

- `5433-5439`: PostgreSQL instances
- `6379-6389`: Redis instances
- `6333-6343`: Qdrant HTTP
- `6334-6344`: Qdrant gRPC

### Object Storage & Messaging (9xxx)

- `9000`: MinIO API (single instance)
- `9001`: MinIO Console (single instance)
- `9092-9095`: Kafka brokers

### Application APIs (5xxx)

- `5001-5010`: Identity API
- `5100-5110`: API Gateway
- `5200-5210`: Admin API
- `5300-5310`: Search API

### Monitoring (3xxx, 9xxx, 1xxxx)

- `3001-3010`: Grafana
- `3100-3110`: Loki
- `9080-9089`: Promtail
- `9090-9099`: Prometheus
- `16686-16696`: Jaeger UI

### Telemetry (4xxx, 1xxxx)

- `4317-4327`: OTLP gRPC
- `4318-4328`: OTLP HTTP
- `14250-14260`: Jaeger Collector

---

## 🔄 Port Update Checklist

When changing a service port:

- [ ] Update `docker-compose.infrastructure.yml`
- [ ] Update `appsettings.Development.json`
- [ ] Update `appsettings.json`
- [ ] Update `CREDENTIALS.md`
- [ ] Update `PORTS.md` (this file)
- [ ] Update `handover.md`
- [ ] Update infrastructure PowerShell scripts
- [ ] Update connection strings in code
- [ ] Restart affected containers
- [ ] Test connectivity

---

**Note:** All ports listed are for **local development**. Production deployments should use standard ports behind load balancers and ingress controllers with proper TLS termination.


# Documentation: PROJECT_PLAN.md

---

# DeepLens - Image Similarity Search Engine

📋 **See also:**

- [Architecture Overview](docs/ARCHITECTURE_OVERVIEW.md)
- [RBAC Plan](docs/RBAC_PLAN.md)
- [Admin & Impersonation Features](docs/ADMIN_IMPERSONATION_PLAN.md)
- [Storage Architecture](docs/STORAGE_ARCHITECTURE.md)

---

## 🚀 Recent Infrastructure Enhancements (December 16-17, 2025)

### Portable Infrastructure & NFS Migration

DeepLens infrastructure now supports **fully portable storage** with comprehensive NFS/bind mount capabilities for easy migration between machines.

#### Key Achievements

✅ **PostgreSQL Backup Provisioning**

- Automated backup containers for tenant databases
- NFS/bind mount support for backup storage
- Configurable schedules (cron-based) and retention policies
- Compression support (gzip) for space efficiency

✅ **Hybrid Storage Architecture** (Windows + Podman)

- Core services: Podman named volumes (PostgreSQL, Redis, Qdrant)
- Tenant data: Bind mounts to Windows filesystem
- Migration via `podman volume export/import` + directory copy

✅ **Complete Documentation**

- [NFS Migration Guide](infrastructure/README-NFS-MIGRATION.md) - 500+ lines
- [PostgreSQL Backup Guide](infrastructure/README-TENANT-POSTGRESQL-BACKUP.md) - 700+ lines
- [MinIO Provisioning Guide](infrastructure/README-TENANT-MINIO-PROVISIONING.md)

✅ **Management Scripts**

- [`setup-with-nfs.ps1`](infrastructure/setup-with-nfs.ps1) - Start/stop/status/clean infrastructure
- [`provision-tenant-backup.ps1`](infrastructure/provision-tenant-backup.ps1) - Automated backup setup
- [`export-infrastructure-state.ps1`](infrastructure/export-infrastructure-state.ps1) - Export for migration
- [`restore-infrastructure.ps1`](infrastructure/restore-infrastructure.ps1) - Restore on new machine

#### Technical Implementation

**Container Runtime**: Podman 5.7.0 on Windows

- Network: `deeplens-network` (bridge)
- Core services: PostgreSQL 16-alpine, Redis 7-alpine, Qdrant v1.7.0
- Backup containers: postgres:16-alpine running crond for scheduled backups

**Storage Strategy**:


**Why Hybrid on Windows**:

- PostgreSQL requires `chmod 700` on data directory
- Windows filesystem cannot honor Unix permissions from containers
- Solution: Named volumes work perfectly, tenant files use bind mounts

#### Files Created/Modified

1. **Documentation** (NEW)

   - `infrastructure/README-NFS-MIGRATION.md` - Complete migration procedures
   - `infrastructure/README-TENANT-POSTGRESQL-BACKUP.md` - Backup provisioning
   - `infrastructure/README-TENANT-MINIO-PROVISIONING.md` - MinIO storage

2. **Infrastructure Scripts** (NEW)

   - `infrastructure/setup-with-nfs.ps1` - Main infrastructure management
   - `infrastructure/provision-tenant-backup.ps1` - Backup container setup
   - `infrastructure/export-infrastructure-state.ps1` - Export for migration
   - `infrastructure/restore-infrastructure.ps1` - Restore on new machine
   - `infrastructure/test-vayyari-setup.ps1` - Validation script

3. **PowerShell Module** (FIXED)

   - `infrastructure/powershell/DeepLensTenantManager.psm1`
   - Fixed Unicode issues (curly quotes → straight quotes)
   - Fixed PowerShell parser errors (ternary operators, inline if statements)
   - Added 4 PostgreSQL backup functions (lines 1450-1810)

4. **Docker Compose** (UPDATED)
   - `infrastructure/docker-compose.infrastructure.yml`
   - Added `DEEPLENS_DATA_PATH` and `DEEPLENS_LOGS_PATH` variables
   - All services support custom paths via environment variables

#### Production Validation

**Successfully Tested**:

- Core infrastructure running with named volumes
- Vayyari tenant database created (`tenant_vayyari_metadata`)
- Backup container provisioned (`deeplens-backup-vayyari`)
- Daily backups scheduled at 2 AM with 30-day retention
- All 4 containers healthy: postgres, redis, qdrant, backup-vayyari

**Migration Paths Documented**:

- Windows → Windows: Volume export/import + directory copy
- Linux → Linux: Direct NFS share copy
- Windows → Linux: Volume extract + permission fix
- WSL2 option available but not required

#### Future Enhancements

- [ ] Switch to WSL2 + Docker for full bind mount support on Windows (optional)
- [ ] Prometheus metrics for backup monitoring
- [ ] Grafana dashboards for storage usage
- [ ] Automated backup verification
- [ ] Multi-region NFS replication

---

## Project Overview

**Vision**: Build a comprehensive image similarity search engine that can find visually similar images across multiple storage locations (network shares, cloud storage, blob storage) and help optimize storage by identifying duplicates.

**Core Functionality**:

- Accept an image input (API/user upload)
- Find similar/duplicate images from indexed storage locations
- Return ranked similarity results with image IDs/locations
- Enable storage optimization through duplicate detection and management
  For storage and database architecture details, see [STORAGE_ARCHITECTURE.md](docs/STORAGE_ARCHITECTURE.md).

## Architecture Overview

For a detailed architecture overview, see [ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md).
│ │ Metrics │ │ Logging │ │
│ │ • Prometheus│ │ • ELK/EFK Stack │ │
│ │ • Grafana │ │ • Fluentd │ │
│ │ • Custom │ │ • Loki │ │
│ └─────────────┘ └─────────────────┘ │
│ │
│ ┌─────────────────────────────────┐ │
│ │ Tracing & APM │ │
│ │ • Jaeger / Zipkin │ │
│ │ • OpenTelemetry │ │
│ │ • Application Insights │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────────┘

graph TD
    A[Image Upload API] -->|images.uploaded| B[Validation Service]
    B -->|images.validated| C[Feature Extraction Service]
    B -->|images.failed| F[Error Handler]
    C -->|images.processed| D[Vector Indexing Service]
    C -->|images.processed| E[Duplicate Detection Service]
    D -->|images.indexed| G[Search API Ready]
    E -->|duplicates.found| H[Duplicate Management]
    F -->|Dead Letter Queue| I[Manual Review]
    G -->|tenant.usage| J[Analytics & Billing]
# Image Processing Pipeline Topics
Topics:
  images.uploaded: # New image uploaded and stored
    partitions: 3
    retention: 7d
    consumers: ["validation-service", "analytics-service"]

  images.validated: # Image passed validation checks
    partitions: 3
    retention: 7d
    consumers: ["feature-extraction-service"]

  images.processed: # Features extracted, vectors generated
    partitions: 3
    retention: 7d
    consumers: ["vector-indexing-service", "duplicate-detection-service"]

  images.indexed: # Image indexed in vector database
    partitions: 3
    retention: 7d
    consumers: ["search-service", "analytics-service"]

  # Specialized Processing Topics
  duplicates.found: # Potential duplicate images detected
    partitions: 1
    retention: 30d
    consumers: ["duplicate-management-service"]

  tenant.usage: # Usage analytics and metrics per tenant
    partitions: 6 # Partition by tenant_id for parallel processing
    retention: 90d
    consumers: ["analytics-service", "billing-service"]

  images.failed: # Processing failures and errors
    partitions: 1
    retention: 30d
    consumers: ["error-handler-service", "monitoring-service"]
┌─────────────────────────────────────────────────────────────────┐
│                     DeepLens Core Service (.NET)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   API Layer     │    │  Orchestration  │    │ Background  │  │
│  │                 │    │     Layer       │    │  Services   │  │
│  │ • Search API    │    │ • Workflow Mgmt │    │ • Indexer   │  │
│  │ • Upload API    │    │ • Job Queue     │    │ • Scanner   │  │
│  │ • Admin API     │    │ • Event Router  │    │ • Processor │  │
│  │ • Health API    │    │ • Storage Mgmt  │    │ • Cleanup   │  │
│  │ • SignalR Hubs  │    │ • Task Scheduler│    │ • Monitor   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   Data Layer    │    │  Cross-Cutting  │    │Integration  │  │
│  │                 │    │    Services     │    │   Layer     │  │
│  │ • EF Core       │    │ • Logging       │    │ • Cloud SDK │  │
│  │ • Caching       │    │ • Monitoring    │    │ • Message   │  │
│  │ • Vector Store  │    │ • Config Mgmt   │    │   Queue     │  │
│  │ • File Storage  │    │ • Health Checks │    │ • AI/ML     │  │
│  │ • Metadata DB   │    │ • Metrics       │    │   Client    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │    Python AI/ML │
                         │    Services     │
                         │                 │
                         │ • Feature       │
                         │   Extraction    │
                         │ • Model         │
                         │   Inference     │
                         │ • Vector Ops    │
                         └─────────────────┘
sequenceDiagram
    participant User
    participant DeepLens Web App
    participant Duende IdentityServer
    participant DeepLens API

    User->>DeepLens Web App: 1. Access protected resource
    DeepLens Web App->>Duende IdentityServer: 2. Redirect to /authorize
    Duende IdentityServer->>User: 3. Login page
    User->>Duende IdentityServer: 4. Enter credentials
    Duende IdentityServer->>User: 5. Consent screen (if needed)
    User->>Duende IdentityServer: 6. Grant consent
    Duende IdentityServer->>DeepLens Web App: 7. Authorization code
    DeepLens Web App->>Duende IdentityServer: 8. Exchange code for tokens
    Duende IdentityServer->>DeepLens Web App: 9. ID token + Access token
    DeepLens Web App->>DeepLens API: 10. API call with access token
    DeepLens API->>Duende IdentityServer: 11. Validate token (introspection)
    Duende IdentityServer->>DeepLens API: 12. Token validation response
    DeepLens API->>DeepLens Web App: 13. API response
    DeepLens Web App->>User: 14. Protected resource
sequenceDiagram
    participant User
    participant DeepLens Web App
    participant Duende IdentityServer
    participant DeepLens API

    User->>DeepLens Web App: 1. Access protected resource
    DeepLens Web App->>Duende IdentityServer: 2. Redirect to /authorize
    Duende IdentityServer->>User: 3. Login page
    User->>Duende IdentityServer: 4. Enter credentials
    Duende IdentityServer->>User: 5. Consent screen (if needed)
    User->>Duende IdentityServer: 6. Grant consent
    Duende IdentityServer->>DeepLens Web App: 7. Authorization code
    DeepLens Web App->>Duende IdentityServer: 8. Exchange code for tokens
    Duende IdentityServer->>DeepLens Web App: 9. ID token + Access token
    DeepLens Web App->>DeepLens API: 10. API call with access token
    DeepLens API->>Duende IdentityServer: 11. Validate token (introspection)
    Duende IdentityServer->>DeepLens API: 12. Token validation response
    DeepLens API->>DeepLens Web App: 13. API response
    DeepLens Web App->>User: 14. Protected resource
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TELEMETRY COLLECTION LAYER                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ .NET Core   │    │ Python AI   │    │Infrastructure│    │ External    │  │
│  │ Service     │    │ Services    │    │ Components   │    │ Services    │  │
│  │ • Serilog→  │    │ • structlog │    │ • Prometheus │    │ • Load Bal. │  │
│  │   OpenTel   │    │ • OpenTel   │    │ • OpenTel    │    │ • Node Exp  │  │
│  │ • OTel      │    │ • FastAPI   │    │ • OTLP       │    │ • cAdvisor  │  │
│  └─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘  │
│           │                 │                 │                 │           │
└───────────┼─────────────────┼─────────────────┼─────────────────┼───────────┘
            │                 │                 │                 │
            ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TELEMETRY AGGREGATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    METRICS      │  │    LOGGING      │  │        TRACING              │   │
│ │                 │  │                 │  │                             │   │
│ │ • Prometheus    │  │ • Elasticsearch │  │ • Jaeger                    │   │
│ │ • Victoria      │  │ • Loki          │  │ • Zipkin                    │   │
│ │   Metrics       │  │ • Fluentd       │  │ • OpenTelemetry Collector   │   │
│ │ • Custom        │  │ • Vector        │  │ • Tempo                     │   │
│ │   Dashboards    │  │ • Logstash      │  │ • AWS X-Ray                 │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
            │                 │                               │
            ▼                 ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VISUALIZATION & ALERTING                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    DASHBOARDS   │  │     ALERTS      │  │         ANALYSIS            │   │
│ │                 │  │                 │  │                             │   │
│ │ • Grafana       │  │ • AlertManager  │  │ • Kibana                    │   │
│ │ • Custom UI     │  │ • PagerDuty     │  │ • Jaeger UI                 │   │
│ │ • DataDog       │  │ • Slack/Teams   │  │ • Custom Analytics          │   │
│ │ • New Relic     │  │ • Email/SMS     │  │ • Business Intelligence     │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                           ┌─────────────────────────────────────────┐
                           │         Load Balancer + WAF             │
                           │    (HAProxy/NGINX/Cloud LB/Traefik)     │
                           └──────────────────┬──────────────────────┘
                                              │
                           ┌─────────────────────────────────────────┐
                           │         API Gateway (.NET Core)         │
                           │  • Authentication & Authorization       │
                           │  • Rate Limiting & Circuit Breakers     │
                           │  • Request Routing & Load Balancing     │
                           │  • OpenTelemetry Integration           │
                           └──────────────────┬──────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
        ▼                                     ▼                                     ▼
┌──────────────────┐                ┌─────────────────┐                ┌─────────────────┐
│   .NET Core APIs │                │    .NET Core    │                │    Python AI/ML │
│                  │                │   Orchestration │                │    Services     │
│ • Search API     │◄──────────────►│                 │◄──────────────►│                 │
│ • Admin API      │                │ • Workflow Mgmt │                │ • Feature       │
│ • Upload API     │                │ • Event Routing │                │   Extraction    │
│ • Health API     │                │ • Task Queue    │                │ • Model         │
│ • Metadata API   │                │ • Job Scheduler │                │   Inference     │
│                  │                │ • File Watcher  │                │ • Training      │
└──────────────────┘                │ • Storage Mgmt  │                │ • Vector Ops    │
        │                           └─────────────────┘                └─────────────────┘
        │                                     │                                     │
        └─────────────────────────────────────┼─────────────────────────────────────┘
                                              │
                                   ┌─────────────────┐
                                   │   Message Bus   │
                                   │                 │
                                   │ • RabbitMQ      │
                                   │ • Apache Kafka  │
                                   │ • Azure Service │
                                   │   Bus/AWS SQS   │
                                   └─────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                     DeepLens Core Service (.NET)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   API Layer     │    │  Orchestration  │    │ Background  │  │
│  │                 │    │     Layer       │    │  Services   │  │
│  │ • Search API    │    │ • Workflow Mgmt │    │ • Indexer   │  │
│  │ • Upload API    │    │ • Job Queue     │    │ • Scanner   │  │
│  │ • Admin API     │    │ • Event Router  │    │ • Processor │  │
│  │ • Health API    │    │ • Storage Mgmt  │    │ • Cleanup   │  │
│  │ • SignalR Hubs  │    │ • Task Scheduler│    │ • Monitor   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   Data Layer    │    │  Cross-Cutting  │    │Integration  │  │
│  │                 │    │    Services     │    │   Layer     │  │
│  │ • EF Core       │    │ • Logging       │    │ • Cloud SDK │  │
│  │ • Caching       │    │ • Monitoring    │    │ • Message   │  │
│  │ • Vector Store  │    │ • Config Mgmt   │    │   Queue     │  │
│  │ • File Storage  │    │ • Health Checks │    │ • AI/ML     │  │
│  │ • Metadata DB   │    │ • Metrics       │    │   Client    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │    Python AI/ML │
                         │    Services     │
                         │                 │
                         │ • Feature       │
                         │   Extraction    │
                         │ • Model         │
                         │   Inference     │
                         │ • Vector Ops    │
                         └─────────────────┘
sequenceDiagram
    participant User
    participant DeepLens Web App
    participant Duende IdentityServer
    participant DeepLens API

    User->>DeepLens Web App: 1. Access protected resource
    DeepLens Web App->>Duende IdentityServer: 2. Redirect to /authorize
    Duende IdentityServer->>User: 3. Login page
    User->>Duende IdentityServer: 4. Enter credentials
    Duende IdentityServer->>User: 5. Consent screen (if needed)
    User->>Duende IdentityServer: 6. Grant consent
    Duende IdentityServer->>DeepLens Web App: 7. Authorization code
    DeepLens Web App->>Duende IdentityServer: 8. Exchange code for tokens
    Duende IdentityServer->>DeepLens Web App: 9. ID token + Access token
    DeepLens Web App->>DeepLens API: 10. API call with access token
    DeepLens API->>Duende IdentityServer: 11. Validate token (introspection)
    Duende IdentityServer->>DeepLens API: 12. Token validation response
    DeepLens API->>DeepLens Web App: 13. API response
    DeepLens Web App->>User: 14. Protected resource
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TELEMETRY COLLECTION LAYER                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ .NET Core   │    │ Python AI   │    │Infrastructure│    │ External    │  │
│  │ Service     │    │ Services    │    │ Components   │    │ Services    │  │
│  │ • Serilog→  │    │ • structlog │    │ • Prometheus │    │ • Load Bal. │  │
│  │   OpenTel   │    │ • OpenTel   │    │ • OpenTel    │    │ • Node Exp  │  │
│  │ • OTel      │    │ • FastAPI   │    │ • OTLP       │    │ • cAdvisor  │  │
│  └─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘  │
│           │                 │                 │                 │           │
└───────────┼─────────────────┼─────────────────┼─────────────────┼───────────┘
            │                 │                 │                 │
            ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TELEMETRY AGGREGATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    METRICS      │  │    LOGGING      │  │        TRACING              │   │
│ │                 │  │                 │  │                             │   │
│ │ • Prometheus    │  │ • Elasticsearch │  │ • Jaeger                    │   │
│ │ • Victoria      │  │ • Loki          │  │ • Zipkin                    │   │
│ │   Metrics       │  │ • Fluentd       │  │ • OpenTelemetry Collector   │   │
│ │ • Custom        │  │ • Vector        │  │ • Tempo                     │   │
│ │   Dashboards    │  │ • Logstash      │  │ • AWS X-Ray                 │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
            │                 │                               │
            ▼                 ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VISUALIZATION & ALERTING                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    DASHBOARDS   │  │     ALERTS      │  │         ANALYSIS            │   │
│ │                 │  │                 │  │                             │   │
│ │ • Grafana       │  │ • AlertManager  │  │ • Kibana                    │   │
│ │ • Custom UI     │  │ • PagerDuty     │  │ • Jaeger UI                 │   │
│ │ • DataDog       │  │ • Slack/Teams   │  │ • Custom Analytics          │   │
│ │ • New Relic     │  │ • Email/SMS     │  │ • Business Intelligence     │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                           ┌─────────────────────────────────────────┐
                           │         Load Balancer + WAF             │
                           │    (HAProxy/NGINX/Cloud LB/Traefik)     │
                           └──────────────────┬──────────────────────┘
                                              │
                           ┌─────────────────────────────────────────┐
                           │         API Gateway (.NET Core)         │
                           │  • Authentication & Authorization       │
                           │  • Rate Limiting & Circuit Breakers     │
                           │  • Request Routing & Load Balancing     │
                           │  • OpenTelemetry Integration           │
                           └──────────────────┬──────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
        ▼                                     ▼                                     ▼
┌──────────────────┐                ┌─────────────────┐                ┌─────────────────┐
│   .NET Core APIs │                │    .NET Core    │                │    Python AI/ML │
│                  │                │   Orchestration │                │    Services     │
│ • Search API     │◄──────────────►│                 │◄──────────────►│                 │
│ • Admin API      │                │ • Workflow Mgmt │                │ • Feature       │
│ • Upload API     │                │ • Event Routing │                │   Extraction    │
│ • Health API     │                │ • Task Queue    │                │ • Model         │
│ • Metadata API   │                │ • Job Scheduler │                │   Inference     │
│                  │                │ • File Watcher  │                │ • Training      │
└──────────────────┘                │ • Storage Mgmt  │                │ • Vector Ops    │
        │                           └─────────────────┘                └─────────────────┘
        │                                     │                                     │
        └─────────────────────────────────────┼─────────────────────────────────────┘
                                              │
                                   ┌─────────────────┐
                                   │   Message Bus   │
                                   │                 │
                                   │ • RabbitMQ      │
                                   │ • Apache Kafka  │
                                   │ • Azure Service │
                                   │   Bus/AWS SQS   │
                                   └─────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                     DeepLens Core Service (.NET)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   API Layer     │    │  Orchestration  │    │ Background  │  │
│  │                 │    │     Layer       │    │  Services   │  │
│  │ • Search API    │    │ • Workflow Mgmt │    │ • Indexer   │  │
│  │ • Upload API    │    │ • Job Queue     │    │ • Scanner   │  │
│  │ • Admin API     │    │ • Event Router  │    │ • Processor │  │
│  │ • Health API    │    │ • Storage Mgmt  │    │ • Cleanup   │  │
│  │ • SignalR Hubs  │    │ • Task Scheduler│    │ • Monitor   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   Data Layer    │    │  Cross-Cutting  │    │Integration  │  │
│  │                 │    │    Services     │    │   Layer     │  │
│  │ • EF Core       │    │ • Logging       │    │ • Cloud SDK │  │
│  │ • Caching       │    │ • Monitoring    │    │ • Message   │  │
│  │ • Vector Store  │    │ • Config Mgmt   │    │   Queue     │  │
│  │ • File Storage  │    │ • Health Checks │    │ • AI/ML     │  │
│  │ • Metadata DB   │    │ • Metrics       │    │   Client    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │    Python AI/ML │
                         │    Services     │
                         │                 │
                         │ • Feature       │
                         │   Extraction    │
                         │ • Model         │
                         │   Inference     │
                         │ • Vector Ops    │
                         └─────────────────┘
sequenceDiagram
    participant User
    participant DeepLens Web App
    participant Duende IdentityServer
    participant DeepLens API

    User->>DeepLens Web App: 1. Access protected resource
    DeepLens Web App->>Duende IdentityServer: 2. Redirect to /authorize
    Duende IdentityServer->>User: 3. Login page
    User->>Duende IdentityServer: 4. Enter credentials
    Duende IdentityServer->>User: 5. Consent screen (if needed)
    User->>Duende IdentityServer: 6. Grant consent
    Duende IdentityServer->>DeepLens Web App: 7. Authorization code
    DeepLens Web App->>Duende IdentityServer: 8. Exchange code for tokens
    Duende IdentityServer->>DeepLens Web App: 9. ID token + Access token
    DeepLens Web App->>DeepLens API: 10. API call with access token
    DeepLens API->>Duende IdentityServer: 11. Validate token (introspection)
    Duende IdentityServer->>DeepLens API: 12. Token validation response
    DeepLens API->>DeepLens Web App: 13. API response
    DeepLens Web App->>User: 14. Protected resource
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TELEMETRY COLLECTION LAYER                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ .NET Core   │    │ Python AI   │    │Infrastructure│    │ External    │  │
│  │ Service     │    │ Services    │    │ Components   │    │ Services    │  │
│  │ • Serilog→  │    │ • structlog │    │ • Prometheus │    │ • Load Bal. │  │
│  │   OpenTel   │    │ • OpenTel   │    │ • OpenTel    │    │ • Node Exp  │  │
│  │ • OTel      │    │ • FastAPI   │    │ • OTLP       │    │ • cAdvisor  │  │
│  └─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘  │
│           │                 │                 │                 │           │
└───────────┼─────────────────┼─────────────────┼─────────────────┼───────────┘
            │                 │                 │                 │
            ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TELEMETRY AGGREGATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    METRICS      │  │    LOGGING      │  │        TRACING              │   │
│ │                 │  │                 │  │                             │   │
│ │ • Prometheus    │  │ • Elasticsearch │  │ • Jaeger                    │   │
│ │ • Victoria      │  │ • Loki          │  │ • Zipkin                    │   │
│ │   Metrics       │  │ • Fluentd       │  │ • OpenTelemetry Collector   │   │
│ │ • Custom        │  │ • Vector        │  │ • Tempo                     │   │
│ │   Dashboards    │  │ • Logstash      │  │ • AWS X-Ray                 │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
            │                 │                               │
            ▼                 ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VISUALIZATION & ALERTING                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    DASHBOARDS   │  │     ALERTS      │  │         ANALYSIS            │   │
│ │                 │  │                 │  │                             │   │
│ │ • Grafana       │  │ • AlertManager  │  │ • Kibana                    │   │
│ │ • Custom UI     │  │ • PagerDuty     │  │ • Jaeger UI                 │   │
│ │ • DataDog       │  │ • Slack/Teams   │  │ • Custom Analytics          │   │
│ │ • New Relic     │  │ • Email/SMS     │  │ • Business Intelligence     │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                           ┌─────────────────────────────────────────┐
                           │         Load Balancer + WAF             │
                           │    (HAProxy/NGINX/Cloud LB/Traefik)     │
                           └──────────────────┬──────────────────────┘
                                              │
                           ┌─────────────────────────────────────────┐
                           │         API Gateway (.NET Core)         │
                           │  • Authentication & Authorization       │
                           │  • Rate Limiting & Circuit Breakers     │
                           │  • Request Routing & Load Balancing     │
                           │  • OpenTelemetry Integration           │
                           └──────────────────┬──────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
        ▼                                     ▼                                     ▼
┌──────────────────┐                ┌─────────────────┐                ┌─────────────────┐
│   .NET Core APIs │                │    .NET Core    │                │    Python AI/ML │
│                  │                │   Orchestration │                │    Services     │
│ • Search API     │◄──────────────►│                 │◄──────────────►│                 │
│ • Admin API      │                │ • Workflow Mgmt │                │ • Feature       │
│ • Upload API     │                │ • Event Routing │                │   Extraction    │
│ • Health API     │                │ • Task Queue    │                │ • Model         │
│ • Metadata API   │                │ • Job Scheduler │                │   Inference     │
│                  │                │ • File Watcher  │                │ • Training      │
└──────────────────┘                │ • Storage Mgmt  │                │ • Vector Ops    │
        │                           └─────────────────┘                └─────────────────┘
        │                                     │                                     │
        └─────────────────────────────────────┼─────────────────────────────────────┘
                                              │
                                   ┌─────────────────┐
                                   │   Message Bus   │
                                   │                 │
                                   │ • RabbitMQ      │
 │ • Apache Kafka  │
                                   │ • Azure Service │
                                   │   Bus/AWS SQS   │
                                   └─────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                     DeepLens Core Service (.NET)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   API Layer     │    │  Orchestration  │    │ Background  │  │
│  │                 │    │     Layer       │    │  Services   │  │
│  │ • Search API    │    │ • Workflow Mgmt │    │ • Indexer   │  │
│  │ • Upload API    │    │ • Job Queue     │    │ • Scanner   │  │
│  │ • Admin API     │    │ • Event Router  │    │ • Processor │  │
│  │ • Health API    │    │ • Storage Mgmt  │    │ • Cleanup   │  │
│  │ • SignalR Hubs  │    │ • Task Scheduler│    │ • Monitor   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   Data Layer    │    │  Cross-Cutting  │    │Integration  │  │
│  │                 │    │    Services     │    │   Layer     │  │
│  │ • EF Core       │    │ • Logging       │    │ • Cloud SDK │  │
│  │ • Caching       │    │ • Monitoring    │    │ • Message   │  │
│  │ • Vector Store  │    │ • Config Mgmt   │    │   Queue     │  │
│  │ • File Storage  │    │ • Health Checks │    │ • AI/ML     │  │
│  │ • Metadata DB   │    │ • Metrics       │    │   Client    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │    Python AI/ML │
                         │    Services     │
                         │                 │
                         │ • Feature       │
                         │   Extraction    │
                         │ • Model         │
                         │   Inference     │
                         │ • Vector Ops    │
                         └─────────────────┘
sequenceDiagram
    participant User
    participant DeepLens Web App
    participant Duende IdentityServer
    participant DeepLens API

    User->>DeepLens Web App: 1. Access protected resource
    DeepLens Web App->>Duende IdentityServer: 2. Redirect to /authorize
    Duende IdentityServer->>User: 3. Login page
    User->>Duende IdentityServer: 4. Enter credentials
    Duende IdentityServer->>User: 5. Consent screen (if needed)
    User->>Duende IdentityServer: 6. Grant consent
    Duende IdentityServer->>DeepLens Web App: 7. Authorization code
    DeepLens Web App->>Duende IdentityServer: 8. Exchange code for tokens
    Duende IdentityServer->>DeepLens Web App: 9. ID token + Access token
    DeepLens Web App->>DeepLens API: 10. API call with access token
    DeepLens API->>Duende IdentityServer: 11. Validate token (introspection)
    Duende IdentityServer->>DeepLens API: 12. Token validation response
    DeepLens API->>DeepLens Web App: 13. API response
    DeepLens Web App->>User: 14. Protected resource
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TELEMETRY COLLECTION LAYER                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ .NET Core   │    │ Python AI   │    │Infrastructure│    │ External    │  │
│  │ Service     │    │ Services    │    │ Components   │    │ Services    │  │
│  │ • Serilog→  │    │ • structlog │    │ • Prometheus │    │ • Load Bal. │  │
│  │   OpenTel   │    │ • OpenTel   │    │ • OpenTel    │    │ • Node Exp  │  │
│  │ • OTel      │    │ • FastAPI   │    │ • OTLP       │    │ • cAdvisor  │  │
│  └─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘  │
│           │                 │                 │                 │           │
└───────────┼─────────────────┼─────────────────┼─────────────────┼───────────┘
            │                 │                 │                 │
            ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TELEMETRY AGGREGATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    METRICS      │  │    LOGGING      │  │        TRACING              │   │
│ │                 │  │                 │  │                             │   │
│ │ • Prometheus    │  │ • Elasticsearch │  │ • Jaeger                    │   │
│ │ • Victoria      │  │ • Loki          │  │ • Zipkin                    │   │
│ │   Metrics       │  │ • Fluentd       │  │ • OpenTelemetry Collector   │   │
│ │ • Custom        │  │ • Vector        │  │ • Tempo                     │   │
│ │   Dashboards    │  │ • Logstash      │  │ • AWS X-Ray                 │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
            │                 │                               │
            ▼                 ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VISUALIZATION & ALERTING                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    DASHBOARDS   │  │     ALERTS      │  │         ANALYSIS            │   │
│ │                 │  │                 │  │                             │   │
│ │ • Grafana       │  │ • AlertManager  │  │ • Kibana                    │   │
│ │ • Custom UI     │  │ • PagerDuty     │  │ • Jaeger UI                 │   │
│ │ • DataDog       │  │ • Slack/Teams   │  │ • Custom Analytics          │   │
│ │ • New Relic     │  │ • Email/SMS     │  │ • Business Intelligence     │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                           ┌─────────────────────────────────────────┐
                           │         Load Balancer + WAF             │
                           │    (HAProxy/NGINX/Cloud LB/Traefik)     │
                           └──────────────────┬──────────────────────┘
                                              │
                           ┌─────────────────────────────────────────┐
                           │         API Gateway (.NET Core)         │
                           │  • Authentication & Authorization       │
                           │  • Rate Limiting & Circuit Breakers     │
                           │  • Request Routing & Load Balancing     │
                           │  • OpenTelemetry Integration           │
                           └──────────────────┬──────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
        ▼                                     ▼                                     ▼
┌──────────────────┐                ┌─────────────────┐                ┌─────────────────┐
│   .NET Core APIs │                │    .NET Core    │                │    Python AI/ML │
│                  │                │   Orchestration │                │    Services     │
│ • Search API     │◄──────────────►│                 │◄──────────────►│                 │
│ • Admin API      │                │ • Workflow Mgmt │                │ • Feature       │
│ • Upload API     │                │ • Event Routing │                │   Extraction    │
│ • Health API     │                │ • Task Queue    │                │ • Model         │
│ • Metadata API   │                │ • Job Scheduler │                │   Inference     │
│                  │                │ • File Watcher  │                │ • Training      │
└──────────────────┘                │ • Storage Mgmt  │                │ • Vector Ops    │
        │                           └─────────────────┘                └─────────────────┘
        │                                     │                                     │
        └─────────────────────────────────────┼─────────────────────────────────────┘
                                              │
                                   ┌─────────────────┐
                                   │   Message Bus   │
                                   │                 │
                                   │ • RabbitMQ      │
                                   │ • Apache Kafka  │
                                   │ • Azure Service │
                                   │   Bus/AWS SQS   │
                                   └─────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                     DeepLens Core Service (.NET)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   API Layer     │    │  Orchestration  │    │ Background  │  │
│  │                 │    │     Layer       │    │  Services   │  │
│  │ • Search API    │    │ • Workflow Mgmt │    │ • Indexer   │  │
│  │ • Upload API    │    │ • Job Queue     │    │ • Scanner   │  │
│  │ • Admin API     │    │ • Event Router  │    │ • Processor │  │
│  │ • Health API    │    │ • Storage Mgmt  │    │ • Cleanup   │  │
│  │ • SignalR Hubs  │    │ • Task Scheduler│    │ • Monitor   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   Data Layer    │    │  Cross-Cutting  │    │Integration  │  │
│  │                 │    │    Services     │    │   Layer     │  │
│  │ • EF Core       │    │ • Logging       │    │ • Cloud SDK │  │
│  │ • Caching       │    │ • Monitoring    │    │ • Message   │  │
│  │ • Vector Store  │    │ • Config Mgmt   │    │   Queue     │  │
│  │ • File Storage  │    │ • Health Checks │    │ • AI/ML     │  │
│  │ • Metadata DB   │    │ • Metrics       │    │   Client    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │    Python AI/ML │
                         │    Services     │
                         │                 │
                         │ • Feature       │
                         │   Extraction    │
                         │ • Model         │
                         │   Inference     │
                         │ • Vector Ops    │
                         └─────────────────┘
sequenceDiagram
    participant User
    participant DeepLens Web App
    participant Duende IdentityServer
    participant DeepLens API

    User->>DeepLens Web App: 1. Access protected resource
    DeepLens Web App->>Duende IdentityServer: 2. Redirect to /authorize
    Duende IdentityServer->>User: 3. Login page
    User->>Duende IdentityServer: 4. Enter credentials
    Duende IdentityServer->>User: 5. Consent screen (if needed)
    User->>Duende IdentityServer: 6. Grant consent
    Duende IdentityServer->>DeepLens Web App: 7. Authorization code
    DeepLens Web App->>Duende IdentityServer: 8. Exchange code for tokens
    Duende IdentityServer->>DeepLens Web App: 9. ID token + Access token
    DeepLens Web App->>DeepLens API: 10. API call with access token
    DeepLens API->>Duende IdentityServer: 11. Validate token (introspection)
    Duende IdentityServer->>DeepLens API: 12. Token validation response
    DeepLens API->>DeepLens Web App: 13. API response
    DeepLens Web App->>User: 14. Protected resource
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TELEMETRY COLLECTION LAYER                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ .NET Core   │    │ Python AI   │    │Infrastructure│    │ External    │  │
│  │ Service     │    │ Services    │    │ Components   │    │ Services    │  │
│  │ • Serilog→  │    │ • structlog │    │ • Prometheus │    │ • Load Bal. │  │
│  │   OpenTel   │    │ • OpenTel   │    │ • OpenTel    │    │ • Node Exp  │  │
│  │ • OTel      │    │ • FastAPI   │    │ • OTLP       │    │ • cAdvisor  │  │
│  └─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘  │
│           │                 │                 │                 │           │
└───────────┼─────────────────┼─────────────────┼─────────────────┼───────────┘
            │                 │                 │                 │
            ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TELEMETRY AGGREGATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    METRICS      │  │    LOGGING      │  │        TRACING              │   │
│ │                 │  │                 │  │                             │   │
│ │ • Prometheus    │  │ • Elasticsearch │  │ • Jaeger                    │   │
│ │ • Victoria      │  │ • Loki          │  │ • Zipkin                    │   │
│ │   Metrics       │  │ • Fluentd       │  │ • OpenTelemetry Collector   │   │
│ │ • Custom        │  │ • Vector        │  │ • Tempo                     │   │
│ │   Dashboards    │  │ • Logstash      │  │ • AWS X-Ray                 │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
            │                 │                               │
            ▼                 ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VISUALIZATION & ALERTING                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    DASHBOARDS   │  │     ALERTS      │  │         ANALYSIS            │   │
│ │                 │  │                 │  │                             │   │
│ │ • Grafana       │  │ • AlertManager  │  │ • Kibana                    │   │
│ │ • Custom UI     │  │ • PagerDuty     │  │ • Jaeger UI                 │   │
│ │ • DataDog       │  │ • Slack/Teams   │  │ • Custom Analytics          │   │
│ │ • New Relic     │  │ • Email/SMS     │  │ • Business Intelligence     │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                           ┌─────────────────────────────────────────┐
                           │         Load Balancer + WAF             │
                           │    (HAProxy/NGINX/Cloud LB/Traefik)     │
                           └──────────────────┬──────────────────────┘
                                              │
                           ┌─────────────────────────────────────────┐
                           │         API Gateway (.NET Core)         │
                           │  • Authentication & Authorization       │
                           │  • Rate Limiting & Circuit Breakers     │
                           │  • Request Routing & Load Balancing     │
                           │  • OpenTelemetry Integration           │
                           └──────────────────┬──────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
        ▼                                     ▼                                     ▼
┌──────────────────┐                ┌─────────────────┐                ┌─────────────────┐
│   .NET Core APIs │                │    .NET Core    │                │    Python AI/ML │
│                  │                │   Orchestration │                │    Services     │
│ • Search API     │◄──────────────►│                 │◄──────────────►│                 │
│ • Admin API      │                │ • Workflow Mgmt │                │ • Feature       │
│ • Upload API     │                │ • Event Routing │                │   Extraction    │
│ • Health API     │                │ • Task Queue    │                │ • Model         │
│ • Metadata API   │                │ • Job Scheduler │                │   Inference     │
│                  │                │ • File Watcher  │                │ • Training      │
└──────────────────┘                │ • Storage Mgmt  │                │ • Vector Ops    │
        │                           └─────────────────┘                └─────────────────┘
        │                                     │                                     │
        └─────────────────────────────────────┼─────────────────────────────────────┘
                                              │
                                   ┌─────────────────┐
                                   │   Message Bus   │
                                   │                 │
                                   │ • RabbitMQ      │
                                   │ • Apache Kafka  │
                                   │ • Azure Service │
                                   │   Bus/AWS SQS   │
                                   └─────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                     DeepLens Core Service (.NET)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   API Layer     │    │  Orchestration  │    │ Background  │  │
│  │                 │    │     Layer       │    │  Services   │  │
│  │ • Search API    │    │ • Workflow Mgmt │    │ • Indexer   │  │
│  │ • Upload API    │    │ • Job Queue     │    │ • Scanner   │  │
│  │ • Admin API     │    │ • Event Router  │    │ • Processor │  │
│  │ • Health API    │    │ • Storage Mgmt  │    │ • Cleanup   │  │
│  │ • SignalR Hubs  │    │ • Task Scheduler│    │ • Monitor   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   Data Layer    │    │  Cross-Cutting  │    │Integration  │  │
│  │                 │    │    Services     │    │   Layer     │  │
│  │ • EF Core       │    │ • Logging       │    │ • Cloud SDK │  │
│  │ • Caching       │    │ • Monitoring    │    │ • Message   │  │
│  │ • Vector Store  │    │ • Config Mgmt   │    │   Queue     │  │
│  │ • File Storage  │    │ • Health Checks │    │ • AI/ML     │  │
│  │ • Metadata DB   │    │ • Metrics       │    │   Client    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │    Python AI/ML │
                         │    Services     │
                         │                 │
                         │ • Feature       │
                         │   Extraction    │
                         │ • Model         │
                         │   Inference     │
                         │ • Vector Ops    │
                         └─────────────────┘
sequenceDiagram
    participant User
    participant DeepLens Web App
    participant Duende IdentityServer
    participant DeepLens API

    User->>DeepLens Web App: 1. Access protected resource
    DeepLens Web App->>Duende IdentityServer: 2. Redirect to /authorize
    Duende IdentityServer->>User: 3. Login page
    User->>Duende IdentityServer: 4. Enter credentials
    Duende IdentityServer->>User: 5. Consent screen (if needed)
    User->>Duende IdentityServer: 6. Grant consent
    Duende IdentityServer->>DeepLens Web App: 7. Authorization code
    DeepLens Web App->>Duende IdentityServer: 8. Exchange code for tokens
    Duende IdentityServer->>DeepLens Web App: 9. ID token + Access token
    DeepLens Web App->>DeepLens API: 10. API call with access token
    DeepLens API->>Duende IdentityServer: 11. Validate token (introspection)
    Duende IdentityServer->>DeepLens API: 12. Token validation response
    DeepLens API->>DeepLens Web App: 13. API response
    DeepLens Web App->>User: 14. Protected resource
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TELEMETRY COLLECTION LAYER                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ .NET Core   │    │ Python AI   │    │Infrastructure│    │ External    │  │
│  │ Service     │    │ Services    │    │ Components   │    │ Services    │  │
│  │ • Serilog→  │    │ • structlog │    │ • Prometheus │    │ • Load Bal. │  │
│  │   OpenTel   │    │ • OpenTel   │    │ • OpenTel    │    │ • Node Exp  │  │
│  │ • OTel      │    │ • FastAPI   │    │ • OTLP       │    │ • cAdvisor  │  │
│  └─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘  │
│           │                 │                 │                 │           │
└───────────┼─────────────────┼─────────────────┼─────────────────┼───────────┘
            │                 │                 │                 │
            ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TELEMETRY AGGREGATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    METRICS      │  │    LOGGING      │  │        TRACING              │   │
│ │                 │  │                 │  │                             │   │
│ │ • Prometheus    │  │ • Elasticsearch │  │ • Jaeger                    │   │
│ │ • Victoria      │  │ • Loki          │  │ • Zipkin                    │   │
│ │   Metrics       │  │ • Fluentd       │  │ • OpenTelemetry Collector   │   │
│ │ • Custom        │  │ • Vector        │  │ • Tempo                     │   │
│ │   Dashboards    │  │ • Logstash      │  │ • AWS X-Ray                 │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
            │                 │                               │
            ▼                 ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VISUALIZATION & ALERTING                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    DASHBOARDS   │  │     ALERTS      │  │         ANALYSIS            │   │
│ │                 │  │                 │  │                             │   │
│ │ • Grafana       │  │ • AlertManager  │  │ • Kibana                    │   │
│ │ • Custom UI     │  │ • PagerDuty     │  │ • Jaeger UI                 │   │
│ │ • DataDog       │  │ • Slack/Teams   │  │ • Custom Analytics          │   │
│ │ • New Relic     │  │ • Email/SMS     │  │ • Business Intelligence     │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                           ┌─────────────────────────────────────────┐
                           │         Load Balancer + WAF             │
                           │    (HAProxy/NGINX/Cloud LB/Traefik)     │
                           └──────────────────┬──────────────────────┘
                                              │
                           ┌─────────────────────────────────────────┐
                           │         API Gateway (.NET Core)         │
                           │  • Authentication & Authorization       │
                           │  • Rate Limiting & Circuit Breakers     │
                           │  • Request Routing & Load Balancing     │
                           │  • OpenTelemetry Integration           │
                           └──────────────────┬──────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
        ▼                                     ▼                                     ▼
┌──────────────────┐                ┌─────────────────┐                ┌─────────────────┐
│   .NET Core APIs │                │    .NET Core    │                │    Python AI/ML │
│                  │                │   Orchestration │                │    Services     │
│ • Search API     │◄──────────────►│                 │◄──────────────►│                 │
│ • Admin API      │                │ • Workflow Mgmt │                │ • Feature       │
│ • Upload API     │                │ • Event Routing │                │   Extraction    │
│ • Health API     │                │ • Task Queue    │                │ • Model         │
│ • Metadata API   │                │ • Job Scheduler │                │   Inference     │
│                  │                │ • File Watcher  │                │ • Training      │
└──────────────────┘                │ • Storage Mgmt  │                │ • Vector Ops    │
        │                           └─────────────────┘                └─────────────────┘
        │                                     │                                     │
        └─────────────────────────────────────┼─────────────────────────────────────┘
                                              │
                                   ┌─────────────────┐
                                   │   Message Bus   │
                                   │                 │
                                   │ • RabbitMQ      │
                                   │ • Apache Kafka  │
                                   │ • Azure Service │
                                   │   Bus/AWS SQS   │
                                   └─────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                     DeepLens Core Service (.NET)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   API Layer     │    │  Orchestration  │    │ Background  │  │
│  │                 │    │     Layer       │    │  Services   │  │
│  │ • Search API    │    │ • Workflow Mgmt │    │ • Indexer   │  │
│  │ • Upload API    │    │ • Job Queue     │    │ • Scanner   │  │
│  │ • Admin API     │    │ • Event Router  │    │ • Processor │  │
│  │ • Health API    │    │ • Storage Mgmt  │    │ • Cleanup   │  │
│  │ • SignalR Hubs  │    │ • Task Scheduler│    │ • Monitor   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   Data Layer    │    │  Cross-Cutting  │    │Integration  │  │
│  │                 │    │    Services     │    │   Layer     │  │
│  │ • EF Core       │    │ • Logging       │    │ • Cloud SDK │  │
│  │ • Caching       │    │ • Monitoring    │    │ • Message   │  │
│  │ • Vector Store  │    │ • Config Mgmt   │    │   Queue     │  │
│  │ • File Storage  │    │ • Health Checks │    │ • AI/ML     │  │
│  │ • Metadata DB   │    │ • Metrics       │    │   Client    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │    Python AI/ML │
                         │    Services     │
                         │                 │
                         │ • Feature       │
                         │   Extraction    │
                         │ • Model         │
                         │   Inference     │
                         │ • Vector Ops    │
                         └─────────────────┘
sequenceDiagram
    participant User
    participant DeepLens Web App
    participant Duende IdentityServer
    participant DeepLens API

    User->>DeepLens Web App: 1. Access protected resource
    DeepLens Web App->>Duende IdentityServer: 2. Redirect to /authorize
    Duende IdentityServer->>User: 3. Login page
    User->>Duende IdentityServer: 4. Enter credentials
    Duende IdentityServer->>User: 5. Consent screen (if needed)
    User->>Duende IdentityServer: 6. Grant consent
    Duende IdentityServer->>DeepLens Web App: 7. Authorization code
    DeepLens Web App->>Duende IdentityServer: 8. Exchange code for tokens
    Duende IdentityServer->>DeepLens Web App: 9. ID token + Access token
    DeepLens Web App->>DeepLens API: 10. API call with access token
    DeepLens API->>Duende IdentityServer: 11. Validate token (introspection)
    Duende IdentityServer->>DeepLens API: 12. Token validation response
    DeepLens API->>DeepLens Web App: 13. API response
    DeepLens Web App->>User: 14. Protected resource
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TELEMETRY COLLECTION LAYER                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ .NET Core   │    │ Python AI   │    │Infrastructure│    │ External    │  │
│  │ Service     │    │ Services    │    │ Components   │    │ Services    │  │
│  │ • Serilog→  │    │ • structlog │    │ • Prometheus │    │ • Load Bal. │  │
│  │   OpenTel   │    │ • OpenTel   │    │ • OpenTel    │    │ • Node Exp  │  │
│  │ • OTel      │    │ • FastAPI   │    │ • OTLP       │    │ • cAdvisor  │  │
│  └─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘  │
│           │                 │                 │                 │           │
└───────────┼─────────────────┼─────────────────┼─────────────────┼───────────┘
            │                 │                 │                 │
            ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TELEMETRY AGGREGATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    METRICS      │  │    LOGGING      │  │        TRACING              │   │
│ │                 │  │                 │  │                             │   │
│ │ • Prometheus    │  │ • Elasticsearch │  │ • Jaeger                    │   │
│ │ • Victoria      │  │ • Loki          │  │ • Zipkin                    │   │
│ │   Metrics       │  │ • Fluentd       │  │ • OpenTelemetry Collector   │   │
│ │ • Custom        │  │ • Vector        │  │ • Tempo                     │   │
│ │   Dashboards    │  │ • Logstash      │  │ • AWS X-Ray                 │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
            │                 │                               │
            ▼                 ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VISUALIZATION & ALERTING                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    DASHBOARDS   │  │     ALERTS      │  │         ANALYSIS            │   │
│ │                 │  │                 │  │                             │   │
│ │ • Grafana       │  │ • AlertManager  │  │ • Kibana                    │   │
│ │ • Custom UI     │  │ • PagerDuty     │  │ • Jaeger UI                 │   │
│ │ • DataDog       │  │ • Slack/Teams   │  │ • Custom Analytics          │   │
│ │ • New Relic     │  │ • Email/SMS     │  │ • Business Intelligence     │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                           ┌─────────────────────────────────────────┐
                           │         Load Balancer + WAF             │
                           │    (HAProxy/NGINX/Cloud LB/Traefik)     │
                           └──────────────────┬──────────────────────┘
                                              │
                           ┌─────────────────────────────────────────┐
                           │         API Gateway (.NET Core)         │
                           │  • Authentication & Authorization       │
                           │  • Rate Limiting & Circuit Breakers     │
                           │  • Request Routing & Load Balancing     │
                           │  • OpenTelemetry Integration           │
                           └──────────────────┬──────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
        ▼                                     ▼                                     ▼
┌──────────────────┐                ┌─────────────────┐                ┌─────────────────┐
│   .NET Core APIs │                │    .NET Core    │                │    Python AI/ML │
│                  │                │   Orchestration │                │    Services     │
│ • Search API     │◄──────────────►│                 │◄──────────────►│                 │
│ • Admin API      │                │ • Workflow Mgmt │                │ • Feature       │
│ • Upload API     │                │ • Event Routing │                │   Extraction    │
│ • Health API     │                │ • Task Queue    │                │ • Model         │
│ • Metadata API   │                │ • Job Scheduler │                │   Inference     │
│                  │                │ • File Watcher  │                │ • Training      │
└──────────────────┘                │ • Storage Mgmt  │                │ • Vector Ops    │
        │                           └─────────────────┘                └─────────────────┘
        │                                     │                                     │
        └─────────────────────────────────────┼─────────────────────────────────────┘
                                              │
                                   ┌─────────────────┐
                                   │   Message Bus   │
                                   │                 │
                                   │ • RabbitMQ      │
                                   │ • Apache Kafka  │
                                   │ • Azure Service │
                                   │   Bus/AWS SQS   │
                                   └─────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                     DeepLens Core Service (.NET)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   API Layer     │    │  Orchestration  │    │ Background  │  │
│  │                 │    │     Layer       │    │  Services   │  │
│  │ • Search API    │    │ • Workflow Mgmt │    │ • Indexer   │  │
│  │ • Upload API    │    │ • Job Queue     │    │ • Scanner   │  │
│  │ • Admin API     │    │ • Event Router  │    │ • Processor │  │
│  │ • Health API    │    │ • Storage Mgmt  │    │ • Cleanup   │  │
│  │ • SignalR Hubs  │    │ • Task Scheduler│    │ • Monitor   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   Data Layer    │    │  Cross-Cutting  │    │Integration  │  │
│  │                 │    │    Services     │    │   Layer     │  │
│  │ • EF Core       │    │ • Logging       │    │ • Cloud SDK │  │
│  │ • Caching       │    │ • Monitoring    │    │ • Message   │  │
│  │ • Vector Store  │    │ • Config Mgmt   │    │   Queue     │  │
│  │ • File Storage  │    │ • Health Checks │    │ • AI/ML     │  │
│  │ • Metadata DB   │    │ • Metrics       │    │   Client    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │    Python AI/ML │
                         │    Services     │
                         │                 │
                         │ • Feature       │
                         │   Extraction    │
                         │ • Model         │
                         │   Inference     │
                         │ • Vector Ops    │
                         └─────────────────┘

**Consumer Configuration (.NET)**


**Python Consumer for AI/ML Services**


📋 **Implementation Details:** See [Processing Queue Configuration](CODE_EXAMPLES.md#processing-queue-configuration) for complete queue management and worker scaling setup.

### Error Handling & Recovery

**Retry Mechanisms:**

- Failed uploads: 3 retries with exponential backoff
- Network timeouts: Configurable timeout per storage type
- Processing failures: Dead letter queue for manual review
- Partial batch failures: Continue processing remaining items

**Monitoring & Alerting:**

- Track processing times and success rates
- Alert on high failure rates or long queue times
- Monitor storage backend health and capacity
- Track per-tenant usage and quotas

### Security & Privacy

**Access Control:**

- Tenant isolation at storage and database level
- Image access requires valid authentication token
- Role-based permissions (upload, view, delete)
- Audit logging for all image operations

**Data Protection:**

- Encryption at rest for all storage backends
- Encryption in transit (HTTPS/TLS)
- PII detection and masking in metadata
- Configurable data retention policies per tenant

**Compliance Features:**

- GDPR: Right to deletion, data portability
- SOC2: Audit trails, access controls
- HIPAA: Enhanced encryption, access logging (if applicable)

## Performance Considerations

### Optimization Strategies

1. **Indexing Optimization**:

   - Batch processing for large datasets
   - Incremental indexing for new files
   - Parallel processing across multiple workers

2. **Search Optimization**:

   - Vector index optimization (HNSW, IVF)
   - Result caching for common queries
   - Approximate nearest neighbor search

3. **Storage Optimization**:
   - Thumbnail generation and caching
   - Metadata precomputation
   - Connection pooling for storage backends

### Scalability Targets

- Handle 1M+ images in index
- Sub-second search response times
- Support for distributed processing
- Horizontal scaling capabilities

## Horizontal Scaling & Load Balancing Strategy

### Scaling Architecture Patterns

#### 1. Stateless Service Design


#### 2. Load Balancing Strategies

**API Layer Load Balancing**:

- **Round Robin**: Equal distribution across healthy instances
- **Least Connections**: Route to instance with fewest active connections
- **Weighted Round Robin**: Different capacities for different instance types
- **IP Hash**: Session affinity when needed
- **Health Check Based**: Automatic failover for unhealthy instances

**Processing Layer Load Balancing**:

- **Task Queue Distribution**: Work distributed via message queues
- **Resource-Aware Routing**: CPU/Memory based task assignment
- **Specialty Routing**: GPU tasks to GPU-enabled nodes
- **Priority Queues**: Critical tasks processed first

#### 3. Auto-Scaling Policies

**Horizontal Pod Autoscaler (HPA) Configuration**:

📋 **Implementation Details:** See [Kubernetes Horizontal Pod Autoscaler](CODE_EXAMPLES.md#kubernetes-horizontal-pod-autoscaler) for complete auto-scaling configuration with CPU, memory, and custom metrics.

**Vertical Pod Autoscaler (VPA)** for resource optimization:

- Automatic CPU/memory limit adjustment
- Right-sizing based on actual usage patterns
- Cost optimization through resource efficiency

#### 4. Data Layer Scaling

**Vector Database Scaling**:

- **Sharding**: Distribute vectors across multiple nodes
- **Replication**: Read replicas for query load distribution
- **Partitioning**: Time-based or feature-based partitioning
- **Federation**: Multiple vector DB clusters for different domains

**Metadata Database Scaling**:

- **Master-Slave Replication**: Read scaling with consistency
- **Sharding**: Horizontal partitioning by image ID ranges
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Indexed queries and materialized views

**Cache Layer Scaling**:

📋 **Implementation Details:** See [Redis Cluster Configuration](CODE_EXAMPLES.md#redis-cluster-configuration) for complete cache layer scaling setup.

#### 5. Storage Scaling Strategies

**Object Storage Scaling**:

- **Multi-Region Distribution**: Geo-distributed storage
- **CDN Integration**: Fast global image delivery
- **Tiered Storage**: Hot/warm/cold data lifecycle management
- **Compression**: Reduce storage costs and transfer time

**Processing Pipeline Scaling**:


### Platform Deployment Patterns

#### 1. Cloud-Native Deployment

📋 **Implementation Details:** See [Cloud-Native Kubernetes Deployment](CODE_EXAMPLES.md#cloud-native-kubernetes-deployment) for complete cloud-agnostic deployment configuration with resource management.

#### 2. Multi-Cloud Strategy

- **Abstraction Layer**: Cloud-agnostic APIs for storage, compute, databases
- **Deployment Templates**: Terraform/Pulumi modules for each cloud provider
- **Migration Support**: Data portability between cloud providers
- **Disaster Recovery**: Cross-cloud backup and failover capabilities

#### 3. Edge Deployment Support

- **Lightweight Containers**: Optimized images for edge devices
- **Local Processing**: On-premises feature extraction capabilities
- **Sync Mechanisms**: Periodic synchronization with central systems
- **Offline Mode**: Continued operation during network outages

### Performance Monitoring & Scaling Metrics

#### Key Performance Indicators (KPIs)


#### Alerting & Auto-Remediation

- **Prometheus Alerts**: Threshold-based scaling triggers
- **Custom Metrics**: Application-specific performance indicators
- **Automated Scaling**: Scale out/in based on demand patterns
- **Circuit Breakers**: Prevent cascade failures during high load

## 🎯 Development Priority (Updated: December 2025)

**CURRENT PRIORITY: Image Upload & Storage Infrastructure**

The project focus has shifted to prioritize the core image upload and storage capabilities as the foundation. This enables immediate value delivery and provides the infrastructure for all downstream processing.

### Priority Order:

1. **📤 Image Upload & Storage** ← **CURRENT FOCUS**

   - Multi-tenant storage routing (BYOS - Bring Your Own Storage)
   - Support for multiple storage backends (Azure Blob, AWS S3, GCS, MinIO, NFS)
   - **Multi-Storage Configuration**: Each tenant can configure multiple storage backends
     - **Use Cases**:
       - **Hot/Cold Storage Tiering**: MinIO for frequently accessed images, S3 Glacier for archives
       - **Multi-Cloud Strategy**: Primary in Azure, backup in AWS for disaster recovery
       - **Compliance Requirements**: EU data in Azure West Europe, US data in AWS us-east-1
       - **Performance Optimization**: Regional storage backends close to end users
       - **Cost Optimization**: Use cheaper storage for infrequently accessed images
     - **Features**:
       - One storage backend marked as default for new uploads
       - Ability to add/remove storage configurations dynamically
       - Storage migration support (move images between backends)
       - Per-backend usage analytics
   - Secure image upload API with authentication
   - Metadata storage in PostgreSQL
   - Basic validation and file handling

2. **🔐 Identity & Authentication**

   - Duende IdentityServer integration
   - Multi-tenant user management
   - JWT token-based authentication
   - RBAC (Role-Based Access Control)

3. **🔄 Event-Driven Processing Pipeline**

   - Kafka integration for async processing
   - Validation service
   - Event publishing and consumption

4. **🤖 AI/ML Feature Extraction**

   - Python-based feature extraction service
   - ResNet50, CLIP model integration
   - Vector generation

5. **🔍 Search & Similarity**
   - Vector database integration (Qdrant)
   - Similarity search API
   - Duplicate detection

---

## Implementation Phases (Updated for Storage-First Approach)

### Phase 1: Image Upload & Storage Foundation ⭐ **CURRENT PHASE**

**Goal**: Build robust, multi-tenant image upload and storage infrastructure

**🔵 .NET Core Upload API:**

- [ ] **Upload API Endpoints**:

  - [ ] POST /api/v1/images/upload - Single image upload
  - [ ] POST /api/v1/images/batch - Batch image upload
  - [ ] POST /api/v1/images/url - Upload from URL
  - [ ] GET /api/v1/images/{id}/status - Upload status tracking
  - [ ] DELETE /api/v1/images/{id} - Delete uploaded image (soft delete)
  - [ ] POST /api/v1/images/{id}/restore - Restore soft-deleted image
  - [ ] POST /api/v1/images/restore-batch - Restore multiple soft-deleted images
  - [ ] GET /api/v1/images/deleted - List soft-deleted images (with pagination)

- [ ] **Image Retrieval API Endpoints**:

  - [ ] GET /api/v1/images/{id} - Get single image by ID
  - [ ] GET /api/v1/images/{id}/download - Download original image file
  - [ ] GET /api/v1/images/{id}/thumbnail?size={size} - Get thumbnail (size: small/medium/large/custom)
  - [ ] GET /api/v1/images/{id}/metadata - Get image metadata only
  - [ ] GET /api/v1/images - List images with pagination and filtering
  - [ ] POST /api/v1/images/bulk - Bulk retrieve images by IDs
  - [ ] GET /api/v1/images/search - Search images by metadata filters (date, size, format, tags)

- [ ] **Thumbnail Management API Endpoints**:

  - [ ] GET /api/v1/images/{id}/thumbnails - List all available thumbnails for an image
  - [ ] POST /api/v1/images/{id}/thumbnails/generate - Force regenerate thumbnails for an image
  - [ ] DELETE /api/v1/images/{id}/thumbnails/{spec} - Delete specific thumbnail specification
  - [ ] POST /api/v1/images/thumbnails/batch-regenerate - Batch regenerate thumbnails
  - [ ] 📋 **Full API reference**: [Thumbnail Documentation](docs/THUMBNAILS.md)

- [ ] **Tenant Thumbnail Configuration API Endpoints**:

  - [ ] GET /api/v1/tenants/{tenantId}/thumbnail-config - Get tenant thumbnail preferences
  - [ ] PUT /api/v1/tenants/{tenantId}/thumbnail-config - Update tenant thumbnail preferences
  - [ ] POST /api/v1/tenants/{tenantId}/thumbnail-config/apply - Apply new config to existing images

- [ ] **Multi-Tenant Storage Routing**:

  - [ ] Storage provider abstraction layer (IStorageProvider)
  - [ ] Azure Blob Storage connector
  - [ ] AWS S3 connector
  - [ ] Google Cloud Storage connector
  - [ ] MinIO connector
  - [ ] NFS/Local file system connector
  - [ ] Tenant configuration storage (PostgreSQL)
  - [ ] Per-tenant storage routing logic
  - [ ] **Multi-Storage Configuration** ⭐ **NEW**:
    - [x] Support for multiple storage backends per tenant (primary + additional)
    - [x] Default storage selection for new uploads
    - [x] Storage configuration with Id, Name, IsDefault flag
    - [ ] API endpoints for managing additional storage configurations:
      - [x] POST /api/v1/tenants/{id}/storage-config - Add additional storage
      - [x] GET /api/v1/tenants/{id}/storage-configs - List all storage configs
      - [x] PUT /api/v1/tenants/{id}/storage-config/{configId}/set-default - Set default
      - [x] DELETE /api/v1/tenants/{id}/storage-config/{configId} - Remove storage config
    - [ ] Storage migration support (move images between storage backends)
    - [ ] Usage analytics per storage backend
  - [ ] **MinIO Lifecycle Rules**:
    - [ ] Auto-delete objects tagged with "deleted=true" after 30 days
    - [ ] Transition old thumbnails to cold storage after 90 days (optional)
    - [ ] Cleanup incomplete multipart uploads after 7 days

- [ ] **File Upload Handling**:

  - [ ] Multipart form-data processing
  - [ ] Streaming uploads for large files (>100MB)
  - [ ] File type validation (JPEG, PNG, WEBP, TIFF, BMP)
  - [ ] File size validation per tenant limits
  - [ ] Checksum/hash calculation (SHA256)
  - [ ] Temporary storage cleanup

- [ ] **Metadata Management**:

  - [ ] PostgreSQL schema for image metadata
  - [ ] Image metadata extraction (dimensions, format, size)
  - [ ] Storage location tracking
  - [ ] Upload timestamp and user tracking
  - [ ] Entity Framework Core models and migrations

- [ ] **Basic Security**:

  - [ ] API key authentication (temporary)
  - [ ] Tenant isolation validation
  - [ ] Storage access permissions
  - [ ] Input sanitization and validation

- [ ] **Observability**:
  - [ ] Upload metrics (count, size, duration)
  - [ ] Storage backend health checks
  - [ ] Structured logging with Serilog
  - [ ] Error tracking and monitoring

**📋 Kafka Event Publishing** (Preparation for Phase 3):

- [ ] Kafka producer setup
- [ ] Publish "images.uploaded" events after successful upload
- [ ] Event schema definition

**🗄️ PostgreSQL Database**:

- [ ] **Tenants table**:
  - [ ] Storage configuration (JSONB with provider, credentials, paths)
  - [ ] Thumbnail configuration (JSONB with specifications array)
  - [ ] Quotas and limits
  - [ ] 📋 **Schema details**: [Thumbnail Documentation](docs/THUMBNAILS.md)
- [ ] **Images table**:
  - [ ] Metadata and storage paths
  - [ ] Processing status and audit fields
  - [ ] Soft delete support (deleted_at timestamp)
- [ ] EF Core migrations and seed data

**Note**: Thumbnails managed via storage paths + tenant config. See [Thumbnail Documentation](docs/THUMBNAILS.md)

**Upload Flow**:

1. User uploads image with optional `StorageConfigurationId` parameter
2. If not specified, use tenant's default storage configuration
3. Store original image at: `{tenant-id}/images/{year}/{month}/{image-id}.{ext}`
4. Read tenant's active `ThumbnailConfiguration.Specifications[]`
5. Generate and store all thumbnails at: `{tenant-id}/thumbnails/{spec-name}/{year}/{month}/{image-id}.{format}`
6. Record `StorageConfigurationId` in `Image` entity for retrieval
7. All thumbnails stored in **same storage backend** as original image

**Retrieval Flow**:

1. API receives request: `GET /api/v1/images/{id}/thumbnail?spec=medium-webp`
2. Query `Image` table to get `StorageConfigurationId`
3. Calculate thumbnail path programmatically from image ID + spec name
4. Fetch from appropriate storage backend
5. Cache in Redis for subsequent requests

**Estimated Time**: 2-3 weeks

---

### Phase 2: Authentication & Authorization

**🔐 Duende IdentityServer Integration:**

**🔵 .NET Core Components:**

- [ ] **API Gateway**: YARP-based gateway with authentication
- [ ] **Search API**: Basic image similarity search endpoints
- [ ] **Core Domain**: Business logic and data models
- [ ] **Infrastructure**: EF Core with PostgreSQL, Redis caching
- [ ] **Basic Telemetry**: Serilog structured logging, health checks

**🔐 Duende IdentityServer Integration:**

- [ ] **IdentityServer Setup**: Duende IdentityServer host application with SQL Server
- [ ] **Client Configuration**: Web app, API, and SPA client configurations
- [ ] **User Store Implementation**: Custom user store with DeepLens-specific claims
- [ ] **JWT Token Validation**: RSA256 signature validation and scope verification
- [ ] **RBAC Implementation**: Role-based permissions with custom scopes
- [ ] **Security Middleware**: Authentication and authorization pipeline integration
- [ ] **User Management**: Registration, profile management, and password reset flows
- [ ] **Admin Interface**: Basic user and client management UI

**🔒 API Security Enhancement:**

- [ ] Replace API key authentication with JWT tokens
- [ ] Implement OAuth 2.0 flows (Authorization Code, Client Credentials)
- [ ] Add refresh token support
- [ ] Implement tenant-scoped authorization
- [ ] Add role-based endpoint protection

**Estimated Time**: 2-3 weeks

---

### Phase 3: Event-Driven Processing Pipeline

**🔄 Kafka Integration:**

- [ ] Kafka consumer infrastructure
- [ ] Image validation service (.NET)
- [ ] **Thumbnail Generation**:
  - [ ] Tenant-configurable thumbnail specifications (format, size, quality)
  - [ ] On-demand generation with storage and Redis caching
- [ ] **Thumbnail Generation**:
  - [ ] Tenant-configurable thumbnail specifications (format, size, quality)
  - [ ] On-demand generation with storage and Redis caching
  - [ ] Initial generation during upload based on tenant config
  - [ ] Support for JPEG, WebP, PNG, AVIF, JPEG XL formats
  - [ ] Aspect ratio preservation (Google Image Search style)
  - [ ] Background job for configuration change cleanup
  - [ ] 📋 **See detailed documentation**: [Thumbnail Documentation](docs/THUMBNAILS.md)
- [ ] EXIF metadata extraction

- [ ] Upload analytics and reporting
- [ ] Storage usage tracking per tenant
- [ ] Processing pipeline monitoring

**Estimated Time**: 2-3 weeks

---

### Phase 4: AI/ML Feature Extraction

**🔴 Python Components:**

- [ ] **Feature Extraction Service**: ResNet-50, CLIP model integration
- [ ] **Kafka Consumer**: Consume "images.validated" events
- [ ] **Vector Generation**: Generate embeddings from images
- [ ] **Kafka Producer**: Publish "images.processed" events
- [ ] **GPU Support**: CUDA acceleration for model inference

**Estimated Time**: 3-4 weeks

---

### Phase 5: Search & Similarity Detection

**🔍 Search Components:**

- [ ] **Vector Database**: Qdrant integration
- [ ] **Search API**: Similarity search endpoints
- [ ] **Duplicate Detection**: Perceptual hashing and vector similarity
- [ ] **Result Ranking**: Similarity scoring and filtering

**🔵 .NET Core Search API:**

- [ ] **Feature Extraction**: ResNet-50 with ONNX Runtime
- [ ] **Similarity Service**: Cosine similarity with NumPy
- [ ] **Basic API**: FastAPI with single model endpoint

**Cross-Service Integration:**

- [ ] gRPC contracts and client generation
- [ ] Docker Compose for local development
- [ ] Basic end-to-end image search workflow

**Estimated Time**: 4-5 weeks

### Phase 2: Enhanced AI & Scalability

**🔵 .NET Core Enhancements:**

- [ ] **Admin API**: Storage management and system configuration
- [ ] **Advanced Caching**: Distributed caching strategies
- [ ] **ONNX Integration**: Direct model inference in .NET
- [ ] **Performance Optimization**: Async patterns and connection pooling

**� .NET Core Advanced Features:**

- [ ] **Multi-Cloud Connectors**: AWS SDK, Azure SDK, Google Cloud SDK integration
- [ ] **Advanced Workflows**: Elsa Workflows for complex orchestration processes
- [ ] **Real-time API**: SignalR WebSocket support for live updates
- [ ] **Batch Processing**: Large-scale file processing with BackgroundService

**🔴 Python AI Enhancements:**

- [ ] **Multiple Models**: CLIP, EfficientNet, custom CNNs
- [ ] **Vector Databases**: Qdrant, Weaviate integration
- [ ] **Advanced Algorithms**: Perceptual hashing, ensemble methods
- [ ] **GPU Acceleration**: CUDA support for model inference

**Observability & Monitoring:**

- [ ] **OpenTelemetry**: Distributed tracing across all services
- [ ] **Prometheus Metrics**: Custom metrics from all languages
- [ ] **Grafana Dashboards**: Service health and performance monitoring

**Estimated Time**: 5-7 weeks

### Phase 3: Platform-Agnostic & Scalable Production

- [ ] **Container Orchestration**:
  - [ ] Kubernetes manifests with Helm charts
  - [ ] Multi-architecture Docker images (AMD64/ARM64)
  - [ ] Health checks and readiness probes
- [ ] **Load Balancing & Service Discovery**:
  - [ ] External load balancer configuration
  - [ ] Service mesh implementation (Istio/Linkerd)
  - [ ] Auto-scaling policies (HPA/VPA)
- [ ] **Platform Abstraction**:
  - [ ] Cloud provider adapters (AWS/Azure/GCP)
  - [ ] Storage backend abstraction layer
  - [ ] Configuration management for multi-environment
- [ ] **Monitoring & Observability**:
  - [ ] Prometheus metrics collection
  - [ ] Distributed tracing with Jaeger
  - [ ] Centralized logging with ELK stack
  - [ ] Custom dashboards and alerting
- [ ] **Security & Compliance**:
  - [ ] **OAuth 2.0/OpenID Connect**:
    - [ ] Multiple identity provider support
    - [ ] JWT token validation and refresh
    - [ ] Scope-based API authorization
    - [ ] Admin panel for user/role management
  - [ ] API rate limiting and throttling per user/API key
  - [ ] Network policies and encryption (TLS 1.3)
  - [ ] Audit logging and compliance (SOC 2, GDPR)

**Estimated Time**: 5-6 weeks

### Phase 4: Advanced Scaling & Distribution

- [ ] **Multi-Region Deployment**:
  - [ ] Geo-distributed deployments
  - [ ] Cross-region data replication
  - [ ] Regional failover capabilities
  - [ ] CDN integration for global access
- [ ] **Advanced Auto-Scaling**:
  - [ ] Predictive scaling based on usage patterns
  - [ ] Cost-optimized scaling strategies
  - [ ] Multi-cloud deployment support
  - [ ] Edge computing integration
- [ ] **Performance Optimization**:
  - [ ] Advanced caching strategies
  - [ ] Query optimization and indexing
  - [ ] Batch processing optimization
  - [ ] Resource usage analytics

**Estimated Time**: 4-5 weeks

### Phase 5: Advanced AI Features

- [ ] **Enhanced AI Capabilities**:
  - [ ] Text-to-image search (CLIP integration)
  - [ ] Custom model training pipeline
  - [ ] Model performance monitoring and validation
  - [ ] Continuous learning and model updates
- [ ] **Analytics & Intelligence**:
  - [ ] Usage analytics and reporting
  - [ ] Storage optimization recommendations
  - [ ] Automated duplicate cleanup workflows
  - [ ] Business intelligence dashboards
- [ ] **Enterprise Features**:
  - [ ] Multi-tenancy support
  - [ ] Role-based access control
  - [ ] Data governance and lineage
  - [ ] Compliance reporting

**Estimated Time**: 4-6 weeks

## Development Environment Setup

### Prerequisites

#### .NET Core Development Environment


#### Node.js Development Environment (for AI services)


#### System Dependencies


#### IDE/Editor Setup


#### Cloud CLI Tools (choose your platform)


### Multi-Solution Project Structure (Actual Implementation)

> **Note:** The actual implementation follows **Clean Architecture** with Domain-Driven Design (DDD) principles,
> providing better separation of concerns than initially planned. See [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md)
> and [src/README.md](src/README.md) for detailed architectural decisions.


### Key Architectural Improvements (Actual vs. Original Plan)

The implemented solution structure improves upon the initial plan:

**1. Clean Architecture with DDD** - Replaces single `DeepLens.Core` with:

- `DeepLens.Domain` - Pure domain logic (zero dependencies)
- `DeepLens.Application` - Business logic and interfaces
- `DeepLens.Contracts` - API contracts and DTOs

**2. Modular Shared Libraries** - Replaces single `DeepLens.Shared` with:

- `DeepLens.Shared.Telemetry` - OpenTelemetry integration
- `DeepLens.Shared.Messaging` - Kafka abstractions
- `DeepLens.Shared.Common` - Utilities

**3. Integrated Orchestration** - `DeepLens.OrchestrationService` integrated in main solution (simpler deployment)

**4. Consistent Naming** - API suffix for clarity:

- `DeepLens.SearchApi` (was `DeepLens.Search`)
- `DeepLens.AdminApi` (was `DeepLens.Admin`)

**5. Combined Search + Ingestion** - Per ADR-003, image upload is in SearchApi (related operations)

**References:**

- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - Complete ADR records
- [src/README.md](src/README.md) - Detailed solution documentation
- [docs/RATE_LIMITING_IMPLEMENTATION.md](docs/RATE_LIMITING_IMPLEMENTATION.md) - Rate limiting guide

---

### Alternative: Node.js/TypeScript Structure


│ │ ├── crypto/ # Cryptographic functions
│ │ └── validation/ # Input validation
│ └── config/ # Configuration management
│ ├── environments/ # Environment-specific configs
│ ├── providers/ # Cloud provider configurations
│ └── settings.py # Global settings
├── deployment/ # Deployment configurations
│ ├── kubernetes/ # K8s manifests
│ │ ├── base/ # Base configurations
│ │ ├── overlays/ # Environment overlays
│ │ │ ├── development/
│ │ │ ├── staging/
│ │ │ └── production/
│ │ └── helm/ # Helm charts
│ ├── docker/ # Docker configurations
│ │ ├── api/ # API service Dockerfile
│ │ ├── worker/ # Worker service Dockerfile
│ │ └── docker-compose/ # Local development
│ ├── terraform/ # Infrastructure as Code
│ │ ├── modules/ # Reusable modules
│ │ ├── environments/ # Environment-specific
│ │ └── providers/ # Cloud provider configs
│ └── ansible/ # Configuration management
├── tests/ # Test suites
│ ├── unit/ # Unit tests
│ ├── integration/ # Integration tests
│ ├── performance/ # Load testing
│ └── e2e/ # End-to-end tests
├── docs/ # Documentation
│ ├── api/ # API documentation
│ ├── architecture/ # Architecture diagrams
│ ├── deployment/ # Deployment guides
│ └── user/ # User guides
├── scripts/ # Utility scripts
│ ├── build/ # Build scripts
│ ├── deploy/ # Deployment scripts
│ ├── migration/ # Database migration scripts
│ └── monitoring/ # Monitoring setup scripts
├── monitoring/ # Monitoring configurations
│ ├── prometheus/ # Prometheus configs
│ ├── grafana/ # Grafana dashboards
│ └── alerts/ # Alert rules
├── .github/ # GitHub workflows
│ └── workflows/ # CI/CD pipelines
├── requirements/ # Python dependencies
│ ├── base.txt # Base requirements
│ ├── development.txt # Development dependencies
│ ├── production.txt # Production requirements
│ └── testing.txt # Testing dependencies
├── Dockerfile.api # API service container
├── Dockerfile.worker # Worker service container
├── docker-compose.yml # Local development setup
├── pyproject.toml # Python project configuration
└── README.md # Project documentation



# Documentation: README.md

---

# DeepLens - Image Similarity Search Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![.NET 8](https://img.shields.io/badge/.NET-8.0-purple.svg)](https://dotnet.microsoft.com/)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docs.docker.com/compose/)

**DeepLens** is a high-performance, multi-tenant image similarity search engine built with modern .NET and Python technologies. It provides fast, accurate image matching using state-of-the-art vector databases and AI/ML models.

## 🎯 **Key Features**

- **🔍 Advanced Image Search** - Vector-based similarity matching with multiple AI models
- **🏢 Multi-Tenant Architecture** - Complete tenant isolation with BYOS (Bring Your Own Storage)
- **⚡ High Performance** - Optimized for speed with Redis caching and vector databases
- **📊 Full Observability** - Complete monitoring with Prometheus, Grafana, Jaeger, and Loki
- **🔒 Enterprise Security** - OAuth 2.0/OpenID Connect with Duende IdentityServer
- **☁️ Cloud Native** - Docker containers with Kubernetes support
- **🔄 Flexible Storage** - Support for Azure Blob, AWS S3, Google Cloud, MinIO, and NFS

## 🧭 **Quick Navigation**

### 👋 New to DeepLens?

**Start here in this order:**

1. Read this README for project overview
2. Check [handover.md](handover.md) - Current system state & quick start
3. Review [CREDENTIALS.md](CREDENTIALS.md) - Get access to all services
4. Browse [DOCS_INDEX.md](DOCS_INDEX.md) - Complete documentation map

### 🔧 Want to Develop?

1. [infrastructure/README.md](infrastructure/README.md) - Set up local environment
2. [src/README.md](src/README.md) - Understand codebase structure
3. [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - Development workflow

### 🐛 Troubleshooting?

1. [PORTS.md](PORTS.md) - Port conflicts and service mappings
2. [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md) - Auth issues
3. [CREDENTIALS.md](CREDENTIALS.md) - Login problems
4. [infrastructure/README.md](infrastructure/README.md#troubleshooting) - Container issues

### 📚 Deep Dive?

- **Architecture:** [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) + [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md)
- **Authentication:** [docs/TOKEN_LIFECYCLE.md](docs/TOKEN_LIFECYCLE.md) + [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md)
- **Multi-Tenancy:** [docs/STORAGE_ARCHITECTURE.md](docs/STORAGE_ARCHITECTURE.md) + [infrastructure/README-TENANT-MANAGEMENT.md](infrastructure/README-TENANT-MANAGEMENT.md)
- **Monitoring:** [OBSERVABILITY_PLAN.md](OBSERVABILITY_PLAN.md)

---

## 🏗️ **Architecture Overview**

DeepLens uses an **asynchronous event-driven microservices architecture** with:

- **.NET Core Services** - API Gateway, Search APIs, Admin services, WorkerService for background processing
- **Python AI Services** - Stateless feature extraction and similarity matching
- **Vector Database** - Qdrant for fast similarity search with multi-tenant isolation
- **Event Streaming** - Apache Kafka with SAGA Choreography for async image processing
- **Multi-Database Strategy** - PostgreSQL for metadata, Redis for caching, InfluxDB for metrics
- **Complete Observability** - OpenTelemetry, Prometheus, Grafana, Loki stack

### Performance Highlights

- **< 700ms** image upload response (6-9x faster than synchronous processing)
- **Async Processing Pipeline** for feature extraction and vector storage
- **Multi-tenant isolation** at every architectural layer

## 🚀 **Quick Start**

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or [Podman](https://podman.io/)
- [PowerShell 7+](https://github.com/PowerShell/PowerShell) (recommended)
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (for development)
- [Python 3.11+](https://www.python.org/downloads/) (for AI services)

### 1. Clone & Setup


### 2. Start Infrastructure


### 3. Verify Services


### 4. Access Dashboards

| Service              | URL                             | Credentials           |
| -------------------- | ------------------------------- | --------------------- |
| **Grafana**          | http://localhost:3000           | admin/DeepLens123!    |
| **Prometheus**       | http://localhost:9090           | -                     |
| **Jaeger Tracing**   | http://localhost:16686          | -                     |
| **Qdrant Dashboard** | http://localhost:6333/dashboard | -                     |
| **Kafka UI**         | http://localhost:8080           | -                     |
| **Portainer**        | http://localhost:9443           | Create on first visit |

## 📁 **Project Structure**


## 🛠️ **Development Setup**

### .NET Services


### Python AI Services


### Database Migrations


## 🔧 **Configuration**

### Environment Variables

Copy and customize the environment file:


### Multi-Tenant Setup


## 📊 **Monitoring & Observability**

DeepLens includes a comprehensive observability stack:

- **📈 Metrics** - Prometheus with 30-day retention
- **📋 Logs** - Loki with structured logging and 30-day retention
- **🔍 Tracing** - Jaeger with OpenTelemetry integration
- **📊 Dashboards** - Grafana with pre-built dashboards
- **🚨 Alerting** - AlertManager with email/Slack notifications
- **🐳 Container Monitoring** - cAdvisor + Portainer for complete visibility

### Access Monitoring


## 🔒 **Security**

- **Authentication** - OAuth 2.0/OpenID Connect with Duende IdentityServer
- **Authorization** - Role-based access control (RBAC)
- **Secret Management** - Infisical self-hosted secret vault
- **Data Encryption** - TLS for all communications, encrypted storage
- **Multi-Tenancy** - Complete tenant isolation and Row Level Security (RLS)

## ☁️ **Deployment**

### Docker Compose (Development)


### Kubernetes (Production)


### Cloud Platforms

- **Azure** - Container Apps, AKS, Azure Database for PostgreSQL
- **AWS** - ECS, EKS, RDS, S3
- **Google Cloud** - GKE, Cloud SQL, Cloud Storage
- **Multi-Cloud** - Portable across all major cloud providers

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📖 **Documentation**

**📚 [Complete Documentation Index](DOCS_INDEX.md)** - Your guide to all DeepLens documentation

### Quick Links

- [🚀 Getting Started](handover.md) - Current state and quick start
- [🔑 Credentials](CREDENTIALS.md) - All development credentials in one place
- [🔌 Port Reference](PORTS.md) - Service ports and conflict resolution
- [🏗️ Architecture](ARCHITECTURE_DECISIONS.md) - Key design decisions
- [💻 Code Structure](src/README.md) - Complete codebase guide
- [🐳 Infrastructure](infrastructure/README.md) - Docker setup and service configuration
- [🔐 OAuth Testing](docs/OAUTH_TESTING_GUIDE.md) - Complete authentication test suite
- [📊 Observability](OBSERVABILITY_PLAN.md) - Monitoring and alerting strategy

## 🆘 **Support**

- **Issues** - [GitHub Issues](https://github.com/your-org/deeplens/issues)
- **Discussions** - [GitHub Discussions](https://github.com/your-org/deeplens/discussions)
- **Email** - support@deeplens.local
- **Documentation** - [Internal Wiki](http://wiki.deeplens.local)

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Qdrant** - High-performance vector database
- **OpenTelemetry** - Observability instrumentation
- **Duende IdentityServer** - Enterprise identity and access management
- **Docker** - Containerization platform
- **Prometheus & Grafana** - Monitoring and visualization

---

**Made with ❤️ by the DeepLens Team**


# Documentation: src/DeepLens.FeatureExtractionService/.pytest_cache/README.md

---

# pytest cache directory #

This directory contains data from the pytest's cache plugin,
which provides the `--lf` and `--ff` options, as well as the `cache` fixture.

**Do not** commit this to version control.

See [the docs](https://docs.pytest.org/en/stable/how-to/cache.html) for more information.


# Documentation: src/DeepLens.FeatureExtractionService/QUICKSTART.md

---

# Quick Start Guide - Feature Extraction Service

Get the Feature Extraction Service running in 5 minutes!

## Prerequisites

- **Python 3.11+** 
  - System installation: [python.org](https://www.python.org/downloads/) or Microsoft Store
  - **OR** Portable installation: See `../../tools/python/README.md` (no admin needed!)
- **PowerShell** (included in Windows)
- **~200MB disk space** (for model and dependencies)

## Step 1: Setup Environment

Open PowerShell in the service directory and run:


This automated script will:
- ✓ Verify Python installation
- ✓ Create virtual environment
- ✓ Install all dependencies
- ✓ Create `.env` configuration
- ✓ Download ResNet50 model (optional)

**Tip:** If you already have Python configured, the script will detect it!

## Step 2: Activate Virtual Environment


You'll see `(venv)` prefix in your terminal prompt.

## Step 3: Run the Service


Or with auto-reload for development:


## Step 4: Test It!

Open your browser to:
- **API Docs**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

Or use PowerShell:


## VS Code Integration

### Debug the Service

1. Open the project in VS Code
2. Press **F5** to start debugging
3. Set breakpoints anywhere in the code
4. Use the Debug Console for interactive Python

### Recommended Extensions

The setup script will prompt you to install:
- **Python** (ms-python.python)
- **Pylance** (ms-python.vscode-pylance)
- **Black Formatter** (ms-python.black-formatter)

## Troubleshooting

### Python Not Found

The setup script searches multiple locations:
- System PATH
- Microsoft Store installation
- `tools\python\` (portable Python)
- Common install directories

**Option A: Portable Python (No admin rights)**
See instructions in `..\..\tools\python\README.md`

**Option B: System Installation**
- **Windows**: https://www.python.org/downloads/
- **Microsoft Store**: Search "Python 3.11"

**Option C: Custom Location**

After installation, restart your terminal.

### Permission Errors

Run PowerShell as Administrator or enable script execution:


### Model Download Fails

Manually download the model:


Or download directly from:
https://github.com/onnx/models/raw/main/vision/classification/resnet/model/resnet50-v2-7.onnx

Save to: `models/resnet50-v2-7.onnx`

### Port Already in Use

Change the port in `.env`:


Or specify when running:


## Next Steps

- **Read the API docs**: http://localhost:8001/docs
- **Run tests**: `pytest tests/` (coming in Phase 1A)
- **Configure**: Edit `.env` file for custom settings
- **Docker**: Build with `docker build -t feature-extraction:latest .`

## Development Workflow


## Common Commands Reference


## Need Help?

- **API Documentation**: http://localhost:8001/docs
- **Health Endpoint**: http://localhost:8001/health
- **Full README**: [README.md](README.md)
- **Architecture Docs**: [../../DEVELOPMENT_PLAN.md](../../DEVELOPMENT_PLAN.md)

Happy coding! 🚀


# Documentation: src/DeepLens.FeatureExtractionService/README.md

---

# Feature Extraction Service

Deep learning feature extraction service for image similarity search. Extracts 2048-dimensional feature vectors from images using ResNet50 model in ONNX format.

## Features

- **ResNet50 Feature Extraction**: Extract deep learning features using pre-trained ResNet50 model
- **ONNX Runtime**: Optimized inference with ONNX Runtime
- **REST API**: Simple HTTP API for feature extraction
- **No Authentication (Phase 1)**: Development-first approach, auth added in Phase 2
- **Health Checks**: Built-in health check endpoint
- **Structured Logging**: JSON-formatted logs for observability

## API Endpoints

### Health Check
Returns service status and model availability.

### Extract Features
Extract feature vector from an uploaded image.

**Request:**
- `file`: Image file (multipart/form-data) - Required
- `image_id`: Optional identifier for the image - Optional
- `return_metadata`: Whether to return image metadata (width, height, format) - Optional

**Response:**

## Setup

### Prerequisites
- Python 3.11+
- ResNet50 ONNX model file

### Installation

#### Quick Setup (Recommended)

Run the automated setup script:

This will:
- Check Python installation (3.11+ required)
- Create a virtual environment
- Install all dependencies
- Create `.env` file from template
- Optionally download the ResNet50 ONNX model

Then activate the environment and run:

#### Manual Setup

1. Create and activate virtual environment:

2. Install dependencies:

3. Download ResNet50 ONNX model:

4. Configure environment:

5. Run the service:

#### VS Code Debugging

Press `F5` in VS Code to start debugging with breakpoints. The `.vscode/launch.json` is pre-configured for FastAPI development.

### Docker

Build and run with Docker:


## Configuration

Configuration is managed through environment variables or `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Service name | `feature-extraction-service` |
| `SERVICE_VERSION` | Service version | `0.1.0` |
| `HOST` | Bind host | `0.0.0.0` |
| `PORT` | Bind port | `8001` (Python services use 8xxx) |
| `MODEL_PATH` | Path to ONNX model | `/app/models/resnet50-v2-7.onnx` |
| `MODEL_NAME` | Model identifier | `resnet50` |
| `FEATURE_DIMENSION` | Output dimension | `2048` |
| `MAX_IMAGE_SIZE` | Max image size (bytes) | `10485760` (10 MB) |
| `ENABLE_AUTH` | Enable JWT auth (Phase 2) | `false` |
| `LOG_LEVEL` | Logging level | `INFO` |

## Usage Examples

### cURL


### Python


### C# (.NET)


## Architecture

- **FastAPI**: Modern async web framework
- **ONNX Runtime**: Optimized model inference
- **Pydantic**: Request/response validation
- **PIL (Pillow)**: Image preprocessing
- **NumPy**: Numerical operations

## Development Roadmap

- [x] **Phase 1A**: Core feature extraction (Current)
  - ResNet50 ONNX model integration
  - REST API endpoints
  - No authentication
  
- [ ] **Phase 2A**: Authentication & Security
  - JWT token validation
  - Optional auth mode (ENABLE_AUTH)
  - IdentityServer integration
  
- [ ] **Phase 2B**: Advanced Features
  - CLIP model support
  - Batch processing
  - Model caching

## Testing


## Monitoring

Service exposes structured JSON logs compatible with:
- Loki (log aggregation)
- Prometheus (metrics - future)
- OpenTelemetry (traces - future)

## License

Internal DeepLens project - Not for public distribution

## References

- [ONNX Model Zoo - ResNet50](https://github.com/onnx/models/tree/main/vision/classification/resnet)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [ONNX Runtime Python API](https://onnxruntime.ai/docs/api/python/)


# Documentation: src/DeepLens.FeatureExtractionService/TESTING.md

---

# Testing Guide - Feature Extraction Service

Complete testing framework for the DeepLens Feature Extraction Service with comprehensive unit tests, integration tests, and API tests.

## Quick Start

### 1. Install Test Dependencies


### 2. Run All Tests


### 3. View Results


## Test Categories

### Unit Tests (`@pytest.mark.unit`)
- **Purpose**: Test individual components in isolation
- **Speed**: Fast (< 1 second per test)
- **Dependencies**: Mocked external dependencies
- **Coverage**: Core business logic, configuration, data models


### API Tests (`@pytest.mark.api`)
- **Purpose**: Test FastAPI endpoints and HTTP behavior
- **Speed**: Medium (1-5 seconds per test) 
- **Dependencies**: FastAPI TestClient with mocked services
- **Coverage**: Request/response handling, validation, error scenarios


### Integration Tests (`@pytest.mark.integration`)
- **Purpose**: Test component interactions and end-to-end flows
- **Speed**: Medium to Slow (5+ seconds per test)
- **Dependencies**: Real components where safe, mocked external services
- **Coverage**: Complete feature extraction pipeline, threading, memory usage


### Slow Tests (`@pytest.mark.slow`)
- **Purpose**: Performance benchmarks and stress tests
- **Speed**: Slow (10+ seconds per test)
- **Usage**: Usually skipped in development, run in CI


## Test Structure


## Test Fixtures

### Image Fixtures

### Mock Fixtures

### API Fixtures  

## Running Specific Tests

### By File

### By Test Function

### By Class

## Test Runner Script

The `run_tests.py` script provides convenient test execution:


## Coverage Requirements

- **Target Coverage**: 80% minimum
- **Coverage Report**: Generated in `htmlcov/`
- **Exclusions**: Test files, external dependencies

### Coverage Commands

## Test Data Management

### Creating Test Images

### Asserting Feature Vectors

### Asserting API Responses  

## Mocking Strategy

### Feature Extractor Mocking

### ONNX Runtime Mocking

## Performance Testing

### Response Time Assertions

### Memory Usage Testing

## Parallel Testing


## Continuous Integration

### GitHub Actions Example

## Test Environment Variables

Tests automatically use these environment variables:

Override in tests:

## Debugging Tests

### Run with PDB

### Verbose Output

### Test Discovery

## Common Issues & Solutions

### Issue: "ImportError: No module named 'main'"
**Solution**: Tests run from service root directory

### Issue: "ONNX model not found"
**Solution**: Use mock fixtures for unit tests

### Issue: "Tests too slow"
**Solution**: Skip slow tests in development

### Issue: "Coverage too low"  
**Solution**: Check which lines aren't covered

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Don't rely on real ONNX models in unit tests
3. **Use Appropriate Markers**: Mark tests by type and speed
4. **Descriptive Test Names**: Test name should describe the scenario
5. **Assert Specific Behaviors**: Test both success and failure cases
6. **Performance Awareness**: Mark slow tests and provide fast alternatives

## Example Test Session


This testing framework provides comprehensive coverage of the Feature Extraction Service while maintaining fast development cycles through appropriate mocking and test categorization.


# Documentation: src/DeepLens.FeatureExtractionService/TESTING_SUMMARY.md

---

# Testing Framework Implementation Summary

## ✅ Successfully Completed

We have successfully implemented a comprehensive testing framework for the DeepLens Feature Extraction Service. Here's what was accomplished:

### 🏗️ Testing Infrastructure
- **pytest 7.4.3** with comprehensive configuration
- **Coverage reporting** with 80% minimum threshold
- **Test categorization** with custom markers (unit, integration, api, slow)
- **Development dependencies** managed in requirements-dev.txt
- **Test runner script** with flexible execution options
- **HTML coverage reports** for detailed analysis

### 🧪 Test Coverage

#### Unit Tests (✅ ALL PASSING)
- **Configuration Tests** (14 tests) - 100% coverage of settings and validation
- **Feature Extractor Tests** (16 tests) - Core functionality with comprehensive mocking
- **Model Tests** (6 tests) - Data models and validation

**Result: 36 unit tests passing with 95%+ coverage on core components**

#### Integration Tests (⚠️ NEEDS API FIXES)
- End-to-end pipeline testing
- Various image size handling
- Configuration integration
- Performance benchmarking

#### API Tests (⚠️ NEEDS FASTAPI SETUP)
- Health endpoint testing
- Feature extraction endpoints
- Error handling scenarios
- Concurrent request handling

### 🔧 Testing Framework Features

#### Test Fixtures & Utilities
- **Image Generation**: Creates test images in various formats (JPEG, PNG, WEBP)
- **Mock Configuration**: Comprehensive ONNX runtime mocking
- **Test Data**: Realistic sample data for all scenarios
- **Assertion Helpers**: Custom validation for feature vectors and metadata

#### Test Organization

#### Execution Options

### 📊 Current Status

#### ✅ Working Perfectly
- **Unit Tests**: All 36 tests passing
- **Test Framework**: Full pytest infrastructure
- **Coverage Reporting**: HTML and terminal output
- **Development Workflow**: Ready for team use
- **Documentation**: Comprehensive guides in TESTING.md

#### ⚠️ Areas for Future Improvement
- **API Tests**: Need FastAPI application setup fixes
- **Integration Tests**: Fixed metadata expectations, ready to run
- **Coverage**: Unit tests achieve 95%+ on core components

### 🚀 Key Achievements

1. **Test-Driven Development Ready**: Framework catches real issues early
2. **Comprehensive Mocking**: Tests run without external dependencies
3. **Fast Feedback Loop**: Unit tests execute in under 1 second
4. **Professional Standards**: Follows pytest best practices
5. **Team Collaboration**: Clear documentation and standardized workflow

### 🎯 Real Issues Discovered

Our testing framework successfully identified several real issues:
1. **Image Size Metadata**: Tests revealed incorrect metadata reporting
2. **API Endpoint Configuration**: Exposed FastAPI setup problems
3. **Edge Case Handling**: Comprehensive error scenario coverage

### 📈 Development Workflow

The testing framework enables:
- **Pre-commit Testing**: Fast unit tests before code commits
- **CI/CD Integration**: Automated testing in deployment pipelines
- **Code Quality**: Minimum 80% coverage requirements
- **Refactoring Confidence**: Comprehensive test coverage for safe changes

## 🏆 Conclusion

We have created a **production-ready testing framework** that:
- ✅ Validates core functionality with 36 passing unit tests
- ✅ Provides comprehensive coverage reporting (95%+ on core components)
- ✅ Enables fast development cycles with proper mocking
- ✅ Catches real issues early in development
- ✅ Follows industry best practices for Python testing

The framework is ready for immediate use and will scale with the project as it grows.


# Documentation: src/DeepLens.WebUI/README.md

---

# DeepLens Web UI

**Modern React-based web interface for DeepLens tenant and data management**

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)
![Material--UI](https://img.shields.io/badge/MUI-5.15.0-007FFF.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)

Last Updated: December 18, 2025

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Development](#development)
- [User Roles & Permissions](#user-roles--permissions)
- [API Integration](#api-integration)
- [Planned Features](#planned-features)
- [Contributing](#contributing)

---

## 🎯 Overview

DeepLens Web UI is a comprehensive React-based web application for managing DeepLens tenants, users, and image data. Built with Material-UI (MUI) components, it provides a modern, responsive interface for both system administrators and tenant users.

**Key Capabilities:**

- 🔐 **Authentication** - JWT-based login with automatic token refresh
- 🏢 **Tenant Management** - Create, view, edit, and manage tenant organizations
- 👥 **User Management** - Manage users across all tenants (admin) or within tenant (tenant users)
- 🖼️ **Image Management** - Upload, search, and manage image data
- 📊 **Analytics Dashboard** - Monitor system metrics and tenant usage
- ⚙️ **Settings** - User profile and application configuration

---

## ✨ Features

### Implemented Features ✅

**Authentication System**

- Login page with JWT authentication
- Automatic token refresh on expiration
- Protected routes with authentication guards
- User session management
- Logout functionality

**Layout & Navigation**

- Responsive sidebar navigation
- Top app bar with user menu
- Material-UI theming (light mode)
- Role-based menu visibility

**Dashboard**

- Welcome screen with user greeting
- System statistics cards (Tenants, Users, Images, API Calls)
- Quick action buttons
- Real-time data display

**Tenant Management (Admin Only)**

- List all tenants with key information
- Create new tenants with admin user
- View tenant details (infrastructure, limits, etc.)
- Tenant tier management (Free/Professional/Enterprise)
- Status indicators (Active/Suspended/PendingSetup)

**Placeholder Pages**

- Users management page
- Images management page
- Settings page with profile information

### Planned Features 🚧

See [Planned Features](#planned-features) section below.

---

## 🛠️ Technology Stack

### Core Framework

- **React 18.2.0** - UI framework with hooks
- **TypeScript 5.3.3** - Type-safe JavaScript
- **Vite 5.0.8** - Build tool and dev server

### UI Framework

- **Material-UI (MUI) 5.15.0** - Component library
- **@mui/icons-material** - Icon set
- **@emotion/react & @emotion/styled** - CSS-in-JS styling

### Routing & State

- **React Router 6.21.0** - Client-side routing
- **React Query 3.39.3** - Server state management & caching

### HTTP & API

- **Axios 1.6.2** - HTTP client with interceptors
- **jwt-decode 4.0.0** - JWT token parsing

### Utilities

- **date-fns 3.0.6** - Date formatting and manipulation

### Development Tools

- **ESLint** - Code linting
- **TypeScript** - Type checking

---

## 📁 Project Structure


---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm 9+** or **yarn 1.22+**
- **DeepLens Backend APIs** - Must be running (NextGen.Identity API on port 5000)

### Installation

1. **Navigate to project directory:**

   ```powershell
   cd c:\productivity\deeplens\src\DeepLens.WebUI
   ```

2. **Install dependencies:**

   ```powershell
   npm install
   ```

3. **Configure environment:**

   ```powershell
   # Copy example env file
   Copy-Item .env.example .env

   # Edit .env with your API URLs (defaults should work for local development)
   ```

4. **Start development server:**

   ```powershell
   npm run dev
   ```

5. **Open browser:**
   ```
   http://localhost:3000
   ```

### Building for Production


---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:


**Note:** All environment variables must be prefixed with `VITE_` to be exposed to the client.

### API Proxy Configuration

Development server proxies API requests to avoid CORS issues:


---

## 💻 Development

### Available Scripts


### Code Style

- **TypeScript** - All new code must use TypeScript
- **Functional Components** - Use functional components with hooks
- **Material-UI** - Follow MUI component patterns
- **ESLint** - Run linter before commits

### Adding a New Page

1. **Create page component:**

   ```typescript
   // src/pages/NewFeature/NewFeaturePage.tsx
   import { Box, Typography } from "@mui/material";

   const NewFeaturePage = () => {
     return (
       <Box>
         <Typography variant="h4">New Feature</Typography>
         {/* Page content */}
       </Box>
     );
   };

   export default NewFeaturePage;
   ```

2. **Add route in App.tsx:**

   ```typescript
   <Route path="/new-feature" element={<NewFeaturePage />} />
   ```

3. **Add to sidebar navigation:**
   ```typescript
   // src/components/Layout/Sidebar.tsx
   const menuItems = [
     // ...
     { text: "New Feature", icon: <Icon />, path: "/new-feature" },
   ];
   ```

### API Service Pattern

All API calls go through service modules:


### React Query Usage

Use React Query for data fetching:


---

## 👥 User Roles & Permissions

### Role Hierarchy

1. **Admin** (System Administrator)

   - Access: ALL features
   - Can manage ALL tenants
   - Can create new tenants
   - Can view/edit all users across tenants
   - Full system analytics

2. **TenantOwner** (Tenant Administrator)

   - Access: Own tenant features
   - Can manage users within tenant
   - Can view tenant analytics
   - Can manage tenant images
   - Cannot create new tenants

3. **User** (Standard User)
   - Access: Limited tenant features
   - Can upload/search images
   - Can manage own profile
   - Cannot access admin features

### Route Protection

Routes are protected based on authentication and role:


---

## 🔌 API Integration

### Backend APIs

The Admin UI integrates with these DeepLens APIs:

| API                      | Port | Purpose                  | Endpoints Used                           |
| ------------------------ | ---- | ------------------------ | ---------------------------------------- |
| **NextGen.Identity API** | 5000 | Authentication & tenants | `/api/auth/*`, `/api/tenants/*`          |
| **DeepLens.SearchApi**   | 5001 | Image upload & search    | `/api/images/*`                          |
| **DeepLens.AdminApi**    | 5002 | Admin operations         | `/api/collections/*`, `/api/analytics/*` |
| **Feature Extraction**   | 8001 | CNN feature extraction   | `/extract`, `/health`                    |

### Authentication Flow

1. **Login:**

   ```typescript
   POST / api / auth / login;
   Body: {
     email, password;
   }
   Response: {
     accessToken, refreshToken, user;
   }
   ```

2. **Token Storage:**

   - Access token → `localStorage.accessToken`
   - Refresh token → `localStorage.refreshToken`

3. **Authenticated Requests:**

   ```typescript
   Headers: {
     Authorization: `Bearer ${accessToken}`;
   }
   ```

4. **Token Refresh (Automatic):**

   - When 401 response received
   - POST `/api/auth/refresh` with refresh token
   - Update stored tokens
   - Retry original request

5. **Logout:**
   ```typescript
   POST /api/auth/logout
   Body: { refreshToken }
   Clear localStorage tokens
   ```

### Error Handling

API errors are handled in interceptors:


---

## 🎯 Planned Features

### Phase 1: User Management (Next)

- [ ] User list page with pagination
- [ ] Create/edit/delete users
- [ ] User role assignment
- [ ] Email confirmation management
- [ ] Password reset functionality
- [ ] User activity logs

### Phase 2: Image Management

- [ ] Image upload with drag-and-drop
- [ ] Image gallery with thumbnails
- [ ] Image search by similarity
- [ ] Image metadata viewing/editing
- [ ] Bulk operations (delete, tag)
- [ ] Image analytics (upload trends, popular images)

### Phase 3: Advanced Analytics

- [ ] Tenant usage dashboard
  - Storage consumption charts
  - API call statistics
  - User activity metrics
- [ ] System-wide analytics (Admin)
  - Tenant growth over time
  - Resource utilization
  - Performance metrics
- [ ] Custom date range filtering
- [ ] Export analytics to CSV/PDF

### Phase 4: Enhanced Tenant Management

- [ ] Tenant tier upgrades/downgrades
- [ ] Resource usage visualization
- [ ] Tenant suspension/activation workflows
- [ ] Infrastructure status monitoring
- [ ] Tenant billing information

### Phase 5: Settings & Customization

- [ ] User profile editing
- [ ] Password change
- [ ] Email preferences
- [ ] Dark mode toggle
- [ ] Notification settings
- [ ] API key management

### Phase 6: Advanced Features

- [ ] Real-time notifications (SignalR)
- [ ] Activity audit logs
- [ ] Advanced search filters
- [ ] Batch operations
- [ ] Export/import functionality
- [ ] Multi-language support (i18n)

### Phase 7: Mobile Responsiveness

- [ ] Mobile-optimized layouts
- [ ] Touch gesture support
- [ ] Progressive Web App (PWA)
- [ ] Mobile-specific navigation

---

## 🧪 Testing (Planned)

### Testing Strategy


### Test Structure (To be implemented)


---

## 🔧 Troubleshooting

### Common Issues

**1. CORS Errors**

- Ensure backend APIs are running
- Check Vite proxy configuration
- Verify API URLs in `.env`

**2. Authentication Fails**

- Check if NextGen.Identity API is accessible
- Verify JWT token format
- Check browser localStorage for tokens

**3. 404 on Refresh**

- Vite dev server handles this automatically
- For production, configure server for SPA routing

**4. Module Not Found**

- Run `npm install` to ensure all dependencies are installed
- Check TypeScript path aliases in `tsconfig.json`

---

## 🤝 Contributing

### Development Workflow

1. **Create feature branch:**

   ```powershell
   git checkout -b feature/new-feature
   ```

2. **Make changes and test:**

   ```powershell
   npm run dev
   npm run lint
   ```

3. **Commit with descriptive message:**

   ```powershell
   git commit -m "feat: Add user management page"
   ```

4. **Push and create pull request:**
   ```powershell
   git push origin feature/new-feature
   ```

### Commit Message Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## 📚 Additional Resources

### Documentation Links

- **Main Project:** [../PROJECT_PLAN.md](../../PROJECT_PLAN.md)
- **Backend API:** [../NextGen.Identity.Api/README.md](../NextGen.Identity.Api/README.md)
- **Infrastructure:** [../../infrastructure/README.md](../../infrastructure/README.md)

### External Resources

- [React Documentation](https://react.dev/)
- [Material-UI Documentation](https://mui.com/)
- [React Router Documentation](https://reactrouter.com/)
- [React Query Documentation](https://tanstack.com/query/v3/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vite Documentation](https://vitejs.dev/)

---

## 📊 Project Status

**Current Version:** 0.1.0-alpha  
**Status:** 🟡 In Active Development

### Feature Completion

| Feature Category    | Status | Completion |
| ------------------- | ------ | ---------- |
| Authentication      | ✅     | 100%       |
| Layout & Navigation | ✅     | 100%       |
| Dashboard           | ✅     | 80%        |
| Tenant Management   | ✅     | 70%        |
| User Management     | 🚧     | 10%        |
| Image Management    | 🚧     | 5%         |
| Analytics           | 🚧     | 20%        |
| Settings            | 🚧     | 30%        |

**Legend:**

- ✅ Complete
- 🚧 In Progress
- ⏳ Planned

---

## 📝 License

Copyright © 2025 DeepLens Development Team

---

## 👤 Maintainers

**DeepLens Development Team**

For questions or support, please refer to the main project documentation.

---

**Last Updated:** December 18, 2025  
**Next Review:** January 2026


# Documentation: src/DeepLens.WebUI/RESPONSIVE_DESIGN.md

---

# Responsive Design Guide

## 📱 Device Support

DeepLens WebUI is fully responsive and optimized for all device sizes:

| Device Type      | Screen Size | Breakpoint | Key Adaptations                                   |
| ---------------- | ----------- | ---------- | ------------------------------------------------- |
| 📱 Mobile        | < 600px     | xs         | Drawer navigation, stacked layout, touch-friendly |
| 📱 Mobile (Land) | 600-900px   | sm         | Compact spacing, optimized buttons                |
| 💻 Tablet        | 900-1200px  | md         | Permanent sidebar, grid layouts                   |
| 🖥️ Laptop        | 1200-1536px | lg         | Full features, optimal spacing                    |
| 🖥️ Large Monitor | > 1536px    | xl         | Expanded content, wide grids                      |

---

## 🎨 Responsive Patterns Implemented

### 1. **Navigation**

**Mobile (< 900px):**

- ✅ Hamburger menu button in header
- ✅ Temporary drawer (swipe to open/close)
- ✅ Auto-close after navigation
- ✅ Full-height overlay

**Tablet & Desktop (≥ 900px):**

- ✅ Permanent sidebar (260px wide)
- ✅ Always visible navigation
- ✅ Hover states for menu items

### 2. **Layout & Spacing**


### 3. **Typography**

**Responsive font sizes:**


- Mobile: Smaller font sizes (1.75rem for h4)
- Desktop: Standard sizes (2.125rem for h4)
- All text wraps properly with `wordBreak: 'break-word'`

### 4. **Grid Layouts**

**Dashboard Cards:**


- **Mobile:** 1 column (xs={12})
- **Tablet:** 2 columns (sm={6})
- **Desktop:** 4 columns (md={3})

### 5. **Buttons & Actions**

**Mobile:** Full-width buttons


**Desktop:** Auto-width inline buttons

### 6. **Tables**

**Responsive table container:**


- Mobile: Horizontal scroll enabled
- Smaller cell padding on mobile
- Condensed font sizes for mobile

### 7. **Dialogs**

**Mobile-optimized dialogs:**


- Mobile: Smaller margins, taller max-height
- Desktop: Standard spacing

---

## 🎯 Breakpoint Usage

### Material-UI Breakpoints


### Using Breakpoints

**In Components:**


**In sx prop:**


---

## 📏 Spacing Scale

| Token | xs (mobile) | sm+ (desktop) | Usage                  |
| ----- | ----------- | ------------- | ---------------------- |
| p     | 16px (2)    | 24px (3)      | Page/container padding |
| gap   | 16px (2)    | 24px (3)      | Grid/flex gaps         |
| mb    | 16px (2)    | 24px (3)      | Section margins        |
| mt    | 32px (4)    | 64px (8)      | Top margins for pages  |

---

## 🎨 Component-Specific Adaptations

### **Header**

- Mobile: Shows hamburger menu button
- Desktop: Hides menu button, shows full title
- User menu: Always visible on all devices

### **Sidebar**

- Mobile: Temporary drawer, overlay
- Desktop: Permanent drawer, inline
- Width: Fixed 260px
- Menu items: Full-width touch targets

### **Dashboard**

- Stats cards: 1 col mobile → 2 col tablet → 4 col desktop
- Quick actions: Stacked mobile → inline desktop
- Responsive font sizes

### **Tenants Page**

- Header: Stacked mobile → row desktop
- Create button: Full-width mobile → auto desktop
- Table: Horizontal scroll on mobile
- Dialogs: Full-height mobile → modal desktop

### **Login Page**

- Container: Reduced padding on mobile
- Form: Optimized touch targets
- Logo: Responsive sizing

---

## 🧪 Testing Responsive Design

### Browser DevTools

1. **Chrome DevTools:**

   - Press `F12` or `Ctrl+Shift+I`
   - Click device toolbar icon (Ctrl+Shift+M)
   - Test presets: iPhone, iPad, Desktop

2. **Responsive Mode:**
   - Drag to resize viewport
   - Test all breakpoints: 320px, 600px, 900px, 1200px, 1536px

### Test Checklist

- [ ] **Mobile (320-600px)**

  - [ ] Hamburger menu works
  - [ ] Drawer opens/closes properly
  - [ ] All buttons are touch-friendly (44px min)
  - [ ] Text is readable without zoom
  - [ ] Forms are easy to fill
  - [ ] Tables scroll horizontally

- [ ] **Tablet (600-900px)**

  - [ ] Sidebar switches to permanent at 900px
  - [ ] Grid layouts adjust properly
  - [ ] Buttons show correct layout
  - [ ] Dialogs display correctly

- [ ] **Desktop (900px+)**

  - [ ] Sidebar is always visible
  - [ ] No horizontal scrolling
  - [ ] Content doesn't stretch too wide
  - [ ] Hover states work properly

- [ ] **Large Screens (1536px+)**
  - [ ] Content scales appropriately
  - [ ] No excessive whitespace
  - [ ] Grids expand properly

---

## 💡 Best Practices

### 1. **Mobile-First Approach**

Always design for mobile first, then enhance for larger screens:


### 2. **Touch Targets**

Minimum touch target: **44x44px**


### 3. **Avoid Horizontal Scroll**

- Use `overflowX: 'auto'` only for tables
- Container max-width: `lg` or `xl`
- Responsive images: `width: '100%', maxWidth: '100%'`

### 4. **Performance**

- Use `useMediaQuery` sparingly
- Prefer CSS breakpoints (sx prop) over JS
- Keep mobile bundle size small

### 5. **Content Priority**

- Show essential content first on mobile
- Use progressive disclosure
- Hide non-critical elements on small screens

---

## 🚀 Future Enhancements

### Phase 1: Mobile UX

- [ ] Swipe gestures for navigation
- [ ] Bottom navigation for mobile
- [ ] Pull-to-refresh on lists
- [ ] Optimized mobile forms

### Phase 2: Touch Optimization

- [ ] Larger touch targets throughout
- [ ] Touch-friendly date/time pickers
- [ ] Image zoom on mobile
- [ ] Swipe actions on list items

### Phase 3: Progressive Web App

- [ ] Add to home screen
- [ ] Offline support
- [ ] Push notifications
- [ ] App-like experience

### Phase 4: Advanced Responsive

- [ ] Responsive images (srcset)
- [ ] Adaptive loading
- [ ] Device-specific optimizations
- [ ] Landscape mode layouts

---

## 📚 Resources

- [Material-UI Breakpoints](https://mui.com/material-ui/customization/breakpoints/)
- [Responsive Design Patterns](https://mui.com/material-ui/guides/responsive-ui/)
- [Mobile-First CSS](https://web.dev/responsive-web-design-basics/)
- [Touch Target Sizes](https://web.dev/accessible-tap-targets/)

---

**Last Updated:** December 18, 2025  
**Status:** ✅ Fully Responsive


# Documentation: src/DeepLens.WebUI/src/styles/README.md

---

# SCSS Architecture - DeepLens WebUI

## 📁 File Structure


## 🎯 Import Order

**IMPORTANT:** Always maintain this import order in `main.scss`:

1. **Variables** → Design tokens must be first
2. **Mixins** → Depends on variables
3. **Base** → Resets and global styles
4. **Utilities** → Helper classes
5. **Components** → Component-specific styles (if needed)

## 📚 Usage Guide

### Using Variables


### Using Mixins


### Using Utilities

Utility classes are available globally:


## 🎨 Variables Overview

### Colors

- **Primary:** `$primary-main`, `$primary-light`, `$primary-dark`
- **Secondary:** `$secondary-main`, `$secondary-light`, `$secondary-dark`
- **Status:** `$success-main`, `$error-main`, `$warning-main`, `$info-main`
- **Grayscale:** `$gray-50` to `$gray-900`
- **Text:** `$text-primary`, `$text-secondary`, `$text-disabled`
- **Backgrounds:** `$bg-default`, `$bg-paper`, `$bg-dark`

### Spacing (8px scale)

- `$spacing-0` (0px)
- `$spacing-1` (8px)
- `$spacing-2` (16px)
- `$spacing-3` (24px)
- `$spacing-4` (32px)
- `$spacing-5` (40px)
- `$spacing-6` (48px)
- `$spacing-8` (64px)

### Breakpoints

- `$breakpoint-xs` (0px) - Mobile
- `$breakpoint-sm` (600px) - Tablet
- `$breakpoint-md` (900px) - Small laptop
- `$breakpoint-lg` (1200px) - Desktop
- `$breakpoint-xl` (1536px) - Large screen

### Typography

- **Font Family:** `$font-family` (Roboto)
- **Font Weights:** `$font-weight-light` to `$font-weight-bold`
- **Font Sizes:** `$font-size-xs` to `$font-size-4xl`
- **Line Heights:** `$line-height-tight`, `$line-height-normal`, `$line-height-relaxed`

## 🔧 Mixins Reference

### Responsive Breakpoints


### Flexbox


### Typography


### Positioning


### Cards & Shadows


### Transitions


### Grid


### Animations


### Custom Scrollbar


## 🎨 Component-Specific Styles

### Creating Component Styles

If you need custom styles for a specific component (not covered by Material-UI):

1. Create a new SCSS file in your component folder:

   ```
   src/components/MyComponent/MyComponent.scss
   ```

2. Import variables and mixins:

   ```scss
   @import "../../styles/variables";
   @import "../../styles/mixins";

   .my-component {
     @include card;
     padding: $spacing-3;

     &__header {
       @include flex-between;
       margin-bottom: $spacing-2;
     }

     @include breakpoint-md {
       width: 50%;
     }
   }
   ```

3. Import in your component:
   ```tsx
   import "./MyComponent.scss";
   ```

## 🚀 Best Practices

### ✅ DO:

- Use SCSS variables for all colors, spacing, and typography
- Use mixins for common patterns (flexbox, breakpoints, transitions)
- Follow BEM naming for custom components (`.block__element--modifier`)
- Keep component styles modular and scoped
- Use utility classes for quick styling
- Mobile-first responsive design

### ❌ DON'T:

- Hard-code colors or spacing values
- Use inline styles unless absolutely necessary
- Override Material-UI styles globally (use theme customization instead)
- Create deep nesting (max 3-4 levels)
- Use `!important` unless required for specificity issues

## 📖 Examples

### Example 1: Custom Card Component


### Example 2: Responsive Grid


### Example 3: Using Utility Classes


## 🔄 Migration from CSS to SCSS

If you have existing CSS files:

1. Rename `.css` to `.scss`
2. Replace hard-coded values with variables:

   ```scss
   // Before (CSS)
   .box {
     padding: 16px;
     color: #1976d2;
   }

   // After (SCSS)
   .box {
     padding: $spacing-2;
     color: $primary-main;
   }
   ```

3. Use mixins for common patterns:

   ```scss
   // Before
   .card {
     display: flex;
     align-items: center;
     justify-content: center;
   }

   // After
   .card {
     @include flex-center;
   }
   ```

## 📦 Build Configuration

Vite automatically handles SCSS compilation. No additional configuration needed!

Just import SCSS files:


## 🎓 Resources

- [SASS Documentation](https://sass-lang.com/documentation)
- [Material Design Guidelines](https://material.io/design)
- [BEM Methodology](http://getbem.com/)
- [CSS Architecture Best Practices](https://www.smashingmagazine.com/2018/05/guide-css-layout/)

---

**Last Updated:** December 18, 2025  
**Maintained By:** DeepLens Team


# Documentation: src/README.md

---

# DeepLens Source Code Guide

**Complete reference for the application codebase**

Last Updated: December 17, 2025

---

## Directory Structure


---

## Quick Start

### Prerequisites

- **.NET 9.0 SDK** - https://dot.net
- **Python 3.11+** - For feature extraction service
- **Docker/Podman** - For infrastructure (PostgreSQL, Kafka, Qdrant, etc.)

### Start Infrastructure First


### Run NextGen.Identity API


### Run Python Feature Extraction


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


**All Operations Instrumented:**

- Database: Every Dapper query/command
- Authentication: Login, registration, token refresh, logout
- Tenant: Create, query, update
- Token: Generate, validate, revoke

**Error Handling Pattern:**


See [OPENTELEMETRY_STATUS.md](../OPENTELEMETRY_STATUS.md) for complete implementation details.

---

## DeepLens Platform - Deep Dive

### Image Processing Pipeline

**1. Upload (SearchApi)**


**2. Processing (ImageProcessingWorker)**


**3. Feature Extraction (FeatureExtractionWorker)**


**4. Vector Indexing (VectorIndexingWorker)**


**5. Search (SearchApi)**


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


**Testing:**

- 93% code coverage
- 15 test cases (endpoint, model loading, feature extraction)
- CI/CD ready (pytest in GitHub Actions)

See [DeepLens.FeatureExtractionService/README.md](DeepLens.FeatureExtractionService/README.md) for details.

---

## Development Guide

### Adding a New Repository (Dapper)

1. **Define interface in Core:**


2. **Implement with OpenTelemetry:**


3. **Register in DI:**


### Adding a New Service with Telemetry


### Running Tests

**NextGen.Identity:**


**Python Feature Extraction:**


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


**Database Query Duration (p95):**


**Active Tenants:**


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


# Documentation: tools/python/Lib/site-packages/pip/_vendor/idna/LICENSE.md

---

BSD 3-Clause License

Copyright (c) 2013-2024, Kim Davies and contributors.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


# Documentation: tools/python/Lib/site-packages/pip-25.3.dist-info/licenses/src/pip/_vendor/idna/LICENSE.md

---

BSD 3-Clause License

Copyright (c) 2013-2024, Kim Davies and contributors.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


# Documentation: tools/python/README.md

---

# Portable Python Installation (Optional)

This folder can contain a portable Python installation for use with the Python services.

## Why Use Portable Python?

- **No admin rights required**
- **No system PATH modification needed**
- **Project-specific Python version**
- **Works alongside other Python installations**
- **Easy to update or remove**

## Setup Instructions

### Step 1: Download Python Embeddable Package

1. Visit: https://www.python.org/downloads/windows/
2. Scroll to "Stable Releases"
3. Find Python 3.11.x or 3.12.x
4. Download: **Windows embeddable package (64-bit)**
   - File name looks like: `python-3.11.x-embed-amd64.zip`

### Step 2: Extract to This Folder

Extract the ZIP contents directly into this `tools\python` folder:


### Step 3: Configure for pip (Required)

The embeddable package doesn't include pip by default. Enable it:

1. Open `python311._pth` (or `python312._pth`) in this folder
2. Uncomment the line: `import site` (remove the `#`)
3. Save the file

### Step 4: Install pip


### Step 5: Test the Setup


### Step 6: Run Service Setup

Now the `setup-dev-environment.ps1` script will automatically detect and use this Python:


## Verification

After setup, verify the installation:


## Folder Structure After Setup


## Troubleshooting

### Python not detected

Make sure `python.exe` is directly in `tools\python\`:

### pip doesn't work

1. Check `python311._pth` has `import site` uncommented
2. Re-run pip installation: `.\python.exe get-pip.py`

### DLL errors

- Download the correct **64-bit** embeddable package
- Make sure all extracted files are in the same folder

## Alternative: Full Python Installation

If you prefer a full Python installation instead of portable:

**Option 1: Microsoft Store**
- Open Microsoft Store
- Search "Python 3.11" or "Python 3.12"
- Install
- Automatically available system-wide

**Option 2: Official Installer**
- Download from: https://www.python.org/downloads/
- Run installer
- Check "Add Python to PATH" (optional)
- Setup script will find it automatically

## Maintenance

### Update Python

1. Download new embeddable package
2. Extract to temporary folder
3. Copy new files over old ones (or delete and re-extract)
4. Re-run pip installation if needed

### Uninstall

Simply delete this `tools\python` folder. No system changes needed.

## References

- [Python Downloads](https://www.python.org/downloads/windows/)
- [Embeddable Package Documentation](https://docs.python.org/3/using/windows.html#the-embeddable-package)
- [pip Installation](https://pip.pypa.io/en/stable/installation/)


