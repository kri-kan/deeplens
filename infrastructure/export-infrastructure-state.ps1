# Export DeepLens Infrastructure State for Migration
# This script exports all container data to a specified directory for easy migration

param(
    [Parameter(Mandatory=$true)]
    [string]$ExportPath,
    
    [Parameter(Mandatory=$false)]
    [switch]$IncludeBackups = $true,
    
    [Parameter(Mandatory=$false)]
    [switch]$StopContainers = $false
)

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "DeepLens Infrastructure Export for Migration" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Validate export path
if (-not (Test-Path $ExportPath)) {
    Write-Host "[CREATE] Creating export directory: $ExportPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $ExportPath -Force | Out-Null
}

$ExportPath = Resolve-Path $ExportPath
Write-Host "[INFO] Export destination: $ExportPath" -ForegroundColor Cyan
Write-Host ""

# Create export structure
$coreDataPath = Join-Path $ExportPath "core/data"
$coreLogsPath = Join-Path $ExportPath "core/logs"
$tenantsPath = Join-Path $ExportPath "tenants"
$configPath = Join-Path $ExportPath "config"

New-Item -ItemType Directory -Path $coreDataPath -Force | Out-Null
New-Item -ItemType Directory -Path $coreLogsPath -Force | Out-Null
New-Item -ItemType Directory -Path $tenantsPath -Force | Out-Null
New-Item -ItemType Directory -Path $configPath -Force | Out-Null

Write-Host "[INFO] Created export directory structure" -ForegroundColor Green

# Stop containers if requested
if ($StopContainers) {
    Write-Host ""
    Write-Host "[STOP] Stopping all DeepLens containers..." -ForegroundColor Yellow
    $containers = podman ps --filter "network=deeplens-network" --format "{{.Names}}"
    foreach ($container in $containers) {
        Write-Host "       Stopping: $container" -ForegroundColor Gray
        podman stop $container | Out-Null
    }
    Write-Host "[OK] All containers stopped" -ForegroundColor Green
}

# Export core infrastructure volumes
Write-Host ""
Write-Host "Step 1: Exporting Core Infrastructure Data" -ForegroundColor Yellow
Write-Host "-" * 40

$volumes = @(
    @{Name="deeplens_postgres_data"; Service="PostgreSQL"; DataDir="/var/lib/postgresql/data"},
    @{Name="deeplens_redis_data"; Service="Redis"; DataDir="/data"},
    @{Name="deeplens_qdrant_data"; Service="Qdrant"; DataDir="/qdrant/storage"},
    @{Name="deeplens_minio_data"; Service="MinIO"; DataDir="/data"}
)

foreach ($vol in $volumes) {
    $volumeName = $vol.Name
    $serviceName = $vol.Service
    $destPath = Join-Path $coreDataPath $serviceName.ToLower()
    
    # Check if volume exists
    $volumeExists = podman volume ls --format "{{.Name}}" | Where-Object { $_ -eq $volumeName }
    
    if ($volumeExists) {
        Write-Host "[EXPORT] $serviceName data..." -ForegroundColor Cyan
        
        # Create temporary container to access volume
        $tempContainer = "temp-export-$(Get-Random)"
        podman run -d --name $tempContainer -v "${volumeName}:$($vol.DataDir)" alpine sleep infinity | Out-Null
        
        # Export data using podman cp
        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
        
        # Copy data from volume to export path
        podman exec $tempContainer sh -c "cd $($vol.DataDir) && tar czf - ." | tar xzf - -C $destPath
        
        # Cleanup
        podman stop $tempContainer | Out-Null
        podman rm $tempContainer | Out-Null
        
        $size = (Get-ChildItem -Path $destPath -Recurse | Measure-Object -Property Length -Sum).Sum
        $sizeGB = [math]::Round($size / 1GB, 2)
        Write-Host "[OK] Exported $serviceName ($sizeGB GB)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Volume not found: $volumeName" -ForegroundColor Yellow
    }
}

# Export tenant databases and backups
Write-Host ""
Write-Host "Step 2: Exporting Tenant Data" -ForegroundColor Yellow
Write-Host "-" * 40

# Find all tenant backup containers
$tenantContainers = podman ps -a --filter "label=service=postgres-backup" --format "{{.Names}}"

if ($tenantContainers) {
    foreach ($container in $tenantContainers) {
        $tenantName = ($container -replace 'deeplens-backup-', '')
        Write-Host "[EXPORT] Tenant: $tenantName" -ForegroundColor Cyan
        
        $tenantExportPath = Join-Path $tenantsPath $tenantName
        New-Item -ItemType Directory -Path $tenantExportPath -Force | Out-Null
        
        # Get backup volume mount
        $volumeInfo = podman inspect $container --format '{{range .Mounts}}{{.Source}}{{end}}' | Select-Object -First 1
        
        if ($volumeInfo -and (Test-Path $volumeInfo)) {
            # Copy backups
            $backupDest = Join-Path $tenantExportPath "backups"
            New-Item -ItemType Directory -Path $backupDest -Force | Out-Null
            Copy-Item -Path "$volumeInfo\*" -Destination $backupDest -Recurse -Force
            
            $backupCount = (Get-ChildItem -Path $backupDest -Filter "*.sql.gz" -ErrorAction SilentlyContinue).Count
            Write-Host "[OK] Exported $backupCount backup files for $tenantName" -ForegroundColor Green
        }
        
        # Export tenant database
        Write-Host "[DUMP] Database: tenant_${tenantName}_metadata" -ForegroundColor Cyan
        $dbDumpPath = Join-Path $tenantExportPath "database_dump.sql.gz"
        podman exec deeplens-postgres pg_dump -U deeplens -d "tenant_${tenantName}_metadata" | gzip > $dbDumpPath
        
        $dumpSize = [math]::Round((Get-Item $dbDumpPath).Length / 1KB, 2)
        Write-Host "[OK] Database dump created ($dumpSize KB)" -ForegroundColor Green
    }
} else {
    Write-Host "[INFO] No tenant backups found" -ForegroundColor Yellow
}

