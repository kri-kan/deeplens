# Tenant Provisioning Quick Reference

**Last Updated:** December 19, 2025

## TL;DR

```powershell
# Interactive mode (recommended for first time)
.\provision-tenant.ps1 -TenantName "your-tenant"

# BYOS mode (tenant brings Azure/AWS/GCS)
.\provision-tenant.ps1 -TenantName "your-tenant" -StorageType "BYOS"

# DeepLens-managed storage (dedicated MinIO)
.\provision-tenant.ps1 -TenantName "your-tenant" -StorageType "DeepLens"

# Remove tenant
.\provision-tenant.ps1 -TenantName "your-tenant" -Remove
```

---

## Storage Options

| Option       | What Gets Provisioned     | Use Case                                 |
| ------------ | ------------------------- | ---------------------------------------- |
| **BYOS**     | Database + Qdrant         | Enterprise with existing cloud storage   |
| **DeepLens** | Database + Qdrant + MinIO | Development, testing, or managed hosting |
| **None**     | Database + Qdrant         | Configure storage later                  |

---

## What Gets Created

### Always Provisioned

- ✅ **PostgreSQL Database**: `tenant_{name}_metadata`
- ✅ **Qdrant Instance**: Dedicated vector database (auto-assigned ports)
- ✅ **Backup Container**: Daily backups at 2 AM, 30-day retention
- ✅ **Data Directory**: `C:\productivity\deeplensData\tenants/{name}/`

### Optional (DeepLens Storage Only)

- ✅ **MinIO Instance**: Dedicated S3-compatible storage (auto-assigned ports)
- ✅ **MinIO Credentials**: Saved to `{tenant-dir}/minio-credentials.txt`

---

## Port Assignments (Auto)

Ports are automatically assigned to avoid conflicts:

| Service       | Starting Port | Pattern               |
| ------------- | ------------- | --------------------- |
| Qdrant HTTP   | 6333          | 6333, 6335, 6337, ... |
| Qdrant gRPC   | 6334          | 6334, 6336, 6338, ... |
| MinIO API     | 9000          | 9000, 9002, 9004, ... |
| MinIO Console | 9001          | 9001, 9003, 9005, ... |

**Example:** If you have 2 tenants:

- Tenant 1: Qdrant=6333/6334, MinIO=9000/9001
- Tenant 2: Qdrant=6335/6336, MinIO=9002/9003

---

## Architecture Strategy

### ✅ What We Do (Isolated per Tenant)

- **Separate Database**: Each tenant has `tenant_{name}_metadata` database
- **Separate Qdrant**: Each tenant has dedicated Qdrant container
- **Separate MinIO** (if DeepLens storage): Each tenant has dedicated MinIO container
- **Separate Backups**: Each tenant has own backup container

### ❌ What We Don't Do (No Shared Resources)

- ❌ **NO shared MinIO with buckets** - Each tenant gets own MinIO instance
- ❌ **NO shared Qdrant with collections** - Each tenant gets own Qdrant instance
- ❌ **NO shared storage volumes** - Each tenant has isolated volumes

### Why This Approach?

1. **Complete Isolation** - No noisy neighbor problems
2. **Independent Scaling** - Scale per tenant as needed
3. **Security** - Zero chance of cross-tenant data access
4. **Resource Control** - Set limits per tenant container
5. **Simplified Debugging** - Isolated logs and metrics

---

## Real-World Examples

### Scenario 1: Enterprise Client (BYOS)

```powershell
.\provision-tenant.ps1 -TenantName "acme" -StorageType "BYOS"

# They configure in Admin Portal:
# - Provider: Azure Blob Storage
# - Connection: <their Azure credentials>
# - Container: acme-deeplens-images

# DeepLens Never Touches Their Storage
```

### Scenario 2: Startup (DeepLens Storage)

```powershell
.\provision-tenant.ps1 -TenantName "startup" -StorageType "DeepLens"

# Output:
# MinIO API:         http://localhost:9002
# MinIO Console:     http://localhost:9003
# MinIO Credentials: C:\productivity\deeplensData\tenants\startup\minio-credentials.txt

# Credentials Example:
# Root User: startup-admin
# Root Password: A7jK9mPx2qR5tYnW8vCx4bFg
```

### Scenario 3: Development Team (Interactive)

```powershell
.\provision-tenant.ps1 -TenantName "dev-team"

# Script prompts:
# Choose storage option for tenant 'dev-team':
#   [1] BYOS (Bring Your Own Storage)
#   [2] DeepLens-Provisioned Storage
#   [3] None (Skip storage provisioning)
# Enter choice (1-3): 2

# Creates dedicated MinIO for dev team
```

---

## Verification Commands

```powershell
# Check all tenant containers
podman ps --filter "label=tenant=your-tenant"

# List all tenant databases
podman exec deeplens-postgres psql -U postgres -c "\l" | Select-String "tenant_"

# Check Qdrant dashboard
Start-Process "http://localhost:6335/dashboard"

# Check MinIO console (if DeepLens storage)
Start-Process "http://localhost:9003"

# View tenant data directory
explorer "C:\productivity\deeplensData\tenants\your-tenant"
```

---

## Troubleshooting

### Port Already in Use

**Solution:** Script auto-assigns next available port. If manual ports specified and conflict, script will fail.

```powershell
# Let script auto-assign
.\provision-tenant.ps1 -TenantName "tenant1" -StorageType "DeepLens"

# Or specify custom ports
.\provision-tenant.ps1 -TenantName "tenant1" -StorageType "DeepLens" -MinioPort 9010 -MinioConsolePort 9011
```

### Container Already Exists

**Solution:** Remove existing tenant first:

```powershell
.\provision-tenant.ps1 -TenantName "old-tenant" -Remove
.\provision-tenant.ps1 -TenantName "old-tenant" -StorageType "BYOS"
```

### Can't Find Credentials

**Location:** `C:\productivity\deeplensData\tenants/{tenant-name}/minio-credentials.txt`

```powershell
Get-Content "C:\productivity\deeplensData\tenants\your-tenant\minio-credentials.txt"
```

---

## Key Files

| File                          | Purpose                  |
| ----------------------------- | ------------------------ |
| `provision-tenant.ps1`        | Main provisioning script |
| `README-TENANT-MANAGEMENT.md` | Complete documentation   |
| `README-PODMAN-SETUP.md`      | Infrastructure setup     |
| `README-TENANT-BACKUP.md`     | Backup and recovery      |

---

## Need Help?

1. Check [README-TENANT-MANAGEMENT.md](README-TENANT-MANAGEMENT.md) for detailed docs
2. Review [README-PODMAN-SETUP.md](README-PODMAN-SETUP.md) for infrastructure
3. See complete examples in tenant management README
