# DeepLens Fresh Setup Guide - Podman Edition

**Last Updated:** December 19, 2025  
**Platform:** Windows with Podman  
**Time Required:** ~10-15 minutes

This guide provides the tested, working steps to start DeepLens infrastructure from scratch using Podman on Windows.

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ [Podman Desktop](https://podman.io/) installed and running
- ✅ [PowerShell 7+](https://github.com/PowerShell/PowerShell) 
- ✅ [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- ✅ [Python 3.11+](https://www.python.org/downloads/) (for AI services later)

---

## 🚀 Step-by-Step Setup

### Step 1: Start Podman Machine

```powershell
# Check Podman machine status
podman machine list

# If not running, start it
podman machine start podman-machine-default

# Verify connection
podman ps
```

**Expected Output:**
```
Machine "podman-machine-default" started successfully
```

---

### Step 2: Clean Up Any Existing Containers/Volumes

```powershell
# Navigate to project directory
cd C:\productivity\deeplens\infrastructure

# Remove all containers
podman ps -aq | ForEach-Object { podman rm -f $_ }

# Remove all volumes (for fresh start)
podman volume ls -q | ForEach-Object { podman volume rm -f $_ }

# Verify cleanup
podman ps -a
podman volume ls
```

**Expected Output:** No containers or volumes listed

---

### Step 3: Start Core Infrastructure Services

Start the essential services **manually** (podman-compose has issues on Windows):

#### 3.1 PostgreSQL

```powershell
podman run -d `
  --name deeplens-postgres `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=DeepLens123! `
  -e POSTGRES_DB=nextgen_identity `
  -p 5433:5432 `
  -v deeplens-postgres-data:/var/lib/postgresql/data `
  postgres:16-alpine
```

#### 3.2 Redis

```powershell
podman run -d `
  --name deeplens-redis `
  -p 6379:6379 `
  redis:7-alpine
```

#### 3.3 Qdrant (Vector Database)

```powershell
podman run -d `
  --name deeplens-qdrant `
  -p 6333:6333 `
  -p 6334:6334 `
  -v deeplens-qdrant-data:/qdrant/storage `
  qdrant/qdrant:v1.7.0
```

#### 3.4 MinIO (Object Storage)

```powershell
podman run -d `
  --name deeplens-minio `
  -p 9000:9000 `
  -p 9001:9001 `
  -e MINIO_ROOT_USER=admin `
  -e MINIO_ROOT_PASSWORD=DeepLens123! `
  -v deeplens-minio-data:/data `
  minio/minio:RELEASE.2023-10-16T04-13-43Z `
  server /data --console-address ":9001"
```

---

### Step 4: Verify Infrastructure is Running

```powershell
# Check all containers
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Expected Output:**
```
NAMES              STATUS        PORTS
deeplens-postgres  Up X seconds  0.0.0.0:5433->5432/tcp
deeplens-redis     Up X seconds  0.0.0.0:6379->6379/tcp
deeplens-qdrant    Up X seconds  0.0.0.0:6333-6334->6333-6334/tcp
deeplens-minio     Up X seconds  0.0.0.0:9000-9001->9000-9001/tcp
```

---

### Step 5: Start Identity API (Authentication Service)

```powershell
# Navigate to Identity API directory
cd C:\productivity\deeplens\src\NextGen.Identity.Api

# Start the service (runs migrations automatically)
dotnet run
```

**Expected Output:**
```
[INFO] Running database migrations...
✓ Executed migration: 001_InitialSchema.sql
[INFO] Database migrations completed successfully
[INFO] Admin tenant created: ...
[INFO] Admin user created: ...
[WRN] ⚠️  Default admin credentials created:
Email: admin@deeplens.local
Password: DeepLens@Admin123!
[INFO] Now listening on: http://localhost:5198
```

**Keep this terminal open** - the service will run in the foreground.

---

## ✅ Verification Checklist

After completing all steps, verify:

### Infrastructure Services

- [ ] PostgreSQL accessible on **localhost:5433**
  ```powershell
  podman exec deeplens-postgres pg_isready -U postgres
  ```

- [ ] Redis accessible on **localhost:6379**
  ```powershell
  podman exec deeplens-redis redis-cli ping
  ```

- [ ] Qdrant dashboard accessible: **http://localhost:6333/dashboard**

- [ ] MinIO console accessible: **http://localhost:9001**
  - Login: admin / DeepLens123!

### Application Services

- [ ] Identity API running on **http://localhost:5198**
  - Test: Open http://localhost:5198/.well-known/openid-configuration

---

## 🔑 Standard Credentials

All services use standardized credentials for development:

| Service    | Host/Port            | Username | Password       | Notes                    |
| ---------- | -------------------- | -------- | -------------- | ------------------------ |
| PostgreSQL | localhost:5433       | postgres | DeepLens123!   | Database: nextgen_identity |
| Redis      | localhost:6379       | -        | (no password)  |                          |
| Qdrant     | localhost:6333-6334  | -        | (no auth)      |                          |
| MinIO      | localhost:9000-9001  | admin    | DeepLens123!   | Console on :9001         |
| Identity   | localhost:5198       | -        | -              | OAuth/OIDC endpoints     |

**Admin User (Identity API):**
- Email: admin@deeplens.local
- Password: DeepLens@Admin123!

---

## 🛑 Stop All Services

To stop everything cleanly:

```powershell
# Stop .NET services (Ctrl+C in their terminals)

# Stop infrastructure containers
podman stop deeplens-postgres deeplens-redis deeplens-qdrant deeplens-minio

# Optional: Remove containers (keeps volumes/data)
podman rm deeplens-postgres deeplens-redis deeplens-qdrant deeplens-minio

# Optional: Remove volumes (deletes all data)
podman volume rm deeplens-postgres-data deeplens-redis-data deeplens-qdrant-data deeplens-minio-data
```

---

## 🐛 Troubleshooting

### Podman Machine Won't Start

```powershell
# Reset the machine
podman machine stop podman-machine-default
podman machine rm podman-machine-default
podman machine init
podman machine start
```

### Container Fails to Start - Port Already in Use

```powershell
# Find what's using the port (example: 5433)
netstat -ano | findstr :5433

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### PostgreSQL Authentication Failure

**Symptoms:** "password authentication failed for user postgres"

**Solution:** Volume has old data with different credentials
```powershell
# Remove container and volume
podman stop deeplens-postgres
podman rm deeplens-postgres
podman volume rm deeplens-postgres-data

# Start fresh (run Step 3.1 again)
```

### Identity API Can't Connect to Database

**Check connection string in appsettings:**
- Port should be **5433** (not 5432)
- Username should be **postgres**
- Password should be **DeepLens123!**
- Database should be **nextgen_identity**

```powershell
# Verify PostgreSQL is accessible
podman exec deeplens-postgres psql -U postgres -d nextgen_identity -c "SELECT 1;"
```

### Container Stuck in "Created" State

```powershell
# Check logs for errors
podman logs deeplens-<service-name>

# Common issue: Config file mount errors on Windows
# Solution: Use named volumes instead of bind mounts
```

---

## 📚 Next Steps

Once infrastructure is running:

1. **Test Authentication**
   - See [docs/OAUTH_TESTING_GUIDE.md](../docs/OAUTH_TESTING_GUIDE.md)

2. **Start Additional Services**
   - API Gateway
   - Search API
   - Admin API
   - WebUI (Next.js)

3. **Add Optional Infrastructure**
   - Kafka + Zookeeper (async processing)
   - Monitoring Stack (Grafana, Prometheus, Jaeger)
   - InfluxDB (time-series metrics)

4. **Configure Tenants**
   - See [README-TENANT-MANAGEMENT.md](README-TENANT-MANAGEMENT.md)

---

## 💡 Key Lessons Learned

Based on actual setup experience:

1. **Use Named Volumes:** Podman on Windows has issues with bind mounts. Always use named volumes like `deeplens-postgres-data:/var/lib/postgresql/data`

2. **Manual Container Start:** `podman-compose` has compatibility issues. Starting containers manually with `podman run` is more reliable.

3. **Port Consistency:** Always use port **5433** for PostgreSQL (host side) to avoid conflicts with Windows/local PostgreSQL installations.

4. **Credential Standardization:** Using **DeepLens123!** for all service passwords simplifies development setup.

5. **Volume Cleanup:** When changing credentials/config, always remove the volume to start with fresh data.

6. **Health Checks:** Wait a few seconds after starting containers before connecting services (use `Start-Sleep -Seconds 5`).

---

## 📝 Configuration Files Reference

| File                                    | Purpose                              |
| --------------------------------------- | ------------------------------------ |
| `infrastructure/.env.example`           | Default environment variables        |
| `docker-compose.infrastructure.yml`     | Full infrastructure definition       |
| `src/NextGen.Identity.Api/appsettings.json` | Identity API connection strings  |
| `CREDENTIALS.md`                        | All service credentials              |
| `PORTS.md`                              | Port mappings and conflicts          |

---

## 🔗 Related Documentation

- [Main README](../README.md) - Project overview
- [CREDENTIALS.md](../CREDENTIALS.md) - All service credentials
- [PORTS.md](../PORTS.md) - Port reference
- [OAUTH_TESTING_GUIDE.md](../docs/OAUTH_TESTING_GUIDE.md) - Authentication testing
- [Infrastructure README](README.md) - Detailed infrastructure guide

---

**Success Indicator:** When all four infrastructure containers are running and the Identity API starts successfully with "Now listening on: http://localhost:5198", your DeepLens environment is ready! 🎉
