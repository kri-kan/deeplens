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

$nodePath = "C:\Users\ADMIN\AppData\Local\nvm\v25.2.1"
$env:PATH = "$nodePath;$env:PATH"
$uiDir = "src\DeepLens.WebUI"

if (-not (Test-Path "$uiDir\.env")) {
    Write-Host "  Copying .env.example to .env..." -ForegroundColor Gray
    Copy-Item "$uiDir\.env.example" "$uiDir\.env"
}

Write-Host "[1/2] Installing dependencies (this may take a moment)..." -ForegroundColor Yellow
Set-Location $uiDir
npm install --no-audit --no-fund | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Dependencies installed" -ForegroundColor Green

Write-Host "[2/2] Starting UI development server..." -ForegroundColor Yellow
$npmCmd = Join-Path $nodePath "npm.cmd"
Start-Process $npmCmd -ArgumentList "run dev" -NoNewWindow -WorkingDirectory (Get-Location)

Start-Sleep 3
Write-Host ""
Write-Host "=== UI Started ===" -ForegroundColor Green
Write-Host "  URL: http://localhost:3000" -ForegroundColor White
Write-Host ""
