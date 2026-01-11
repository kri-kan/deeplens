param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("Clear", "Check")]
    [string]$Action = "Check",

    [Parameter(Mandatory=$false)]
    [string]$SessionDir = "$PSScriptRoot\..\..\sessions\default_session"
)

$ErrorActionPreference = "Stop"

Write-Host "Session Manager: Performing $Action..." -ForegroundColor Cyan

try {
    switch ($Action) {
        "Check" {
            if (Test-Path $SessionDir) {
                Write-Host "  [INFO] Session exists at: $SessionDir" -ForegroundColor Green
            } else {
                Write-Host "  [INFO] No session found at: $SessionDir" -ForegroundColor Gray
            }
        }

        "Clear" {
            if (Test-Path $SessionDir) {
                Write-Host "  Removing session directory..." -ForegroundColor Yellow
                Remove-Item -Path $SessionDir -Recurse -Force
                Write-Host "  [OK] Session deleted." -ForegroundColor Green
            } else {
                Write-Host "  [INFO] Session directory not found, nothing to clear." -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
