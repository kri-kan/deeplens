# DeepLens Infrastructure Guide

**Complete reference for the containerized infrastructure setup**

Last Updated: December 16, 2025

---

## 📁 Directory Structure

```
infrastructure/
├── README.md                              # ⭐ This comprehensive guide
├── README-TENANT-MANAGEMENT.md            # Tenant provisioning documentation
│
├── 🐳 Docker Compose Files
│   ├── docker-compose.infrastructure.yml  # Data services (11 containers)
│   └── docker-compose.monitoring.yml      # Observability stack (8 containers)
│
├── ⚙️ Configuration
│   └── .env.example                       # Environment variable template
│
├── 🔧 Setup Scripts
│   ├── setup-containers.ps1               # Container runtime manager (Docker/Podman)
│   └── setup-infrastructure.ps1           # Service lifecycle manager
│
├── 📦 PowerShell Modules
│   ├── DeepLensInfrastructure.psm1        # Core infrastructure functions
│   └── powershell/
│       └── DeepLensTenantManager.psm1     # Multi-tenant management module
│
├── 🗄️ Database Initialization
│   └── init-scripts/postgres/
│       ├── 01-init-databases.sql          # Database & user creation
│       └── 02-tenant-provisioning.sql     # Tenant provisioning procedures
│
└── 📊 Service Configurations
    └── config/
        ├── alertmanager/                  # Alert routing rules
        ├── grafana/                       # Dashboards & datasources
        ├── loki/                          # Log aggregation config
        ├── otel-collector/                # OpenTelemetry pipeline
        ├── prometheus/                    # Metrics scraping rules
        ├── promtail/                      # Log shipping config
        ├── qdrant/                        # Vector database config
        └── redis/                         # Cache configuration
```

---

## 🚀 Quick Start

### First-Time Setup

```powershell
# 1. Copy environment template
Copy-Item .env.example .env

# 2. Start everything (recommended)
.\setup-containers.ps1 -StartComplete

# OR start in stages
.\setup-infrastructure.ps1 -Start          # Data services only
.\setup-containers.ps1 -StartMonitoring    # Add monitoring
```

### Daily Operations

```powershell
# Check status
.\setup-containers.ps1 -Status

# Stop everything
.\setup-containers.ps1 -Stop

# View logs
docker logs deeplens-postgres -f
```

---

## 🐳 Docker Compose Files

### docker-compose.infrastructure.yml (11 Services)

**Purpose:** Core data storage, message queues, and secret management

| Service                | Port(s)                    | Purpose                                                       | Resource Limits |
| ---------------------- | -------------------------- | ------------------------------------------------------------- | --------------- |
| **postgres**           | 5432                       | Primary database (3 DBs: identity, platform, tenant_template) | 2GB RAM, 1 CPU  |
| **qdrant**             | 6333 (HTTP), 6334 (gRPC)   | Vector similarity search                                      | 4GB RAM         |
| **influxdb**           | 8086                       | Time-series metrics storage                                   | 2GB RAM         |
| **kafka**              | 9092                       | Message queue & event streaming                               | 2GB RAM         |
| **zookeeper**          | 2181                       | Kafka coordination                                            | 512MB RAM       |
| **redis**              | 6379                       | Cache & session storage                                       | 1GB RAM         |
| **minio**              | 9000 (API), 9001 (Console) | S3-compatible object storage (for BYOS testing)               | 1GB RAM         |
| **kafka-ui**           | 8080                       | Kafka management interface                                    | 512MB RAM       |
| **infisical**          | 8082                       | Self-hosted secret management                                 | 1GB RAM         |
| **infisical-postgres** | 5433                       | Dedicated DB for Infisical                                    | 512MB RAM       |
| **infisical-redis**    | 6380                       | Dedicated cache for Infisical                                 | 256MB RAM       |

**Health Checks:** All services have 10-30s health check intervals  
**Networking:** Custom bridge network `deeplens-network`  
**Storage:** Persistent Docker volumes for all data services

### docker-compose.monitoring.yml (8 Services)

**Purpose:** Observability, metrics, logs, and tracing

