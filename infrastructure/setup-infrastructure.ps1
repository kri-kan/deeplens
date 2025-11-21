# DeepLens Infrastructure Setup
# Quick setup script for the containerized database stack

param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Reset,
    [switch]$Help
)

# Import the infrastructure module
Import-Module "$PSScriptRoot\DeepLensInfrastructure.psm1" -Force

function Show-Help {
    Write-Host @"
🔧 DeepLens Infrastructure Setup

USAGE:
  .\setup-infrastructure.ps1 [OPTIONS]

OPTIONS:
  -Start    Start all infrastructure services
  -Stop     Stop all infrastructure services  
  -Status   Check the status of all services
  -Reset    Reset the entire development environment
  -Help     Show this help message

EXAMPLES:
  .\setup-infrastructure.ps1 -Start
  .\setup-infrastructure.ps1 -Status
  .\setup-infrastructure.ps1 -Reset

SERVICES INCLUDED:
  • PostgreSQL (Identity & Metadata databases)
  • Qdrant (Vector database for similarity search)
  • InfluxDB (Time-series metrics)
  • Apache Kafka (Message queue)
  • Redis (Cache layer)
  
WEB INTERFACES:
  • Qdrant Dashboard: http://localhost:6333/dashboard
  • Kafka UI: http://localhost:8080
  • InfluxDB: http://localhost:8086
  • Infisical Secrets: http://localhost:8082

MONITORING STACK:
  📊 To add monitoring: .\setup-containers.ps1 -StartMonitoring
  🚀 For complete setup: .\setup-containers.ps1 -StartComplete

For more advanced operations, import the PowerShell module:
  Import-Module .\DeepLensInfrastructure.psm1

"@ -ForegroundColor Cyan
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

if ($Start) {
    Start-DeepLensInfrastructure
}
elseif ($Stop) {
    Stop-DeepLensInfrastructure
}
elseif ($Status) {
    Test-DeepLensServices
}
elseif ($Reset) {
    Reset-DeepLensEnvironment
}
else {
    Write-Host "🚀 Welcome to DeepLens Infrastructure Setup!" -ForegroundColor Green
    Write-Host "💡 Use setup-containers.ps1 for monitoring stack" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available actions:" -ForegroundColor Cyan
    Write-Host "  1. Start infrastructure services" -ForegroundColor White
    Write-Host "  2. Stop infrastructure services" -ForegroundColor White
    Write-Host "  3. Check service status" -ForegroundColor White
    Write-Host "  4. Reset development environment" -ForegroundColor White
    Write-Host "  5. Show help" -ForegroundColor White
    Write-Host ""
    
    do {
        $choice = Read-Host "Select an action (1-5)"
        switch ($choice) {
            "1" { Start-DeepLensInfrastructure; break }
            "2" { Stop-DeepLensInfrastructure; break }
            "3" { Test-DeepLensServices; break }
            "4" { Reset-DeepLensEnvironment; break }
            "5" { Show-Help; break }
            default { Write-Host "Invalid choice. Please select 1-5." -ForegroundColor Red }
        }
    } while ($choice -notin @("1", "2", "3", "4", "5"))
}