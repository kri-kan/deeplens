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

# Load environment variables
. "$PSScriptRoot/scripts/helpers/LoadEnv.ps1"
Load-Env -EnvFile "$PSScriptRoot/.env"

# Use variables from .env or fallback to baseline
$RemoteHost = if ($env:INFRA_HOST) { $env:INFRA_HOST } else { "192.168.0.170" }
$PgPort = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { 5432 }
$RedisPort = if ($env:REDIS_PORT) { $env:REDIS_PORT } else { 6379 }
$KafkaPort = if ($env:KAFKA_PORT) { $env:KAFKA_PORT } else { 9092 }
$MinioPort = if ($env:MINIO_PORT) { $env:MINIO_PORT } else { 9000 }
$QdrantDashPort = if ($env:QDRANT_DASH_PORT) { $env:QDRANT_DASH_PORT } else { 6333 }
$InfluxPort = if ($env:INFLUXDB_PORT) { $env:INFLUXDB_PORT } else { 8086 }
$DbPass = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "Krikank1$" }

$allGood = $true

# Check remote infrastructure connectivity
Write-Host "[Infrastructure Connectivity ($RemoteHost)]" -ForegroundColor Yellow
$RequiredPorts = @(
    @{Port = $PgPort; Name = "PostgreSQL"}
    @{Port = $RedisPort; Name = "Redis"}
    @{Port = $KafkaPort; Name = "Kafka"}
    @{Port = $MinioPort; Name = "MinIO (API)"}
    @{Port = $QdrantDashPort; Name = "Qdrant (Dashboard)"}
    @{Port = $InfluxPort; Name = "InfluxDB"}
)

# Helper for cross-platform port testing
function Test-Port {
    param([string]$HostName, [int]$Port)
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $ar = $tcp.BeginConnect($HostName, $Port, $null, $null)
        $wait = $ar.AsyncWaitHandle.WaitOne(1000, $false)
        if ($wait) {
            $tcp.EndConnect($ar)
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        $tcp.Close()
        if ($null -ne $tcp.Dispose) { $tcp.Dispose() }
    }
}

foreach ($item in $RequiredPorts) {
    if (Test-Port -HostName $RemoteHost -Port $item.Port) {
        Write-Host "  [OK] $($item.Name) on port $($item.Port)" -ForegroundColor Green
    }
    else {
        Write-Host "  [FAIL] $($item.Name) on port $($item.Port)" -ForegroundColor Red
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
    @{Name = "MinIO (Remote)"; Url = "http://$RemoteHost`:$MinioPort/minio/health/live" }
    @{Name = "Qdrant (Remote)"; Url = "http://$RemoteHost`:$QdrantDashPort/" }
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

$DbHost = $RemoteHost

docker run --rm -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -U postgres -d nextgen_identity -c "SELECT 1" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] nextgen_identity database" -ForegroundColor Green
}
else {
    Write-Host "  [FAIL] nextgen_identity database" -ForegroundColor Red
    # Show actual error for easier debugging
    Write-Host "    Error: $(docker run --rm -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -U postgres -d nextgen_identity -c 'SELECT 1' 2>&1)" -ForegroundColor DarkGray
    $allGood = $false
}

docker run --rm -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -U postgres -d deeplens_platform -c "SELECT 1" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] deeplens_platform database" -ForegroundColor Green
}
else {
    Write-Host "  [FAIL] deeplens_platform database" -ForegroundColor Red
    # Show actual error for easier debugging
    Write-Host "    Error: $(docker run --rm -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -U postgres -d deeplens_platform -c 'SELECT 1' 2>&1)" -ForegroundColor DarkGray
    $allGood = $false
}

# Summary
Write-Host ""
if ($allGood) {
    Write-Host "=== Environment is healthy ===" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "=== Environment has issues ===`n" -ForegroundColor Red
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check connectivity to ($RemoteHost)(Ping or Browser)" -ForegroundColor Gray
    Write-Host "  2. Ensure Docker Desktop / Engine is running" -ForegroundColor Gray
    exit 1
}