| Service            | Port(s)                                  | Purpose                                         | Resource Limits |
| ------------------ | ---------------------------------------- | ----------------------------------------------- | --------------- |
| **prometheus**     | 9090                                     | Metrics collection & storage (30-day retention) | 2GB RAM         |
| **grafana**        | 3000                                     | Visualization dashboards                        | 1GB RAM         |
| **jaeger**         | 16686 (UI), 14250 (gRPC)                 | Distributed tracing                             | 1GB RAM         |
| **loki**           | 3100                                     | Log aggregation                                 | 1GB RAM         |
| **promtail**       | 9080                                     | Log shipping agent                              | 256MB RAM       |
| **cadvisor**       | 8081                                     | Container metrics exporter                      | 256MB RAM       |
| **node-exporter**  | 9100                                     | Host metrics exporter                           | 128MB RAM       |
| **alertmanager**   | 9093                                     | Alert routing & management                      | 256MB RAM       |
| **otel-collector** | 4317 (gRPC), 4318 (HTTP), 8888 (metrics) | OpenTelemetry receiver                          | 512MB RAM       |
| **portainer**      | 9443                                     | Container management UI                         | 512MB RAM       |

**Pre-configured Dashboards:** Grafana includes infrastructure, application, and container metrics dashboards  
**Alert Rules:** Prometheus has pre-configured alerts for service health and resource usage

---

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

---

## ⚙️ Configuration Files

### .env.example

**Purpose:** Template for all environment variables

**Key Sections:**

- **Database Credentials:** PostgreSQL, InfluxDB usernames/passwords
- **Service Configuration:** Kafka partitions, Redis memory, Qdrant API keys
- **Secret Management:** Infisical encryption keys and JWT secrets
- **Network & Volumes:** Custom network name and volume mappings
- **Resource Limits:** Production tuning parameters

**⚠️ Security Note:**  
Default credentials are for **development only**. Change all passwords, tokens, and encryption keys before production deployment.

```powershell
# Setup for development
Copy-Item .env.example .env

# For production, generate secure keys
$env:INFISICAL_ENCRYPTION_KEY = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 255 }))
```

---

## 🔧 Setup Scripts

### setup-containers.ps1 (Container Runtime Manager)

**Responsibility:** Manages the container platform (Docker/Podman)

**Features:**

- Auto-detects Docker or Podman runtime
- Validates container daemon status
- Initializes Podman machines with Kubernetes support
- Orchestrates docker-compose/podman-compose commands
- Shows container resource usage (CPU, memory, network)

**Usage:**

```powershell
# Start complete environment
.\setup-containers.ps1 -StartComplete

# Use Podman instead of Docker
.\setup-containers.ps1 -UsePodman -StartComplete

# Start only infrastructure (no monitoring)
.\setup-containers.ps1 -StartInfrastructure

# Start only monitoring (requires infrastructure running)
.\setup-containers.ps1 -StartMonitoring

# Check container status
.\setup-containers.ps1 -Status

# Stop all containers
.\setup-containers.ps1 -Stop

# Interactive menu
.\setup-containers.ps1

# Help
.\setup-containers.ps1 -Help
```

**Dependencies:**

- Docker Desktop OR Podman
- docker-compose OR podman-compose
- Import: `DeepLensInfrastructure.psm1`

### setup-infrastructure.ps1 (Service Manager)

**Responsibility:** Manages DeepLens infrastructure services

**Features:**

- Starts/stops infrastructure services (excludes monitoring)
- Tests service health with connectivity checks
- Resets development environment (removes volumes)
- Interactive menu for common operations

**Usage:**

```powershell
# Start infrastructure services
.\setup-infrastructure.ps1 -Start

# Stop infrastructure services
.\setup-infrastructure.ps1 -Stop

# Check service health
.\setup-infrastructure.ps1 -Status

# Reset environment (⚠️ deletes all data)
.\setup-infrastructure.ps1 -Reset

# Interactive menu
.\setup-infrastructure.ps1

# Help
.\setup-infrastructure.ps1 -Help
```

**Dependencies:**

- Import: `DeepLensInfrastructure.psm1`
- Delegates to module functions

**Relationship with setup-containers.ps1:**

- **Independent:** Can be used separately
- **Complementary:** setup-containers.ps1 is the recommended entry point
- **Scope:** setup-infrastructure.ps1 focuses only on data services

---

## 📦 PowerShell Modules

### DeepLensInfrastructure.psm1 (Core Module)

**Purpose:** Core infrastructure management functions

**Exported Functions:**

#### Service Lifecycle

```powershell
Start-DeepLensInfrastructure      # Start all infrastructure services
Stop-DeepLensInfrastructure       # Stop all infrastructure services
Restart-DeepLensInfrastructure    # Restart all infrastructure services
```

#### Health Checks

