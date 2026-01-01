# DeepLens Container Platform Setup
# Supports both Docker and Podman with Kubernetes capabilities

param(
    [switch]$UsePodman,
    [switch]$UseDocker,
    [switch]$StartInfrastructure,
    [switch]$StartMonitoring,
    [switch]$StartComplete,
    [switch]$Status,
    [switch]$Stop,
    [switch]$Help
)

# Import the infrastructure module
Import-Module "$PSScriptRoot\DeepLensInfrastructure.psm1" -Force

function Show-ContainerPlatformHelp {
    Write-Host @"
🔧 DeepLens Container Platform Setup

DESCRIPTION:
  Manages DeepLens infrastructure on Docker or Podman with Kubernetes support.
  
CONTAINER PLATFORMS:
  🐳 Docker: Traditional container runtime with Docker Compose
  🟦 Podman: Rootless containers with Kubernetes compatibility
  
USAGE:
  .\setup-containers.ps1 [OPTIONS]

OPTIONS:
  -UsePodman           Use Podman as container runtime
  -UseDocker           Use Docker as container runtime (default)
  -StartInfrastructure Start database infrastructure only
  -StartMonitoring     Start monitoring stack only  
  -StartComplete       Start complete environment (infrastructure + monitoring)
  -Status              Check status of all containers
  -Stop                Stop all containers
  -Help                Show this help message

EXAMPLES:
  # Start with Docker (default)
  .\setup-containers.ps1 -StartComplete

  # Start with Podman
  .\setup-containers.ps1 -UsePodman -StartComplete
  
  # Start only infrastructure
  .\setup-containers.ps1 -StartInfrastructure
  
  # Check container status
  .\setup-containers.ps1 -Status

MONITORING DASHBOARDS:
  📊 Grafana:         http://localhost:3000 (admin/DeepLens123!)
  🔍 Prometheus:      http://localhost:9090
  🐳 Portainer:       http://localhost:9443
  📈 cAdvisor:        http://localhost:8081
  🔍 Jaeger Tracing:  http://localhost:16686
  📝 Loki Logs:       http://localhost:3100
  🚨 AlertManager:    http://localhost:9093
  🔄 OTEL Collector:  http://localhost:8888/metrics
  
INFRASTRUCTURE SERVICES:
  🗄️ PostgreSQL:      localhost:5432
  🔍 Qdrant:          http://localhost:6333
  📊 InfluxDB:        http://localhost:8086
  🔥 Kafka UI:        http://localhost:8080
  ⚡ Redis:           localhost:6379
  🔐 Infisical:       http://localhost:8082

KUBERNETES WITH PODMAN:
  # Initialize Podman machine with Kubernetes
  podman machine init --cpus 4 --memory 8192 --disk-size 50
  podman machine start
  
  # Enable Kubernetes in Podman
  podman system service --time=0 unix:///tmp/podman.sock &
  
  # Use kubectl with Podman
  kubectl config use-context podman

"@ -ForegroundColor Cyan
}

function Initialize-ContainerRuntime {
    param(
        [bool]$UsePodmanRuntime
    )
    
    if ($UsePodmanRuntime) {
        Write-Host "🟦 Initializing Podman Runtime..." -ForegroundColor Blue
        
        # Check if Podman is installed
        try {
            $podmanVersion = podman --version
            Write-Host "✅ Podman detected: $podmanVersion" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Podman not found. Please install Podman first." -ForegroundColor Red
            exit 1
        }
        
        # Check Podman machine status
        $machineStatus = podman machine list --format json | ConvertFrom-Json
        if (-not $machineStatus -or $machineStatus.Count -eq 0) {
            Write-Host "🔧 Creating Podman machine with Kubernetes support..." -ForegroundColor Yellow
            podman machine init --cpus 4 --memory 8192 --disk-size 50 --now
        }
        
        # Start Podman machine if not running
        $runningMachines = podman machine list --format "{{.Name}}\t{{.Running}}" | Where-Object { $_ -match "true" }
        if (-not $runningMachines) {
            Write-Host "🚀 Starting Podman machine..." -ForegroundColor Yellow
            podman machine start
        }
        
        # Set environment for Podman Compose
        $env:CONTAINER_HOST = "unix:///tmp/podman.sock"
        $env:COMPOSE_PROVIDER = "podman"
        
        Write-Host "✅ Podman runtime initialized" -ForegroundColor Green
        Write-Host "💡 Kubernetes available via: kubectl --context=podman" -ForegroundColor Cyan
        
    }
    else {
        Write-Host "🐳 Using Docker Runtime..." -ForegroundColor Blue
        
        # Check if Docker is running
        try {
            $dockerVersion = docker --version
            Write-Host "✅ Docker detected: $dockerVersion" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Docker not found or not running. Please install and start Docker." -ForegroundColor Red
            exit 1
        }
        
        # Check Docker daemon
        try {
            docker info | Out-Null
            Write-Host "✅ Docker daemon is running" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Docker daemon is not running. Please start Docker Desktop." -ForegroundColor Red
            exit 1
        }
    }
}

