# Provision PostgreSQL Backup for a Tenant
# This script creates a backup container for automated PostgreSQL backups

param(
    [Parameter(Mandatory=$true)]
    [string]$TenantName,
    
    [string]$BackupPath = "C:\productivity\deeplensData\tenants\$TenantName\backups",
    [string]$Schedule = "0 2 * * *",  # Daily at 2 AM
    [int]$RetentionDays = 30,
    [switch]$TestBackup
)

$containerName = "deeplens-backup-$TenantName"
$dbName = "tenant_${TenantName}_metadata"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " PostgreSQL Backup Provisioning" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] Tenant: $TenantName" -ForegroundColor Cyan
Write-Host "[INFO] Database: $dbName" -ForegroundColor Cyan
Write-Host "[INFO] Backup Path: $BackupPath" -ForegroundColor Cyan
Write-Host "[INFO] Schedule: $Schedule" -ForegroundColor Cyan
Write-Host "[INFO] Retention: $RetentionDays days" -ForegroundColor Cyan
Write-Host ""

# Create backup directory
if (-not (Test-Path $BackupPath)) {
    Write-Host "[CREATE] Creating backup directory..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    Write-Host "[OK] Directory created" -ForegroundColor Green
}

# Check if backup container already exists
$existing = podman ps -a --filter "name=^${containerName}$" --format "{{.Names}}" 2>$null
if ($existing) {
    Write-Host "[WARN] Backup container already exists: $containerName" -ForegroundColor Yellow
    Write-Host "[INFO] Removing existing container..." -ForegroundColor Cyan
    podman rm -f $containerName 2>&1 | Out-Null
    Write-Host "[OK] Removed old container" -ForegroundColor Green
}

# Create backup script inside container (avoids line ending issues)
Write-Host "[CREATE] Creating backup script..." -ForegroundColor Cyan
$scriptPath = Join-Path $BackupPath "backup.sh"
# Placeholder file
"" | Out-File -FilePath $scriptPath -Encoding ASCII -Force
Write-Host "[OK] Backup script placeholder created" -ForegroundColor Green

# Create cron schedule file
Write-Host "[CREATE] Creating cron schedule..." -ForegroundColor Cyan
$cronFile = Join-Path $BackupPath "crontab"
"$Schedule /scripts/backup.sh >> /var/log/backup.log 2>&1`n" | Out-File -FilePath $cronFile -Encoding ASCII -Force -NoNewline
Write-Host "[OK] Cron schedule created" -ForegroundColor Green

# Create backup container
Write-Host "[START] Creating backup container..." -ForegroundColor Cyan
$result = podman run -d `
    --name $containerName `
    --restart unless-stopped `
    --network deeplens-network `
    -v "${BackupPath}:/backups" `
    -v "${cronFile}:/etc/crontabs/root:ro" `
    -e PGPASSWORD="DeepLens123!" `
    postgres:16-alpine `
    crond -f -l 2

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Backup container created: $containerName" -ForegroundColor Green
    
    # Create backup script inside container to avoid line ending issues
    Write-Host "[SCRIPT] Creating backup script in container..." -ForegroundColor Cyan
    
    # Create scripts directory
    podman exec $containerName mkdir -p /scripts 2>&1 | Out-Null
    
    # Write script line by line to avoid line ending issues
    podman exec $containerName sh -c "echo '#!/bin/sh' > /scripts/backup.sh"
    podman exec $containerName sh -c "echo 'BACKUP_DIR=/backups' >> /scripts/backup.sh"
    podman exec $containerName sh -c "echo 'TIMESTAMP=`$(date +%Y%m%d_%H%M%S)' >> /scripts/backup.sh"
    podman exec $containerName sh -c "echo 'BACKUP_FILE=`$BACKUP_DIR/${dbName}_`$TIMESTAMP.sql.gz' >> /scripts/backup.sh"
    podman exec $containerName sh -c "echo 'echo [BACKUP] Starting backup' >> /scripts/backup.sh"
    podman exec $containerName sh -c "echo 'PGPASSWORD=DeepLens123! pg_dump -h deeplens-postgres -U deeplens -d ${dbName} | gzip > `$BACKUP_FILE' >> /scripts/backup.sh"
    podman exec $containerName sh -c "echo 'echo [OK] Backup completed' >> /scripts/backup.sh"
    podman exec $containerName sh -c "echo 'find `$BACKUP_DIR -name *.sql.gz -type f -mtime +${RetentionDays} -delete' >> /scripts/backup.sh"
    podman exec $containerName chmod +x /scripts/backup.sh 2>&1 | Out-Null
    
    Write-Host "[OK] Backup script created in container" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to create backup container" -ForegroundColor Red
    exit 1
}

# Run test backup if requested
if ($TestBackup) {
    Write-Host ""
    Write-Host "[TEST] Running test backup..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    
    podman exec $containerName sh /scripts/backup.sh
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] Test backup completed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "[INFO] Backup files:" -ForegroundColor Cyan
        Get-ChildItem -Path $BackupPath -Filter "*.sql.gz" | ForEach-Object {
            $size = [math]::Round($_.Length / 1KB, 2)
            Write-Host "  $($_.Name) - ${size} KB" -ForegroundColor Gray
        }
    } else {
        Write-Host "[ERROR] Test backup failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "[SUCCESS] Backup provisioning completed!" -ForegroundColor Green
Write-Host ""
Write-Host "[NEXT STEPS]" -ForegroundColor Yellow
Write-Host "  Check logs: podman logs $containerName" -ForegroundColor Gray
Write-Host "  List backups: Get-ChildItem '$BackupPath'" -ForegroundColor Gray
Write-Host "  Manual backup: podman exec $containerName sh /scripts/backup.sh" -ForegroundColor Gray
Write-Host ""
