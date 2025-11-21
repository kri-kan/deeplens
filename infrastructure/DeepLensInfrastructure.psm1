# DeepLens Infrastructure Management Scripts
# PowerShell scripts for managing the containerized database stack

# =============================================================================
# Quick Start
# =============================================================================

# Start all services
function Start-DeepLensInfrastructure {
    Write-Host "🚀 Starting DeepLens Infrastructure..." -ForegroundColor Green
    docker-compose -f docker-compose.infrastructure.yml up -d
    
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Check service health
    Test-DeepLensServices
}

# Stop all services
function Stop-DeepLensInfrastructure {
    Write-Host "🛑 Stopping DeepLens Infrastructure..." -ForegroundColor Red
    docker-compose -f docker-compose.infrastructure.yml down
}

# Restart all services
function Restart-DeepLensInfrastructure {
    Write-Host "🔄 Restarting DeepLens Infrastructure..." -ForegroundColor Blue
    Stop-DeepLensInfrastructure
    Start-Sleep -Seconds 5
    Start-DeepLensInfrastructure
}

# =============================================================================
# Service Health Checks
# =============================================================================

function Test-DeepLensServices {
    Write-Host "🔍 Checking service health..." -ForegroundColor Cyan
    
    # PostgreSQL
    try {
        $pgResult = docker exec deeplens-postgres pg_isready -U deeplens
        Write-Host "✅ PostgreSQL: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ PostgreSQL: Not Ready" -ForegroundColor Red
    }
    
    # Qdrant
    try {
        $qdrantResult = Invoke-RestMethod -Uri "http://localhost:6333/health" -Method GET
        Write-Host "✅ Qdrant: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ Qdrant: Not Ready" -ForegroundColor Red
    }
    
    # InfluxDB
    try {
        $influxResult = Invoke-RestMethod -Uri "http://localhost:8086/health" -Method GET
        Write-Host "✅ InfluxDB: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ InfluxDB: Not Ready" -ForegroundColor Red
    }
    
    # Kafka
    try {
        $kafkaResult = docker exec deeplens-kafka kafka-broker-api-versions --bootstrap-server localhost:9092
        Write-Host "✅ Kafka: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ Kafka: Not Ready" -ForegroundColor Red
    }
    
    # Redis
    try {
        $redisResult = docker exec deeplens-redis redis-cli ping
        if ($redisResult -eq "PONG") {
            Write-Host "✅ Redis: Ready" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Redis: Not Ready" -ForegroundColor Red
    }
    
    # Infisical
    try {
        $infisicalResult = Invoke-RestMethod -Uri "http://localhost:8082/api/status" -Method GET
        Write-Host "✅ Infisical: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ Infisical: Not Ready" -ForegroundColor Red
    }
}

# Test monitoring services health
function Test-DeepLensMonitoring {
    Write-Host "🔍 Checking monitoring services health..." -ForegroundColor Cyan
    
    # Prometheus
    try {
        $prometheusResult = Invoke-RestMethod -Uri "http://localhost:9090/-/healthy" -Method GET
        Write-Host "✅ Prometheus: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ Prometheus: Not Ready" -ForegroundColor Red
    }
    
    # Grafana
    try {
        $grafanaResult = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
        Write-Host "✅ Grafana: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ Grafana: Not Ready" -ForegroundColor Red
    }
    
    # Jaeger
    try {
        $jaegerResult = Invoke-RestMethod -Uri "http://localhost:16686/api/services" -Method GET
        Write-Host "✅ Jaeger: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ Jaeger: Not Ready" -ForegroundColor Red
    }
    
    # OpenTelemetry Collector
    try {
        $otelResult = Invoke-RestMethod -Uri "http://localhost:8888/metrics" -Method GET
        Write-Host "✅ OpenTelemetry Collector: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ OpenTelemetry Collector: Not Ready" -ForegroundColor Red
    }
    
    # AlertManager
    try {
        $alertResult = Invoke-RestMethod -Uri "http://localhost:9093/-/healthy" -Method GET
        Write-Host "✅ AlertManager: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ AlertManager: Not Ready" -ForegroundColor Red
    }
    
    # Loki
    try {
        $lokiResult = Invoke-RestMethod -Uri "http://localhost:3100/ready" -Method GET
        Write-Host "✅ Loki: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ Loki: Not Ready" -ForegroundColor Red
    }
    
    # Node Exporter
    try {
        $nodeResult = Invoke-RestMethod -Uri "http://localhost:9100/metrics" -Method GET -TimeoutSec 5
        Write-Host "✅ Node Exporter: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ Node Exporter: Not Ready" -ForegroundColor Red
    }
    
    # Portainer
    try {
        $portainerResult = Invoke-RestMethod -Uri "https://localhost:9443/api/status" -Method GET -SkipCertificateCheck
        Write-Host "✅ Portainer: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ Portainer: Not Ready" -ForegroundColor Red
    }
}

# =============================================================================
# Database Operations
# =============================================================================

# Connect to PostgreSQL
function Connect-DeepLensPostgreSQL {
    param(
        [string]$Database = "deeplens"
    )
    Write-Host "🔌 Connecting to PostgreSQL database: $Database" -ForegroundColor Cyan
    docker exec -it deeplens-postgres psql -U deeplens -d $Database
}

# Connect to Redis CLI
function Connect-DeepLensRedis {
    Write-Host "🔌 Connecting to Redis CLI" -ForegroundColor Cyan
    docker exec -it deeplens-redis redis-cli
}

# Open Qdrant Web UI
function Open-QdrantUI {
    Write-Host "🌐 Opening Qdrant Web UI..." -ForegroundColor Cyan
    Start-Process "http://localhost:6333/dashboard"
}

# Open Kafka UI  
function Open-KafkaUI {
    Write-Host "🌐 Opening Kafka UI..." -ForegroundColor Cyan
    Start-Process "http://localhost:8080"
}

# Open InfluxDB UI
function Open-InfluxUI {
    Write-Host "🌐 Opening InfluxDB UI..." -ForegroundColor Cyan
    Start-Process "http://localhost:8086"
}

# Open Infisical UI
function Open-InfisicalUI {
    Write-Host "🔐 Opening Infisical Secret Management UI..." -ForegroundColor Cyan
    Start-Process "http://localhost:8082"
}

# =============================================================================
# Monitoring & Management Functions
# =============================================================================

# Start monitoring stack
function Start-DeepLensMonitoring {
    Write-Host "📊 Starting DeepLens Monitoring Stack..." -ForegroundColor Green
    docker-compose -f docker-compose.monitoring.yml up -d
    
    Write-Host "⏳ Waiting for monitoring services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    Write-Host "🌐 Opening monitoring dashboards..." -ForegroundColor Cyan
    Start-Process "http://localhost:3000"    # Grafana
    Start-Process "http://localhost:9090"    # Prometheus
    Start-Process "http://localhost:16686"   # Jaeger
    Start-Process "http://localhost:9443"    # Portainer
}

# Stop monitoring stack
function Stop-DeepLensMonitoring {
    Write-Host "🛑 Stopping DeepLens Monitoring Stack..." -ForegroundColor Red
    docker-compose -f docker-compose.monitoring.yml down
}

# Open Grafana Dashboard
function Open-GrafanaUI {
    Write-Host "📊 Opening Grafana Dashboard..." -ForegroundColor Cyan
    Write-Host "   Username: admin" -ForegroundColor Gray
    Write-Host "   Password: DeepLens123!" -ForegroundColor Gray
    Start-Process "http://localhost:3000"
}

# Open Prometheus UI
function Open-PrometheusUI {
    Write-Host "🔍 Opening Prometheus Metrics..." -ForegroundColor Cyan
    Start-Process "http://localhost:9090"
}

# Open Portainer UI
function Open-PortainerUI {
    Write-Host "🐳 Opening Portainer Container Management..." -ForegroundColor Cyan
    Start-Process "http://localhost:9443"
}

# Open cAdvisor UI
function Open-CAdvisorUI {
    Write-Host "📈 Opening cAdvisor Container Metrics..." -ForegroundColor Cyan
    Start-Process "http://localhost:8081"
}

# Open Jaeger Tracing UI
function Open-JaegerUI {
    Write-Host "🔍 Opening Jaeger Distributed Tracing..." -ForegroundColor Cyan
    Start-Process "http://localhost:16686"
}

# Open AlertManager UI
function Open-AlertManagerUI {
    Write-Host "🚨 Opening AlertManager..." -ForegroundColor Cyan
    Start-Process "http://localhost:9093"
}

# Open Loki (via Grafana Explore)
function Open-LokiUI {
    Write-Host "📝 Opening Loki Logs (via Grafana Explore)..." -ForegroundColor Cyan
    Start-Process "http://localhost:3000/explore"
}

# Open Node Exporter Metrics
function Open-NodeExporterUI {
    Write-Host "🖥️ Opening Node Exporter Metrics..." -ForegroundColor Cyan
    Start-Process "http://localhost:9100/metrics"
}

# Start complete DeepLens environment
function Start-DeepLensComplete {
    Write-Host "🚀 Starting Complete DeepLens Environment..." -ForegroundColor Green
    Write-Host ""
    
    # Start infrastructure
    Write-Host "1️⃣ Starting Infrastructure Services..." -ForegroundColor Cyan
    Start-DeepLensInfrastructure
    
    Start-Sleep -Seconds 10
    
    # Start monitoring
    Write-Host "2️⃣ Starting Monitoring Stack..." -ForegroundColor Cyan
    Start-DeepLensMonitoring
    
    Start-Sleep -Seconds 10
    
    # Check monitoring health
    Write-Host "3️⃣ Verifying Monitoring Services..." -ForegroundColor Cyan
    Test-DeepLensMonitoring
    
    Write-Host ""
    Write-Host "✅ Complete DeepLens Environment Started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Available Dashboards:" -ForegroundColor Cyan
    Write-Host "   📊 Grafana:         http://localhost:3000 (admin/DeepLens123!)" -ForegroundColor White
    Write-Host "   🔍 Prometheus:      http://localhost:9090" -ForegroundColor White
    Write-Host "   🔍 Jaeger Tracing:  http://localhost:16686" -ForegroundColor White
    Write-Host "   🚨 AlertManager:    http://localhost:9093" -ForegroundColor White
    Write-Host "   🐳 Portainer:       http://localhost:9443" -ForegroundColor White
    Write-Host "   📈 cAdvisor:        http://localhost:8081" -ForegroundColor White
    Write-Host "   🖥️ Node Exporter:   http://localhost:9100/metrics" -ForegroundColor White
    Write-Host "   🔐 Infisical:       http://localhost:8082" -ForegroundColor White
    Write-Host "   📝 Logs (Loki):     http://localhost:3000/explore" -ForegroundColor White
    Write-Host "   🔄 OpenTelemetry:   http://localhost:8888/metrics" -ForegroundColor White
}

# Stop complete environment
function Stop-DeepLensComplete {
    Write-Host "🛑 Stopping Complete DeepLens Environment..." -ForegroundColor Red
    Stop-DeepLensMonitoring
    Stop-DeepLensInfrastructure
    Write-Host "✅ Complete environment stopped" -ForegroundColor Green
}

# =============================================================================
# Maintenance Operations
# =============================================================================

# View logs for a specific service
function Get-DeepLensLogs {
    param(
        [ValidateSet("postgres", "qdrant", "influxdb", "kafka", "zookeeper", "redis", "kafka-ui", "infisical", "infisical-postgres", "infisical-redis")]
        [string]$Service
    )
    docker-compose -f docker-compose.infrastructure.yml logs -f deeplens-$Service
}

# Clean up unused volumes and images
function Clear-DeepLensData {
    param(
        [switch]$Force
    )
    
    if (-not $Force) {
        $confirm = Read-Host "⚠️  This will delete ALL DeepLens data. Are you sure? (yes/no)"
        if ($confirm -ne "yes") {
            Write-Host "❌ Operation cancelled" -ForegroundColor Red
            return
        }
    }
    
    Write-Host "🧹 Cleaning up DeepLens data..." -ForegroundColor Yellow
    
    # Stop services
    Stop-DeepLensInfrastructure
    
    # Remove volumes
    docker volume rm deeplens_postgres_data
    docker volume rm deeplens_qdrant_data  
    docker volume rm deeplens_influxdb_data
    docker volume rm deeplens_kafka_data
    docker volume rm deeplens_zookeeper_data
    docker volume rm deeplens_zookeeper_logs
    docker volume rm deeplens_redis_data
    
    Write-Host "✅ Data cleanup complete" -ForegroundColor Green
}

# Backup databases
function Backup-DeepLensData {
    param(
        [string]$BackupPath = ".\backups\$(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss')"
    )
    
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    Write-Host "💾 Creating backup at: $BackupPath" -ForegroundColor Cyan
    
    # PostgreSQL backup
    docker exec deeplens-postgres pg_dumpall -U deeplens > "$BackupPath\postgres-backup.sql"
    
    # Redis backup
    docker exec deeplens-redis redis-cli BGSAVE
    docker cp deeplens-redis:/data/deeplens-dump.rdb "$BackupPath\redis-backup.rdb"
    
    Write-Host "✅ Backup completed" -ForegroundColor Green
}

# =============================================================================
# Development Helpers
# =============================================================================

# Reset development environment
function Reset-DeepLensEnvironment {
    Write-Host "🔄 Resetting DeepLens development environment..." -ForegroundColor Blue
    
    # Stop and remove containers
    docker-compose -f docker-compose.infrastructure.yml down -v
    
    # Pull latest images
    docker-compose -f docker-compose.infrastructure.yml pull
    
    # Start fresh
    Start-DeepLensInfrastructure
    
    Write-Host "✅ Environment reset complete" -ForegroundColor Green
}

# Show connection strings for development
function Show-DeepLensConnectionStrings {
    Write-Host "🔗 DeepLens Development Connection Strings:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "PostgreSQL (NextGen Identity):" -ForegroundColor White
    Write-Host "  Host=localhost;Port=5432;Database=nextgen_identity;Username=nextgen_identity_service;Password=NextGenIdentity123!" -ForegroundColor Gray
    Write-Host ""
    Write-Host "PostgreSQL (Metadata):" -ForegroundColor White  
    Write-Host "  Host=localhost;Port=5432;Database=deeplens_metadata;Username=api_service;Password=ApiService123!" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Qdrant:" -ForegroundColor White
    Write-Host "  HTTP: http://localhost:6333" -ForegroundColor Gray
    Write-Host "  gRPC: localhost:6334" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Redis:" -ForegroundColor White
    Write-Host "  localhost:6379" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Kafka:" -ForegroundColor White
    Write-Host "  localhost:9092" -ForegroundColor Gray
    Write-Host ""
    Write-Host "InfluxDB:" -ForegroundColor White
    Write-Host "  URL: http://localhost:8086" -ForegroundColor Gray
    Write-Host "  Token: deeplens-admin-token" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Infisical (Secret Management):" -ForegroundColor White
    Write-Host "  URL: http://localhost:8082" -ForegroundColor Gray
    Write-Host "  Username: admin@deeplens.local (create on first login)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OpenTelemetry Collector:" -ForegroundColor White
    Write-Host "  OTLP gRPC: localhost:4317" -ForegroundColor Gray
    Write-Host "  OTLP HTTP: localhost:4318" -ForegroundColor Gray
    Write-Host "  Metrics: http://localhost:8888/metrics" -ForegroundColor Gray
}

# =============================================================================
# Export functions for easy use
# =============================================================================

Export-ModuleMember -Function @(
    'Start-DeepLensInfrastructure',
    'Stop-DeepLensInfrastructure', 
    'Restart-DeepLensInfrastructure',
    'Test-DeepLensServices',
    'Test-DeepLensMonitoring',
    'Connect-DeepLensPostgreSQL',
    'Connect-DeepLensRedis',
    'Open-QdrantUI',
    'Open-KafkaUI', 
    'Open-InfluxUI',
    'Open-InfisicalUI',
    'Start-DeepLensMonitoring',
    'Stop-DeepLensMonitoring',
    'Open-GrafanaUI',
    'Open-PrometheusUI',
    'Open-PortainerUI',
    'Open-CAdvisorUI',
    'Open-JaegerUI',
    'Open-AlertManagerUI',
    'Open-LokiUI',
    'Open-NodeExporterUI',
    'Start-DeepLensComplete',
    'Stop-DeepLensComplete',
    'Get-DeepLensLogs',
    'Clear-DeepLensData',
    'Backup-DeepLensData',
    'Reset-DeepLensEnvironment',
    'Show-DeepLensConnectionStrings'
)