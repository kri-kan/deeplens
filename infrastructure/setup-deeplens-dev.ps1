#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Complete DeepLens development environment setup script (Orchestrator)
.DESCRIPTION
    This script sets up the entire DeepLens development environment by coordinating modular lifecycle scripts:
    1. Infrastructure Cleanup (manage-cleanup.ps1)
    2. Core Services Start (start-core-services.ps1)
    3. Messaging Services Start (start-messaging-services.ps1)
    4. Observability Start (start-observability.ps1)
    5. Data Initialization (init-bootstrap-data.ps1)
#>

param(
    [switch]$Clean,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Continue"
$ScriptsRoot = "$PSScriptRoot\scripts\lifecycle"
$CommonScriptsRoot = "$PSScriptRoot\scripts\WAProcessor"

Write-Host "=== DeepLens Development Environment Setup (Modular) ===" -ForegroundColor Cyan
Write-Host ""

# 1. Cleanup
if ($Clean) {
    Write-Host "[1/6] Cleaning infrastructure..." -ForegroundColor Yellow
    & "$ScriptsRoot\manage-cleanup.ps1"
}

# 2. Start Core Services
Write-Host "[2/6] Starting Core Services..." -ForegroundColor Yellow
& "$ScriptsRoot\start-core-services.ps1"

# 3. Start Messaging Services
Write-Host "[3/6] Starting Messaging Services..." -ForegroundColor Yellow
& "$ScriptsRoot\start-messaging-services.ps1"

# 3a. Create Kafka Topics
Write-Host "  Creating Kafka Topics..." -ForegroundColor Yellow
$requiredTopics = @(
    "deeplens.images.uploaded",
    "deeplens.videos.uploaded",
    "deeplens.features.extraction",
    "deeplens.vectors.indexing",
    "deeplens.processing.completed",
    "deeplens.processing.failed",
    "deeplens.images.maintenance"
)

foreach ($topic in $requiredTopics) {
    & "$CommonScriptsRoot\manage-kafka-topics.ps1" -Action "Create" -TopicName $topic | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Host "    [WARN] Failed to create topic $topic" -ForegroundColor Yellow }
}

# 3b. Cleanup Data (Topics/Buckets) if Clean was requested
# This runs AFTER services start because we need the services to accept delete commands
if ($Clean) {
    Write-Host "  [CLEAN] Cleaning App Data (Topics/Buckets)..." -ForegroundColor Yellow
    
    # Kafka Topics
    # We loop and use the common script
    try {
        $topics = podman exec deeplens-kafka kafka-topics --bootstrap-server localhost:9092 --list 2>$null
        if ($topics) {
            $deepLensTopics = $topics -split "\r?\n" | Where-Object { $_ -match "^deeplens-" }
            foreach ($topic in $deepLensTopics) {
                 & "$CommonScriptsRoot\manage-kafka-topics.ps1" -Action "Delete" -TopicName $topic
            }
        }
    } catch { Write-Host "    [WARN] Kafka cleanup issue: $_" -ForegroundColor Gray }

    # MinIO Buckets
    try {
        & "$CommonScriptsRoot\manage-minio-storage.ps1" -Action "Clean" -BucketName "vayyari"
        & "$CommonScriptsRoot\manage-minio-storage.ps1" -Action "Clean" -BucketName "platform-admin"
    } catch { Write-Host "    [WARN] MinIO cleanup issue: $_" -ForegroundColor Gray }
}

# 4. Start Observability
Write-Host "[4/6] Starting Observability Stack..." -ForegroundColor Yellow
& "$ScriptsRoot\start-observability.ps1"

# 5. Feature Extraction
Write-Host "[5/6] Setting up Feature Extraction Service..." -ForegroundColor Yellow
if (-not $SkipBuild) {
    Write-Host "  Building Docker image..." -ForegroundColor Gray
    podman build -t deeplens-feature-extraction -f src/DeepLens.FeatureExtractionService/Dockerfile src/DeepLens.FeatureExtractionService | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Host "  [FAIL] Build failed" -ForegroundColor Red; exit 1 }
}
podman run -d `
    --name deeplens-feature-extraction `
    --network deeplens-network `
    -v "${PWD}/src/DeepLens.FeatureExtractionService/models:/app/models" `
    -p 8001:8001 `
    deeplens-feature-extraction | Out-Null
Write-Host "  [OK] Feature Extraction Service started" -ForegroundColor Green

# 6. Initialize Data
Write-Host "[6/6] Initializing & Bootstrapping Data..." -ForegroundColor Yellow
& "$ScriptsRoot\init-bootstrap-data.ps1"

Write-Host ""
Write-Host "=== Infrastructure Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Start backend services:  .\infrastructure\start-dotnet-services.ps1" -ForegroundColor White
Write-Host "2. Wait 30s, then seed data: .\seed_data.ps1" -ForegroundColor White
Write-Host "3. Start Web UI:            .\infrastructure\start-ui.ps1" -ForegroundColor White
