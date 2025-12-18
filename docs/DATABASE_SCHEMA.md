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

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(100) NOT NULL UNIQUE,

    -- Database configuration
    database_name VARCHAR(100) NOT NULL,
    connection_string TEXT,

    -- Infrastructure
    qdrant_container_name VARCHAR(100) NOT NULL,
    qdrant_http_port INTEGER NOT NULL,
    qdrant_grpc_port INTEGER NOT NULL,
    minio_endpoint VARCHAR(255) NOT NULL,
    minio_bucket_name VARCHAR(100) NOT NULL,

    -- Status and limits
    status SMALLINT NOT NULL DEFAULT 1,
    tier SMALLINT NOT NULL DEFAULT 1,
    max_storage_bytes BIGINT NOT NULL DEFAULT 10737418240,
    max_users INTEGER NOT NULL DEFAULT 10,
    max_api_calls_per_day INTEGER NOT NULL DEFAULT 10000,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_by UUID,

    CONSTRAINT chk_status CHECK (status BETWEEN 1 AND 4),
    CONSTRAINT chk_tier CHECK (tier BETWEEN 1 AND 3)
);
```

### C# Model

```csharp
public class Tenant
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required string Slug { get; set; }

    // Database configuration
    public required string DatabaseName { get; set; }
    public string? ConnectionString { get; set; }

    // Infrastructure
    public required string QdrantContainerName { get; set; }
    public int QdrantHttpPort { get; set; }
    public int QdrantGrpcPort { get; set; }
    public required string MinioEndpoint { get; set; }
    public required string MinioBucketName { get; set; }

    // Status and limits
    public TenantStatus Status { get; set; } = TenantStatus.Active;
    public TenantTier Tier { get; set; } = TenantTier.Free;
    public long MaxStorageBytes { get; set; } = 10_737_418_240; // 10 GB
    public int MaxUsers { get; set; } = 10;
    public int MaxApiCallsPerDay { get; set; } = 10000;

    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? CreatedBy { get; set; } // System or User ID
}

public enum TenantStatus : short
{
    Active = 1,
    Suspended = 2,
    PendingSetup = 3,
    Deleted = 4
}

public enum TenantTier : short
{
    Free = 1,
    Professional = 2,
    Enterprise = 3
}
```

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

```sql
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status) WHERE deleted_at IS NULL;
```

---

## Table: `users`

### Purpose

User accounts with authentication and authorization.

### Schema Definition

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    -- Authentication
    email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    email_confirmation_token VARCHAR(255),
    email_confirmation_token_expiry TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_token_expiry TIMESTAMP,

    -- Authorization
    role SMALLINT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,

    CONSTRAINT chk_role CHECK (role BETWEEN 1 AND 3),
    CONSTRAINT uq_tenant_email UNIQUE(tenant_id, email)
);
```

### C# Model

```csharp
public class User
{
    public Guid Id { get; set; }
    public required Guid TenantId { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }

    // Authentication
    public bool EmailConfirmed { get; set; }
    public string? EmailConfirmationToken { get; set; }
    public DateTime? EmailConfirmationTokenExpiry { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiry { get; set; }

    // Authorization
    public UserRole Role { get; set; } = UserRole.User;
    public bool IsActive { get; set; } = true;

    // Audit
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public enum UserRole : short
{
    User = 1,
    Admin = 2,
    TenantOwner = 3
}
```

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

```sql
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email) WHERE deleted_at IS NULL;
```

---

## Table: `refresh_tokens`

### Purpose

OAuth 2.0 refresh tokens for token rotation.

### Schema Definition

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMP,
    revoked_reason VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent VARCHAR(500)
);
```

### C# Model

```csharp
public class RefreshToken
{
    public Guid Id { get; set; }
    public required Guid UserId { get; set; }
    public required string Token { get; set; }
    public required DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsRevoked { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedReason { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
```

---

## Table: `tenant_api_keys`

### Purpose

API keys for machine-to-machine authentication.

### Schema Definition

```sql
CREATE TABLE tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(8) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL
);
```

### C# Model

```csharp
public class TenantApiKey
{
    public Guid Id { get; set; }
    public required Guid TenantId { get; set; }
    public required string Name { get; set; }
    public required string KeyHash { get; set; }
    public required string KeyPrefix { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid CreatedBy { get; set; }
}
```

---

## Seeding Strategy

### Default Admin Tenant

```csharp
var adminTenant = new Tenant
{
    Id = Guid.NewGuid(),
    Name = "DeepLens Administration",
    Description = "System administration tenant",
    Slug = "deeplens-admin",
    DatabaseName = "deeplens_admin",
    QdrantContainerName = "deeplens-admin-qdrant",
    QdrantHttpPort = 6333,
    QdrantGrpcPort = 6334,
    MinioEndpoint = "localhost:9000",
    MinioBucketName = "deeplens-admin",
    Status = TenantStatus.Active,
    Tier = TenantTier.Enterprise,
    MaxStorageBytes = 107374182400, // 100 GB
    MaxUsers = 100,
    MaxApiCallsPerDay = 1000000,
    CreatedAt = DateTime.UtcNow,
    CreatedBy = Guid.Empty // System-created (00000000...)
};
```

### Default Admin User

```csharp
var adminUser = new User
{
    Id = Guid.NewGuid(),
    TenantId = adminTenant.Id,
    Email = "admin@deeplens.local",
    PasswordHash = BCrypt.Net.BCrypt.HashPassword("DeepLens@Admin123!"),
    FirstName = "System",
    LastName = "Administrator",
    EmailConfirmed = true,
    Role = UserRole.Admin,
    IsActive = true,
    CreatedAt = DateTime.UtcNow
};
```

---

## Best Practices

### 1. Always Use UTC Timestamps

```csharp
CreatedAt = DateTime.UtcNow; // ✓ Correct
CreatedAt = DateTime.Now;    // ✗ Wrong (local time)
```

### 2. Enum Casting in SQL

```sql
-- Query by enum value
SELECT * FROM tenants WHERE status = 1; -- Active

-- In C# with Dapper
connection.QueryAsync<Tenant>(
    "SELECT * FROM tenants WHERE status = @Status",
    new { Status = (short)TenantStatus.Active }
);
```

### 3. Soft Deletes

```csharp
// Mark as deleted (don't actually delete)
tenant.DeletedAt = DateTime.UtcNow;
await _tenantRepository.UpdateAsync(tenant);

// Query only active records
SELECT * FROM tenants WHERE deleted_at IS NULL;
```

### 4. Guid Generation

```csharp
// Let PostgreSQL generate
Id = default // Will be set by gen_random_uuid()

// Or generate in C#
Id = Guid.NewGuid()
```

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

```csharp
// SQL: created_by UUID
public string CreatedBy { get; set; } // Wrong!
public Guid? CreatedBy { get; set; }  // Correct!
```

### ❌ Enum Without Cast

```csharp
// Wrong - Dapper can't convert
new { Status = TenantStatus.Active }

// Correct
new { Status = (short)TenantStatus.Active }
```

### ❌ Missing Timezone

```csharp
// Wrong - local time
DateTime.Now

// Correct - UTC
DateTime.UtcNow
```

---

**Status:** ✅ All models aligned with schema (December 18, 2025)
