#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Starts the DeepLens Web UI
.DESCRIPTION
    Installs dependencies (if needed) and starts the Vite development server
.EXAMPLE
    .\start-ui.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "=== Starting DeepLens Web UI ===" -ForegroundColor Cyan
Write-Host ""

# Check for node/npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "  [FAIL] 'npm' not found in PATH. Please install Node.js." -ForegroundColor Red
    exit 1
}

$uiDir = "src/DeepLens.WebUI"

if (-not (Test-Path "$uiDir/.env")) {
    if (Test-Path "$uiDir/.env.example") {
        Write-Host "  Copying .env.example to .env..." -ForegroundColor Gray
        Copy-Item "$uiDir/.env.example" "$uiDir/.env"
    }
}

Write-Host "[1/2] Installing dependencies (this may take a moment)..." -ForegroundColor Yellow
Set-Location $uiDir
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Dependencies installed" -ForegroundColor Green

Write-Host "[2/2] Starting UI development server..." -ForegroundColor Yellow
# Using '&' to run in background or Start-Process if we want it to persist
Start-Process "npm" -ArgumentList "run dev" -NoNewWindow -WorkingDirectory (Get-Location)

Start-Sleep 3
Write-Host ""
Write-Host "=== UI Started ===" -ForegroundColor Green
Write-Host "  URL: http://localhost:3000" -ForegroundColor White
Write-Host ""
