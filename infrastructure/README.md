# DeepLens Infrastructure Setup

**Complete guide for setting up DeepLens with Podman on Windows**

Last Updated: December 20, 2025

---

## 📋 Table of Contents

- [Quick Start](#-quick-start-15-minutes)
- [Prerequisites](#-prerequisites)
- [Core Infrastructure](#-core-infrastructure-setup)
- [Identity API](#-identity-api-setup)
- [Tenant Provisioning](#-tenant-provisioning)
- [Troubleshooting](#-troubleshooting)
- [Advanced Topics](#-advanced-topics)

---

## 🚀 Quick Start (15 Minutes)

### 1. Install Prerequisites

1. **[Podman Desktop](https://podman.io/)** - Container runtime
2. **[PowerShell 7+](https://github.com/PowerShell/PowerShell)** - Shell
3. **[.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)** - For Identity API

```powershell
# Configure PowerShell (one-time)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Start Infrastructure
Automation handles the setup of Shared Services (PostgreSQL, Kafka, MinIO, Redis) and internal networks.

```powershell
cd C:\productivity\deeplens\infrastructure
./setup-infrastructure.ps1 -Start
```

### 3. Start Identity API & Bootstrap
The Identity API handles database migrations on startup.

```powershell
cd C:\productivity\deeplens\src\NextGen.Identity.Api
$env:ASPNETCORE_ENVIRONMENT='Development'
dotnet run --urls=http://localhost:5198
```

### 4. Verify & Checkpoint
Run the automated identity checkpoint to verify Platform and Tenant admin access.

```powershell
cd C:\productivity\deeplens\infrastructure
Import-Module ./DeepLensInfrastructure.psm1
Invoke-IdentityCheckpoint
```

**Done!** You now have:
- ✅ Automated platform bootstrapping (Admin user/tenant)
- ✅ Verified Identity API with correct role claims
- ✅ Multi-tenant resource readiness

---

## 📋 Prerequisites

### Required Software

| Software       | Version | Purpose           |
| -------------- | ------- | ----------------- |
| Podman Desktop | Latest  | Container runtime |
| PowerShell     | 7+      | Scripting         |
| .NET SDK       | 9.0     | Identity API      |

### System Requirements

**Minimum (Development):**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 50 GB free

**Recommended (Multi-Tenant):**
- CPU: 8 cores
- RAM: 16 GB
- Disk: 100 GB SSD

### PowerShell Configuration

```powershell
# Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Verify
Get-ExecutionPolicy -List
```

---

## 🏗️ Core Infrastructure Setup

### Architecture

┌─────────────────────────────────────────────────────────┐
│              Shared Infrastructure                      │
│ (Supports DeepLens, WhatsApp Processor, etc.)           │
├─────────────────────────────────────────────────────────┤
│ PostgreSQL (5433) - Shared Relational DB                 │
│ Kafka (9092)      - Shared Message Backbone              │
│ MinIO (9000/9001) - Shared Object Storage                │
│ Redis (6379)      - Shared Cache                         │
│ deeplens-network  - Shared Container Network             │
├─────────────────────────────────────────────────────────┤
│              Observability Stack                        │
├─────────────────────────────────────────────────────────┤
│ Jaeger (16686)    - Distributed Tracing                  │
│ Grafana (3000)    - Monitoring Dashboards                │
│ Prometheus (9090) - Metrics Database                     │
│ Loki (3100)       - Log Aggregation                      │
└─────────────────────────────────────────────────────────┘
         │
         ├── DeepLens Tenants
         │   ├── Qdrant (6333/6334) - Vector Database
         │   └── Backup Container
         │
         └── Other Applications
             └── WhatsApp Processor Containers...
```

### Network Setup

```powershell
# Create network (required for tenant isolation)
podman network create deeplens-network

# Verify
podman network ls
```

### PostgreSQL Setup

```powershell
podman run -d `
  --name deeplens-postgres `
  --network deeplens-network `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=DeepLens123! `
  -e POSTGRES_DB=nextgen_identity `
  -p 5433:5432 `
  -v deeplens-postgres-data:/var/lib/postgresql/data `
  postgres:16-alpine

# Test connection
podman exec deeplens-postgres pg_isready -U postgres
```

### Redis Setup

```powershell
podman run -d `
  --name deeplens-redis `
  --network deeplens-network `
  -p 6379:6379 `
  redis:7-alpine

# Test connection
podman exec deeplens-redis redis-cli ping
```

### Verify Infrastructure

```powershell
# Check all containers
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Expected output:
# NAMES              STATUS        PORTS
# deeplens-postgres  Up X seconds  0.0.0.0:5433->5432/tcp
# deeplens-redis     Up X seconds  0.0.0.0:6379->6379/tcp
```

---

## 🔐 Identity API Setup

### Start the API

```powershell
cd C:\productivity\deeplens\src\NextGen.Identity.Api

# Set environment (REQUIRED!)
$env:ASPNETCORE_ENVIRONMENT='Development'

# Start API
dotnet run --urls=http://localhost:5198
```

### Verify API is Running

```powershell
# Test OpenID configuration
Invoke-RestMethod http://localhost:5198/.well-known/openid-configuration

# Should return JSON with endpoints
```

### Default Admin Credentials

- **Email:** `admin@deeplens.local`
- **Password:** `DeepLens@Admin123!`
- ⚠️ **Change after first login!**

---

## 🏢 Tenant Provisioning

### Provision a Tenant

```powershell
cd C:\productivity\deeplens\infrastructure

# Interactive (prompts for storage type)
.\provision-tenant.ps1 -TenantName "your-tenant"

# With DeepLens-managed storage
.\provision-tenant.ps1 -TenantName "your-tenant" -StorageType "DeepLens"

# With BYOS (Bring Your Own Storage)
.\provision-tenant.ps1 -TenantName "your-tenant" -StorageType "BYOS"
```

### What Gets Created

**For Every Tenant:**
- ✅ Database: `tenant_{name}_metadata`
- ✅ Qdrant: Dedicated vector database (auto-assigned ports)
- ✅ Backup: Automated daily backups
- ✅ Admin User: `admin@{name}.local`

**For DeepLens Storage:**
- ✅ MinIO: Dedicated object storage (auto-assigned ports)
- ✅ Credentials: Saved to tenant directory

### Storage Options

| Option       | What's Provisioned        | Use Case                      |
| ------------ | ------------------------- | ----------------------------- |
| **BYOS**     | Database + Qdrant         | Enterprise with Azure/AWS/GCS |
| **DeepLens** | Database + Qdrant + MinIO | Development, testing          |
| **None**     | Database + Qdrant         | Configure storage later       |

### Verify Tenant

```powershell
# Check tenant containers
podman ps --filter "label=tenant=your-tenant"

# Check database
podman exec deeplens-postgres psql -U postgres -c "\l" | Select-String "tenant_"

# View credentials
Get-Content "C:\productivity\deeplensData\tenants\your-tenant\admin-credentials.txt"
```

### Remove a Tenant

```powershell
.\provision-tenant.ps1 -TenantName "old-tenant" -Remove
```

---

## 🐛 Troubleshooting

### "dotnet: command not found"

```powershell
# Use full path
& "C:\Program Files\dotnet\dotnet.exe" run --urls=http://localhost:5198

# Or add to PATH
$env:Path += ";C:\Program Files\dotnet"
```

### "Scripts are disabled on this system"

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Production signing credential not configured"

```powershell
# Ensure environment variable is set
$env:ASPNETCORE_ENVIRONMENT='Development'
```

### Containers fail to start

```powershell
# Check if network exists
podman network ls | Select-String "deeplens-network"

# Create if missing
podman network create deeplens-network
```

### Port already in use

```powershell
# Find what's using the port
netstat -ano | findstr :5433

# Kill the process
taskkill /PID <PID> /F
```

### Tenant containers in "Created" state

```powershell
# Check for port conflicts
podman ps -a | Select-String "demo"

# Stop core infrastructure if using multi-tenant
podman stop deeplens-qdrant deeplens-minio

# Start tenant containers
podman start deeplens-qdrant-demo deeplens-minio-demo
```

### View Container Logs

```powershell
# Identity API logs (if running in background)
podman logs deeplens-identity-api

# Tenant Qdrant logs
podman logs deeplens-qdrant-demo

# Tenant MinIO logs
podman logs deeplens-minio-demo

# PostgreSQL logs
podman logs deeplens-postgres
```

---

## 🔧 Advanced Topics

### Stop All Services

```powershell
# Stop Identity API (Ctrl+C in its terminal)

# Stop all containers
podman stop $(podman ps -aq)

# Or stop specific services
podman stop deeplens-postgres deeplens-redis
```

### Backup Database

```powershell
# Backup all databases
podman exec deeplens-postgres pg_dumpall -U postgres > deeplens-backup.sql

# Backup specific tenant database
podman exec deeplens-postgres pg_dump -U postgres tenant_demo_metadata > demo-backup.sql
```

### Restore Database

```powershell
# Restore all databases
Get-Content deeplens-backup.sql | podman exec -i deeplens-postgres psql -U postgres

# Restore specific database
Get-Content demo-backup.sql | podman exec -i deeplens-postgres psql -U postgres -d tenant_demo_metadata
```

### Clean Up Everything

```powershell
# Stop and remove all containers
podman stop $(podman ps -aq)
podman rm $(podman ps -aq)

# Remove all volumes (⚠️ DELETES ALL DATA)
podman volume rm $(podman volume ls -q)

# Remove network
podman network rm deeplens-network
```

### Check Resource Usage

```powershell
# Container stats
podman stats

# Disk usage
podman system df

# Volume usage
podman volume ls
```

### Migration & Portable Storage

**Core Databases (Named Volumes):**
On Windows, core databases use named volumes. To migrate:
```powershell
# Export
podman volume export deeplens-postgres-data > postgres.tar
# Import on new machine
Get-Content postgres.tar | podman volume import deeplens-postgres-data
```

**Tenant Data (Bind Mounts):**
Tenant data is in `C:\productivity\deeplensData\tenants`. Simply copy the directory to migrate.

### Service Endpoints

| Service         | Port  | URL                             | Credentials             |
| --------------- | ----- | ------------------------------- | ----------------------- |
| PostgreSQL      | 5433  | -                               | postgres / DeepLens123! |
| Redis           | 6379  | -                               | (no password)           |
| Identity API    | 5198  | http://localhost:5198           | -                       |
| Qdrant (tenant) | 6333  | http://localhost:6333/dashboard | -                       |
| MinIO (tenant)  | 9001  | http://localhost:9001           | See credentials file    |
| Jaeger          | 16686 | http://localhost:16686          | -                       |
| Grafana         | 3000  | http://localhost:3000           | admin / DeepLens123!    |
| Prometheus      | 9090  | http://localhost:9090           | -                       |

---

## 📚 Additional Documentation

For more detailed information, see:

- **[TENANT-GUIDE.md](TENANT-GUIDE.md)** - Architecture & provisioning
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Solutions for common issues

---

## 💡 Tips

1. **Keep terminals organized:**
   - Terminal 1: Identity API (must stay running)
   - Terminal 2: Provisioning and management

2. **Check status regularly:**
   ```powershell
   podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
   ```

3. **Monitor logs:**
   ```powershell
   podman logs -f <container-name>
   ```

4. **Use labels for filtering:**
   ```powershell
   podman ps --filter "label=tenant=demo"
   ```

---

**Setup Time:** ~15 minutes  
**Difficulty:** Beginner-friendly  
**Platform:** Windows with Podman
