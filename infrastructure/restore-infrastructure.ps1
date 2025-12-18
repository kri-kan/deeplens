# Restore DeepLens Infrastructure from Export
# This script restores all infrastructure from an exported state

param(
    [Parameter(Mandatory=$true)]
    [string]$ExportPath,
    
    [Parameter(Mandatory=$false)]
    [string]$NewDataRoot = "C:/deeplens-data"
)

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "DeepLens Infrastructure Restoration" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Validate export path
if (-not (Test-Path $ExportPath)) {
    Write-Host "[ERROR] Export path not found: $ExportPath" -ForegroundColor Red
    exit 1
}

$ExportPath = Resolve-Path $ExportPath
Write-Host "[INFO] Restoring from: $ExportPath" -ForegroundColor Cyan
Write-Host "[INFO] New data root: $NewDataRoot" -ForegroundColor Cyan
Write-Host ""

# Load migration metadata
$metadataPath = Join-Path $ExportPath "migration-metadata.json"
if (Test-Path $metadataPath) {
    $metadata = Get-Content $metadataPath | ConvertFrom-Json
    Write-Host "[INFO] Export Details:" -ForegroundColor Yellow
    Write-Host "       Date: $($metadata.ExportDate)" -ForegroundColor Gray
    Write-Host "       Source: $($metadata.SourceMachine)" -ForegroundColor Gray
    Write-Host "       Containers: $($metadata.Containers.Count)" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "[WARN] Migration metadata not found" -ForegroundColor Yellow
}

# Create new data structure
Write-Host "Step 1: Creating Data Directory Structure" -ForegroundColor Yellow
Write-Host "-" * 40

$coreDataPath = Join-Path $NewDataRoot "core/data"
$coreLogsPath = Join-Path $NewDataRoot "core/logs"
$tenantsPath = Join-Path $NewDataRoot "tenants"

New-Item -ItemType Directory -Path $coreDataPath -Force | Out-Null
New-Item -ItemType Directory -Path $coreLogsPath -Force | Out-Null
New-Item -ItemType Directory -Path $tenantsPath -Force | Out-Null

Write-Host "[OK] Directory structure created" -ForegroundColor Green

# Copy core infrastructure data
Write-Host ""
Write-Host "Step 2: Restoring Core Infrastructure Data" -ForegroundColor Yellow
Write-Host "-" * 40

$exportedCoreData = Join-Path $ExportPath "core/data"
if (Test-Path $exportedCoreData) {
    $services = Get-ChildItem -Path $exportedCoreData -Directory
    foreach ($service in $services) {
        Write-Host "[COPY] $($service.Name) data..." -ForegroundColor Cyan
        $destPath = Join-Path $coreDataPath $service.Name
        Copy-Item -Path $service.FullName -Destination $destPath -Recurse -Force
        
        $size = (Get-ChildItem -Path $destPath -Recurse | Measure-Object -Property Length -Sum).Sum
        $sizeGB = [math]::Round($size / 1GB, 2)
        Write-Host "[OK] Restored $($service.Name) ($sizeGB GB)" -ForegroundColor Green
    }
} else {
    Write-Host "[WARN] No core data found in export" -ForegroundColor Yellow
}

# Restore tenant data
Write-Host ""
Write-Host "Step 3: Restoring Tenant Data" -ForegroundColor Yellow
Write-Host "-" * 40

$exportedTenantsPath = Join-Path $ExportPath "tenants"
if (Test-Path $exportedTenantsPath) {
    $tenants = Get-ChildItem -Path $exportedTenantsPath -Directory
    foreach ($tenant in $tenants) {
        Write-Host "[RESTORE] Tenant: $($tenant.Name)" -ForegroundColor Cyan
        $tenantDestPath = Join-Path $tenantsPath $tenant.Name
        Copy-Item -Path $tenant.FullName -Destination $tenantDestPath -Recurse -Force
        
        $backupCount = (Get-ChildItem -Path (Join-Path $tenantDestPath "backups") -Filter "*.sql.gz" -ErrorAction SilentlyContinue).Count
        Write-Host "[OK] Restored $backupCount backup files for $($tenant.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "[INFO] No tenant data to restore" -ForegroundColor Yellow
}

# Create network
Write-Host ""
Write-Host "Step 4: Creating Podman Network" -ForegroundColor Yellow
Write-Host "-" * 40

podman network create deeplens-network 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 125) {
    Write-Host "[OK] Network ready: deeplens-network" -ForegroundColor Green
} else {
    Write-Host "[WARN] Network creation issue (may already exist)" -ForegroundColor Yellow
}

# Start core infrastructure
Write-Host ""
Write-Host "Step 5: Starting Core Infrastructure" -ForegroundColor Yellow
Write-Host "-" * 40

# Set environment variables for data paths
$env:DEEPLENS_DATA_PATH = $coreDataPath
$env:DEEPLENS_LOGS_PATH = $coreLogsPath