```powershell
Test-DeepLensServices             # Check infrastructure service health
Test-DeepLensMonitoring           # Check monitoring service health
Show-DeepLensStatus               # Comprehensive status overview
```

#### Database Operations

```powershell
Backup-DeepLensDatabase           # Backup PostgreSQL databases
Restore-DeepLensDatabase          # Restore from backup
Reset-DeepLensDatabase            # Reset database to initial state
```

#### Service-Specific Operations

```powershell
Get-KafkaTopics                   # List Kafka topics
Get-QdrantCollections             # List vector collections
Get-RedisKeys                     # List Redis keys
Get-InfluxDBBuckets               # List InfluxDB buckets
```

#### Environment Management

```powershell
Reset-DeepLensEnvironment         # Complete environment reset
Show-DeepLensResources            # Show resource usage
Export-DeepLensConfig             # Export current configuration
```

**Usage:**

```powershell
# Import module
Import-Module .\infrastructure\DeepLensInfrastructure.psm1

# Start services
Start-DeepLensInfrastructure

# Check health
Test-DeepLensServices

# Backup database
Backup-DeepLensDatabase -OutputPath "C:\backups\deeplens-$(Get-Date -Format 'yyyyMMdd').sql"
```

### DeepLensTenantManager.psm1 (Tenant Management)

**Purpose:** Multi-tenant provisioning and BYOS configuration

**Location:** `powershell/DeepLensTenantManager.psm1`

**Key Classes:**

#### DeepLensConfig

```powershell
# Configuration object for tenant operations
$config = [DeepLensConfig]@{
    PostgresConnectionString = "Host=localhost;Port=5432;Database=deeplens_platform;Username=platform_service;Password=..."
    EncryptionKey = "your-32-character-encryption-key"
    PlatformApiUrl = "https://api.deeplens.local"
}
```

#### StorageProviderConfig

- Azure Blob Storage configuration
- AWS S3 configuration
- Google Cloud Storage configuration
- MinIO configuration
- NFS/SMB configuration

**Exported Functions:**

#### Tenant Provisioning

```powershell
New-DeepLensTenant                # Create new tenant with isolated database
Remove-DeepLensTenant             # Delete tenant and cleanup resources
Get-DeepLensTenant                # Retrieve tenant information
Update-DeepLensTenant             # Update tenant configuration
```

#### Storage Management

```powershell
Set-TenantStorageConfig           # Configure BYOS storage provider
Test-DeepLensStorageConfig        # Validate storage connectivity
Get-TenantStorageUsage            # Retrieve storage metrics
```

#### Plan Management

```powershell
Get-TenantPlan                    # Get plan details (free/premium/enterprise)
Update-TenantPlan                 # Upgrade/downgrade tenant plan
```

#### Managed MinIO Storage Provisioning

```powershell
New-TenantMinIOStorage            # Provision dedicated MinIO with NFS backend
Remove-TenantMinIOStorage         # Remove tenant MinIO instance
Get-TenantMinIOStatus             # Check MinIO status and configuration
Get-AllTenantMinIOInstances       # List all tenant MinIO instances
```

See [README-TENANT-MINIO-PROVISIONING.md](README-TENANT-MINIO-PROVISIONING.md) for complete documentation.

#### Tenant PostgreSQL Backup Provisioning

```powershell
New-TenantPostgreSQLBackup        # Configure automated backups with NFS storage
Remove-TenantPostgreSQLBackup     # Remove backup configuration
Get-TenantPostgreSQLBackupStatus  # Check backup status and logs
Get-AllTenantPostgreSQLBackups    # List all tenant backup configurations
```

See [README-TENANT-POSTGRESQL-BACKUP.md](README-TENANT-POSTGRESQL-BACKUP.md) for complete documentation.

**Usage Examples:**

```powershell
# Import module
Import-Module .\infrastructure\powershell\DeepLensTenantManager.psm1

# Create tenant with default MinIO storage
New-DeepLensTenant -Name "acme-corp" -Domain "acme.com" -PlanType "premium"

# Create tenant with Azure Blob Storage
New-DeepLensTenant -Name "enterprise-client" -PlanType "enterprise" `
  -StorageProvider "azure_blob" `
  -StorageConfig @{
    connection_string = "DefaultEndpointsProtocol=https;AccountName=storage;..."
    container = "images"
  }

# List all tenants
Get-DeepLensTenant

# Test storage configuration
Test-DeepLensStorageConfig -TenantId "12345678-1234-1234-1234-123456789012"

# Remove tenant (with confirmation)
Remove-DeepLensTenant -TenantId "12345678-1234-1234-1234-123456789012" -Confirm
```

