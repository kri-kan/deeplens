# Load-Env.ps1
# Helper function to load .env file into current PowerShell session

function Load-Env {
    param(
        [string]$EnvFile = "$PSScriptRoot/../../.env"
    )
    
    if (Test-Path $EnvFile) {
        Write-Host "  Loading variables from $EnvFile..." -ForegroundColor DarkGray
        Get-Content $EnvFile | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and $line -match "=") {
                $name, $value = $line -split '=', 2
                $name = $name.Trim()
                $value = $value.Trim().Trim('"').Trim("'")
                
                # Set as environment variable
                [System.Environment]::SetEnvironmentVariable($name, $value)
                
                # Also set as script-level variable for convenience if needed, 
                # but env vars are more standard for these scripts
                Set-Variable -Name $name -Value $value -Scope Script -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Host "  [WARN] .env file not found at $EnvFile" -ForegroundColor Yellow
    }
}

# Export it