# Export configuration files
Write-Host ""
Write-Host "Step 3: Exporting Configuration" -ForegroundColor Yellow
Write-Host "-" * 40

$configItems = @(
    @{Source="./docker-compose.infrastructure.yml"; Dest="docker-compose.infrastructure.yml"},
    @{Source="./docker-compose.monitoring.yml"; Dest="docker-compose.monitoring.yml"},
    @{Source="./.env"; Dest=".env"},
    @{Source="./init-scripts"; Dest="init-scripts"}
)

foreach ($item in $configItems) {
    $sourcePath = $item.Source
    $destPath = Join-Path $configPath $item.Dest
    
    if (Test-Path $sourcePath) {
        if (Test-Path $sourcePath -PathType Container) {
            Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
        } else {
            Copy-Item -Path $sourcePath -Destination $destPath -Force
        }
        Write-Host "[OK] Copied: $($item.Dest)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Not found: $sourcePath" -ForegroundColor Yellow
    }
}

# Create restoration metadata
Write-Host ""
Write-Host "Step 4: Creating Migration Metadata" -ForegroundColor Yellow
Write-Host "-" * 40

$metadata = @{
    ExportDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    SourceMachine = $env:COMPUTERNAME
    SourcePath = (Get-Location).Path
    PodmanVersion = (podman --version)
    Containers = @(podman ps -a --filter "network=deeplens-network" --format "{{.Names}}")
    Volumes = @(podman volume ls --format "{{.Name}}" | Where-Object { $_ -like "deeplens_*" })
}

$metadataPath = Join-Path $ExportPath "migration-metadata.json"
$metadata | ConvertTo-Json -Depth 5 | Out-File -FilePath $metadataPath -Encoding UTF8

Write-Host "[OK] Migration metadata saved" -ForegroundColor Green

# Create restoration script
$restorationScript = @"
# DeepLens Infrastructure Restoration Script
# Generated: $($metadata.ExportDate)
# Source: $($metadata.SourceMachine)

# Usage:
#   .\restore-infrastructure.ps1 -DataPath <path-to-exported-data>

param(
    [Parameter(Mandatory=`$true)]
    [string]`$DataPath
)

# Set environment variables for custom paths
`$env:DEEPLENS_DATA_PATH = (Join-Path `$DataPath "core/data")
`$env:DEEPLENS_LOGS_PATH = (Join-Path `$DataPath "core/logs")

Write-Host "[INFO] Restoring DeepLens Infrastructure" -ForegroundColor Cyan
Write-Host "[INFO] Data path: `$(`$env:DEEPLENS_DATA_PATH)" -ForegroundColor Cyan
Write-Host "[INFO] Logs path: `$(`$env:DEEPLENS_LOGS_PATH)" -ForegroundColor Cyan

# Run infrastructure setup
cd (Join-Path `$DataPath "config")
.\setup-infrastructure.ps1 -Start

Write-Host "[SUCCESS] Infrastructure restored!" -ForegroundColor Green
"@

$restorationScriptPath = Join-Path $ExportPath "restore-infrastructure.ps1"
$restorationScript | Out-File -FilePath $restorationScriptPath -Encoding UTF8

Write-Host "[OK] Restoration script created: restore-infrastructure.ps1" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "=" * 80 -ForegroundColor Green
Write-Host "Export Complete!" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Green
Write-Host ""
Write-Host "[EXPORT] Location: $ExportPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Directory Structure:" -ForegroundColor Yellow
Write-Host "  core/data/          - PostgreSQL, Redis, Qdrant, MinIO data" -ForegroundColor Gray
Write-Host "  core/logs/          - Service logs" -ForegroundColor Gray
Write-Host "  tenants/            - Per-tenant databases and backups" -ForegroundColor Gray
Write-Host "  config/             - Docker compose files and init scripts" -ForegroundColor Gray
Write-Host "  migration-metadata.json - Export metadata" -ForegroundColor Gray
Write-Host "  restore-infrastructure.ps1 - Restoration script" -ForegroundColor Gray
Write-Host ""
Write-Host "Migration Steps:" -ForegroundColor Yellow
Write-Host "  1. Copy entire export folder to new machine" -ForegroundColor White
Write-Host "  2. Install Podman on new machine" -ForegroundColor White
Write-Host "  3. Run: .\restore-infrastructure.ps1 -DataPath <exported-path>" -ForegroundColor White
Write-Host ""

$totalSize = (Get-ChildItem -Path $ExportPath -Recurse | Measure-Object -Property Length -Sum).Sum
$totalSizeGB = [math]::Round($totalSize / 1GB, 2)
Write-Host "[INFO] Total export size: $totalSizeGB GB" -ForegroundColor Cyan
Write-Host ""
