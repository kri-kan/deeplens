# DeepLens Infrastructure - Docker Compose Setup

This directory contains the containerized infrastructure setup for DeepLens with persistent storage.

## 🗄️ Database Stack

- **PostgreSQL 16**: Identity + Metadata databases
- **Qdrant**: Vector database for image similarity search
- **InfluxDB**: Time-series database for logs and analytics
- **Apache Kafka**: Message queue for event streaming
- **Redis**: Cache layer for sessions and search results
- **Infisical**: Self-hosted secret management and configuration vault
- **MinIO**: Object storage for BYOS (Bring Your Own Storage) testing scenarios

> 📖 **Multi-Tenant Setup**: See [README-TENANT-MANAGEMENT.md](README-TENANT-MANAGEMENT.md) for complete tenant provisioning and BYOS configuration.

## 🚀 Quick Start

### Using Setup Scripts (Recommended)

```powershell
# Start complete environment (infrastructure + monitoring)
.\setup-containers.ps1 -StartComplete

# Start infrastructure only
.\setup-infrastructure.ps1 -Start

# Start monitoring stack only
.\setup-containers.ps1 -StartMonitoring

# Check service status
.\setup-containers.ps1 -Status
```

### Using Docker Compose Directly

```bash
# Start all infrastructure services
docker-compose -f docker-compose.infrastructure.yml up -d

# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Check service status
docker-compose -f docker-compose.infrastructure.yml ps

# View logs
docker-compose -f docker-compose.infrastructure.yml logs -f

# Stop all services
docker-compose -f docker-compose.infrastructure.yml down
docker-compose -f docker-compose.monitoring.yml down
```

## 📊 Service Endpoints

### Infrastructure Services

| Service        | Port | Admin UI                        | Credentials             |
| -------------- | ---- | ------------------------------- | ----------------------- |
| **PostgreSQL** | 5432 | -                               | `deeplens/DeepLens123!` |
| **Qdrant**     | 6333 | http://localhost:6333/dashboard | -                       |
| **InfluxDB**   | 8086 | http://localhost:8086           | `admin/DeepLens123!`    |
| **Kafka**      | 9092 | -                               | -                       |
| **Kafka UI**   | 8080 | http://localhost:8080           | -                       |
| **Redis**      | 6379 | -                               | -                       |
| **MinIO**      | 9000 | http://localhost:9001           | `deeplens/DeepLens123!` |
| **Infisical**  | 8082 | http://localhost:8082           | Create on first visit   |

### Monitoring & Observability Services

| Service           | Port      | Admin UI               | Credentials           |
| ----------------- | --------- | ---------------------- | --------------------- |
| **Grafana**       | 3000      | http://localhost:3000  | `admin/DeepLens123!`  |
| **Prometheus**    | 9090      | http://localhost:9090  | -                     |
| **Jaeger**        | 16686     | http://localhost:16686 | -                     |
| **Loki**          | 3100      | -                      | -                     |
| **AlertManager**  | 9093      | http://localhost:9093  | -                     |
| **Portainer**     | 9443      | https://localhost:9443 | Create on first visit |
| **cAdvisor**      | 8081      | http://localhost:8081  | -                     |
| **OpenTelemetry** | 4317/4318 | -                      | -                     |

## 💾 Persistent Volumes

All data is stored in Docker volumes:

```bash
# List all volumes
docker volume ls | grep deeplens

# Backup volumes (example for PostgreSQL)
docker run --rm -v deeplens_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v deeplens_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /data
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```env
# Database Credentials
POSTGRES_USER=deeplens
POSTGRES_PASSWORD=DeepLens123!
POSTGRES_DB=deeplens

# InfluxDB Configuration
INFLUXDB_ADMIN_USER=admin
INFLUXDB_ADMIN_PASSWORD=DeepLens123!
INFLUXDB_ADMIN_TOKEN=deeplens-admin-token-change-me-in-production

# Kafka Configuration
KAFKA_BROKER_ID=1
KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181

# MinIO Configuration
MINIO_ROOT_USER=deeplens
MINIO_ROOT_PASSWORD=DeepLens123!

