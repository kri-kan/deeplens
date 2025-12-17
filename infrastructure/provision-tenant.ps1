# DeepLens Unified Tenant Provisioning Script
# Provisions all tenant-specific resources in a single operation

param(
    [Parameter(Mandatory=$true)]
    [string]$TenantName,
    
    [string]$DataBasePath = "C:\productivity\deeplensData",
    
    [int]$QdrantHttpPort = 0,  # Auto-assign if 0
    
    [int]$QdrantGrpcPort = 0,  # Auto-assign if 0
    
    [string]$BackupSchedule = "0 2 * * *",  # Daily at 2 AM
    
    [int]$BackupRetentionDays = 30,
    
    [switch]$TestBackup,
    
    [switch]$Remove
)

$ErrorActionPreference = "Stop"

$TenantDBName = "tenant_${TenantName}_metadata"
$TenantPath = "$DataBasePath/tenants/$TenantName"
$BackupsPath = "$TenantPath/backups"

function Get-NextAvailablePort {
    param([int]$StartPort)
    
    $usedPorts = podman ps --format "{{.Ports}}" | Select-String -Pattern "(\d+):" -AllMatches | 
        ForEach-Object { $_.Matches.Groups[1].Value } | Sort-Object -Unique
    
    $port = $StartPort
    while ($usedPorts -contains $port) {
        $port++
    }
    return $port
}

function Remove-Tenant {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host " Removing Tenant: $TenantName" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    
    # Stop and remove Qdrant
    Write-Host "[QDRANT] Removing Qdrant container..." -ForegroundColor Yellow
    $qdrantContainer = podman ps -a --filter "name=^deeplens-qdrant-$TenantName$" --format "{{.Names}}"
    if ($qdrantContainer) {
        podman stop "deeplens-qdrant-$TenantName" 2>&1 | Out-Null
        podman rm "deeplens-qdrant-$TenantName" 2>&1 | Out-Null
    }
    $qdrantVolume = podman volume ls --filter "name=^deeplens_qdrant_${TenantName}_data$" --format "{{.Name}}"
    if ($qdrantVolume) {
        podman volume rm "deeplens_qdrant_${TenantName}_data" 2>&1 | Out-Null
    }
    Write-Host "[OK] Qdrant removed" -ForegroundColor Green
    
    # Stop and remove Backup
    Write-Host "`n[BACKUP] Removing backup container..." -ForegroundColor Yellow
    $backupContainer = podman ps -a --filter "name=^deeplens-backup-$TenantName$" --format "{{.Names}}"
    if ($backupContainer) {
        podman stop "deeplens-backup-$TenantName" 2>&1 | Out-Null
        podman rm "deeplens-backup-$TenantName" 2>&1 | Out-Null
    }
    Write-Host "[OK] Backup container removed" -ForegroundColor Green
    
    # Drop database
    Write-Host "`n[DATABASE] Dropping tenant database..." -ForegroundColor Yellow
    $dropCmd = "DROP DATABASE IF EXISTS $TenantDBName;"
    podman exec -i deeplens-postgres psql -U deeplens -c $dropCmd 2>&1 | Out-Null
    Write-Host "[OK] Database dropped" -ForegroundColor Green
    
    # Remove data directories
    Write-Host "`n[DATA] Removing tenant data..." -ForegroundColor Yellow
    Remove-Item -Path $TenantPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Tenant data removed" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[SUCCESS] Tenant '$TenantName' completely removed" -ForegroundColor Green
    Write-Host ""
}

