#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Setup script for WhatsApp Processor database
.DESCRIPTION
    Creates and initializes the whatsapp_vayyari_data database with all required tables.
    This script ensures the database is properly configured for the WhatsApp Processor application.
.PARAMETER Clean
    If specified, drops and recreates the database
.EXAMPLE
    .\setup-whatsapp-db.ps1
    .\setup-whatsapp-db.ps1 -Clean
#>

param(
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

# Configuration
$DB_NAME = "whatsapp_vayyari_data"
$DB_USER = "postgres"
$CONTAINER_NAME = "deeplens-postgres"

Write-Host "=== WhatsApp Processor Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if container is running
Write-Host "[1/4] Checking PostgreSQL container..." -ForegroundColor Yellow
$containerStatus = podman ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}" 2>$null
if (-not $containerStatus -or $containerStatus -notmatch "Up") {
    Write-Host "  [FAIL] Container '$CONTAINER_NAME' is not running" -ForegroundColor Red
    Write-Host "  Please start the infrastructure first:" -ForegroundColor Yellow
    Write-Host "    cd c:\productivity\deeplens" -ForegroundColor Gray
    Write-Host "    .\infrastructure\setup-deeplens-dev.ps1" -ForegroundColor Gray
    exit 1
}
Write-Host "  [OK] PostgreSQL container is running" -ForegroundColor Green

# Wait for PostgreSQL to be ready
Write-Host "[2/4] Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxRetries = 30
$retryCount = 0
while ($retryCount -lt $maxRetries) {
    podman exec $CONTAINER_NAME pg_isready -U $DB_USER 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep 1
    $retryCount++
}

if ($retryCount -eq $maxRetries) {
    Write-Host "  [FAIL] PostgreSQL failed to start in time" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] PostgreSQL is ready" -ForegroundColor Green

# Drop database if Clean flag is set
if ($Clean) {
    Write-Host "[3/4] Dropping existing database..." -ForegroundColor Yellow
    podman exec $CONTAINER_NAME psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>&1 | Out-Null
    Write-Host "  [OK] Existing database dropped" -ForegroundColor Green
}

# Create database if it doesn't exist
Write-Host "[3/4] Creating database..." -ForegroundColor Yellow
$dbExists = podman exec $CONTAINER_NAME psql -U $DB_USER -t -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" 2>&1
if (-not ($dbExists -and $dbExists.Trim())) {
    podman exec $CONTAINER_NAME psql -U $DB_USER -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] Failed to create database" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Database '$DB_NAME' created" -ForegroundColor Green
}
else {
    Write-Host "  [OK] Database '$DB_NAME' already exists" -ForegroundColor Green
}

# Initialize schema
Write-Host "[4/4] Initializing database schema..." -ForegroundColor Yellow
$scriptDir = Join-Path $PSScriptRoot "scripts\ddl"
$scripts = @(
    "001_chats.sql",
    "002_messages.sql",
    "003_chat_tracking_state.sql",
    "004_processing_state.sql",
    "005_media_files.sql"
)

foreach ($script in $scripts) {
    $scriptPath = Join-Path $scriptDir $script
    if (-not (Test-Path $scriptPath)) {
        Write-Host "  [WARNING] Script not found: $script" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "  Executing: $script" -ForegroundColor Gray
    # Run psql and capture output. We don't use 2>&1 | Out-Null here because it can trigger ErrorActionPreference Stop
    # Instead we let it run and check $LASTEXITCODE
    Get-Content $scriptPath | podman exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME > $null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [WARNING] Script $script had issues (exit code: $LASTEXITCODE)" -ForegroundColor Yellow
    }
}

# Verify tables were created
$tableCount = podman exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>&1
if ($tableCount -and $tableCount.Trim() -ge 5) {
    Write-Host "  [OK] Schema initialized successfully ($($tableCount.Trim()) tables created)" -ForegroundColor Green
}
else {
    Write-Host "  [WARNING] Expected 5 tables, found $($tableCount.Trim())" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Database Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Connection Details:" -ForegroundColor Cyan
Write-Host "  Host:     localhost" -ForegroundColor White
Write-Host "  Port:     5433" -ForegroundColor White
Write-Host "  Database: $DB_NAME" -ForegroundColor White
Write-Host "  Username: $DB_USER" -ForegroundColor White
Write-Host "  Password: DeepLens123!" -ForegroundColor White
Write-Host ""
Write-Host "Connection String (for .env):" -ForegroundColor Cyan
Write-Host "  vayyari_wa_db_connection_string=postgresql://${DB_USER}:DeepLens123%21@localhost:5433/${DB_NAME}" -ForegroundColor White
Write-Host ""