# Monitoring Configuration
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=DeepLens123!
PROMETHEUS_RETENTION_TIME=30d
LOKI_RETENTION_PERIOD=720h
OTEL_MEMORY_LIMIT_MIB=512
```

### Configuration Files

The setup includes configuration files for all services:

- **PostgreSQL**: Database initialization scripts in `init-scripts/postgres/`
- **InfluxDB**: Bucket creation and organization setup
- **Qdrant**: Vector database optimization in `config/qdrant/production.yaml`
- **Prometheus**: Metrics collection configuration in `config/prometheus/prometheus.yml`
- **Grafana**: Datasource and dashboard provisioning in `config/grafana/`
- **AlertManager**: Alert routing and notification setup in `config/alertmanager/`
- **Loki**: Log aggregation configuration in `config/loki/loki.yml`
- **OpenTelemetry Collector**: Telemetry collection and routing in `config/otel-collector/`
- **Promtail**: Log collection agent configuration in `config/promtail/`
- **Redis**: Performance and persistence settings in `config/redis/redis.conf`

## 🔒 Security Notes

**⚠️ Development Only**: Default credentials are for local development only.

**Production Setup**:

- Change all default passwords
- Use proper secret management
- Enable TLS/SSL for all services
- Configure proper firewall rules
- Use authentication for Kafka and Redis

## 📊 Monitoring & Observability Stack

DeepLens includes a comprehensive monitoring stack for full observability:

### Core Monitoring Services

- **Prometheus v2.47.0** - Metrics collection and alerting (Port: 9090)
- **Grafana 10.1.0** - Visualization dashboards (Port: 3000)
- **OpenTelemetry Collector v0.88.0** - Centralized telemetry collection (Ports: 4317/4318)
- **Jaeger v1.49** - Distributed tracing (Port: 16686)
- **Loki v2.9.0** - Log aggregation (Port: 3100)
- **AlertManager v0.25.0** - Alert routing (Port: 9093)

### System Metrics

- **cAdvisor v0.47.0** - Container metrics (Port: 8081)
- **Node Exporter v1.6.1** - System metrics (Port: 9100)
- **Redis Exporter v1.55.0** - Redis metrics (Port: 9121)
- **PostgreSQL Exporter v0.15.0** - Database metrics (Port: 9187)

### Management Tools

- **Portainer v2.19.1** - Container management UI (Port: 9443)
- **Promtail v2.9.0** - Log collection agent

### Enhanced Setup Scripts

- **setup-containers.ps1** - Multi-platform container management (Docker/Podman + Kubernetes)
- **setup-infrastructure.ps1** - Focused infrastructure setup
- **DeepLensInfrastructure.psm1** - PowerShell management module with 25+ functions

### Quick Start Monitoring

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
open http://localhost:3000    # Grafana (admin/DeepLens123!)
open http://localhost:9090    # Prometheus
open http://localhost:16686   # Jaeger Tracing
open http://localhost:9443    # Portainer Management
```

### Data Flow Architecture

```
Applications → OpenTelemetry Collector → Storage Backends
     ↓              ↓ (Process/Route)         ↓
(.NET/Python)  • Metrics → Prometheus    • Dashboards
• Logs         • Traces  → Jaeger        • Alerts
• Metrics      • Logs    → Loki          • Analysis
• Traces
```

## 📈 Service Health Monitoring

Access service health:

- **PostgreSQL**: `docker exec deeplens-postgres pg_isready`
- **Qdrant**: `curl http://localhost:6333/telemetry`
- **InfluxDB**: `curl http://localhost:8086/health`
- **Kafka**: Check topics with Kafka UI at http://localhost:8080
- **Redis**: `docker exec deeplens-redis redis-cli ping`
- **All Services**: Monitor via Grafana dashboards at http://localhost:3000

## 🛠️ Maintenance

### Database Maintenance

```bash
# PostgreSQL maintenance
docker exec deeplens-postgres psql -U deeplens -d deeplens -c "VACUUM ANALYZE;"

# Qdrant optimization
curl -X POST "http://localhost:6333/collections/images/index" -H "Content-Type: application/json"

# Redis cleanup
docker exec deeplens-redis redis-cli FLUSHDB
```

### Volume Management

```bash
# Check volume usage
docker system df -v

# Clean unused volumes (be careful!)
docker volume prune
```

## 🔄 Development vs Production

### Current Setup (Development)

- **Local Docker Compose** with full observability stack
- **Complete monitoring** with Prometheus, Grafana, Jaeger, Loki
- **Container management** via Portainer
- **Development credentials** and configurations

### Production Considerations

1. **Container Orchestration**: Use Kubernetes with StatefulSets
2. **Observability**: Current monitoring stack is production-ready
3. **Security**: Replace development credentials with proper secrets
4. **High Availability**: Configure database clustering and replication
5. **Backup Strategies**: Automated backups for all persistent data
6. **Managed Services**: Consider cloud-managed databases for scale
7. **TLS/SSL**: Enable encryption for all service communications

### Monitoring Production Readiness ✅

- **Metrics Collection**: Prometheus with 30-day retention
- **Distributed Tracing**: Jaeger with OpenTelemetry integration
- **Log Aggregation**: Loki with structured logging
- **Alerting**: AlertManager with customizable routing
- **Visualization**: Grafana with pre-built dashboards
- **Resource Monitoring**: cAdvisor + Node Exporter for complete visibility

## 📚 Next Steps

1. **Start Infrastructure**: Use `setup-containers.ps1 -StartComplete` or `setup-infrastructure.ps1 -Start`
2. **Verify Services**: Check health with `setup-containers.ps1 -Status` or PowerShell module `Test-DeepLensServices`
3. **Import Management Module**: `Import-Module .\DeepLensInfrastructure.psm1` for advanced operations
4. **Database Setup**: Run migrations for Identity and Metadata databases
5. **Initialize Collections**: Set up Qdrant vector collections for image search
6. **Access Monitoring**: Visit Grafana at http://localhost:3000 (admin/DeepLens123!)
7. **Start Development**: Begin building DeepLens services with full observability support

### PowerShell Module Functions

```powershell
# Import the module
Import-Module .\DeepLensInfrastructure.psm1

# Start complete environment
Start-DeepLensComplete

# Open monitoring dashboards
Open-GrafanaUI
Open-PrometheusUI
Open-JaegerUI

# Connect to databases
Connect-DeepLensPostgreSQL
Connect-DeepLensRedis
```
