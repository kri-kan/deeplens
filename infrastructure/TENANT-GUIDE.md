# DeepLens Tenant Management Guide

**Complete reference for multi-tenant architecture, provisioning, and maintenance.**

Last Updated: December 20, 2025

---

## 🏗️ Architecture Overview

DeepLens uses a "Shared Infrastructure, Isolated Data" approach. Core services (Postgres, Kafka, MinIO, Redis) are shared across applications (DeepLens, WhatsApp Processor), while tenant data is logically isolated.

### Data Separation Strategy

| Component      | Shared | Per-Tenant           | Purpose                             |
| -------------- | ------ | -------------------- | ----------------------------------- |
| **PostgreSQL** | ✅      | Database per tenant  | Shared Instance (DeepLens/WhatsApp) |
| **Kafka**      | ✅      | Topic per tenant     | Shared Message Backbone             |
| **Redis**      | ✅      | Key Prefix           | Shared Cache & Sessions             |
| **MinIO**      | ✅      | **Dedicated Bucket** | Shared Instance with IAM Search     |
| **Qdrant**     | ❌      | Dedicated Instance   | Vector Search Isolation             |
| **Backups**    | ❌      | Dedicated Container  | Automated Tenant Backups            |

### Storage Models

1. **BYOS (Bring Your Own Storage)** ⭐ *Enterprise*
   - Tenant provides their own cloud storage (Azure/AWS/GCS).
   - Custom credentials configured in Admin Portal.
   - DeepLens only provisions Database + Qdrant.

2. **DeepLens-Provisioned Storage** 🛡️ *Optimized*
   - Dedicated bucket created on the shared **Master MinIO** instance.
   - Unique Service Account (Access Key/Secret Key) scoped to that bucket only.
   - DeepLens provisions: Database + Qdrant + Bucket / IAM Security.

---

## 🚀 Provisioning Tenants

### Prerequisites

1. ✅ **Core infrastructure running** (PostgreSQL, Redis)
2. ✅ **`deeplens-network` created**
3. ✅ **Identity API running** at `http://localhost:5198`
4. ✅ **Core Qdrant instances stopped** (if overlapping with new tenant ports)

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

| Service      | Starting Port | Pattern               |
| ------------ | ------------- | --------------------- |
| Qdrant HTTP  | 6433          | 6433, 6435, 6437, ... |
| Qdrant gRPC  | 6434          | 6434, 6436, 6438, ... |
| Shared MinIO | 9000          | Fixed at 9000         |

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
