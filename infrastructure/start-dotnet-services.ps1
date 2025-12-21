#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Starts all DeepLens .NET services
.DESCRIPTION
    Starts Identity API, Search API, and Worker Service in the background
.EXAMPLE
    .\start-dotnet-services.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "=== Starting DeepLens .NET Services ===" -ForegroundColor Cyan
Write-Host ""

# Stop any existing dotnet processes
Write-Host "[1/4] Stopping existing services..." -ForegroundColor Yellow
Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2
Write-Host "  [OK] Existing services stopped" -ForegroundColor Green

# Start Identity API
Write-Host "[2/4] Starting Identity API..." -ForegroundColor Yellow
Start-Process "C:\Program Files\dotnet\dotnet.exe" `
    -ArgumentList "run --project src\NextGen.Identity.Api\NextGen.Identity.Api.csproj" `
    -NoNewWindow `
    -WorkingDirectory (Get-Location)

Start-Sleep 5
Write-Host "  [OK] Identity API started on http://localhost:5198" -ForegroundColor Green

# Start Search API
Write-Host "[3/4] Starting Search API..." -ForegroundColor Yellow
Start-Process "C:\Program Files\dotnet\dotnet.exe" `
    -ArgumentList "run --project src\DeepLens.SearchApi\DeepLens.SearchApi.csproj" `
    -NoNewWindow `
    -WorkingDirectory (Get-Location)

Start-Sleep 5
Write-Host "  [OK] Search API started on http://localhost:5000" -ForegroundColor Green

# Start Worker Service
Write-Host "[4/4] Starting Worker Service..." -ForegroundColor Yellow
Start-Process "C:\Program Files\dotnet\dotnet.exe" `
    -ArgumentList "run --project src\DeepLens.WorkerService\DeepLens.WorkerService.csproj" `
    -NoNewWindow `
    -WorkingDirectory (Get-Location)

Start-Sleep 5
Write-Host "  [OK] Worker Service started" -ForegroundColor Green

Write-Host ""
Write-Host "=== All Services Started ===" -ForegroundColor Green
Write-Host ""
Write-Host "Running services:" -ForegroundColor Cyan
$processes = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue
Write-Host "  $($processes.Count) dotnet processes running" -ForegroundColor White
Write-Host ""
Write-Host "To view logs, check the console output or use:" -ForegroundColor Gray
Write-Host "  Get-Process -Name dotnet | Select-Object Id, StartTime" -ForegroundColor Gray
Write-Host ""