**Plan Types & Limits:**

| Plan           | Storage Quota | Images/Month | Search Queries/Day | Price          |
| -------------- | ------------- | ------------ | ------------------ | -------------- |
| **free**       | 5 GB          | 1,000        | 100                | Free           |
| **premium**    | 100 GB        | 50,000       | 10,000             | $29/month      |
| **enterprise** | Unlimited     | Unlimited    | Unlimited          | Custom pricing |

**See Also:** [README-TENANT-MANAGEMENT.md](README-TENANT-MANAGEMENT.md)

---

## 🗄️ Database Initialization Scripts

### init-scripts/postgres/01-init-databases.sql

**Purpose:** Initialize PostgreSQL databases, users, and permissions

**Executes:** Automatically on first PostgreSQL container startup

**Creates:**

#### Databases (3)

1. **nextgen_identity** - Authentication and user management
2. **deeplens_platform** - Tenant registry and BYOS configurations
3. **tenant_metadata_template** - Template for tenant-specific databases

#### Users (4)

1. **identity_service** - NextGen Identity service account
2. **platform_service** - DeepLens Platform service account
3. **tenant_service** - Tenant management service account
4. **readonly_user** - Read-only analytics/reporting access

**Extensions Enabled:**

- `uuid-ossp` - UUID generation
- `pgcrypto` - Encryption functions
- `pg_trgm` - Text similarity search

**Permissions:**

- Owner permissions for service accounts on respective databases
- Read-only permissions for analytics user
- Schema-level access controls

**Schema Structure:**

```sql
-- Platform Database Tables
- tenants                    (tenant registry)
- tenant_storage_configs     (BYOS configurations, encrypted)
- tenant_databases           (database registry)
- api_usage_logs             (cross-tenant metrics)

-- Tenant Template Tables
- image_collections          (user-organized collections)
- images                     (image metadata & checksums)
- search_sessions            (analytics)
- search_queries             (search behavior)
```

### init-scripts/postgres/02-tenant-provisioning.sql

**Purpose:** Stored procedures for runtime tenant provisioning

**Functions:**

#### create_tenant_database

```sql
-- Creates isolated tenant database from template
-- Configures Row Level Security (RLS)
-- Returns connection string and database name
CREATE OR REPLACE FUNCTION create_tenant_database(
    tenant_id UUID,
    tenant_name TEXT
) RETURNS TABLE(database_name TEXT, connection_string TEXT)
```

#### provision_tenant_schema

```sql
-- Initializes tenant-specific schema
-- Creates indexes and constraints
-- Sets up RLS policies
CREATE OR REPLACE FUNCTION provision_tenant_schema(
    tenant_db_name TEXT,
    tenant_id UUID
)
```

#### cleanup_tenant_database

```sql
-- Safely removes tenant database
-- Terminates active connections
-- Drops database and user
CREATE OR REPLACE FUNCTION cleanup_tenant_database(
    tenant_db_name TEXT
)
```

**Usage (Internal):**
These functions are called automatically by `DeepLensTenantManager.psm1` during tenant creation/deletion.

---

## 📊 Service Configurations

### config/prometheus/

**Files:**

- `prometheus.yml` - Scraping rules, alerting rules, service discovery
- `alerts.yml` - Alert definitions for service health and resource usage

**Scrape Targets:**

- PostgreSQL (postgres-exporter)
- Redis (redis-exporter)
- Kafka (kafka-exporter)
- cAdvisor (container metrics)
- Node Exporter (host metrics)

**Alert Rules:**

- Service down alerts (critical)
- High CPU/memory usage (warning)
- Disk space thresholds (critical)
- Response time degradation (warning)

### config/grafana/

**Files:**

- `datasources.yml` - Pre-configured datasources (Prometheus, Loki, Jaeger)
- `dashboards.yml` - Dashboard provisioning config
- `dashboards/` - JSON dashboard definitions

**Included Dashboards:**

- Infrastructure Overview
- Container Metrics (cAdvisor)
- Application Performance
- Database Performance (PostgreSQL)
- Kafka Monitoring
- Redis Monitoring

**Default Credentials:**

- Username: `admin`
- Password: `DeepLens123!`

### config/loki/

**Files:**

- `loki-config.yml` - Log ingestion, storage, retention

**Configuration:**

- Retention: 30 days
- Storage: Local filesystem
- Ingestion rate limits configured

