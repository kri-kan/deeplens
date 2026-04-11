param (
    [switch]$Clean = $false
)

$ErrorActionPreference = "Continue"
$RepoRoot = Resolve-Path "$PSScriptRoot\..\..\.."

# Paths
$InitScriptsPath = "$RepoRoot\infrastructure\init-scripts\postgres"
$CliToolPath = "$RepoRoot\tools\DeepLens.CLI\DeepLens.CLI.csproj"

function Confirm-Step {
    param([string]$StepName)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] $StepName failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Initializing Databases & Bootstrapping Data..." -ForegroundColor Cyan

# 1. Wait for Postgres
$DbHost = "192.168.0.170"
$DbPort = 5432
$DbPass = "Krikank1$"

Write-Host "  Checking PostgreSQL connection ($DbHost)..." -ForegroundColor Gray
$maxRetries = 10
$retryCount = 0
$connected = $false
while ($retryCount -lt $maxRetries) {
    try {
        $conn = Test-NetConnection -ComputerName $DbHost -Port $DbPort -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if ($conn.TcpTestSucceeded) { 
            $connected = $true
            break 
        }
    } catch {}
    Start-Sleep 2
    $retryCount++
}

if (-not $connected) {
    Write-Host "  [FAIL] PostgreSQL ($DbHost:$DbPort) is not reachable" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Connected to remote Postgres" -ForegroundColor Green

# 2. Run Init Scripts
# Reuse manage-postgres-db module? 
# OR just loop here like original script since DeepLens has MANY scripts.
# We will use the loop for now as it handles specific folder iteration.

$initScripts = Get-ChildItem "$InitScriptsPath\*.sql" | Sort-Object Name
foreach ($script in $initScripts) {
    Write-Host "    Executing: $($script.Name)" -ForegroundColor DarkGray
    # Copy script to container for reliable execution
    podman cp $script.FullName "deeplens-postgres:/tmp/$($script.Name)"
    # Execute inside container
    podman exec -i deeplens-postgres psql -U postgres -d postgres -f "/tmp/$($script.Name)"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    [WARNING] Script $($script.Name) had some issues (exit code $LASTEXITCODE)." -ForegroundColor Yellow
    }
}
Write-Host "  [OK] Baseline databases initialized" -ForegroundColor Green

# 3. Bootstrap Data (CLI)
Write-Host "  Generating bootstrap SQL using DeepLens.CLI..." -ForegroundColor Gray
$VAYYARI_ID = "2abbd721-873e-4bf0-9cb2-c93c6894c584"
$ADMIN_ID = "cf123992-628d-4eb4-9721-aef8c59275a5"
$bootstrapFile = "bootstrap_temp.sql"

dotnet run --project $CliToolPath -- bootstrap-sql "DeepLensAdmin123!" "DeepLens@Vayyari123!" $ADMIN_ID $VAYYARI_ID > $bootstrapFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Executing bootstrap SQL..." -ForegroundColor Gray
    # Pipe content to remote psql
    podman run --rm -i `
        -e PGPASSWORD=$DbPass `
        --network host `
        postgres:15-alpine `
        psql -h $DbHost -p $DbPort -U postgres -d nextgen_identity < $bootstrapFile | Out-Null
    
    Confirm-Step "Bootstrap SQL Execution"
    Write-Host "  [OK] Database bootstrap successful" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] CLI Tool failed to generate SQL" -ForegroundColor Red
}

Remove-Item $bootstrapFile -ErrorAction SilentlyContinue

# 4. Create Vayyari Tenant DB
$checkSQL = "SELECT 1 FROM pg_database WHERE datname = 'tenant_vayyari_metadata';"
$checkVayyariDB = podman run --rm -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -p $DbPort -U postgres -t -c "$checkSQL"
if (-not ($checkVayyariDB -and $checkVayyariDB.Trim())) {
    $createSQL = "CREATE DATABASE tenant_vayyari_metadata WITH TEMPLATE tenant_metadata_template OWNER tenant_service;"
    podman run --rm -e PGPASSWORD=$DbPass --network host postgres:15-alpine psql -h $DbHost -p $DbPort -U postgres -c "$createSQL" | Out-Null
    Write-Host "  [OK] Vayyari database created" -ForegroundColor Green
}
