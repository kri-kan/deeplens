param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("Reset", "Init", "Drop")]
    [string]$Action = "Reset",

    [Parameter(Mandatory=$false)]
    [string]$DatabaseName = "whatsapp_vayyari_data",

    [Parameter(Mandatory=$false)]
    [string]$ContainerName = "deeplens-postgres",

    [Parameter(Mandatory=$false)]
    [string]$DdlPath = "$PSScriptRoot\..\ddl" 
)

$ErrorActionPreference = "Continue"

function Run-Psql-Cmd {
    param($Cmd)
    # Write-Host "DEBUG: Running SQL: $Cmd" -ForegroundColor DarkGray
    podman exec $ContainerName psql -U postgres -d $DatabaseName -c "$Cmd" 2>&1
}

function Run-Psql-File {
    param($FileName)
    # Run from inside the directory so relative paths in SQL work
    podman exec $ContainerName sh -c "cd /tmp/ddl && psql -U postgres -d $DatabaseName -f $FileName" 2>&1
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
            
            podman exec $ContainerName rm -rf /tmp/ddl
            podman cp "$DdlPath" "$($ContainerName):/tmp/ddl" 2>&1 | Out-Null
            
            Write-Host "  Executing setup.sql..." -ForegroundColor Yellow
            $res = Run-Psql-File "setup.sql"
            if ($LASTEXITCODE -ne 0) { throw "Setup failed: $res" }

            # Cleanup
            podman exec $ContainerName rm -rf /tmp/ddl
            Write-Host "  [OK] Database initialized." -ForegroundColor Green
        }

        "Reset" {
            # Check if DB exists (connect to 'postgres' DB to check)
            $existsCheck = podman exec $ContainerName psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DatabaseName'"
            if ($existsCheck -ne "1") {
                Write-Host "  Database '$DatabaseName' does not exist. Creating..." -ForegroundColor Yellow
                podman exec $ContainerName psql -U postgres -d postgres -c "CREATE DATABASE ""$DatabaseName"";" 2>&1 | Out-Null
            } else {
                # Drop existing schema
                Write-Host "  Dropping existing schema..." -ForegroundColor Yellow
                $res = Run-Psql-Cmd "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
                # Warn but continue on drop failure
                if ($LASTEXITCODE -ne 0) { Write-Host "  [WARN] Schema drop issue: $res" -ForegroundColor Gray }
            }

            # Init
            Write-Host "  Copying DDL scripts from $DdlPath..." -ForegroundColor Gray
            if (-not (Test-Path $DdlPath)) { throw "DDL path not found: $DdlPath" }
            
            # Remove old if exists
            podman exec $ContainerName rm -rf /tmp/ddl
            
            # Copy folder
            podman cp "$DdlPath" "$($ContainerName):/tmp/ddl" 2>&1 | Out-Null
            
            Write-Host "  Applying fresh schema..." -ForegroundColor Yellow
            $res = Run-Psql-File "setup.sql"
            if ($LASTEXITCODE -ne 0) { throw "Setup failed: $res" }

             # Cleanup
            podman exec $ContainerName rm -rf /tmp/ddl
            Write-Host "  [OK] Database successfully reset." -ForegroundColor Green
        }
    }
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