### config/otel-collector/

**Files:**

- `otel-collector-config.yml` - OpenTelemetry pipeline configuration

**Receivers:**

- OTLP (gRPC: 4317, HTTP: 4318)
- Prometheus receiver
- Jaeger receiver

**Exporters:**

- Prometheus (metrics)
- Jaeger (traces)
- Loki (logs)

### config/alertmanager/

**Files:**

- `alertmanager.yml` - Alert routing and notification rules

**Notification Channels:**

- Email (SMTP)
- Webhook (for Slack/Teams integration)
- PagerDuty (critical alerts)

### config/qdrant/

**Purpose:** Vector database configuration

**Settings:**

- Memory limit: 4GB
- Collection creation on-demand
- Quantization enabled for performance

### config/redis/

**Purpose:** Cache and session storage configuration

**Settings:**

- Max memory: 1GB
- Eviction policy: allkeys-lru
- Persistence: RDB snapshots every 15 minutes

---

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

---

## 🔐 Security Considerations

### Development Environment

**Default Credentials (⚠️ CHANGE IN PRODUCTION):**

- PostgreSQL: `deeplens` / `DeepLens123!`
- InfluxDB: `admin` / `DeepLens123!`
- Grafana: `admin` / `DeepLens123!`
- MinIO: `deeplens` / `DeepLens123!`
- Redis: `DeepLens123!`

### Production Hardening Checklist

- [ ] Change all default passwords and API keys
- [ ] Generate secure encryption keys for Infisical (32+ character random)
- [ ] Generate unique JWT secrets for Infisical
- [ ] Enable TLS/SSL for all external endpoints
- [ ] Use secrets management (Infisical or external provider)
- [ ] Configure firewall rules (restrict ports to internal network)
- [ ] Enable authentication on Redis and Kafka
- [ ] Implement network segmentation
- [ ] Set up automated backups with encryption
- [ ] Configure log retention policies
- [ ] Enable audit logging
- [ ] Implement rate limiting

### Encryption Keys Generation

```powershell
# Generate secure encryption key
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$encryptionKey = [Convert]::ToBase64String($bytes)

# Generate JWT secrets
$jwtSignup = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 255 }))
$jwtRefresh = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 255 }))
$jwtAuth = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 255 }))
```

---

## 📊 Resource Requirements

### Minimum System Requirements (Development)

- **CPU:** 4 cores
- **RAM:** 16 GB
- **Disk:** 50 GB free space
- **OS:** Windows 10/11, macOS 12+, Linux (Ubuntu 20.04+)

### Recommended System Requirements (Production)

- **CPU:** 8+ cores
- **RAM:** 32 GB+
- **Disk:** 500 GB+ SSD (NVMe preferred)
- **Network:** 1 Gbps+

### Container Resource Usage (Approximate)

| Component                   | CPU       | RAM      | Storage  |
| --------------------------- | --------- | -------- | -------- |
| **Infrastructure Services** | 2-3 cores | 8-10 GB  | 20-50 GB |
| **Monitoring Stack**        | 1-2 cores | 4-6 GB   | 10-30 GB |
| **Total**                   | 3-5 cores | 12-16 GB | 30-80 GB |

### Docker Desktop Settings

```json
{
  "memoryMiB": 16384,
  "cpus": 4,
  "diskSizeMiB": 102400
}
```

### Podman Machine Configuration

```powershell
podman machine init --cpus 4 --memory 16384 --disk-size 100
```

---

## 🔄 Backup & Recovery

### Manual Backup

```powershell
# Import infrastructure module
Import-Module .\DeepLensInfrastructure.psm1

# Backup all databases
Backup-DeepLensDatabase -OutputPath "C:\backups\deeplens-$(Get-Date -Format 'yyyyMMdd').sql"

# Backup specific database
docker exec deeplens-postgres pg_dump -U deeplens deeplens_platform > platform-backup.sql
```

### Automated Backup Script

```powershell
# Create scheduled task for daily backups
$action = New-ScheduledTaskAction -Execute 'PowerShell.exe' `
  -Argument '-File "C:\productivity\deeplens\infrastructure\backup-daily.ps1"'
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "DeepLens Daily Backup" -Action $action -Trigger $trigger
```

### Restore from Backup

```powershell
# Restore using module
Restore-DeepLensDatabase -BackupPath "C:\backups\deeplens-20251216.sql"

