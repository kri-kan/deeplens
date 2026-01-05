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

# 2. Clean database
Write-Host ""
Write-Host "2. Cleaning database..." -ForegroundColor Cyan
$env:PGPASSWORD = 'DeepLens123!'
try {
    $result = podman exec deeplens-postgres psql -U postgres -d whatsapp_vayyari_data -c "TRUNCATE chats, messages, conversation_sync_state, chat_tracking_state, processing_state, media_files CASCADE;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Database tables truncated" -ForegroundColor Green
    }
    else {
        Write-Host "   [WARN] Database truncate failed: $result" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   [ERROR] Database cleanup failed: $_" -ForegroundColor Red
}

# 3. Clean MinIO bucket
Write-Host ""
Write-Host "3. Cleaning MinIO bucket..." -ForegroundColor Cyan

# Get bucket name from .env
$bucketName = "tenant-vayyari-data"
if (Test-Path .env) {
    $envContent = Get-Content .env -Raw
    if ($envContent -match 'MINIO_BUCKET=(.+)') {
        $bucketName = $matches[1].Trim()
    }
}

Write-Host "   Bucket: $bucketName" -ForegroundColor Gray

try {
    # List and remove all objects in the bucket
    $objects = podman exec deeplens-minio mc ls --recursive local/$bucketName 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $objects) {
        Write-Host "   Removing objects..." -ForegroundColor Gray
        $removeResult = podman exec deeplens-minio mc rm --recursive --force local/$bucketName/ 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] MinIO bucket cleaned" -ForegroundColor Green
        }
        else {
            Write-Host "   [WARN] Some objects may not have been removed" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "   [INFO] Bucket is already empty or inaccessible" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   [WARN] MinIO cleanup skipped: $_" -ForegroundColor Yellow
}

# 4. Clean WhatsApp session (optional)
if ($IncludeSession) {
    Write-Host ""
    Write-Host "4. Cleaning WhatsApp session..." -ForegroundColor Cyan
    
    $sessionPath = "./sessions/default_session"
    if (Test-Path $sessionPath) {
        try {
            Remove-Item -Path $sessionPath -Recurse -Force
            Write-Host "   [OK] Session deleted (QR code required on next start)" -ForegroundColor Green
        }
        catch {
            Write-Host "   [ERROR] Session cleanup failed: $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "   [INFO] No session found" -ForegroundColor Gray
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
