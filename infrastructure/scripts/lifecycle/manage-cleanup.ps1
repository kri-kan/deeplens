param (
    [switch]$Force = $false
)

$ErrorActionPreference = "Continue"

Write-Host "Cleaning up existing environment..." -ForegroundColor Yellow

# Stop .NET services
$dotnetProcs = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue
if ($dotnetProcs) {
    Write-Host "  Stopping .NET services..." -ForegroundColor Gray
    $dotnetProcs | Stop-Process -Force
}

# --------------------------------------------------------------------------
# Logical Cleanup (DeepLens Entities Only)
# --------------------------------------------------------------------------
Write-Host "  Performing Logical Cleanup (DeepLens Only)..." -ForegroundColor Gray

# 1. Databases (DeepLens Only)
if (podman ps --filter "name=deeplens-postgres" --format "{{.ID}}") {
    $dbs = @("deeplens_platform", "nextgen_identity", "tenant_metadata_template", "tenant_vayyari_metadata")
    foreach ($db in $dbs) {
        podman exec deeplens-postgres psql -U postgres -c "DROP DATABASE IF EXISTS ""$db"";" 2>$null | Out-Null
    }
    Write-Host "    [OK] DeepLens Databases dropped" -ForegroundColor Green
}

# 2. Kafka Topics (DeepLens Only)
if (podman ps --filter "name=deeplens-kafka" --format "{{.ID}}") {
    $topics = @("deeplens.images.uploaded", "deeplens.videos.uploaded", "deeplens.features.extraction", "deeplens.vectors.indexing", "deeplens.processing.completed", "deeplens.processing.failed", "deeplens.images.maintenance")
    foreach ($topic in $topics) {
        podman exec deeplens-kafka kafka-topics --delete --topic $topic --bootstrap-server localhost:9092 --if-exists 2>$null | Out-Null
    }
    Write-Host "    [OK] DeepLens Topics deleted" -ForegroundColor Green
}

# 3. MinIO Buckets (DeepLens Only)
if (podman ps --filter "name=deeplens-minio" --format "{{.ID}}") {
    $minioScript = "$PSScriptRoot\..\WAProcessor\manage-minio-storage.ps1"
    if (Test-Path $minioScript) {
        # Using the script's 'Clean' action (Nuke & Pave)
        & $minioScript -Action Clean -BucketName "platform-admin" 2>$null | Out-Null
        & $minioScript -Action Clean -BucketName "vayyari" 2>$null | Out-Null
        Write-Host "    [OK] DeepLens Buckets cleaned" -ForegroundColor Green
    }
}

# 4. Redis (Shared - FLUSHDB)
if (podman ps --filter "name=deeplens-redis" --format "{{.ID}}") {
    podman exec deeplens-redis redis-cli -n 0 FLUSHDB 2>$null | Out-Null
    Write-Host "    [OK] Redis flushed (DB 0)" -ForegroundColor Green
}

# --------------------------------------------------------------------------

# Stop and remove DeepLens containers
$allContainers = podman ps -a --format "{{.Names}}" | Where-Object { $_ -match "^deeplens-" }
$persistentContainers = @("deeplens-postgres", "deeplens-redis", "deeplens-minio", "deeplens-kafka", "deeplens-zookeeper")

if ($allContainers) {
    Write-Host "  Removing containers (Preserving persistent ones)..." -ForegroundColor Gray
    foreach ($container in $allContainers) {
        if ($container -in $persistentContainers) {
            Write-Host "    [SKIP] Preserving container (Keeping running): $container" -ForegroundColor Cyan
            continue
        }
        podman rm -f $container 2>&1 | Out-Null
    }
}

# Remove DeepLens volumes (EXCLUDING SHARED ONES)
Write-Host "  Removing volumes (Preserving Shared Postgres/Kafka/MinIO)..." -ForegroundColor Gray
$allVolumes = podman volume ls --format "{{.Name}}" | Where-Object { $_ -match "^deeplens[-_]" }
$keptVolumes = @(
    "deeplens-postgres-data", 
    "deeplens-redis-data",
    "deeplens-minio-data", 
    "deeplens-kafka-data", 
    "deeplens-kafka-secrets",
    "deeplens-zookeeper-data", 
    "deeplens-zookeeper-secrets", 
    "deeplens-zookeeper-logs"
)

foreach ($volume in $allVolumes) {
    if ($volume -in $keptVolumes) {
        Write-Host "    [SKIP] Preserving shared volume: $volume" -ForegroundColor Cyan
        continue
    }
    podman volume rm $volume 2>&1 | Out-Null
}

# Prune orphaned volumes
# podman volume prune -f 2>&1 | Out-Null

# Remove network
$networkExists = podman network ls --format "{{.Name}}" | Select-String -Pattern "^deeplens-network$"
if ($networkExists) {
    podman network rm deeplens-network 2>&1 | Out-Null
}

Write-Host "  [OK] Cleanup complete" -ForegroundColor Green