# Manual restore
Get-Content platform-backup.sql | docker exec -i deeplens-postgres psql -U deeplens deeplens_platform
```

### Volume Backup

```powershell
# Backup Docker volumes
docker run --rm -v deeplens_postgres_data:/data -v C:\backups:/backup alpine tar czf /backup/postgres-data.tar.gz -C /data .

# Restore Docker volumes
docker run --rm -v deeplens_postgres_data:/data -v C:\backups:/backup alpine tar xzf /backup/postgres-data.tar.gz -C /data
```

---

## 🐛 Troubleshooting

### Services Won't Start

```powershell
# Check Docker daemon
docker info

# Check container logs
docker logs deeplens-postgres --tail 100

# Check disk space
docker system df

# Clean up unused resources
docker system prune -a --volumes
```

### Port Conflicts

```powershell
# Find process using port
netstat -ano | findstr :5432

# Kill process (use PID from above)
taskkill /PID <PID> /F
```

### Database Connection Issues

```powershell
# Test PostgreSQL connection
docker exec deeplens-postgres pg_isready -U deeplens

# Test from host
psql -h localhost -p 5432 -U deeplens -d deeplens_platform

# Check network connectivity
docker network inspect deeplens-network
```

### Health Check Failures

```powershell
# Run comprehensive health check
Import-Module .\DeepLensInfrastructure.psm1
Test-DeepLensServices

# Check specific service
docker exec deeplens-qdrant curl -s http://localhost:6333/health
```

### Container Resource Issues

```powershell
# Check resource usage
docker stats --no-stream

# Increase Docker memory limit (Docker Desktop)
# Settings > Resources > Memory > 16 GB

# Restart containers with more resources
docker-compose -f docker-compose.infrastructure.yml down
docker-compose -f docker-compose.infrastructure.yml up -d
```

### Kafka Issues

```powershell
# Check Kafka broker status
docker exec deeplens-kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# List topics
docker exec deeplens-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Check consumer groups
docker exec deeplens-kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list
```

### Reset Everything

```powershell
# Nuclear option: Complete reset
.\setup-infrastructure.ps1 -Reset

# Manual reset
docker-compose -f docker-compose.monitoring.yml down -v
docker-compose -f docker-compose.infrastructure.yml down -v
docker volume prune -f
docker network prune -f
```

---

## 📈 Monitoring & Observability

### Access Dashboards

| Service           | URL                             | Credentials             |
| ----------------- | ------------------------------- | ----------------------- |
| **Grafana**       | http://localhost:3000           | admin / DeepLens123!    |
| **Prometheus**    | http://localhost:9090           | -                       |
| **Jaeger**        | http://localhost:16686          | -                       |
| **Portainer**     | https://localhost:9443          | Create on first login   |
| **Kafka UI**      | http://localhost:8080           | -                       |
| **InfluxDB**      | http://localhost:8086           | admin / DeepLens123!    |
| **Qdrant**        | http://localhost:6333/dashboard | -                       |
| **MinIO Console** | http://localhost:9001           | deeplens / DeepLens123! |

### Key Metrics to Monitor

**Infrastructure Health:**

- Container CPU/memory usage (cAdvisor)
- Disk I/O and space (Node Exporter)
- Network throughput (cAdvisor)

**Database Performance:**

- PostgreSQL connection pool usage
- Query execution time (slow query log)
- Cache hit ratio

**Application Metrics:**

- API response times
- Request rate (throughput)
- Error rates
- Queue depth (Kafka lag)

**Business Metrics:**

- Active tenants
- Images processed per day
- Search queries per hour
- Storage usage per tenant

### Custom Metrics

```powershell
# Export custom metrics to Prometheus
# Add to your application code
$metrics = @{
    images_processed_total = 12345
    search_queries_total = 67890
    active_tenants = 42
}

# Or query from Grafana
# PromQL: sum(rate(http_requests_total[5m])) by (tenant_id)
```

---

## 🔗 Integration Points

### Application Connection Strings

```powershell
# Platform Database
Server=localhost;Port=5432;Database=deeplens_platform;User Id=platform_service;Password=...

# Identity Database
Server=localhost;Port=5432;Database=nextgen_identity;User Id=identity_service;Password=...

# Tenant Database (dynamic)
Server=localhost;Port=5432;Database=tenant_<tenant_id>;User Id=tenant_service;Password=...

# Redis
localhost:6379,password=DeepLens123!

# Kafka
localhost:9092

# Qdrant
http://localhost:6333

