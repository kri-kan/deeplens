#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Complete DeepLens development environment setup script
.DESCRIPTION
    This script sets up the entire DeepLens development environment from scratch:
    - Infrastructure containers (Postgres, Kafka, MinIO, Qdrant, Redis)
    - Feature Extraction Service (Python)
.PARAMETER Clean
    If specified, removes all existing containers and volumes before setup
.PARAMETER SkipBuild
    If specified, skips building the Feature Extraction Docker image
#>

param(
    [switch]$Clean,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

# Helper function to check exit codes of native commands
function Confirm-Step {
    param([string]$StepName)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] $StepName failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
}

# Configuration
$POSTGRES_PASSWORD = "DeepLens123!"
$MINIO_USER = "deeplens"
$MINIO_PASSWORD = "DeepLens123!"

Write-Host "=== DeepLens Development Environment Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean up if requested
if ($Clean) {
    Write-Host "[1/10] Cleaning up existing environment..." -ForegroundColor Yellow
    
    # Stop .NET services
    Write-Host "  Stopping .NET services..." -ForegroundColor Gray
    $dotnetProcs = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue
    if ($dotnetProcs) {
        $dotnetProcs | Stop-Process -Force
    }
    
    # Stop and remove DeepLens containers
    Write-Host "  Removing containers..." -ForegroundColor Gray
    $allContainers = podman ps -a --format "{{.Names}}" | Where-Object { $_ -match "^deeplens-" }
    foreach ($container in $allContainers) {
        podman rm -f $container 2>&1 | Out-Null
    }
    
    # Remove DeepLens volumes
    Write-Host "  Removing volumes..." -ForegroundColor Gray
    $allVolumes = podman volume ls --format "{{.Name}}" | Where-Object { $_ -match "^deeplens[-_]" }
    foreach ($volume in $allVolumes) {
        podman volume rm $volume 2>&1 | Out-Null
    }
    
    # Prune orphaned volumes
    podman volume prune -f 2>&1 | Out-Null
    
    # Remove network
    $networkExists = podman network ls --format "{{.Name}}" | Select-String -Pattern "^deeplens-network$"
    if ($networkExists) {
        podman network rm deeplens-network 2>&1 | Out-Null
    }

    Write-Host "  [OK] Cleanup complete" -ForegroundColor Green
}

# Step 2: Create podman resources
Write-Host "[2/10] Creating podman resources..." -ForegroundColor Yellow

# Create network
$networkExists = podman network ls --format "{{.Name}}" | Select-String -Pattern "^deeplens-network$"
if (-not $networkExists) {
    podman network create deeplens-network | Out-Null
    Confirm-Step "Network Creation"
}

# Create volumes
$volumes = @(
    "deeplens-postgres-data",
    "deeplens-kafka-data",
    "deeplens-kafka-secrets",
    "deeplens-zookeeper-data",
    "deeplens-zookeeper-secrets",
    "deeplens-zookeeper-logs",
    "deeplens-minio-data",
    "deeplens-qdrant-data",
    "deeplens-redis-data"
)
foreach ($volume in $volumes) {
    podman volume create $volume 2>&1 | Out-Null
    Confirm-Step "Volume Creation: $volume"
}
Write-Host "  [OK] Resources created" -ForegroundColor Green

# Step 3: Start PostgreSQL
Write-Host "[3/10] Starting PostgreSQL..." -ForegroundColor Yellow
# Note: We don't set POSTGRES_DB here because init scripts handle database creation
podman run -d `
    --name deeplens-postgres `
    --network deeplens-network `
    -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD `
    -v deeplens-postgres-data:/var/lib/postgresql/data `
    -p 5433:5432 `
    postgres:16 | Out-Null
Confirm-Step "PostgreSQL Start"
Write-Host "  [OK] PostgreSQL started" -ForegroundColor Green

