# Test script for Vayyari tenant setup with Podman
# This validates PostgreSQL backup provisioning and tenant database creation

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "DeepLens Vayyari Tenant Setup - Dry Run" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# 1. Verify core infrastructure
Write-Host "Step 1: Verifying Core Infrastructure" -ForegroundColor Yellow
Write-Host "-" * 40
$containers = podman ps --filter "network=deeplens-network" --format "{{.Names}}"
if ($containers -contains "deeplens-postgres") {
    Write-Host "[OK] PostgreSQL: Running" -ForegroundColor Green
} else {
    Write-Host "[ERROR] PostgreSQL: Not Running" -ForegroundColor Red
    exit 1
}

if ($containers -contains "deeplens-redis") {
    Write-Host "[OK] Redis: Running" -ForegroundColor Green
} else {
    Write-Host "[WARN] Redis: Not Running (optional)" -ForegroundColor Yellow
}

if ($containers -contains "deeplens-qdrant") {
    Write-Host "[OK] Qdrant: Running" -ForegroundColor Green
} else {
    Write-Host "[WARN] Qdrant: Not Running (optional)" -ForegroundColor Yellow
}

# 2. Create Vayyari tenant database
Write-Host ""
Write-Host "Step 2: Creating Vayyari Tenant Database" -ForegroundColor Yellow
Write-Host "-" * 40

# Check if tenant database already exists
$existingDB = podman exec deeplens-postgres psql -U deeplens -tAc "SELECT 1 FROM pg_database WHERE datname='tenant_vayyari_metadata'"

if ($existingDB -eq "1") {
    Write-Host "[WARN] Tenant database already exists: tenant_vayyari_metadata" -ForegroundColor Yellow
    Write-Host "       Skipping database creation" -ForegroundColor Gray
} else {
    Write-Host "[INFO] Creating tenant database from template..." -ForegroundColor Cyan
    $createDB = podman exec deeplens-postgres psql -U deeplens -d deeplens_platform -c "CREATE DATABASE tenant_vayyari_metadata WITH TEMPLATE tenant_metadata_template OWNER tenant_service"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Tenant database created: tenant_vayyari_metadata" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to create tenant database" -ForegroundColor Red
        Write-Host $createDB
        exit 1
    }
}

# Verify database was created
$databases = podman exec deeplens-postgres psql -U deeplens -c "\l" | Select-String "tenant_vayyari_metadata"
if ($databases) {
    Write-Host "[OK] Verified: tenant_vayyari_metadata exists" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Database verification failed" -ForegroundColor Red
    exit 1
}

# 3. Test PostgreSQL Backup Provisioning (NFS simulation with local path)
Write-Host ""
Write-Host "Step 3: PostgreSQL Backup Provisioning Test" -ForegroundColor Yellow
Write-Host "-" * 40

$tenantName = "vayyari"
$backupContainerName = "deeplens-backup-${tenantName}"
$backupVolumeName = "tenant_${tenantName}_pgbackup"
$backupPath = "C:/productivity/deeplendData/tenants/vayyari/backups"

# Create backup directory
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
Write-Host "[CREATE] Backup directory: $backupPath" -ForegroundColor Cyan

# Check if backup container already exists
$existingContainer = podman ps -a --filter "name=^${backupContainerName}$" --format "{{.Names}}"
if ($existingContainer) {
    Write-Host "[WARN] Backup container already exists: $backupContainerName" -ForegroundColor Yellow
    Write-Host "       Removing existing container..." -ForegroundColor Gray
    podman stop $backupContainerName 2>&1 | Out-Null
    podman rm $backupContainerName 2>&1 | Out-Null
}

# Create backup script
$backupScript = @'
#!/bin/sh
set -e

DB_NAME="tenant_vayyari_metadata"
DB_USER="deeplens"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup for database: ${DB_NAME}"
pg_dump -h deeplens-postgres -U ${DB_USER} -d ${DB_NAME} | gzip > "${BACKUP_FILE}"
echo "[$(date)] Backup completed (compressed): ${BACKUP_FILE}"
echo "[$(date)] Current backups:"
ls -lh ${BACKUP_DIR}/*.sql.gz 2>/dev/null || echo "No backups found"
'@

$tempScriptPath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "backup-vayyari.sh")
$backupScript | Out-File -FilePath $tempScriptPath -Encoding ASCII -NoNewline

Write-Host "[CREATE] Backup script created" -ForegroundColor Cyan

# Create backup container with bind mount (for testing on Windows)
Write-Host "[START] Creating backup container..." -ForegroundColor Cyan
podman run -d `
    --name $backupContainerName `
    --network deeplens-network `
    --restart unless-stopped `
    -v "${backupPath}:/backups" `
    -e PGPASSWORD=DeepLens123! `
    --label tenant=$tenantName `
    --label service=postgres-backup `
    postgres:16-alpine `
    sh -c "sleep infinity"

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Backup container created: $backupContainerName" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to create backup container" -ForegroundColor Red
    Remove-Item $tempScriptPath -Force
    exit 1
}

# Copy backup script into container
podman cp $tempScriptPath "${backupContainerName}:/usr/local/bin/backup.sh"
podman exec $backupContainerName chmod +x /usr/local/bin/backup.sh
Remove-Item $tempScriptPath -Force

Write-Host "[OK] Backup script installed in container" -ForegroundColor Green

# Run initial backup
Write-Host "[RUN] Running initial backup test..." -ForegroundColor Cyan
podman exec $backupContainerName /usr/local/bin/backup.sh

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Backup test successful!" -ForegroundColor Green
    
    # Verify backup file was created
    $backupFiles = Get-ChildItem -Path $backupPath -Filter "*.sql.gz" -ErrorAction SilentlyContinue
    if ($backupFiles) {
        Write-Host "[OK] Backup file created: $($backupFiles[0].Name)" -ForegroundColor Green
        Write-Host "     Size: $([math]::Round($backupFiles[0].Length / 1KB, 2)) KB" -ForegroundColor Cyan
        Write-Host "     Location: $($backupFiles[0].FullName)" -ForegroundColor Cyan
    } else {
        Write-Host "[WARN] Backup file not found in $backupPath" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] Backup test failed" -ForegroundColor Red
    podman logs $backupContainerName --tail 50
}

# 4. Summary
Write-Host ""
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Summary - Vayyari Tenant Setup" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host ""
Write-Host "[STATUS] Infrastructure:" -ForegroundColor Yellow
podman ps --filter "network=deeplens-network" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "[DATABASE] List:" -ForegroundColor Yellow
podman exec deeplens-postgres psql -U deeplens -c "\l" | Select-String -Pattern "deeplens|tenant"

Write-Host ""
Write-Host "[BACKUP] Configuration:" -ForegroundColor Yellow
Write-Host "   Container: $backupContainerName" -ForegroundColor Cyan
Write-Host "   Backup Path: $backupPath" -ForegroundColor Cyan
Write-Host "   Database: tenant_vayyari_metadata" -ForegroundColor Cyan

Write-Host ""
Write-Host "[SUCCESS] Dry run completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Configure production NFS storage for backups" -ForegroundColor Gray
Write-Host "  2. Set up automated backup schedule (cron)" -ForegroundColor Gray
Write-Host "  3. Provision MinIO storage for image data" -ForegroundColor Gray
Write-Host "  4. Register tenant in platform database" -ForegroundColor Gray
Write-Host ""