# InfluxDB
http://localhost:8086
```

### OpenTelemetry Integration

```csharp
// Add to your .NET application
services.AddOpenTelemetry()
    .WithTracing(builder => builder
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri("http://localhost:4317");
        })
    );
```

---

## 📚 Additional Documentation

- [README-TENANT-MANAGEMENT.md](README-TENANT-MANAGEMENT.md) - Complete tenant provisioning guide
- [docker-compose.infrastructure.yml](docker-compose.infrastructure.yml) - Infrastructure service definitions
- [docker-compose.monitoring.yml](docker-compose.monitoring.yml) - Monitoring service definitions
- [.env.example](.env.example) - Environment variable reference

---

## 🎯 Common Workflows

### Development Workflow

```powershell
# Morning: Start environment
.\setup-containers.ps1 -StartComplete

# Work on application...

# Evening: Stop environment
.\setup-containers.ps1 -Stop
```

### Tenant Onboarding Workflow

#### Option 1: Tenant Brings Their Own Storage (BYOS)

```powershell
# 1. Import tenant manager
Import-Module .\powershell\DeepLensTenantManager.psm1

# 2. Create tenant with BYOS (Azure Blob)
$tenant = New-DeepLensTenant -Name "enterprise-client" -Domain "enterprise.com" -PlanType "enterprise" `
  -StorageProvider "azure_blob" `
  -StorageConfig @{
    connection_string = "DefaultEndpointsProtocol=https;AccountName=storage;AccountKey=...;EndpointSuffix=core.windows.net"
    container = "deeplens-images"
  }

# 3. Test storage connectivity
Test-DeepLensStorageConfig -TenantId $tenant.TenantId

# 4. Provide tenant with credentials
Write-Output "Tenant ID: $($tenant.TenantId)"
Write-Output "Database: $($tenant.DatabaseName)"
Write-Output "Storage: $($tenant.StorageProvider)"
```

#### Option 2: Platform-Managed MinIO Storage (NEW)

**Use Case:** When tenant doesn't have cloud storage but has NFS infrastructure

```powershell
# 1. Import tenant manager
Import-Module .\powershell\DeepLensTenantManager.psm1

# 2. Create tenant record
$tenant = New-DeepLensTenant -Name "vayyari" -Domain "vayyari.com" -PlanType "premium"

# 3. Provision dedicated MinIO with tenant's NFS storage
$minioConfig = New-TenantMinIOStorage `
  -TenantId $tenant.TenantId `
  -TenantName "vayyari" `
  -NFSPath "nfs.vayyari.com:/exports/deeplens-storage"

# Output example:
# ✅ MinIO storage provisioned successfully for tenant: vayyari
#
# 📋 MinIO Configuration:
#    Container Name: deeplens-minio-vayyari
#    API Endpoint:   http://localhost:9100
#    Console URL:    http://localhost:9200
#    Access Key:     tenant-vayyari-1234
#    Secret Key:     <auto-generated>
#    Default Bucket: images
#    NFS Backend:    nfs.vayyari.com:/exports/deeplens-storage

# 4. Update tenant storage configuration
Set-TenantStorageConfig -TenantId $tenant.TenantId -StorageProvider 'minio' -Config @{
    endpoint = $minioConfig.APIEndpoint
    access_key = $minioConfig.AccessKey
    secret_key = $minioConfig.SecretKey
    bucket = 'images'
    secure = $false
}

# 5. Verify MinIO status
Get-TenantMinIOStatus -TenantName "vayyari"

# 6. Provide tenant with credentials
Write-Host "Vayyari Tenant Provisioned:" -ForegroundColor Green
Write-Host "  Tenant ID: $($tenant.TenantId)"
Write-Host "  Database: $($tenant.DatabaseName)"
Write-Host "  MinIO Console: $($minioConfig.ConsoleURL)"
Write-Host "  MinIO Access Key: $($minioConfig.AccessKey)"
Write-Host "  MinIO Secret Key: $($minioConfig.SecretKey)"
Write-Host "  Data Location: NFS - $($minioConfig.NFSPath)"
```

#### Managed MinIO Features

**What DeepLens Provisions:**

- Dedicated containerized MinIO instance per tenant
- Auto-generated secure credentials (32-byte secret key)
- Auto-assigned ports (9100+ for API, 9200+ for Console)
- NFS-backed Docker volume for data persistence
- Default 'images' bucket pre-created
- Health checks and auto-restart policy
- Connected to `deeplens-network` for service integration

**What Tenant Provides:**

