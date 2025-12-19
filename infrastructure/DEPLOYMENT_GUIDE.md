# DeepLens Deployment Guide

This guide provides step-by-step instructions for deploying DeepLens infrastructure and provisioning tenants from a clean slate.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Deployment Steps](#detailed-deployment-steps)
4. [Verification Steps](#verification-steps)
5. [Troubleshooting](#troubleshooting)
6. [Cleanup and Reset](#cleanup-and-reset)

---

## Prerequisites

### Required Software

- **Podman** (Container runtime)
  - Verify: `podman --version`
  - Required for running PostgreSQL, Redis, Qdrant, and MinIO containers

- **.NET 9.0 SDK**
  - Verify: `dotnet --version`
  - Required for running Identity API

- **PowerShell 7+**
  - Verify: `$PSVersionTable.PSVersion`
  - Required for running provisioning scripts

### Required Ports

Ensure the following ports are available:

| Service | Port(s) | Purpose |
|---------|---------|---------|
| PostgreSQL | 5433 | Main database |
| Redis | 6379 | Caching and session storage |
| Identity API | 5198 | Authentication and tenant management |
| Qdrant | 6333, 6334+ | Vector database (per tenant) |
| MinIO | 9000, 9001+ | Object storage (per tenant) |

### Directory Structure

The scripts expect the following structure:
```
C:\productivity\deeplens\
├── infrastructure/
│   ├── provision-tenant.ps1
│   ├── init-scripts/
│   │   └── postgres/
│   └── config/
└── src/
    └── NextGen.Identity.Api/
```

Data will be stored in:
```
C:\productivity\deeplensData/
├── postgres/
├── redis/
└── tenants/
    └── {tenant-name}/
```

---

## Quick Start

For experienced users, here's the complete deployment in 4 commands:

```powershell
# 1. Setup infrastructure (from infrastructure directory)
cd C:\productivity\deeplens\infrastructure
podman network create deeplens-network
podman volume create deeplens_postgres_data
podman volume create deeplens_redis_data
podman run -d --name deeplens-postgres --network deeplens-network -p 5433:5432 -v deeplens_postgres_data:/var/lib/postgresql/data -v "C:\productivity\deeplens\infrastructure\init-scripts\postgres:/docker-entrypoint-initdb.d:ro" -e POSTGRES_PASSWORD=postgres postgres:15-alpine
podman run -d --name deeplens-redis --network deeplens-network -p 6379:6379 -v deeplens_redis_data:/data redis:7-alpine redis-server --appendonly yes

# 2. Wait for databases to initialize (15 seconds)
Start-Sleep -Seconds 15

# 3. Start Identity API (in separate terminal)
cd C:\productivity\deeplens\src\NextGen.Identity.Api
dotnet run

# 4. Provision tenant (wait for API to be healthy first, ~10 seconds)
cd C:\productivity\deeplens\infrastructure
.\provision-tenant.ps1 -TenantName "vayyari" -StorageType "DeepLens"
```

---

## Detailed Deployment Steps

### Step 1: Clean Slate (Optional)

If you have existing infrastructure, clean it up first:

```powershell
cd C:\productivity\deeplens\infrastructure

# Remove existing tenant (if any)
.\provision-tenant.ps1 -TenantName "vayyari" -Remove

# Stop and remove all DeepLens containers
podman ps -a --filter "name=deeplens" --format "{{.Names}}" | ForEach-Object { podman stop $_ }
podman ps -a --filter "name=deeplens" --format "{{.Names}}" | ForEach-Object { podman rm $_ }

# Remove volumes
podman volume ls --filter "name=deeplens" --format "{{.Name}}" | ForEach-Object { podman volume rm $_ }

# Remove network
podman network rm deeplens-network
```

**Expected Result:** All DeepLens containers, volumes, and networks removed.

---

### Step 2: Setup Infrastructure

#### 2.1 Create Network

```powershell
podman network create deeplens-network
```

**Expected Result:** Network created successfully.

#### 2.2 Create Volumes

```powershell
podman volume create deeplens_postgres_data
podman volume create deeplens_redis_data
```

**Expected Result:** Two volumes created for persistent storage.

#### 2.3 Start PostgreSQL

```powershell
podman run -d `
  --name deeplens-postgres `
  --network deeplens-network `
  -p 5433:5432 `
  -v deeplens_postgres_data:/var/lib/postgresql/data `
  -v "C:\productivity\deeplens\infrastructure\init-scripts\postgres:/docker-entrypoint-initdb.d:ro" `
  -e POSTGRES_PASSWORD=postgres `
  postgres:15-alpine
```

**Expected Result:** PostgreSQL container running on port 5433.

**Key Points:**
- Initialization scripts in `init-scripts/postgres/` run automatically
- Creates databases: `nextgen_identity`, `deeplens_platform`, `tenant_metadata_template`
- Creates service users with appropriate permissions

#### 2.4 Start Redis

```powershell
podman run -d `
  --name deeplens-redis `
  --network deeplens-network `
  -p 6379:6379 `
  -v deeplens_redis_data:/data `
  redis:7-alpine redis-server --appendonly yes
```

**Expected Result:** Redis container running on port 6379 with persistence enabled.

#### 2.5 Wait for Initialization

```powershell
Start-Sleep -Seconds 15
```

**Purpose:** Allow PostgreSQL initialization scripts to complete.

#### 2.6 Verify Infrastructure

```powershell
# Check containers are running
podman ps

# Verify databases created
podman exec -i deeplens-postgres psql -U postgres -c "\l"
```

**Expected Output:**
```
CONTAINER ID  IMAGE                            STATUS        PORTS
xxx           postgres:15-alpine               Up            0.0.0.0:5433->5432/tcp
xxx           redis:7-alpine                   Up            0.0.0.0:6379->6379/tcp

Databases:
- deeplens_platform
- nextgen_identity
- tenant_metadata_template
- postgres
- template0
- template1
```

---

### Step 3: Start Identity API

#### 3.1 Open New Terminal

Open a **separate PowerShell terminal** for the API (it runs in foreground).

#### 3.2 Navigate and Run

```powershell
cd C:\productivity\deeplens\src\NextGen.Identity.Api
dotnet run
```

**Expected Output:**
```
Building...
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5198
info: Microsoft.Hosting.Lifetime[0]
      Application started.
```

**Key Points:**
- API runs Entity Framework migrations automatically on startup
- Creates tables in `nextgen_identity` database
- Exposes endpoints on `http://localhost:5198`

#### 3.3 Wait for API Readiness

In your **original terminal**, wait for the API to be healthy:

```powershell
Start-Sleep -Seconds 10
```

#### 3.4 Verify API Health

```powershell
Invoke-RestMethod -Uri "http://localhost:5198/api/auth/health" -Method Get
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "identity-api",
  "timestamp": "2025-12-19T14:29:32.8780643Z"
}
```

---

### Step 4: Provision Tenant

#### 4.1 Run Provisioning Script

```powershell
cd C:\productivity\deeplens\infrastructure
.\provision-tenant.ps1 -TenantName "vayyari" -StorageType "DeepLens"
```

**Parameters:**
- `-TenantName`: Unique tenant identifier (alphanumeric, lowercase recommended)
- `-StorageType`: Storage configuration
  - `"DeepLens"` - Provisions dedicated MinIO instance (recommended for development)
  - `"BYOS"` - Bring Your Own Storage (for production)
  - `"None"` - No storage provisioning

#### 4.2 Provisioning Steps (Automatic)

The script performs these steps automatically:

1. **Prerequisites Check**
   - Verifies PostgreSQL is running

2. **Directory Creation**
   - Creates `C:\productivity\deeplensData\tenants\{tenant-name}\`
   - Creates subdirectories: `data`, `qdrant`, `backups`

3. **Database Creation**
   - Creates `tenant_{tenant-name}_metadata` database from template

4. **Identity API Call**
   - POST to `/api/tenant/provision`
   - Creates tenant record in `nextgen_identity`
   - Creates admin user with hashed password
   - Uses idempotent logic (cleans up existing tenant if found)

5. **Qdrant Container**
   - Starts `deeplens-qdrant-{tenant-name}`
   - Auto-assigns HTTP and gRPC ports (starting from 6333)
   - Updates tenant record with assigned ports

6. **MinIO Container** (if StorageType = "DeepLens")
   - Starts `deeplens-minio-{tenant-name}`
   - Auto-assigns API and Console ports (starting from 9000)
   - Generates random credentials

7. **Backup Container**
   - Starts `deeplens-backup-{tenant-name}`
   - Configures daily backup schedule (2 AM)
   - 30-day retention policy

8. **Credentials File**
   - Saves admin credentials to `C:\productivity\deeplensData\tenants\{tenant-name}\admin-credentials.txt`
   - Saves MinIO credentials to `minio-credentials.txt`

#### 4.3 Expected Output

```
========================================
 Provisioning Tenant: vayyari
========================================

[CHECK] Verifying prerequisites...
[OK] PostgreSQL is running

[DIRECTORIES] Creating tenant directories...
[OK] Directories created at: C:\productivity\deeplensData/tenants/vayyari

[DATABASE] Creating tenant database...
[OK] Database created: tenant_vayyari_metadata

[IDENTITY] Creating tenant and admin user via API...
[OK] Tenant and admin user created via API
[INFO] Tenant ID: a889d592-42fa-4c3d-8576-127a4603e98a
[INFO] Admin User ID: e520db0f-6948-4ed7-800c-d9ce6d9fc0ce
[INFO] Tenant Slug: vayyari

[QDRANT] Provisioning Qdrant instance...
[INFO] Auto-assigned HTTP port: 6333
[INFO] Auto-assigned gRPC port: 6334
[OK] Qdrant started on ports 6333 (HTTP) and 6334 (gRPC)

[STORAGE] Provisioning dedicated MinIO instance...
[INFO] Auto-assigned MinIO API port: 9000
[INFO] Auto-assigned MinIO Console port: 9001
[OK] MinIO started on ports 9000 (API) and 9001 (Console)

[BACKUP] Provisioning backup container...
[OK] Backup container configured (Schedule: 0 2 * * *, Retention: 30 days)

========================================
 Tenant Provisioning Complete
========================================

  Tenant Name:       vayyari
  Database:          tenant_vayyari_metadata
  Data Path:         C:\productivity\deeplensData/tenants/vayyari

  Admin User:        admin@vayyari.local
  Admin Password:    DeepLens@vayyari123!
  Admin Role:        TenantOwner

  Qdrant HTTP:       http://localhost:6333
  Qdrant Dashboard:  http://localhost:6333/dashboard
  Qdrant gRPC:       localhost:6334

  MinIO API:         http://localhost:9000
  MinIO Console:     http://localhost:9001

  Backup Schedule:   0 2 * * *
  Backup Retention:  30 days
```

---

## Verification Steps

### Verify Infrastructure Containers

```powershell
podman ps --filter "name=deeplens"
```

**Expected Output:**
```
NAMES                    STATUS        PORTS
deeplens-postgres        Up            0.0.0.0:5433->5432/tcp
deeplens-redis           Up            0.0.0.0:6379->6379/tcp
```

### Verify Tenant Containers

```powershell
podman ps --filter "name=vayyari"
```

**Expected Output:**
```
NAMES                    STATUS        PORTS
deeplens-qdrant-vayyari  Up            0.0.0.0:6333-6334->6333-6334/tcp
deeplens-minio-vayyari   Up            0.0.0.0:9000-9001->9000-9001/tcp
deeplens-backup-vayyari  Up            5432/tcp
```

### Verify Tenant in Database

```powershell
podman exec -i deeplens-postgres psql -U postgres -d nextgen_identity -c `
  "SELECT id, name, slug, created_at, qdrant_http_port, qdrant_grpc_port FROM tenants WHERE slug = 'vayyari';"
```

**Expected Output:**
```
                  id                  |  name   |  slug   |         created_at         | qdrant_http_port | qdrant_grpc_port
--------------------------------------+---------+---------+----------------------------+------------------+------------------
 a889d592-42fa-4c3d-8576-127a4603e98a | vayyari | vayyari | 2025-12-19 14:29:45.085633 |             6333 |             6334
```

### Verify Admin User

```powershell
podman exec -i deeplens-postgres psql -U postgres -d nextgen_identity -c `
  "SELECT id, email, email_confirmed, tenant_id FROM users WHERE email = 'admin@vayyari.local';"
```

**Expected Output:**
```
                  id                  |        email        | email_confirmed |              tenant_id
--------------------------------------+---------------------+-----------------+--------------------------------------
 e520db0f-6948-4ed7-800c-d9ce6d9fc0ce | admin@vayyari.local | t               | a889d592-42fa-4c3d-8576-127a4603e98a
```

### Test Admin Login

```powershell
$body = @{
    grant_type = "password"
    username = "admin@vayyari.local"
    password = "DeepLens@vayyari123!"
    client_id = "deeplens-web"
    scope = "openid profile email offline_access"
}

Invoke-RestMethod -Uri "http://localhost:5198/connect/token" `
  -Method Post `
  -Body $body `
  -ContentType "application/x-www-form-urlencoded"
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "refresh_token": "CfDJ8...",
  "scope": "openid profile email offline_access"
}
```

### Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Identity API | http://localhost:5198 | N/A |
| Qdrant Dashboard | http://localhost:6333/dashboard | No auth (dev) |
| MinIO Console | http://localhost:9001 | See minio-credentials.txt |

---

## Troubleshooting

### Issue: Port Already in Use

**Symptom:**
```
Error: unable to expose port 5433, it is already allocated
```

**Solutions:**
1. Check what's using the port:
   ```powershell
   netstat -ano | findstr :5433
   ```
2. Stop the conflicting process or change the port mapping:
   ```powershell
   # Use different host port
   podman run ... -p 5434:5432 ...
   ```

### Issue: PostgreSQL Not Ready

**Symptom:**
```
[ERROR] PostgreSQL is not running on port 5433
```

**Solutions:**
1. Check container status:
   ```powershell
   podman ps -a --filter "name=deeplens-postgres"
   ```
2. Check logs:
   ```powershell
   podman logs deeplens-postgres
   ```
3. Wait longer (initialization can take 15-30 seconds)

### Issue: Identity API Returns 500

**Symptom:**
```
HTTP 500 Internal Server Error
```

**Solutions:**
1. Check API logs in the terminal where `dotnet run` is running
2. Verify database migrations ran:
   ```powershell
   podman exec -i deeplens-postgres psql -U postgres -d nextgen_identity -c "\dt"
   ```
3. Restart Identity API:
   ```powershell
   # In API terminal: Ctrl+C to stop
   dotnet run
   ```

### Issue: Tenant Already Exists

**Symptom:**
```
[ERROR] Tenant with slug 'vayyari' already exists
```

**Solution:**
The provisioning script is idempotent and will automatically clean up and recreate the tenant. If you see this error, it means the idempotent logic detected the existing tenant and is removing it before recreating. This is expected behavior.

To manually remove a tenant:
```powershell
.\provision-tenant.ps1 -TenantName "vayyari" -Remove
```

### Issue: Docker Compose Not Found

**Symptom:**
```
docker-compose: The term 'docker-compose' is not recognized
```

**Solution:**
Use the manual Podman commands shown in Step 2. The `setup-infrastructure.ps1` script requires Docker Compose, but the manual approach works with Podman alone.

### Issue: API Not Responding

**Symptom:**
Health check fails or times out

**Solutions:**
1. Verify API is running:
   ```powershell
   Get-Process -Name dotnet | Where-Object {$_.MainWindowTitle -like "*Identity.Api*"}
   ```
2. Check if API started successfully (look for "Now listening on:" message)
3. Wait 10-15 seconds after starting before calling endpoints
4. Check firewall isn't blocking localhost:5198

---

## Cleanup and Reset

### Remove Specific Tenant

```powershell
cd C:\productivity\deeplens\infrastructure
.\provision-tenant.ps1 -TenantName "vayyari" -Remove
```

This removes:
- Qdrant container
- MinIO container
- Backup container
- Tenant database
- Tenant data directory
- Tenant and user records from Identity database

### Complete Infrastructure Reset

```powershell
cd C:\productivity\deeplens\infrastructure

# Stop Identity API (Ctrl+C in API terminal)

# Remove all DeepLens containers
podman ps -a --filter "name=deeplens" --format "{{.Names}}" | ForEach-Object { podman stop $_ }
podman ps -a --filter "name=deeplens" --format "{{.Names}}" | ForEach-Object { podman rm $_ }

# Remove volumes (WARNING: Deletes all data)
podman volume ls --filter "name=deeplens" --format "{{.Name}}" | ForEach-Object { podman volume rm $_ }

# Remove network
podman network rm deeplens-network
```

**WARNING:** This deletes ALL data including tenant data and databases. Use only for complete fresh start.

---

## Advanced Topics

### Multiple Tenants

To provision multiple tenants, repeat Step 4 with different tenant names:

```powershell
.\provision-tenant.ps1 -TenantName "tenant1" -StorageType "DeepLens"
.\provision-tenant.ps1 -TenantName "tenant2" -StorageType "DeepLens"
.\provision-tenant.ps1 -TenantName "tenant3" -StorageType "BYOS"
```

Each tenant gets:
- Separate database
- Separate Qdrant instance (auto-assigned ports)
- Separate MinIO instance (if DeepLens storage)
- Separate data directory

### Bring Your Own Storage (BYOS)

For production deployments using external S3-compatible storage:

```powershell
.\provision-tenant.ps1 -TenantName "production-tenant" -StorageType "BYOS"
```

Configure storage credentials in your application settings.

### Backup and Restore

Backups run automatically at 2 AM daily. To trigger manual backup:

```powershell
podman exec deeplens-backup-vayyari /backup.sh
```

Backups are stored in: `C:\productivity\deeplensData\tenants\{tenant-name}\backups\`

### Port Assignments

The provisioning script automatically assigns ports to avoid conflicts:

- **Qdrant HTTP**: Starts at 6333, increments for each tenant
- **Qdrant gRPC**: Starts at 6334, increments for each tenant
- **MinIO API**: Starts at 9000, increments for each tenant
- **MinIO Console**: Starts at 9001, increments for each tenant

To view port assignments for a tenant:

```powershell
podman exec -i deeplens-postgres psql -U postgres -d nextgen_identity -c `
  "SELECT name, qdrant_http_port, qdrant_grpc_port FROM tenants WHERE slug = 'vayyari';"
```

---

## Architecture Notes

### Idempotent Provisioning

The tenant provisioning is idempotent - running it multiple times with the same tenant name will:

1. Detect existing tenant by slug
2. Delete all refresh tokens for users in that tenant
3. Delete all users in that tenant
4. Delete the tenant record
5. Create fresh tenant and admin user

This makes development and testing workflows robust and repeatable.

### Security Considerations

**Development Setup:**
- Admin password is predictable: `DeepLens@{tenantname}123!`
- Qdrant has no authentication
- MinIO credentials are randomly generated but stored in plain text

**⚠️ For Production:**
- Change admin password immediately after first login
- Enable Qdrant API key authentication
- Use secrets management for MinIO credentials
- Enable SSL/TLS for all services
- Use proper firewall rules

### Database Architecture

- **nextgen_identity**: Identity server data (users, tenants, tokens)
- **deeplens_platform**: Platform-wide data (audit logs, system config)
- **tenant_{name}_metadata**: Tenant-specific metadata and configuration
- **tenant_metadata_template**: Template database for creating new tenant databases

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs: `podman logs {container-name}`
3. Verify all prerequisites are met
4. Ensure ports are not in use

---

**Last Updated:** December 19, 2025  
**Version:** 1.0.0
