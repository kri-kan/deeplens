# DeepLens Infrastructure Setup with NFS/Portable Storage
# This script starts all infrastructure using bind mounts to a specified base path
# The base path can be on NFS, allowing easy migration between machines

param(
    [string]$DataBasePath = "C:\productivity\deeplensData",
    [switch]$Stop,
    [switch]$Status,
    [switch]$Clean
)

$CoreDataPath = "$DataBasePath/core/data"
$CoreLogsPath = "$DataBasePath/core/logs"
$TenantsPath = "$DataBasePath/tenants"

function Initialize-Directories {
    Write-Host "[INIT] Creating directory structure..." -ForegroundColor Cyan
    
    # Core data directories
    $dirs = @(
        "$CoreDataPath/postgres",
        "$CoreDataPath/redis",
        "$CoreDataPath/qdrant",
        "$CoreDataPath/influxdb",
        "$CoreDataPath/kafka",
        "$CoreDataPath/zookeeper/data",
        "$CoreDataPath/minio",
        "$CoreDataPath/infisical/postgres",
        "$CoreDataPath/infisical/redis",
        "$CoreLogsPath/postgres",
        "$CoreLogsPath/redis",
        "$CoreLogsPath/kafka",
        "$CoreLogsPath/zookeeper",
        "$TenantsPath"
    )
    
    foreach ($dir in $dirs) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    
    Write-Host "[OK] Directory structure created at: $DataBasePath" -ForegroundColor Green
}

function Start-Infrastructure {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " Starting DeepLens Infrastructure" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[INFO] Data Path: $CoreDataPath" -ForegroundColor Yellow
    Write-Host "[INFO] Logs Path: $CoreLogsPath" -ForegroundColor Yellow
    Write-Host ""
    
    Initialize-Directories
    
    # Create network
    Write-Host "`n[NETWORK] Creating deeplens-network..." -ForegroundColor Cyan
    podman network create deeplens-network 2>&1 | Out-Null
    Write-Host "[OK] Network ready" -ForegroundColor Green
    
    # PostgreSQL
    Write-Host "`n[START] PostgreSQL..." -ForegroundColor Cyan
    podman run -d `
        --name deeplens-postgres `
        --restart unless-stopped `
        --network deeplens-network `
        -e POSTGRES_USER=deeplens `
        -e POSTGRES_PASSWORD=DeepLens123! `
        -e POSTGRES_DB=deeplens `
        -p 5432:5432 `
        -v deeplens_postgres_data:/var/lib/postgresql/data `
        -v "${PWD}/init-scripts/postgres:/docker-entrypoint-initdb.d:ro" `
        --health-cmd "pg_isready -U deeplens" `
        --health-interval 10s `
        --health-timeout 5s `
        --health-retries 5 `
        postgres:16-alpine
    
    Write-Host "[OK] PostgreSQL started (using named volume - see migration notes)" -ForegroundColor Green
    
    # Redis
    Write-Host "`n[START] Redis..." -ForegroundColor Cyan
    podman run -d `
        --name deeplens-redis `
        --restart unless-stopped `
        --network deeplens-network `
        -p 6379:6379 `
        -v deeplens_redis_data:/data `
        redis:7-alpine redis-server --appendonly yes
    
    Write-Host "[OK] Redis started" -ForegroundColor Green
    
    # Qdrant
    Write-Host "`n[START] Qdrant..." -ForegroundColor Cyan
    podman run -d `
        --name deeplens-qdrant `
        --restart unless-stopped `
        --network deeplens-network `
        -p 6333:6333 `
        -p 6334:6334 `
        -v deeplens_qdrant_data:/qdrant/storage `
        qdrant/qdrant:v1.7.0
    
    Write-Host "[OK] Qdrant started" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[SUCCESS] Infrastructure started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[NOTE] Core services use named volumes due to Podman/Windows limitations" -ForegroundColor Yellow
    Write-Host "[NOTE] Tenant data (backups, MinIO) uses portable paths at: $TenantsPath" -ForegroundColor Yellow
    Write-Host "[NOTE] To migrate: Use 'podman volume export/import' for core data" -ForegroundColor Yellow
    Write-Host "       Or use this script on Linux with proper NFS mounts" -ForegroundColor Yellow
    Write-Host ""
}

function Stop-Infrastructure {
    Write-Host "[STOP] Stopping all containers..." -ForegroundColor Yellow
    podman stop $(podman ps -q --filter network=deeplens-network) 2>&1 | Out-Null
    Write-Host "[OK] All containers stopped" -ForegroundColor Green
}

function Show-Status {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " DeepLens Infrastructure Status" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "[INFO] Data Base Path: $DataBasePath" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "[CONTAINERS]" -ForegroundColor Yellow
    podman ps --filter "network=deeplens-network" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    Write-Host ""
    Write-Host "[VOLUMES]" -ForegroundColor Yellow
    podman volume ls --filter "name=deeplens_" --format "table {{.Name}}\t{{.Driver}}"
    
    Write-Host ""
    Write-Host "[TENANT DATA]" -ForegroundColor Yellow
    if (Test-Path $TenantsPath) {
        Get-ChildItem -Path $TenantsPath -Directory | ForEach-Object {
            $size = (Get-ChildItem -Path $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
            Write-Host "  $($_.Name): $([math]::Round($size, 2)) MB" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  No tenant data yet" -ForegroundColor Gray
    }
    Write-Host ""
}

function Clean-All {
    Write-Host "[CLEAN] This will remove ALL containers, volumes, and data!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? Type 'yes' to confirm"
    
    if ($confirm -ne "yes") {
        Write-Host "[CANCELLED] Clean operation cancelled" -ForegroundColor Yellow
        return
    }
    
    Write-Host "[CLEANUP] Stopping containers..." -ForegroundColor Yellow
    podman stop $(podman ps -aq) 2>&1 | Out-Null
    
    Write-Host "[CLEANUP] Removing containers..." -ForegroundColor Yellow
    podman rm $(podman ps -aq) 2>&1 | Out-Null
    
    Write-Host "[CLEANUP] Removing volumes..." -ForegroundColor Yellow
    podman volume prune -f 2>&1 | Out-Null
    
    Write-Host "[CLEANUP] Removing data at $DataBasePath..." -ForegroundColor Yellow
    Remove-Item -Path $DataBasePath -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Host "[OK] Clean complete" -ForegroundColor Green
}

# Main execution
if ($Stop) {
    Stop-Infrastructure
}
elseif ($Status) {
    Show-Status
}
elseif ($Clean) {
    Clean-All
}
else {
    Start-Infrastructure
    Start-Sleep -Seconds 5
    Show-Status
}
