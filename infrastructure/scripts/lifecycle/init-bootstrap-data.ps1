param (
    [switch]$Clean = $false
)

$ErrorActionPreference = "Continue"
$RepoRoot = Resolve-Path "$PSScriptRoot/../../.."

# Paths (using forward slashes)
$InitScriptsPath = "$RepoRoot/setupscripts/application"
$CliToolPath = "$RepoRoot/tools/DeepLens.CLI/DeepLens.CLI.csproj"

# Helper for cross-platform port testing
function Test-Port {
    param([string]$HostName, [int]$Port)
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $ar = $tcp.BeginConnect($HostName, $Port, $null, $null)
        if ($ar.AsyncWaitHandle.WaitOne(1000, $false)) {
            $tcp.EndConnect($ar)
            return $true
        }
        return $false
    } catch { return $false }
    finally { $tcp.Close() }
}

function Confirm-Step {
    param([string]$StepName)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] $StepName failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Initializing Single-Tenant Databases & Bootstrapping Data..." -ForegroundColor Cyan

# Load environment variables
. "$PSScriptRoot/../../scripts/helpers/LoadEnv.ps1"
Load-Env -EnvFile "$PSScriptRoot/../../.env"

# 1. Wait for Postgres
$DbHost = $env:INFRA_IP ?? "192.168.0.170"
$DbPort = $env:POSTGRES_PORT ?? 5432
$DbPass = $env:INFRA_ADMIN_PASSWORD ?? "Krikank1$"

Write-Host "  Checking PostgreSQL connection ($DbHost)..." -ForegroundColor Gray
$maxRetries = 10
$retryCount = 0
$connected = $false

while ($retryCount -lt $maxRetries) {
    if (Test-Port -HostName $DbHost -Port $DbPort) { 
        $connected = $true
        break 
    }
    Start-Sleep 2
    $retryCount++
}

if (-not $connected) {
    Write-Host "  [FAIL] PostgreSQL ($($DbHost):$($DbPort)) is not reachable" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Connected to remote Postgres" -ForegroundColor Green

# 2. Run Init Scripts (Simplified Order)
$serviceOrder = @("identity", "deeplens-core", "search-api", "competitor-intel")

foreach ($service in $serviceOrder) {
    $serviceDir = "$InitScriptsPath/$service"
    if (-not (Test-Path $serviceDir)) {
        Write-Host "    [SKIP] Service folder not found: $service" -ForegroundColor Gray
        continue
    }

    Write-Host "    Service: $service" -ForegroundColor Yellow
    $scripts = Get-ChildItem "$serviceDir/*.sql" | Sort-Object Name
    foreach ($script in $scripts) {
        $targetDb = "postgres"
        if ($script.Name -match "nextgen_identity") { $targetDb = "nextgen_identity" }
        elseif ($script.Name -match "deeplens_platform") { $targetDb = "deeplens_platform" }
        elseif ($service -eq "identity") { $targetDb = "nextgen_identity" }
        elseif ($service -eq "deeplens-core") { $targetDb = "deeplens_platform" }
        elseif ($service -eq "search-api") { $targetDb = "deeplens_platform" }

        Write-Host "      Executing: $($script.Name) (Target: $targetDb)" -ForegroundColor DarkGray
        Get-Content $script.FullName | docker run --rm -i -e PGPASSWORD=$DbPass --network host postgres:latest psql -h $DbHost -p $DbPort -U postgres -d $targetDb | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "      [WARNING] Script $($script.Name) had some issues." -ForegroundColor Yellow
        }
    }
}

Write-Host "  [OK] Databases initialized" -ForegroundColor Green
Write-Host "=== DeepLens Single-Tenant Environment Ready ===" -ForegroundColor Green
