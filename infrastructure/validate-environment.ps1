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

# Check remote infrastructure connectivity
Write-Host "[Infrastructure Connectivity (192.168.0.170)]" -ForegroundColor Yellow
$RemoteHost = "192.168.0.170"
$RequiredPorts = @(
    @{Port = 5432; Name = "PostgreSQL"}
    @{Port = 6379; Name = "Redis"}
    @{Port = 9092; Name = "Kafka"}
    @{Port = 9000; Name = "MinIO (API)"}
    @{Port = 6333; Name = "Qdrant (Dashboard)"}
    @{Port = 8086; Name = "InfluxDB"}
)

foreach ($item in $RequiredPorts) {
    try {
        $conn = Test-NetConnection -ComputerName $RemoteHost -Port $item.Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if ($conn.TcpTestSucceeded) {
            Write-Host "  [OK] $($item.Name) on port $($item.Port)" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $($item.Name) on port $($item.Port) (Unreachable)" -ForegroundColor Red
            $allGood = $false
        }
    } catch {
        Write-Host "  [FAIL] $($item.Name) on port $($item.Port) (Error)" -ForegroundColor Red
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
    @{Name = "MinIO (Remote)"; Url = "http://192.168.0.170:9000/minio/health/live" }
    @{Name = "Qdrant (Remote)"; Url = "http://192.168.0.170:6333/" }
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

# Check remote databases
Write-Host ""
Write-Host "[Remote Databases]" -ForegroundColor Yellow

$DbPass = "Krikank1$"
$DbHost = "192.168.0.170"

podman run --rm -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -U postgres -d nextgen_identity -c "SELECT 1" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] nextgen_identity database" -ForegroundColor Green
}
else {
    Write-Host "  [FAIL] nextgen_identity database" -ForegroundColor Red
    $allGood = $false
}

podman run --rm -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -U postgres -d tenant_metadata_template -c "SELECT 1" 2>&1 | Out-Null
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

