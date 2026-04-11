param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("Reset", "Init", "Drop")]
    [string]$Action = "Reset",

    [Parameter(Mandatory=$false)]
    [string]$DatabaseName = "whatsapp_vayyari_data",

    [Parameter(Mandatory=$false)]
    [string]$ContainerName = "", # If empty, a temporary container will be used for remote connection

    [Parameter(Mandatory=$false)]
    [string]$DbHost = "192.168.0.170",

    [Parameter(Mandatory=$false)]
    [int]$DbPort = 5432,

    [Parameter(Mandatory=$false)]
    [string]$DbUser = "postgres",

    [Parameter(Mandatory=$false)]
    [string]$DbPass = "Krikank1$",

    [Parameter(Mandatory=$false)]
    [string]$DdlPath = "$PSScriptRoot\..\ddl" 
)

$ErrorActionPreference = "Continue"

function Run-Psql-Cmd {
    param($Cmd, [string]$TargetDb = $DatabaseName)
    
    if (-not [string]::IsNullOrEmpty($ContainerName)) {
        # Use existing local container
        docker exec $ContainerName psql -U $DbUser -d $TargetDb -c "$Cmd" 2>&1
    } else {
        # Use temporary container for remote connection
        docker run --rm `
            -e PGPASSWORD=$DbPass `
            --network host `
            postgres:15-alpine `
            psql -h $DbHost -p $DbPort -U $DbUser -d $TargetDb -c "$Cmd" 2>&1
    }
}

function Run-Psql-File {
    param($FileName, [string]$TargetDb = $DatabaseName)
    
    if (-not [string]::IsNullOrEmpty($ContainerName)) {
        # Use existing local container
        docker exec $ContainerName sh -c "cd /tmp/ddl && psql -U $DbUser -d $TargetDb -f $FileName" 2>&1
    } else {
        # Use temporary container for remote connection
        # Mount the DDL path to /tmp/ddl inside the container
        docker run --rm `
            -e PGPASSWORD=$DbPass `
            -v "${DdlPath}:/tmp/ddl:Z" `
            --network host `
            postgres:15-alpine `
            psql -h $DbHost -p $DbPort -U $DbUser -d $TargetDb -f "/tmp/ddl/$FileName" 2>&1
    }
}

Write-Host "Postgres Manager: Performing $Action on '$DatabaseName'..." -ForegroundColor Cyan

try {
    switch ($Action) {
        "Drop" {
            Write-Host "  Dropping public schema..." -ForegroundColor Yellow
            $res = Run-Psql-Cmd "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
            if ($LASTEXITCODE -ne 0) { throw "Schema drop failed: $res" }
            Write-Host "  [OK] Schema dropped." -ForegroundColor Green
        }

        "Init" {
            Write-Host "  Copying DDL scripts from $DdlPath..." -ForegroundColor Gray
            if (-not (Test-Path $DdlPath)) { throw "DDL path not found: $DdlPath" }
            
            # Skip local cleanup if using remote
            if (-not [string]::IsNullOrEmpty($ContainerName)) {
                # Cleanup
                docker exec $ContainerName rm -rf /tmp/ddl
            }
            Write-Host "  [OK] Database initialized." -ForegroundColor Green
        }

        "Reset" {
            # Check if DB exists (connect to 'postgres' DB to check)
            $existsCheck = Run-Psql-Cmd "SELECT 1 FROM pg_database WHERE datname='$DatabaseName'" "postgres"
            if ($existsCheck -notmatch "1") {
                Write-Host "  Database '$DatabaseName' does not exist. Creating..." -ForegroundColor Yellow
                Run-Psql-Cmd "CREATE DATABASE ""$DatabaseName"";" "postgres" | Out-Null
            } else {
                # Drop existing schema
                Write-Host "  Dropping existing schema..." -ForegroundColor Yellow
                $res = Run-Psql-Cmd "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
                # Warn but continue on drop failure
                if ($LASTEXITCODE -ne 0) { Write-Host "  [WARN] Schema drop issue: $res" -ForegroundColor Gray }
            }

            Write-Host "  Applying fresh schema..." -ForegroundColor Yellow
            $res = Run-Psql-File "setup.sql"
            if ($LASTEXITCODE -ne 0) { throw "Setup failed: $res" }

             # Cleanup (only if local)
            if (-not [string]::IsNullOrEmpty($ContainerName)) {
                docker exec $ContainerName rm -rf /tmp/ddl
            }
            Write-Host "  [OK] Database successfully reset." -ForegroundColor Green
        }
    }
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