function Provision-Tenant {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " Provisioning Tenant: $TenantName" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Check prerequisites
    Write-Host "[CHECK] Verifying prerequisites..." -ForegroundColor Cyan
    $pgStatus = podman inspect deeplens-postgres --format '{{.State.Health.Status}}' 2>$null
    if ($pgStatus -ne "healthy") {
        Write-Host "[ERROR] PostgreSQL is not healthy. Run setup-with-nfs.ps1 first" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] PostgreSQL is healthy" -ForegroundColor Green
    
    # Create tenant directories
    Write-Host "`n[DIRECTORIES] Creating tenant directories..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $BackupsPath -Force | Out-Null
    Write-Host "[OK] Directories created at: $TenantPath" -ForegroundColor Green
    
    # Create tenant database
    Write-Host "`n[DATABASE] Creating tenant database..." -ForegroundColor Cyan
    $createDBCmd = "CREATE DATABASE $TenantDBName WITH ENCODING='UTF8' LC_COLLATE='en_US.utf8' LC_CTYPE='en_US.utf8';"
    try {
        podman exec -i deeplens-postgres psql -U deeplens -c $createDBCmd 2>&1 | Out-Null
        Write-Host "[OK] Database created: $TenantDBName" -ForegroundColor Green
    }
    catch {
        Write-Host "[WARNING] Database might already exist" -ForegroundColor Yellow
    }
    
    # Provision Qdrant
    Write-Host "`n[QDRANT] Provisioning Qdrant instance..." -ForegroundColor Cyan
    
    # Check if already exists
    $qdrantExists = podman ps -a --filter "name=^deeplens-qdrant-$TenantName$" --format "{{.Names}}"
    if ($qdrantExists) {
        Write-Host "[WARNING] Qdrant container already exists, skipping..." -ForegroundColor Yellow
    }
    else {
        # Auto-assign ports if not specified
        if ($QdrantHttpPort -eq 0) {
            $QdrantHttpPort = Get-NextAvailablePort -StartPort 6333
            Write-Host "[INFO] Auto-assigned HTTP port: $QdrantHttpPort" -ForegroundColor Yellow
        }
        
        if ($QdrantGrpcPort -eq 0) {
            $QdrantGrpcPort = Get-NextAvailablePort -StartPort 6334
            Write-Host "[INFO] Auto-assigned gRPC port: $QdrantGrpcPort" -ForegroundColor Yellow
        }
        
        $qdrantVolume = "deeplens_qdrant_${TenantName}_data"
        $volumeExists = podman volume ls --filter "name=^${qdrantVolume}$" --format "{{.Name}}"
        if (-not $volumeExists) {
            podman volume create $qdrantVolume | Out-Null
        }
        
        podman run -d `
            --name "deeplens-qdrant-$TenantName" `
            --restart unless-stopped `
            --network deeplens-network `
            -p "${QdrantHttpPort}:6333" `
            -p "${QdrantGrpcPort}:6334" `
            -v "${qdrantVolume}:/qdrant/storage" `
            --label "tenant=$TenantName" `
            --label "service=qdrant" `
            qdrant/qdrant:v1.7.0 | Out-Null
        
        Write-Host "[OK] Qdrant started on ports $QdrantHttpPort (HTTP) and $QdrantGrpcPort (gRPC)" -ForegroundColor Green
    }
    
    # Provision Backup Container
    Write-Host "`n[BACKUP] Provisioning backup container..." -ForegroundColor Cyan
    
    # Check if already exists
    $backupExists = podman ps -a --filter "name=^deeplens-backup-$TenantName$" --format "{{.Names}}"
    if ($backupExists) {
        Write-Host "[WARNING] Backup container already exists, skipping..." -ForegroundColor Yellow
        $backupConfigured = $true
    }
    else {
        # Create backup container
        podman run -d `
            --name "deeplens-backup-$TenantName" `
            --restart unless-stopped `
            --network deeplens-network `
            -v "${BackupsPath}:/backups" `
            --label "tenant=$TenantName" `
            --label "service=backup" `
            postgres:16-alpine crond -f -l 2 | Out-Null
        
        # Wait for container to be ready
        Start-Sleep -Seconds 3
        
        # Create backup script inside container
        $backupScript = "#!/bin/sh`n" +
            "TIMESTAMP=`$(date +%Y%m%d_%H%M%S)`n" +
            "BACKUP_FILE=""/backups/backup_`${TIMESTAMP}.sql""`n" +
            "PGPASSWORD='DeepLens123!' pg_dump -h deeplens-postgres -U deeplens -d $TenantDBName > ""`$BACKUP_FILE""`n" +
            "echo ""`$(date): Backup completed - `$BACKUP_FILE"" >> /backups/backup.log`n" +
            "find /backups -name ""backup_*.sql"" -type f -mtime +$BackupRetentionDays -exec rm -f {} +`n"
        
        $backupScript | podman exec -i "deeplens-backup-$TenantName" sh -c "cat > /usr/local/bin/backup.sh"
        podman exec "deeplens-backup-$TenantName" chmod +x /usr/local/bin/backup.sh | Out-Null
        
        # Install cron job
        $cronEntry = "$BackupSchedule /usr/local/bin/backup.sh"
        echo $cronEntry | podman exec -i "deeplens-backup-$TenantName" sh -c "cat > /etc/crontabs/root"
        
        Write-Host "[OK] Backup container configured (Schedule: $BackupSchedule, Retention: $BackupRetentionDays days)" -ForegroundColor Green
        $backupConfigured = $true
    }
    
    # Test backup if requested
    if ($TestBackup -and $backupConfigured) {
        Write-Host "`n[TEST] Running test backup..." -ForegroundColor Cyan
        Start-Sleep -Seconds 3  # Ensure container is ready
        try {
            podman exec "deeplens-backup-$TenantName" sh /usr/local/bin/backup.sh 2>&1 | Out-Null
            Start-Sleep -Seconds 2
            
            $backupFiles = Get-ChildItem -Path $BackupsPath -Filter "backup_*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
            if ($backupFiles) {
                $latestBackup = $backupFiles[0]
                $sizeKB = [math]::Round($latestBackup.Length / 1KB, 2)
                Write-Host "[OK] Test backup successful: $($latestBackup.Name) ($sizeKB KB)" -ForegroundColor Green
            }
            else {
                Write-Host "[WARNING] Test backup file not found" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "[ERROR] Test backup failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Display summary
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Tenant Provisioning Complete" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Tenant Name:       $TenantName" -ForegroundColor Cyan
    Write-Host "  Database:          $TenantDBName" -ForegroundColor Cyan
    Write-Host "  Data Path:         $TenantPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Qdrant HTTP:       http://localhost:$QdrantHttpPort" -ForegroundColor Yellow
    Write-Host "  Qdrant Dashboard:  http://localhost:$QdrantHttpPort/dashboard" -ForegroundColor Yellow
    Write-Host "  Qdrant gRPC:       localhost:$QdrantGrpcPort" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Backup Schedule:   $BackupSchedule" -ForegroundColor Cyan
    Write-Host "  Backup Retention:  $BackupRetentionDays days" -ForegroundColor Cyan
    Write-Host "  Backups Location:  $BackupsPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[NEXT STEPS]" -ForegroundColor Yellow
    Write-Host "  1. Configure application to use database: $TenantDBName" -ForegroundColor White
    Write-Host "  2. Configure Qdrant endpoint: http://localhost:$QdrantHttpPort" -ForegroundColor White
    Write-Host "  3. Create Qdrant collections as needed" -ForegroundColor White
    Write-Host ""
}

# Main execution
if ($Remove) {
    Remove-Tenant
}
else {
    Provision-Tenant
}
