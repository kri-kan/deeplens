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

$ErrorActionPreference = "Continue"

# Configuration
$DB_NAME = "whatsapp_vayyari_data"
$DB_USER = "postgres"
$DB_PASS = "Krikank1$"
$DB_HOST = "10.31.203.89"
$DB_PORT = 5432

function Run-Remote-Sql {
    param([string]$Sql, [string]$TargetDb = "postgres")
    podman run --rm `
        -e PGPASSWORD=$DB_PASS `
        --network host `
        postgres:15-alpine `
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $TargetDb -c "$Sql" 2>&1
}

function Run-Remote-Sql-File {
    param([string]$FilePath, [string]$TargetDb = $DB_NAME)
    podman run --rm `
        -e PGPASSWORD=$DB_PASS `
        -v "${FilePath}:/tmp/script.sql:Z" `
        --network host `
        postgres:15-alpine `
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $TargetDb -f "/tmp/script.sql" 2>&1
}

Write-Host "=== WhatsApp Processor Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if host is reachable
Write-Host "[1/4] Checking PostgreSQL host ($DB_HOST)..." -ForegroundColor Yellow
$conn = Test-NetConnection -ComputerName $DB_HOST -Port $DB_PORT -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
if (-not $conn.TcpTestSucceeded) {
    Write-Host "  [FAIL] PostgreSQL ($DB_HOST) is not reachable" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] PostgreSQL host is ready" -ForegroundColor Green

# Drop database if Clean flag is set
if ($Clean) {
    Write-Host "[2/4] Dropping existing database..." -ForegroundColor Yellow
    Run-Remote-Sql "DROP DATABASE IF EXISTS $DB_NAME;" | Out-Null
    Write-Host "  [OK] Existing database dropped" -ForegroundColor Green
}

# Create database if it doesn't exist
Write-Host "[3/4] Creating database..." -ForegroundColor Yellow
$dbExists = Run-Remote-Sql "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';"
if ($dbExists -notmatch "1") {
    Run-Remote-Sql "CREATE DATABASE $DB_NAME OWNER $DB_USER;" | Out-Null
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
$localScriptsDir = Join-Path $PSScriptRoot "scripts\ddl"

if (Test-Path $localScriptsDir) {
    # Run setup.sql
    Write-Host "  Executing setup.sql..." -ForegroundColor Gray
    $setupFile = Join-Path $localScriptsDir "setup.sql"
    Run-Remote-Sql-File $setupFile
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] Schema initialization failed" -ForegroundColor Red
    }
    else {
        Write-Host "  [OK] setup.sql executed successfully" -ForegroundColor Green
    }
}
else {
    Write-Host "  [FAIL] scripts/ddl directory not found! Path: $localScriptsDir" -ForegroundColor Red
    exit 1
}

# Verify tables were created
$tableCountStr = Run-Remote-Sql "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" $DB_NAME
if ($tableCountStr -match '(\d+)') {
    $count = $matches[1]
    if ($count -ge 7) {
        Write-Host "  [OK] Schema initialized successfully ($count tables created)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Expected at least 7 tables, found $count" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Database Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Connection Details:" -ForegroundColor Cyan
Write-Host "  Host:     10.31.203.89" -ForegroundColor White
Write-Host "  Port:     5432" -ForegroundColor White
Write-Host "  Database: $DB_NAME" -ForegroundColor White
Write-Host "  Username: $DB_USER" -ForegroundColor White
Write-Host "  Password: Krikank1$" -ForegroundColor White
Write-Host ""
Write-Host "Connection String (for .env):" -ForegroundColor Cyan
Write-Host "  vayyari_wa_db_connection_string=postgresql://${DB_USER}:Krikank1%24@10.31.203.89:5432/${DB_NAME}" -ForegroundColor White
Write-Host ""
