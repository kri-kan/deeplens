# DeepLens Development Environment - Issues & Solutions

## Summary of Issues Encountered

### 1. **Missing `tenant_id` Claim in JWT Tokens**
**Problem:** The Identity API was not including the `tenant_id` claim in access tokens for tenant users.

**Impact:** 
- Ingestion controller fell back to hardcoded test ID `2abbd721-873e-4bf0-9cb2-c93c6894c584`
- Data was uploaded to the wrong bucket/database
- Frontend couldn't find the data

**Solution:** 
- Patched `TenantMetadataService.cs` to map the dynamically generated tenant ID to the test bucket
- Patched `StorageService.cs` to handle the same mapping
- **Long-term fix needed:** Update Identity API to include `tenant_id` in token claims

### 2. **Missing Feature Extraction Service**
**Problem:** The Python-based Feature Extraction Service (port 8001) was not running.

**Impact:**
- Worker Service hung waiting for HTTP requests to port 8001
- Images and videos remained at `status=0` (unprocessed)
- No thumbnails or embeddings were generated

**Solution:**
- Built Docker image: `podman build -t deeplens-feature-extraction -f src/DeepLens.FeatureExtractionService/Dockerfile src/DeepLens.FeatureExtractionService`
- Started container: `podman run -d -p 8001:8001 --name deeplens-feature-extraction deeplens-feature-extraction`

### 3. **Video Thumbnail Path Bug**
**Problem:** `VideoProcessingWorker` was incorrectly generating thumbnail paths.

**Details:**
- The `FilePath` from Kafka events included bucket prefix: `tenant-xxx/raw/...`
- Worker did `.Replace("raw/", "thumbnails/")` without stripping bucket prefix
- Result: `tenant-xxx/thumbnails/...` was passed to `UploadThumbnailAsync`
- MinIO tried to upload to bucket `tenant-xxx` with object path `tenant-xxx/thumbnails/...` (double prefix)

**Solution:**
- Modified `VideoProcessingWorker.cs` to strip bucket prefix before path manipulation
- Modified `StorageService.GetFileAsync` to handle paths with or without bucket prefix

### 4. **Database Schema Initialization**
**Problem:** The `tenant_metadata_template` database and `settings` column were missing.

**Impact:**
- Tenant provisioning failed
- Metadata queries failed

**Solution:**
- Manually executed `infrastructure/init-scripts/postgres/03-tenant-metadata-template.sql`
- Added `settings` column to `tenants` table
- **Long-term fix needed:** Automate schema initialization in setup scripts

### 5. **MinIO Bucket Naming Mismatch**
**Problem:** Ingestion used lowercase bucket names, but database had mixed case.

**Solution:**
- Updated `provision-tenant.ps1` to ensure lowercase bucket names
- Updated database `minio_bucket_name` to match actual bucket

### 6. **Data Directory Structure**
**Problem:** Local bind mounts instead of Podman volumes for MinIO, Qdrant, Redis.

**Impact:**
- Harder to clean up and reset
- Performance implications
- Not portable across machines

**Solution:**
- Created setup scripts that use proper Podman volumes
- PostgreSQL uses named volume: `deeplens-postgres-data`
- Other services use bind mounts to `./data/*` for easier debugging

## Automation Scripts Created

### 1. **`infrastructure/setup-deeplens-dev.ps1`**
Complete infrastructure setup:
- Starts all containers (PostgreSQL, Kafka, MinIO, Qdrant, Redis, Feature Extraction)
- Creates necessary volumes and directories
- Initializes databases
- Supports `-Clean` flag to start fresh

### 2. **`infrastructure/start-dotnet-services.ps1`**
Starts all .NET services:
- Identity API (port 5198)
- Search API (port 5000)
- Worker Service

### 3. **`infrastructure/validate-environment.ps1`**
Health check script:
- Verifies all containers are running
- Checks service endpoints are accessible
- Validates database connectivity
- Returns exit code 0 if healthy, 1 if issues found

### 4. **`setup-complete.ps1`** (Master Script)
End-to-end setup:
1. Infrastructure setup
2. Start .NET services
3. Initialize platform admin
4. Provision Vayyari tenant
5. Seed test data
6. Validate environment

## Usage