# Step 4: Start Zookeeper
Write-Host "[4/10] Starting Zookeeper..." -ForegroundColor Yellow
podman run -d `
    --name deeplens-zookeeper `
    --network deeplens-network `
    -e ZOOKEEPER_CLIENT_PORT=2181 `
    -e ZOOKEEPER_TICK_TIME=2000 `
    -v deeplens-zookeeper-data:/var/lib/zookeeper/data `
    -v deeplens-zookeeper-secrets:/etc/zookeeper/secrets `
    -v deeplens-zookeeper-logs:/var/lib/zookeeper/log `
    -p 2181:2181 `
    confluentinc/cp-zookeeper:7.4.0 | Out-Null
Confirm-Step "Zookeeper Start"
Start-Sleep 5
Write-Host "  [OK] Zookeeper started" -ForegroundColor Green

# Step 5: Start Kafka
Write-Host "[5/10] Starting Kafka..." -ForegroundColor Yellow
$kafkaEnv = "PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT"
podman run -d `
    --name deeplens-kafka `
    --network deeplens-network `
    -e KAFKA_BROKER_ID=1 `
    -e KAFKA_ZOOKEEPER_CONNECT=deeplens-zookeeper:2181 `
    -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 `
    -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 `
    -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=$kafkaEnv `
    -e KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT `
    -v deeplens-kafka-data:/var/lib/kafka/data `
    -v deeplens-kafka-secrets:/etc/kafka/secrets `
    -p 9092:9092 `
    confluentinc/cp-kafka:7.4.0 | Out-Null
Confirm-Step "Kafka Start"
Start-Sleep 5
Write-Host "  [OK] Kafka started" -ForegroundColor Green

# Step 6: Start MinIO
Write-Host "[6/10] Starting MinIO..." -ForegroundColor Yellow
podman run -d `
    --name deeplens-minio `
    --network deeplens-network `
    -e MINIO_ROOT_USER=$MINIO_USER `
    -e MINIO_ROOT_PASSWORD=$MINIO_PASSWORD `
    -v deeplens-minio-data:/data `
    -p 9000:9000 `
    -p 9001:9001 `
    quay.io/minio/minio server /data --console-address ":9001" | Out-Null
Confirm-Step "MinIO Start"
Start-Sleep 3
Write-Host "  [OK] MinIO started" -ForegroundColor Green

# Step 7: Start Qdrant
Write-Host "[7/10] Starting Qdrant..." -ForegroundColor Yellow
podman run -d `
    --name deeplens-qdrant `
    --network deeplens-network `
    -v deeplens-qdrant-data:/qdrant/storage `
    -p 6333:6333 `
    -p 6334:6334 `
    qdrant/qdrant:latest | Out-Null
Confirm-Step "Qdrant Start"
Start-Sleep 3
Write-Host "  [OK] Qdrant started" -ForegroundColor Green

# Step 8: Start Redis
Write-Host "[8/10] Starting Redis..." -ForegroundColor Yellow
podman run -d `
    --name deeplens-redis `
    --network deeplens-network `
    -v deeplens-redis-data:/data `
    -p 6379:6379 `
    redis:latest redis-server --appendonly yes | Out-Null
Confirm-Step "Redis Start"
Start-Sleep 2
Write-Host "  [OK] Redis started" -ForegroundColor Green

# Step 9: Build and start Feature Extraction Service
Write-Host "[9/10] Setting up Feature Extraction Service..." -ForegroundColor Yellow
if (-not $SkipBuild) {
    Write-Host "  Building Docker image..." -ForegroundColor Gray
    podman build -t deeplens-feature-extraction -f src/DeepLens.FeatureExtractionService/Dockerfile src/DeepLens.FeatureExtractionService | Out-Null
    Confirm-Step "Image Build"
}
podman run -d `
    --name deeplens-feature-extraction `
    --network deeplens-network `
    -p 8001:8001 `
    deeplens-feature-extraction | Out-Null
Confirm-Step "Feature Extraction Start"
Start-Sleep 3
Write-Host "  [OK] Feature Extraction Service started" -ForegroundColor Green

# Step 10: Initialize databases
Write-Host "[10/10] Initializing baseline databases..." -ForegroundColor Yellow

# Wait for PostgreSQL to be ready
$maxRetries = 30
$retryCount = 0
while ($retryCount -lt $maxRetries) {
    podman exec deeplens-postgres pg_isready -U postgres 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep 1
    $retryCount++
}

if ($retryCount -eq $maxRetries) {
    Write-Host "  [FAIL] PostgreSQL failed to start in time" -ForegroundColor Red
    exit 1
}

# Run all init scripts in order
Write-Host "  Running database initialization scripts..." -ForegroundColor Gray
$initScripts = Get-ChildItem "infrastructure\init-scripts\postgres\*.sql" | Sort-Object Name
foreach ($script in $initScripts) {
    Write-Host "    Executing: $($script.Name)" -ForegroundColor DarkGray
    # Copy script to container for reliable execution
    podman cp $script.FullName "deeplens-postgres:/tmp/$($script.Name)"
    # Execute inside container
    podman exec -i deeplens-postgres psql -U postgres -d postgres -f "/tmp/$($script.Name)"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    [WARNING] Script $($script.Name) had some issues (exit code $LASTEXITCODE). Continuing..." -ForegroundColor Yellow
    }
    else {
        Write-Host "    [OK] $($script.Name) completed" -ForegroundColor Gray
    }
}
Write-Host "  [OK] Baseline databases initialized" -ForegroundColor Green

# Step 11: Bootstrapping Admin and Demo Data
Write-Host "[11/10] Bootstrapping platform and demo tenant..." -ForegroundColor Yellow

# Shared "Blessed" IDs from codebase
$VAYYARI_ID = "2abbd721-873e-4bf0-9cb2-c93c6894c584"
$ADMIN_ID = "cf123992-628d-4eb4-9721-aef8c59275a5"

