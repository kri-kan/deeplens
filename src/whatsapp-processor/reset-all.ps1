#!/usr/bin/env pwsh
# Complete Reset Script for WhatsApp Processor
# Cleans database, MinIO bucket, and optionally WhatsApp session

param(
    [switch]$IncludeSession = $false,
    [switch]$Force = $false
)

Write-Host "🔄 WhatsApp Processor - Complete Reset" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Confirmation
if (-not $Force) {
    Write-Host "⚠️  WARNING: This will:" -ForegroundColor Yellow
    Write-Host "   - Truncate all database tables (chats, messages, etc.)" -ForegroundColor Yellow
    Write-Host "   - Delete all files in MinIO bucket" -ForegroundColor Yellow
    if ($IncludeSession) {
        Write-Host "   - Delete WhatsApp session (requires re-authentication)" -ForegroundColor Red
    }
    Write-Host ""
    $confirm = Read-Host "Are you sure? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "❌ Reset cancelled" -ForegroundColor Red
        exit 0
    }
}

Write-Host ""

# 1. Stop the application
Write-Host "1. Stopping application..." -ForegroundColor Cyan
try {
    taskkill /F /IM node.exe /T 2>$null
    Write-Host "   [OK] Application stopped" -ForegroundColor Green
}
catch {
    Write-Host "   [INFO] No running application found" -ForegroundColor Gray
}

Start-Sleep -Seconds 2

# 2. Reset database schema
Write-Host ""
Write-Host "2. Resetting database schema..." -ForegroundColor Cyan
$env:PGPASSWORD = 'DeepLens123!'
try {
    # Point to common script and explicitly pass DDL path since script was moved
    & "$PSScriptRoot\..\..\infrastructure\scripts\WAProcessor\manage-postgres-db.ps1" -Action "Reset" -DdlPath "$PSScriptRoot\scripts\ddl"
}
catch {
    Write-Host "   [ERROR] Database reset failed: $_" -ForegroundColor Red
}

# 3. Clean MinIO bucket
Write-Host ""
Write-Host "3. Cleaning MinIO bucket..." -ForegroundColor Cyan

# Get bucket name from .env
$bucketName = "whatsapp-data"
if (Test-Path .env) {
    $envContent = Get-Content .env -Raw
    if ($envContent -match 'MINIO_BUCKET=(.+)') {
        $bucketName = $matches[1].Trim()
    }
}

Write-Host "   Bucket: $bucketName" -ForegroundColor Gray

try {
    & "$PSScriptRoot\..\..\infrastructure\scripts\WAProcessor\manage-minio-storage.ps1" -Action "Clean" -BucketName $bucketName
}
catch {
    Write-Host "   [WARN] MinIO cleanup skipped: $_" -ForegroundColor Yellow
}

# 4. Clean Redis Cache
Write-Host ""
Write-Host "4. Cleaning Redis cache..." -ForegroundColor Cyan

# Get Redis DB from .env
$redisDb = 1 # Default
if (Test-Path .env) {
    $envContent = Get-Content .env -Raw
    if ($envContent -match 'REDIS_DB=(\d+)') {
        $redisDb = [int]$matches[1]
    }
}
Write-Host "   Database Index: $redisDb" -ForegroundColor Gray

try {
    & "$PSScriptRoot\..\..\infrastructure\scripts\WAProcessor\manage-redis-cache.ps1" -Action "FlushDb" -DbIndex $redisDb
}
catch {
    Write-Host "   [WARN] Redis cleanup skipped: $_" -ForegroundColor Yellow
}

# 5. Reset Kafka Topic
Write-Host ""
Write-Host "5. Resetting Kafka topic..." -ForegroundColor Cyan
try {
    & "$PSScriptRoot\..\..\infrastructure\scripts\WAProcessor\manage-kafka-topics.ps1" -Action "Recreate" -TopicName "whatsapp-ready-messages"
}
catch {
    Write-Host "   [WARN] Kafka topic reset skipped: $_" -ForegroundColor Yellow
}

# 6. Clean WhatsApp session (optional)
if ($IncludeSession) {
    Write-Host ""
    Write-Host "6. Cleaning WhatsApp session..." -ForegroundColor Cyan
    try {
        & "$PSScriptRoot\scripts\infra\manage-app-session.ps1" -Action "Clear"
    }
    catch {
        Write-Host "   [WARN] Session cleanup skipped: $_" -ForegroundColor Yellow
    }
}

# Summary
Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Reset complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run: npm run dev" -ForegroundColor White
if ($IncludeSession) {
    Write-Host "  2. Scan QR code to authenticate" -ForegroundColor White
    Write-Host "  3. Wait for initial sync" -ForegroundColor White
}
else {
    Write-Host "  2. Wait for initial sync" -ForegroundColor White
}
Write-Host ""