### Fresh Setup
```powershell
# Complete setup from scratch
.\setup-complete.ps1 -Clean

# Or step by step:
.\infrastructure\setup-deeplens-dev.ps1 -Clean
.\infrastructure\start-dotnet-services.ps1
.\infrastructure\init-platform-admin.ps1
.\infrastructure\provision-tenant.ps1 -TenantName "Vayyari"
.\seed_data.ps1
.\infrastructure\validate-environment.ps1
```

### Quick Reset
```powershell
# Reset and re-seed data
.\infrastructure\setup-deeplens-dev.ps1 -Clean
.\infrastructure\start-dotnet-services.ps1
.\setup-complete.ps1
```

### Health Check
```powershell
.\infrastructure\validate-environment.ps1
```

## Credentials (Standardized)

| Service                | Username             | Password             |
| ---------------------- | -------------------- | -------------------- |
| Platform Admin         | admin@deeplens.local | DeepLensAdmin123!    |
| Tenant Admin (Vayyari) | admin@Vayyari.local  | DeepLens@Vayyari123! |
| PostgreSQL             | postgres             | DeepLens123!         |
| MinIO                  | deeplens             | DeepLens123!         |

## Service Ports

| Service            | Port | URL                           |
| ------------------ | ---- | ----------------------------- |
| Identity API       | 5198 | http://localhost:5198         |
| Search API         | 5000 | http://localhost:5000         |
| Swagger UI         | 5000 | http://localhost:5000/swagger |
| PostgreSQL         | 5433 | localhost:5433                |
| MinIO API          | 9000 | http://localhost:9000         |
| MinIO Console      | 9001 | http://localhost:9001         |
| Kafka              | 9092 | localhost:9092                |
| Zookeeper          | 2181 | localhost:2181                |
| Qdrant             | 6333 | http://localhost:6333         |
| Redis              | 6379 | localhost:6379                |
| Feature Extraction | 8001 | http://localhost:8001         |

## Remaining Technical Debt

### High Priority
1. **Fix Identity API token claims** - Include `tenant_id` in JWT tokens for tenant users
2. **Automate database migrations** - Use EF Core migrations instead of manual SQL scripts
3. **Remove hardcoded GUIDs** - Replace hardcoded tenant IDs with dynamic configuration

### Medium Priority
4. **Improve error handling** - Better error messages and logging in Worker Service
5. **Add retry logic** - Kafka consumers should retry failed messages
6. **Health check endpoints** - Add `/health` endpoints to all .NET services

### Low Priority
7. **Use Podman Compose** - Migrate from manual `podman run` to `podman-compose`
8. **Centralized configuration** - Use environment variables or config files instead of hardcoded values
9. **Logging aggregation** - Centralize logs from all services

## Jenkins/CI Integration

The `setup-complete.ps1` script is designed to be CI-friendly:

```groovy
// Jenkinsfile example
pipeline {
    agent any
    stages {
        stage('Setup Environment') {
            steps {
                pwsh './setup-complete.ps1 -Clean'
            }
        }
        stage('Run Tests') {
            steps {
                pwsh './run-tests.ps1'
            }
        }
        stage('Validate') {
            steps {
                pwsh './infrastructure/validate-environment.ps1'
            }
        }
    }
    post {
        always {
            // Cleanup
            pwsh 'podman rm -f $(podman ps -aq)'
        }
    }
}
```

## Troubleshooting

### Issue: Services won't start
```powershell
# Check if ports are already in use
netstat -ano | findstr ":5000"
netstat -ano | findstr ":5198"

# Kill processes using those ports
Stop-Process -Id <PID> -Force
```

### Issue: Containers won't start
```powershell
# Check container logs
podman logs deeplens-postgres
podman logs deeplens-kafka

# Restart specific container
podman restart deeplens-postgres
```

### Issue: Data not appearing
```powershell
# Check database
podman exec deeplens-postgres psql -U postgres -d tenant_vayyari_metadata -c "SELECT COUNT(*) FROM media;"

# Check MinIO bucket
podman exec deeplens-minio ls /data/tenant-2abbd721-873e-4bf0-9cb2-c93c6894c584/
```

### Issue: Worker not processing
```powershell
# Check if Feature Extraction Service is running
curl http://localhost:8001/health

# Check Worker logs
Get-Process -Name dotnet | Where-Object { $_.StartTime -gt (Get-Date).AddMinutes(-5) }
```
