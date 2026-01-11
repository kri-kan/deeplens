param (
    [string]$PostgresPassword = "DeepLens123!",
    [string]$MinioUser = "deeplens",
    [string]$MinioPassword = "DeepLens123!",
    [switch]$SkipVolumes = $false
)

$ErrorActionPreference = "Stop" # Changed to Stop for robustness

function Confirm-Step {
    param([string]$StepName)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] $StepName failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
}

function Wait-For-Port {
    param($Port, $Name, $MaxRetries=60) # 2 minutes max
    Write-Host "    Waiting for $Name (Port $Port)..." -NoNewline -ForegroundColor Gray
    for ($i=0; $i -lt $MaxRetries; $i++) {
        try {
            $conn = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue  -ErrorAction SilentlyContinue
            if ($conn.TcpTestSucceeded) {
                Write-Host " [OK]" -ForegroundColor Green
                return
            }
        } catch {}
        Write-Host "." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
    Write-Host " [TIMEOUT]" -ForegroundColor Red
    throw "$Name failed to start (Port $Port not reachable)"
}

Write-Host "Starting Core Services (Postgres, Redis, MinIO, Qdrant)..." -ForegroundColor Cyan

# Ensure Network
$networkExists = podman network ls --format "{{.Name}}" | Select-String -Pattern "^deeplens-network$"
if (-not $networkExists) {
    podman network create deeplens-network | Out-Null
}

# Create Volumes
if (-not $SkipVolumes) {
    $volumes = @(
        "deeplens-postgres-data",
        "deeplens-minio-data",
        "deeplens-qdrant-data",
        "deeplens-redis-data"
    )
    foreach ($volume in $volumes) {
        $exists = podman volume ls --format "{{.Name}}" | Select-String -Pattern "^$volume$"
        if (-not $exists) {
            podman volume create $volume | Out-Null
        }
    }
}

# 1. Postgres
$pgRunning = podman ps --format "{{.Names}}" | Select-String -Pattern "^deeplens-postgres$"
$pgExists = podman ps -a --format "{{.Names}}" | Select-String -Pattern "^deeplens-postgres$"

if ($pgRunning) {
    Write-Host "  PostgreSQL already running" -ForegroundColor Gray
} elseif ($pgExists) {
    Write-Host "  Starting existing PostgreSQL..." -ForegroundColor Yellow
    podman start deeplens-postgres | Out-Null
} else {
    Write-Host "  Creating PostgreSQL..." -ForegroundColor Yellow
    podman run -d `
        --name deeplens-postgres `
        --network deeplens-network `
        -e POSTGRES_PASSWORD=$PostgresPassword `
        -v deeplens-postgres-data:/var/lib/postgresql/data `
        -p 5433:5432 `
        postgres:16 | Out-Null
}
Wait-For-Port 5433 "PostgreSQL"
Write-Host "    [OK] PostgreSQL ready" -ForegroundColor Green

# 2. Redis
$redisRunning = podman ps --format "{{.Names}}" | Select-String -Pattern "^deeplens-redis$"
$redisExists = podman ps -a --format "{{.Names}}" | Select-String -Pattern "^deeplens-redis$"

if ($redisRunning) {
    Write-Host "  Redis already running" -ForegroundColor Gray
} elseif ($redisExists) {
    Write-Host "  Starting existing Redis..." -ForegroundColor Yellow
    podman start deeplens-redis | Out-Null
} else {
    Write-Host "  Creating Redis..." -ForegroundColor Yellow
    podman run -d `
        --name deeplens-redis `
        --network deeplens-network `
        -v deeplens-redis-data:/data `
        -p 6379:6379 `
        redis:latest redis-server --appendonly yes | Out-Null
}
Wait-For-Port 6379 "Redis"
Write-Host "    [OK] Redis ready" -ForegroundColor Green

# 3. MinIO
$minioRunning = podman ps --format "{{.Names}}" | Select-String -Pattern "^deeplens-minio$"
$minioExists = podman ps -a --format "{{.Names}}" | Select-String -Pattern "^deeplens-minio$"

if ($minioRunning) {
    Write-Host "  MinIO already running" -ForegroundColor Gray
} elseif ($minioExists) {
    Write-Host "  Starting existing MinIO..." -ForegroundColor Yellow
    podman start deeplens-minio | Out-Null
} else {
    Write-Host "  Creating MinIO..." -ForegroundColor Yellow
    podman run -d `
        --name deeplens-minio `
        --network deeplens-network `
        -e MINIO_ROOT_USER=$MinioUser `
        -e MINIO_ROOT_PASSWORD=$MinioPassword `
        -v deeplens-minio-data:/data `
        -p 9000:9000 `
        -p 9001:9001 `
        quay.io/minio/minio server /data --console-address ":9001" | Out-Null
}
Wait-For-Port 9000 "MinIO API"
Wait-For-Port 9001 "MinIO Console"
Write-Host "    [OK] MinIO ready" -ForegroundColor Green

# 4. Qdrant
$qdrantRunning = podman ps --format "{{.Names}}" | Select-String -Pattern "^deeplens-qdrant$"
$qdrantExists = podman ps -a --format "{{.Names}}" | Select-String -Pattern "^deeplens-qdrant$"

if ($qdrantRunning) {
    Write-Host "  Qdrant already running" -ForegroundColor Gray
} elseif ($qdrantExists) {
    Write-Host "  Starting existing Qdrant..." -ForegroundColor Yellow
    podman start deeplens-qdrant | Out-Null
} else {
    Write-Host "  Creating Qdrant..." -ForegroundColor Yellow
    podman run -d `
        --name deeplens-qdrant `
        --network deeplens-network `
        -v deeplens-qdrant-data:/qdrant/storage `
        -p 6333:6333 `
        -p 6334:6334 `
        qdrant/qdrant:latest | Out-Null
}
Wait-For-Port 6333 "Qdrant"
Write-Host "    [OK] Qdrant ready" -ForegroundColor Green