function Show-ContainerStatus {
    param(
        [bool]$UsePodmanRuntime
    )
    
    $containerCmd = if ($UsePodmanRuntime) { "podman" } else { "docker" }
    
    Write-Host "📊 Container Status Overview:" -ForegroundColor Cyan
    Write-Host ""
    
    # List all DeepLens containers
    $containers = & $containerCmd ps -a --filter "name=deeplens-*" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    if ($containers) {
        Write-Host $containers
    }
    else {
        Write-Host "No DeepLens containers found." -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # Show resource usage
    Write-Host "💾 Resource Usage:" -ForegroundColor Cyan
    & $containerCmd stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

function Start-ContainerEnvironment {
    param(
        [bool]$UsePodmanRuntime,
        [string]$Mode = "complete"  # "infrastructure", "monitoring", "complete"
    )
    
    $composeCmd = if ($UsePodmanRuntime) { "podman-compose" } else { "docker-compose" }
    
    switch ($Mode) {
        "infrastructure" {
            Write-Host "🗄️ Starting Infrastructure Services..." -ForegroundColor Green
            & $composeCmd -f docker-compose.infrastructure.yml up -d
        }
        "monitoring" {
            Write-Host "📊 Starting Monitoring Stack..." -ForegroundColor Green
            & $composeCmd -f docker-compose.monitoring.yml up -d
        }
        "complete" {
            Write-Host "🚀 Starting Complete DeepLens Environment..." -ForegroundColor Green
            & $composeCmd -f docker-compose.infrastructure.yml up -d
            Start-Sleep -Seconds 10
            & $composeCmd -f docker-compose.monitoring.yml up -d
            
            Write-Host ""
            Write-Host "✅ Environment started successfully!" -ForegroundColor Green
            Write-Host "🌐 Access dashboards at:" -ForegroundColor Cyan
            Write-Host "   📊 Grafana:    http://localhost:3000 (admin/DeepLens123!)" -ForegroundColor White
            Write-Host "   🐳 Portainer:  http://localhost:9443" -ForegroundColor White
            Write-Host "   🔍 Prometheus: http://localhost:9090" -ForegroundColor White
            Write-Host "   🔍 Jaeger:     http://localhost:16686" -ForegroundColor White
            Write-Host "   📝 Loki:       http://localhost:3100" -ForegroundColor White
            Write-Host "   🚨 Alerts:     http://localhost:9093" -ForegroundColor White
        }
    }
}

function Stop-ContainerEnvironment {
    param(
        [bool]$UsePodmanRuntime
    )
    
    $composeCmd = if ($UsePodmanRuntime) { "podman-compose" } else { "docker-compose" }
    
    Write-Host "🛑 Stopping DeepLens Environment..." -ForegroundColor Red
    & $composeCmd -f docker-compose.monitoring.yml down
    & $composeCmd -f docker-compose.infrastructure.yml down
    Write-Host "✅ Environment stopped" -ForegroundColor Green
}

# Main execution
if ($Help) {
    Show-ContainerPlatformHelp
    exit 0
}

# Determine container runtime
$usesPodman = $UsePodman -or ((Get-Command podman -ErrorAction SilentlyContinue) -and (-not $UseDocker))

# Initialize container runtime
Initialize-ContainerRuntime -UsePodmanRuntime $usesPodman

# Execute requested action
if ($StartInfrastructure) {
    Start-ContainerEnvironment -UsePodmanRuntime $usesPodman -Mode "infrastructure"
}
elseif ($StartMonitoring) {
    Start-ContainerEnvironment -UsePodmanRuntime $usesPodman -Mode "monitoring"
}
elseif ($StartComplete) {
    Start-ContainerEnvironment -UsePodmanRuntime $usesPodman -Mode "complete"
}
elseif ($Status) {
    Show-ContainerStatus -UsePodmanRuntime $usesPodman
}
elseif ($Stop) {
    Stop-ContainerEnvironment -UsePodmanRuntime $usesPodman
}
else {
    Write-Host "🚀 DeepLens Container Platform Manager" -ForegroundColor Green
    Write-Host ""
    Write-Host "Detected runtime: $(if ($usesPodman) { '🟦 Podman' } else { '🐳 Docker' })" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Available actions:" -ForegroundColor Cyan
    Write-Host "  1. Start complete environment (infrastructure + monitoring)" -ForegroundColor White
    Write-Host "  2. Start infrastructure only" -ForegroundColor White
    Write-Host "  3. Start monitoring only" -ForegroundColor White
    Write-Host "  4. Check container status" -ForegroundColor White
    Write-Host "  5. Stop all containers" -ForegroundColor White
    Write-Host "  6. Show help" -ForegroundColor White
    Write-Host ""
    
    do {
        $choice = Read-Host "Select an action (1-6)"
        switch ($choice) {
            "1" { Start-ContainerEnvironment -UsePodmanRuntime $usesPodman -Mode "complete"; break }
            "2" { Start-ContainerEnvironment -UsePodmanRuntime $usesPodman -Mode "infrastructure"; break }
            "3" { Start-ContainerEnvironment -UsePodmanRuntime $usesPodman -Mode "monitoring"; break }
            "4" { Show-ContainerStatus -UsePodmanRuntime $usesPodman; break }
            "5" { Stop-ContainerEnvironment -UsePodmanRuntime $usesPodman; break }
            "6" { Show-ContainerPlatformHelp; break }
            default { Write-Host "Invalid choice. Please select 1-6." -ForegroundColor Red }
        }
    } while ($choice -notin @("1", "2", "3", "4", "5", "6"))
}