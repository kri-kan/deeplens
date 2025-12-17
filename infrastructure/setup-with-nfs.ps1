# DeepLens Infrastructure Setup with NFS/Portable Storage
# This script starts all infrastructure using bind mounts to a specified base path
# The base path can be on NFS, allowing easy migration between machines

param(
    [string]$DataBasePath = "C:\productivity\deeplensData",
    [switch]$Stop,
    [switch]$Status,
    [switch]$Clean
)

$TenantsPath = "$DataBasePath/tenants"

function Initialize-Directories {
    Write-Host "[INIT] Creating tenant directory..." -ForegroundColor Cyan
    
    # Only create tenants path - core services use named volumes
    New-Item -ItemType Directory -Path $TenantsPath -Force | Out-Null
    
    Write-Host "[OK] Tenant directory created at: $TenantsPath" -ForegroundColor Green
}

function Start-Infrastructure {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " Starting DeepLens Core Infrastructure" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[INFO] Tenants Path: $TenantsPath" -ForegroundColor Yellow
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
    
    Write-Host ""
    Write-Host "[SUCCESS] Infrastructure started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[NOTE] Core services (PostgreSQL, Redis) use named volumes" -ForegroundColor Yellow
    Write-Host "[NOTE] Tenant data (backups, MinIO, Qdrant) uses portable paths at: $TenantsPath" -ForegroundColor Yellow
    Write-Host "[NOTE] Per-tenant services provisioned separately (see provision-tenant-*.ps1)" -ForegroundColor Yellow
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