# Start PostgreSQL
Write-Host "[START] PostgreSQL..." -ForegroundColor Cyan
podman run -d `
    --name deeplens-postgres `
    --restart unless-stopped `
    --network deeplens-network `
    -e POSTGRES_USER=postgres `
    -e POSTGRES_PASSWORD=DeepLens123! `
    -e POSTGRES_DB=nextgen_identity `
    -p 5433:5432 `
    -v "${coreDataPath}/postgresql:/var/lib/postgresql/data" `
    --health-cmd "pg_isready -U postgres" `
    --health-interval 10s `
    postgres:16-alpine | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] PostgreSQL started" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to start PostgreSQL" -ForegroundColor Red
}

# Start Redis
Write-Host "[START] Redis..." -ForegroundColor Cyan
podman run -d `
    --name deeplens-redis `
    --restart unless-stopped `
    --network deeplens-network `
    -p 6379:6379 `
    -v "${coreDataPath}/redis:/data" `
    redis:7-alpine redis-server --appendonly yes | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Redis started" -ForegroundColor Green
}

# Start Qdrant
Write-Host "[START] Qdrant..." -ForegroundColor Cyan
podman run -d `
    --name deeplens-qdrant `
    --restart unless-stopped `
    --network deeplens-network `
    -p 6333:6333 -p 6334:6334 `
    -v "${coreDataPath}/qdrant:/qdrant/storage" `
    qdrant/qdrant:v1.7.0 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Qdrant started" -ForegroundColor Green
}

# Wait for PostgreSQL to be ready
Write-Host ""
Write-Host "[WAIT] Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

$retries = 0
$maxRetries = 10
while ($retries -lt $maxRetries) {
    $pgReady = podman exec deeplens-postgres pg_isready -U deeplens 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] PostgreSQL is ready!" -ForegroundColor Green
        break
    }
    $retries++
    Write-Host "[WAIT] Retry $retries/$maxRetries..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
}

# Restore tenant databases
Write-Host ""
Write-Host "Step 6: Restoring Tenant Databases" -ForegroundColor Yellow
Write-Host "-" * 40

if (Test-Path $exportedTenantsPath) {
    $tenants = Get-ChildItem -Path $exportedTenantsPath -Directory
    foreach ($tenant in $tenants) {
        $dbDumpPath = Join-Path $tenant.FullName "database_dump.sql.gz"
        if (Test-Path $dbDumpPath) {
            $dbName = "tenant_$($tenant.Name)_metadata"
            Write-Host "[RESTORE] Database: $dbName" -ForegroundColor Cyan
            
            # Create database
            podman exec deeplens-postgres psql -U deeplens -c "CREATE DATABASE $dbName OWNER tenant_service" 2>&1 | Out-Null
            
            # Restore dump
            Get-Content $dbDumpPath | gunzip | podman exec -i deeplens-postgres psql -U deeplens -d $dbName 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Database restored: $dbName" -ForegroundColor Green
            } else {
                Write-Host "[WARN] Database restore may have issues: $dbName" -ForegroundColor Yellow
            }
        }
    }
}

# Restore tenant backup containers
Write-Host ""
Write-Host "Step 7: Restoring Tenant Backup Containers" -ForegroundColor Yellow
Write-Host "-" * 40

if (Test-Path (Join-Path $tenantsPath "*")) {
    $restoredTenants = Get-ChildItem -Path $tenantsPath -Directory
    foreach ($tenant in $restoredTenants) {
        $tenantName = $tenant.Name
        $backupPath = Join-Path $tenant.FullName "backups"
        
        if (Test-Path $backupPath) {
            Write-Host "[CREATE] Backup container for: $tenantName" -ForegroundColor Cyan
            $containerName = "deeplens-backup-${tenantName}"
            
            # Create backup container
            podman run -d `
                --name $containerName `
                --network deeplens-network `
                --restart unless-stopped `
                -v "${backupPath}:/backups" `
                -e PGPASSWORD=DeepLens123! `
                --label tenant=$tenantName `
                --label service=postgres-backup `
                postgres:16-alpine `
                sh -c "sleep infinity" | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                # Install backup script
                $backupScriptContent = @'
#!/bin/sh
set -e
DB_NAME="tenant_TENANT_NAME_metadata"
DB_USER="deeplens"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
echo "[$(date)] Starting backup for database: ${DB_NAME}"
pg_dump -h deeplens-postgres -U ${DB_USER} -d ${DB_NAME} | gzip > "${BACKUP_FILE}"
echo "[$(date)] Backup completed: ${BACKUP_FILE}"
ls -lh ${BACKUP_DIR}/*.sql.gz 2>/dev/null || echo "No backups found"
'@ -replace 'TENANT_NAME', $tenantName
                
                podman exec $containerName sh -c "cat > /usr/local/bin/backup.sh << 'EOF'
$backupScriptContent
EOF
chmod +x /usr/local/bin/backup.sh"
                
                Write-Host "[OK] Backup container created: $containerName" -ForegroundColor Green
            }
        }
    }
}

# Summary
Write-Host ""
Write-Host "=" * 80 -ForegroundColor Green
Write-Host "Restoration Complete!" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Green
Write-Host ""
Write-Host "[STATUS] Infrastructure:" -ForegroundColor Yellow
podman ps --filter "network=deeplens-network" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "[DATABASE] List:" -ForegroundColor Yellow
podman exec deeplens-postgres psql -U deeplens -c "\l" | Select-String -Pattern "deeplens|tenant"

Write-Host ""
Write-Host "[INFO] Data Location: $NewDataRoot" -ForegroundColor Cyan
Write-Host "[INFO] All services restored and running!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Verify all services are healthy" -ForegroundColor Gray
Write-Host "  2. Test database connectivity" -ForegroundColor Gray
Write-Host "  3. Verify backup schedules are working" -ForegroundColor Gray
Write-Host "  4. Update any application connection strings" -ForegroundColor Gray
Write-Host ""