- NFS server hostname/IP (e.g., `nfs.vayyari.com` or `10.0.1.100`)
- NFS export path (e.g., `/exports/deeplens-storage`)
- Read/write access permissions on NFS export
- Network connectivity to NFS server (port 2049)

**NFS Configuration Examples:**

```powershell
# Standard NFS with default options
New-TenantMinIOStorage `
  -TenantId "<tenant-id>" `
  -TenantName "customer" `
  -NFSPath "nfs-server.company.com:/exports/customer-data"

# NFS with custom mount options (for compatibility)
New-TenantMinIOStorage `
  -TenantId "<tenant-id>" `
  -TenantName "customer" `
  -NFSPath "10.0.1.100:/mnt/storage/customer" `
  -NFSOptions "rw,sync,nolock"

# Specify custom ports (if defaults conflict)
New-TenantMinIOStorage `
  -TenantId "<tenant-id>" `
  -TenantName "customer" `
  -NFSPath "nfs.customer.com:/exports/data" `
  -MinIOPort 9500 `
  -ConsolePort 9501
```

**Managing Tenant MinIO Instances:**

```powershell
# Check status of specific tenant MinIO
Get-TenantMinIOStatus -TenantName "vayyari"

# List all tenant MinIO instances
Get-AllTenantMinIOInstances

# Remove tenant MinIO (keeps NFS data intact)
Remove-TenantMinIOStorage -TenantName "vayyari" -Confirm

# Remove tenant MinIO and unmount NFS volume
Remove-TenantMinIOStorage -TenantName "vayyari" -RemoveVolume -Confirm
```

**Troubleshooting MinIO Provisioning:**

```powershell
# Verify NFS server is accessible
Test-Connection nfs.tenant.com

# Check NFS exports (Linux/macOS)
showmount -e nfs.tenant.com

# View container logs
docker logs deeplens-minio-vayyari

# Check container health
docker inspect deeplens-minio-vayyari --format='{{.State.Health.Status}}'

# Test MinIO API connectivity
curl http://localhost:9100/minio/health/live
```

### Monitoring Workflow

```powershell
# 1. Open Grafana
Start-Process "http://localhost:3000"

# 2. Check infrastructure dashboard
# Navigate to: Dashboards > Infrastructure Overview

# 3. Set up alerts
# Grafana > Alerting > Alert Rules

# 4. View logs in Loki
# Grafana > Explore > Loki datasource

# 5. Trace requests in Jaeger
Start-Process "http://localhost:16686"
```

### Troubleshooting Workflow

```powershell
# 1. Check service health
.\setup-infrastructure.ps1 -Status

# 2. View container logs
docker logs deeplens-<service-name> --tail 100 -f

# 3. Check resource usage
docker stats

# 4. Test database connectivity
docker exec deeplens-postgres psql -U deeplens -l

# 5. If issues persist, restart services
.\setup-infrastructure.ps1 -Stop
Start-Sleep -Seconds 5
.\setup-infrastructure.ps1 -Start
```

---

## 🚀 Performance Tuning

### PostgreSQL Optimization

```sql
-- View current settings
SHOW all;

-- Recommended production settings (adjust based on hardware)
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '32MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Restart PostgreSQL container
docker restart deeplens-postgres
```

### Redis Optimization

```bash
# Edit redis config
docker exec -it deeplens-redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
docker exec -it deeplens-redis redis-cli CONFIG SET maxmemory 2gb
```

### Kafka Optimization

```properties
# Increase partitions for high-throughput topics
docker exec deeplens-kafka kafka-topics --bootstrap-server localhost:9092 \
  --alter --topic images-processing --partitions 10

# Increase retention for critical topics
docker exec deeplens-kafka kafka-configs --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name images-processing \
  --alter --add-config retention.ms=604800000
```

---

## 📞 Support & Contribution

### Getting Help

1. Check this README first
2. Review service logs: `docker logs <container-name>`
3. Check Grafana dashboards for metrics
4. Review [Troubleshooting](#-troubleshooting) section

### Contributing

1. Test changes in development environment
2. Update this README for infrastructure changes
3. Add/update health checks for new services
4. Document new configuration options

### Version History

- **v1.0.0** (December 16, 2025) - Initial comprehensive documentation
  - 19 containerized services (11 infrastructure + 8 monitoring)
  - Multi-tenant provisioning with BYOS support
  - Complete automation with PowerShell modules
  - Pre-configured monitoring dashboards

---

**Last Updated:** December 16, 2025  
**Maintainer:** DeepLens Team  
**License:** Proprietary

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
