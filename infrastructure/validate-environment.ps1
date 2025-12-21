#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Validates the DeepLens development environment
.DESCRIPTION
    Checks that all required services are running and accessible
.EXAMPLE
    .\validate-environment.ps1
#>

$ErrorActionPreference = "Continue"

Write-Host "=== DeepLens Environment Validation ===" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check containers
Write-Host "[Infrastructure Containers]" -ForegroundColor Yellow
$requiredContainers = @(
    "deeplens-postgres",
    "deeplens-kafka",
    "deeplens-zookeeper",
    "deeplens-minio",
    "deeplens-qdrant",
    "deeplens-redis",
    "deeplens-feature-extraction"
)

foreach ($container in $requiredContainers) {
    $status = podman ps --filter "name=$container" --format "{{.Status}}" 2>$null
    if ($status -match "Up") {
        Write-Host "  [OK] $container" -ForegroundColor Green
    }
    else {
        Write-Host "  [FAIL] $container (not running)" -ForegroundColor Red
        $allGood = $false
    }
}

# Check .NET services
Write-Host ""
Write-Host "[.NET Services]" -ForegroundColor Yellow
$dotnetProcesses = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue
if ($dotnetProcesses.Count -ge 3) {
    Write-Host "  [OK] $($dotnetProcesses.Count) dotnet processes running" -ForegroundColor Green
}
else {
    Write-Host "  [FAIL] Expected 3 dotnet processes, found $($dotnetProcesses.Count)" -ForegroundColor Red
    $allGood = $false
}

# Check service endpoints
Write-Host ""
Write-Host "[Service Endpoints]" -ForegroundColor Yellow

$endpoints = @(
    @{Name = "Identity API"; Url = "http://localhost:5198/.well-known/openid-configuration" }
    @{Name = "Search API"; Url = "http://localhost:5000/swagger/index.html" }
    @{Name = "MinIO"; Url = "http://localhost:9000/minio/health/live" }
    @{Name = "Qdrant"; Url = "http://localhost:6333/" }
    @{Name = "Feature Extraction"; Url = "http://localhost:8001/health" }
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint.Url -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  [OK] $($endpoint.Name)" -ForegroundColor Green
        }
        else {
            Write-Host "  [FAIL] $($endpoint.Name) (HTTP $($response.StatusCode))" -ForegroundColor Red
            $allGood = $false
        }
    }
    catch {
        Write-Host "  [FAIL] $($endpoint.Name) (not accessible)" -ForegroundColor Red
        $allGood = $false
    }
}

# Check databases
Write-Host ""
Write-Host "[Databases]" -ForegroundColor Yellow

podman exec deeplens-postgres psql -U postgres -d nextgen_identity -c "SELECT 1" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] nextgen_identity database" -ForegroundColor Green
}
else {
    Write-Host "  [FAIL] nextgen_identity database" -ForegroundColor Red
    $allGood = $false
}

podman exec deeplens-postgres psql -U postgres -d tenant_metadata_template -c "SELECT 1" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] tenant_metadata_template database" -ForegroundColor Green
}
else {
    Write-Host "  [FAIL] tenant_metadata_template database" -ForegroundColor Red
    $allGood = $false
}

# Summary
Write-Host ""
if ($allGood) {
    Write-Host "=== Environment is healthy ===" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "=== Environment has issues ===" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Run: .\infrastructure\setup-deeplens-dev.ps1 -Clean" -ForegroundColor Gray
    Write-Host "  2. Check logs: podman logs <container-name>" -ForegroundColor Gray
    exit 1
}

