#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Complete end-to-end DeepLens setup with tenant provisioning and data seeding
.DESCRIPTION
    This script performs a complete setup:
    1. Infrastructure (containers)
    2. .NET services
    3. Platform admin initialization
    4. Tenant provisioning
    5. Test data seeding
    6. Environment validation
.PARAMETER Clean
    Start fresh by removing all existing containers and data
.EXAMPLE
    .\setup-complete.ps1
    .\setup-complete.ps1 -Clean
#>

param(
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   DeepLens Complete Development Environment Setup        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date

# Step 1: Infrastructure Setup
Write-Host "=== Step 1/6: Infrastructure Setup ===" -ForegroundColor Cyan
if ($Clean) {
    & ".\infrastructure\setup-deeplens-dev.ps1" -Clean
}
else {
    & ".\infrastructure\setup-deeplens-dev.ps1"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "X Infrastructure setup failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Start-Sleep 5

# Step 2: Start .NET Services
Write-Host "=== Step 2/6: Starting .NET Services ===" -ForegroundColor Cyan
& ".\infrastructure\start-dotnet-services.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "X Failed to start .NET services" -ForegroundColor Red
    exit 1
}

Write-Host ""
Start-Sleep 10

# Steps 3-4: Bootstrapping (Covered in Step 1)
Write-Host "=== Steps 3-4: Bootstrapping (Covered in Infrastructure Setup) ===" -ForegroundColor Cyan
Write-Host "  Platform Admin and Vayyari Tenant were bootstrapped during infrastructure setup." -ForegroundColor Gray

Write-Host ""
Start-Sleep 2

# Step 5: Seed Test Data
Write-Host "=== Step 5/6: Seeding Test Data ===" -ForegroundColor Cyan
if (Test-Path ".\seed_data.ps1") {
    & ".\seed_data.ps1"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "X Data seeding failed" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "  ! seed_data.ps1 not found, skipping" -ForegroundColor Yellow
}

Write-Host ""
Start-Sleep 5

# Step 6: Validate Environment
Write-Host "=== Step 6/6: Validating Environment ===" -ForegroundColor Cyan
& ".\infrastructure\validate-environment.ps1"

$validationResult = $LASTEXITCODE

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
if ($validationResult -eq 0) {
    Write-Host "   SUCCESS! Setup Complete. Environment is ready.         " -ForegroundColor Green
}
else {
    Write-Host "   WARNING: Setup completed with issues.                  " -ForegroundColor Yellow
}
Write-Host "   Duration: $($duration.ToString('mm\:ss'))" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Credentials:" -ForegroundColor Cyan
Write-Host "  Platform Admin:  admin@deeplens.local / DeepLensAdmin123!" -ForegroundColor White
Write-Host "  Tenant Admin:    admin@Vayyari.local / DeepLens@Vayyari123!" -ForegroundColor White
Write-Host "  MinIO:           deeplens / DeepLens123!" -ForegroundColor White
Write-Host "  PostgreSQL:      postgres / DeepLens123!" -ForegroundColor White
Write-Host "  Grafana:         admin / DeepLens123!" -ForegroundColor White
Write-Host ""

Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "  Identity API:    http://localhost:5198" -ForegroundColor White
Write-Host "  Search API:      http://localhost:5000" -ForegroundColor White
Write-Host "  Swagger:         http://localhost:5000/swagger" -ForegroundColor White
Write-Host "  MinIO Console:   http://localhost:9001" -ForegroundColor White
Write-Host "  Jaeger (Traces): http://localhost:16686" -ForegroundColor White
Write-Host "  Grafana (Dash):  http://localhost:3000" -ForegroundColor White
Write-Host "  Prometheus:      http://localhost:9090" -ForegroundColor White
Write-Host "  WhatsApp UI:     http://localhost:3005" -ForegroundColor White
Write-Host ""

exit $validationResult
