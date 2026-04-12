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

Write-Host "Initializing Databases & Bootstrapping Data..." -ForegroundColor Cyan

# Load environment variables
. "$PSScriptRoot/../../scripts/helpers/LoadEnv.ps1"
Load-Env -EnvFile "$PSScriptRoot/../../.env"

# 1. Wait for Postgres
$DbHost = $env:INFRA_HOST ?? "192.168.0.170"
$DbPort = $env:POSTGRES_PORT ?? 5432
$DbPass = $env:POSTGRES_PASSWORD ?? "Krikank1$"

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

# 2. Run Init Scripts (Service-Oriented Order)
$serviceOrder = @("identity", "tenant-manager", "deeplens-core", "search-api", "competitor-intel")

foreach ($service in $serviceOrder) {
    $serviceDir = "$InitScriptsPath/$service"
    if (-not (Test-Path $serviceDir)) {
        Write-Host "    [SKIP] Service folder not found: $service" -ForegroundColor Gray
        continue
    }

    Write-Host "    Service: $service" -ForegroundColor Yellow
    $scripts = Get-ChildItem "$serviceDir/*.sql" | Sort-Object Name
    foreach ($script in $scripts) {
        # Determine target database from filename or service name
        $targetDb = "postgres"
        if ($script.Name -match "nextgen_identity") { $targetDb = "nextgen_identity" }
        elseif ($script.Name -match "deeplens_platform") { $targetDb = "deeplens_platform" }
        elseif ($script.Name -match "tenant_metadata_template") { $targetDb = "tenant_metadata_template" }
        elseif ($script.Name -match "tenant_vayyari_metadata") { $targetDb = "tenant_vayyari_metadata" }
        elseif ($service -eq "identity") { $targetDb = "nextgen_identity" } # Fallback for granular files
        elseif ($service -eq "deeplens-core") { $targetDb = "deeplens_platform" }
        elseif ($service -eq "tenant-manager") { $targetDb = "tenant_metadata_template" }

        Write-Host "      Executing: $($script.Name) (Target: $targetDb)" -ForegroundColor DarkGray
        Get-Content $script.FullName | podman run --rm -i -e PGPASSWORD=$DbPass --network host postgres:latest psql -h $DbHost -p $DbPort -U postgres -d $targetDb | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "      [WARNING] Script $($script.Name) had some issues (exit code $LASTEXITCODE)." -ForegroundColor Yellow
        }
    }
}

Write-Host "  [OK] Baseline databases initialized" -ForegroundColor Green

# 3. Bootstrap Data (CLI)
Write-Host "  Generating bootstrap SQL using DeepLens.CLI..." -ForegroundColor Gray
$VAYYARI_ID = "2abbd721-873e-4bf0-9cb2-c93c6894c584"
$ADMIN_ID = "cf123992-628d-4eb4-9721-aef8c59275a5"
$bootstrapFile = "bootstrap_temp.sql"

# Check if dotnet is available
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "  [FAIL] 'dotnet' CLI not found. Please install .NET SDK or add it to PATH." -ForegroundColor Red
    exit 1
}

dotnet run --project $CliToolPath -- bootstrap-sql "DeepLensAdmin123!" "DeepLens@Vayyari123!" $ADMIN_ID $VAYYARI_ID > $bootstrapFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Executing bootstrap SQL..." -ForegroundColor Gray
    Get-Content $bootstrapFile | docker run --rm -i -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -p $DbPort -U postgres -d nextgen_identity | Out-Null
    Confirm-Step "Bootstrap SQL Execution"
    Write-Host "  [OK] Database bootstrap successful" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] CLI Tool failed to generate SQL" -ForegroundColor Red
}

Remove-Item $bootstrapFile -ErrorAction SilentlyContinue

# 4. Create Vayyari Tenant DB
$checkSQL = "SELECT 1 FROM pg_database WHERE datname = 'tenant_vayyari_metadata';"
$checkVayyariDB = docker run --rm -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -p $DbPort -U postgres -t -c "$checkSQL"
if (-not ($checkVayyariDB -and $checkVayyariDB.Trim())) {
    $createSQL = "CREATE DATABASE tenant_vayyari_metadata WITH TEMPLATE tenant_metadata_template OWNER tenant_service;"
    docker run --rm -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -p $DbPort -U postgres -c "$createSQL" | Out-Null
    Write-Host "  [OK] Vayyari database created" -ForegroundColor Green
}
