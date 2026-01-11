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
$maxRetries = 30
$retryCount = 0
while ($retryCount -lt $maxRetries) {
    podman exec deeplens-postgres pg_isready -U postgres 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep 1
    $retryCount++
}
if ($retryCount -eq $maxRetries) {
    Write-Host "  [FAIL] PostgreSQL failed to start in time" -ForegroundColor Red
    exit 1
}

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
    Get-Content $bootstrapFile | podman exec -i deeplens-postgres psql -U postgres -d nextgen_identity
    Confirm-Step "Bootstrap SQL Execution"
    Write-Host "  [OK] Database bootstrap successful" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] CLI Tool failed to generate SQL" -ForegroundColor Red
}

Remove-Item $bootstrapFile -ErrorAction SilentlyContinue

# 4. Create Vayyari Tenant DB
$checkVayyariDB = podman exec -i deeplens-postgres psql -U postgres -t -c "SELECT 1 FROM pg_database WHERE datname = 'tenant_vayyari_metadata';"
if (-not ($checkVayyariDB -and $checkVayyariDB.Trim())) {
    podman exec -i deeplens-postgres psql -U postgres -c "CREATE DATABASE tenant_vayyari_metadata WITH TEMPLATE tenant_metadata_template OWNER tenant_service;"
    Write-Host "  [OK] Vayyari database created" -ForegroundColor Green
}
