# DeepLens Tenant Management Guide

**Complete reference for multi-tenant architecture, provisioning, and maintenance.**

Last Updated: December 20, 2025

---

## 🏗️ Architecture Overview

DeepLens uses a "Shared Infrastructure, Isolated Data" approach. While core services like PostgreSQL and Redis are shared, each tenant gets isolated storage and vector database resources.

### Data Separation Strategy

| Component      | Shared | Per-Tenant          | Purpose                      |
| -------------- | ------ | ------------------- | ---------------------------- |
| **PostgreSQL** | ✅      | Database per tenant | Metadata, users, collections |
| **Redis**      | ✅      | ❌                   | Shared cache & sessions      |
| **Qdrant**     | ❌      | Dedicated Instance  | Vector search isolation      |
| **MinIO**      | ❌      | Dedicated Instance  | Object storage isolation     |
| **Backups**    | ❌      | Dedicated Container | Automated tenant backups     |

### Storage Models

1. **BYOS (Bring Your Own Storage)** ⭐ *Enterprise*
   - Tenant provides their own cloud storage (Azure/AWS/GCS).
   - Custom credentials configured in Admin Portal.
   - DeepLens only provisions Database + Qdrant.

2. **DeepLens-Provisioned Storage** 🔒 *Isolated*
   - Dedicated MinIO container per tenant.
   - Automated setup with unique ports and credentials.
   - DeepLens provisions: Database + Qdrant + MinIO.

---

## 🚀 Provisioning Tenants

### Prerequisites

1. ✅ **Core infrastructure running** (PostgreSQL, Redis)
2. ✅ **`deeplens-network` created**
3. ✅ **Identity API running** at `http://localhost:5198`
4. ✅ **Core Qdrant/MinIO stopped** (to avoid port conflicts)

### Provisioning Commands

```powershell
cd C:\productivity\deeplens\infrastructure

# 1. Interactive Mode (Recommended)
.\provision-tenant.ps1 -TenantName "acme"

# 2. BYOS Mode
.\provision-tenant.ps1 -TenantName "enterprise" -StorageType "BYOS"

# 3. DeepLens Storage Mode
.\provision-tenant.ps1 -TenantName "startup" -StorageType "DeepLens"

# 4. Remove a Tenant
.\provision-tenant.ps1 -TenantName "old-tenant" -Remove
```

### Port Assignments (Auto-managed)

Ports are automatically assigned to avoid conflicts:

| Service       | Starting Port | Pattern               |
| ------------- | ------------- | --------------------- |
| Qdrant HTTP   | 6333          | 6333, 6335, 6337, ... |
| Qdrant gRPC   | 6334          | 6334, 6336, 6338, ... |
| MinIO API     | 9000          | 9000, 9002, 9004, ... |
| MinIO Console | 9001          | 9001, 9003, 9005, ... |

---

## 💾 Backup & Disaster Recovery

Each tenant has a dedicated backup container that handles daily backups at 2 AM.

### Manual Backup

```powershell
# PostgreSQL Backup
podman exec deeplens-postgres pg_dump -U postgres -d tenant_acme_metadata -F c -f /tmp/acme.dump
podman cp deeplens-postgres:/tmp/acme.dump ./acme.dump

# Qdrant Snapshot
Invoke-RestMethod -Uri "http://localhost:6333/snapshots" -Method Post
```

### Restore Procedure

```powershell
# Restore PostgreSQL
podman exec -i deeplens-postgres pg_restore -U postgres -d tenant_acme_metadata -c ./acme.dump

# Restore Qdrant
Invoke-RestMethod -Uri "http://localhost:6333/snapshots/recover" -Method Put `
  -ContentType "application/json" -Body '{"location": "/qdrant/snapshots/restore.snapshot"}'
```

---

## 🔍 Verification & Maintenance

### Verify Tenant Health

```powershell
# Check containers
podman ps --filter "label=tenant=acme"

# List databases
podman exec deeplens-postgres psql -U postgres -c "\l"

# Check credentials
# Location: C:\productivity\deeplensData\tenants\{tenant}\admin-credentials.txt
```

### Common Issues

- **Port Conflict:** Ensure core Qdrant/MinIO are stopped or use specific ports.
- **Identity API:** Ensure API is running and accessible at `http://localhost:5198`.
- **Network:** Ensure `deeplens-network` exists.

---

## 📚 Related Files

- `provision-tenant.ps1`: Core provisioning script.
- `init-scripts/02-tenant-provisioning.sql`: SQL logic for tenant DBs.
- `powershell/DeepLensTenantManager.psm1`: Tenant management module.