# Generate hashes using the existing .NET tool in tools/HashGenerator
Write-Host "  Generating secure hashes using internal tool..." -ForegroundColor Gray
$DOTNET_PATH = "C:\Program Files\dotnet\dotnet.exe"
$HASH_TOOL = "tools\HashGenerator\HashGenerator.csproj"

function Get-BcHash {
    param($password)
    $output = & $DOTNET_PATH run --project $HASH_TOOL $password 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    [FAIL] Failed to generate hash for password." -ForegroundColor Red
        Write-Host $output
        exit 1
    }
    # Parse "Hash: $2a$..." line
    $hashLine = $output | Select-String "Hash:"
    if (-not $hashLine) {
        Write-Host "    [FAIL] Unexpected output from HashGenerator." -ForegroundColor Red
        exit 1
    }
    return $hashLine.ToString().Split(" ")[1].Trim()
}

$ADMIN_HASH = Get-BcHash "DeepLensAdmin123!"
$VAYYARI_HASH = Get-BcHash "DeepLens@Vayyari123!"

$BOOTSTRAP_SQL = @"
-- Clean existing
DELETE FROM users WHERE email IN ('admin@deeplens.local', 'admin@vayyari.local');
DELETE FROM tenants WHERE slug IN ('admin', 'vayyari') OR id IN ('$ADMIN_ID', '$VAYYARI_ID');

-- 1. Create Demo Tenant (Vayyari)
INSERT INTO tenants (id, name, slug, database_name, qdrant_container_name, qdrant_http_port, qdrant_grpc_port, minio_endpoint, minio_bucket_name, status, tier, created_at)
VALUES ('$VAYYARI_ID', 'Vayyari', 'vayyari', 'tenant_vayyari_metadata', 'deeplens-qdrant-Vayyari', 6433, 6434, 'http://localhost:9000', 'vayyari', 1, 1, NOW());

-- 2. Create Platform Admin Tenant
INSERT INTO tenants (id, name, slug, database_name, qdrant_container_name, qdrant_http_port, qdrant_grpc_port, minio_endpoint, minio_bucket_name, status, tier, created_at)
VALUES ('$ADMIN_ID', 'DeepLens Administration', 'admin', 'nextgen_identity', 'deeplens-qdrant', 6333, 6334, 'http://localhost:9000', 'platform-admin', 1, 3, NOW());

-- 3. Create Admin Users
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, created_at)
VALUES 
('9d1645f7-c93d-4c31-97f2-aed8c56275a5', '$ADMIN_ID', 'admin@deeplens.local', '$ADMIN_HASH', 'System', 'Admin', 2, true, NOW()),
('798f62b3-2828-45f0-8ba4-6dd94c1787ff', '$VAYYARI_ID', 'admin@vayyari.local', '$VAYYARI_HASH', 'Vayyari', 'Admin', 2, true, NOW());
"@

# Write SQL to file to avoid piping issues
$bootstrapFile = "bootstrap_temp.sql"
$BOOTSTRAP_SQL | Out-File -FilePath $bootstrapFile -Encoding UTF8

Write-Host "  Executing bootstrap SQL..." -ForegroundColor Gray
cat $bootstrapFile | podman exec -i deeplens-postgres psql -U postgres -d nextgen_identity

if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Database bootstrap failed" -ForegroundColor Red
}
else {
    Write-Host "  [OK] Database bootstrap successful" -ForegroundColor Green
}

Remove-Item $bootstrapFile -ErrorAction SilentlyContinue

# 4. Create Vayyari Tenant Database if missing
$checkVayyariDB = podman exec -i deeplens-postgres psql -U postgres -t -c "SELECT 1 FROM pg_database WHERE datname = 'tenant_vayyari_metadata';"
if (-not ($checkVayyariDB -and $checkVayyariDB.Trim())) {
    podman exec -i deeplens-postgres psql -U postgres -c "CREATE DATABASE tenant_vayyari_metadata WITH TEMPLATE tenant_metadata_template OWNER tenant_service;"
    Write-Host "  [OK] Vayyari database created" -ForegroundColor Green
}

Write-Host "  [OK] Bootstrapping complete" -ForegroundColor Green
Write-Host ""
Write-Host "=== Infrastructure Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Start backend services:  .\infrastructure\start-dotnet-services.ps1" -ForegroundColor White
Write-Host "2. Wait 30s, then seed data: .\seed_data.ps1" -ForegroundColor White
Write-Host "3. Start Web UI:            .\infrastructure\start-ui.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Credentials:" -ForegroundColor Cyan
Write-Host "  - Platform: admin@deeplens.local / DeepLensAdmin123!" -ForegroundColor White
Write-Host "  - Demo:     admin@vayyari.local / DeepLens@Vayyari123!" -ForegroundColor White
Write-Host ""

