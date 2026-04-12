# DeepLens Infrastructure Setup Wrapper
# Points to the refactored lifecycle initialization script.

Write-Host "Redirecting to infrastructure/scripts/lifecycle/init-bootstrap-data.ps1..." -ForegroundColor Yellow
& "$PSScriptRoot/scripts/lifecycle/init-bootstrap-data.ps1" @args
