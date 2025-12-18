# DeepLens Service Ports Reference

**Last Updated:** December 18, 2025  
**Environment:** Local Development

This document provides a comprehensive reference of all service ports used in the DeepLens platform, including their default assignments, configurable ranges, and conflict resolution strategies.

---

## 📋 Quick Reference Table

| Service               | Host Port | Container Port | Protocol | Configurable Range | Notes                                                  |
| --------------------- | --------- | -------------- | -------- | ------------------ | ------------------------------------------------------ |
| PostgreSQL            | 5433      | 5432           | TCP      | 5433-5439          | Changed from 5432 to avoid Windows PostgreSQL conflict |
| Redis                 | 6379      | 6379           | TCP      | 6379-6389          | Standard Redis port                                    |
| Qdrant (HTTP)         | 6333      | 6333           | HTTP     | 6333-6343          | Vector database REST API                               |
| Qdrant (gRPC)         | 6334      | 6334           | gRPC     | 6334-6344          | Vector database gRPC                                   |
| MinIO API             | 9000      | 9000           | HTTP     | N/A                | Single instance, bucket-based multi-tenancy            |
| MinIO Console         | 9001      | 9001           | HTTP     | N/A                | Single instance web UI                                 |
| Kafka                 | 9092      | 9092           | TCP      | 9092-9095          | Broker port                                            |
| Zookeeper             | 2181      | 2181           | TCP      | 2181-2185          | Kafka coordination                                     |
| Grafana               | 3001      | 3000           | HTTP     | 3001-3010          | Monitoring dashboards                                  |
| Prometheus            | 9090      | 9090           | HTTP     | 9090-9099          | Metrics collection                                     |
| Loki                  | 3100      | 3100           | HTTP     | 3100-3110          | Log aggregation                                        |
| Promtail              | 9080      | 9080           | HTTP     | 9080-9089          | Log shipper                                            |
| Jaeger UI             | 16686     | 16686          | HTTP     | 16686-16696        | Distributed tracing                                    |
| Jaeger Collector      | 14250     | 14250          | gRPC     | 14250-14260        | Trace ingestion                                        |
| OTEL Collector (gRPC) | 4317      | 4317           | gRPC     | 4317-4327          | OpenTelemetry gRPC                                     |
| OTEL Collector (HTTP) | 4318      | 4318           | HTTP     | 4318-4328          | OpenTelemetry HTTP                                     |
| Alertmanager          | 9093      | 9093           | HTTP     | 9093-9099          | Alert management                                       |

---

## 🔧 Core Services

### PostgreSQL Database

**Primary Service:** Relational database for platform and tenant data

- **Host Port:** `5433` (⚠️ **CHANGED from 5432**)
- **Container Port:** `5432`
- **Protocol:** TCP (PostgreSQL wire protocol)
- **Configurable Range:** `5433-5439`
- **Default in Production:** `5432`

**Why Port 5433?**

- Avoids conflict with Windows/macOS native PostgreSQL installations
- Container internally uses standard port 5432
- Application connection strings use 5433

**Connection Examples:**

```bash
# From host
psql -h localhost -p 5433 -U postgres

# Connection string
Host=localhost;Port=5433;Database=nextgen_identity;Username=postgres;Password=DeepLensPassword123

# Docker/Podman run
podman run -d --name deeplens-postgres -p 5433:5432 postgres:16-alpine
```

---

### Redis (Caching & Session Store)

**Primary Service:** In-memory data structure store

- **Host Port:** `6379`
- **Container Port:** `6379`
- **Protocol:** TCP (RESP)
- **Configurable Range:** `6379-6389`
- **Cluster Ports:** `16379-16389` (Redis Cluster bus)

**Connection Examples:**

```bash
# From host
redis-cli -h localhost -p 6379

# Connection string
localhost:6379

# Docker/Podman run
podman run -d --name deeplens-redis -p 6379:6379 redis:7-alpine
```

---

### Qdrant (Vector Database)

**Primary Service:** Vector similarity search for embeddings

- **HTTP API Port:** `6333`
- **gRPC Port:** `6334`
- **Container Ports:** `6333` (HTTP), `6334` (gRPC)
- **Protocol:** HTTP/REST and gRPC
- **Configurable Range:** `6333-6343` (HTTP), `6334-6344` (gRPC)

**Per-Tenant Deployment:**

- Each tenant gets dedicated Qdrant instance
- Ports allocated sequentially: `6333`, `6335`, `6337`...
- Container naming: `deeplens-{tenant-slug}-qdrant`

**Connection Examples:**

```bash
# Dashboard
http://localhost:6333/dashboard

# REST API
curl http://localhost:6333/collections

# gRPC endpoint
localhost:6334

# Docker/Podman run
podman run -d --name deeplens-qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

---

### MinIO (Object Storage)

**Primary Service:** S3-compatible object storage for images/files

- **API Port:** `9000`
- **Console Port:** `9001`
- **Container Ports:** `9000` (API), `9001` (Console)
- **Protocol:** HTTP (S3 API)
- **Multi-Tenancy:** Bucket-based isolation

**Single Instance Architecture:**

- One MinIO instance serves all tenants
- Each tenant gets a dedicated bucket
- IAM policies enforce tenant isolation
- Per-tenant access keys for security

**Bucket Naming Convention:**
| Tenant | Bucket Name | Access Key Pattern |
|--------|-------------|--------------------|
| Admin | `deeplens-admin` | `admin-{random}` |
| Tenant 1 | `deeplens-tenant1` | `tenant1-{random}` |
| Tenant 2 | `deeplens-tenant2` | `tenant2-{random}` |

**Connection Examples:**

```bash
# MinIO Console (Web UI)
http://localhost:9001
# Login: admin / DeepLensPassword123

# S3 API endpoint
http://localhost:9000

# Docker/Podman run
podman run -d --name deeplens-minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=admin \
  -e MINIO_ROOT_PASSWORD=DeepLensPassword123 \
  -v deeplens-minio-data:/data \
  minio/minio server /data --console-address ":9001"

# Create tenant bucket (using MinIO client)
mc alias set deeplens http://localhost:9000 admin DeepLensPassword123
mc mb deeplens/tenant-acme
mc mb deeplens/tenant-widgets

# Create tenant-specific access credentials
mc admin user add deeplens tenant-acme-key SecurePassword123
mc admin policy attach deeplens readwrite --user tenant-acme-key
```

---

## 🔄 Messaging & Streaming

### Apache Kafka

**Primary Service:** Event streaming platform

- **Broker Port:** `9092`
- **Container Port:** `9092`
- **Protocol:** Kafka protocol (TCP)
- **Configurable Range:** `9092-9095`
- **JMX Port:** `9999` (monitoring)

**Connection Examples:**

```bash
# Bootstrap servers
localhost:9092

# Create topic
kafka-topics --create --bootstrap-server localhost:9092 --topic test

# Docker/Podman run
podman run -d --name deeplens-kafka -p 9092:9092 confluentinc/cp-kafka
```

### Zookeeper (Kafka Dependency)

**Primary Service:** Distributed coordination for Kafka

- **Client Port:** `2181`
- **Container Port:** `2181`
- **Protocol:** TCP (Zookeeper protocol)
- **Configurable Range:** `2181-2185`
- **Peer Port:** `2888`, **Leader Port:** `3888`

---

## 📊 Observability Stack

### Grafana (Dashboards)

**Primary Service:** Metrics visualization and monitoring

- **Host Port:** `3001` (⚠️ **CHANGED from 3000**)
- **Container Port:** `3000`
- **Protocol:** HTTP
- **Configurable Range:** `3001-3010`
- **Default Port:** `3000` (conflicts with React dev server)

**Why Port 3001?**

- React WebUI runs on port 3000
- Grafana moved to 3001 to avoid conflict

**Connection Examples:**

```bash
# Dashboard
http://localhost:3001

# Docker/Podman run
podman run -d --name deeplens-grafana \
  -p 3001:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=DeepLensPassword123 \
  grafana/grafana
```

### Prometheus (Metrics)

**Primary Service:** Time-series metrics database

- **Host Port:** `9090`
- **Container Port:** `9090`
- **Protocol:** HTTP
- **Configurable Range:** `9090-9099`

**Connection Examples:**

```bash
# Query UI
http://localhost:9090

# Metrics endpoint
http://localhost:9090/metrics

# PromQL query
curl 'http://localhost:9090/api/v1/query?query=up'
```

### Loki (Logs)

**Primary Service:** Log aggregation system

- **Host Port:** `3100`
- **Container Port:** `3100`
- **Protocol:** HTTP
- **Configurable Range:** `3100-3110`

**Connection Examples:**

```bash
# API endpoint
http://localhost:3100

# Query logs
curl 'http://localhost:3100/loki/api/v1/query?query={job="varlogs"}'

# Docker/Podman run
podman run -d --name deeplens-loki -p 3100:3100 grafana/loki
```

### Jaeger (Distributed Tracing)

**Primary Service:** End-to-end distributed tracing

- **UI Port:** `16686`
- **Collector gRPC:** `14250`
- **Collector HTTP:** `14268`
- **Agent Thrift:** `6831` (UDP)
- **Protocol:** HTTP (UI), gRPC (collector)
- **Configurable Range:** `16686-16696` (UI)

**Connection Examples:**

```bash
# Jaeger UI
http://localhost:16686

# Submit trace (gRPC)
localhost:14250

# Docker/Podman run
podman run -d --name deeplens-jaeger \
  -p 16686:16686 -p 14250:14250 \
  jaegertracing/all-in-one
```

### OpenTelemetry Collector

**Primary Service:** Vendor-agnostic telemetry collection

- **gRPC Port:** `4317`
- **HTTP Port:** `4318`
- **Protocol:** OTLP (gRPC/HTTP)
- **Configurable Range:** `4317-4327` (gRPC), `4318-4328` (HTTP)
- **Prometheus Exporter:** `8889`
- **Health Check:** `13133`

**Connection Examples:**

```bash
# OTLP gRPC endpoint
localhost:4317

# OTLP HTTP endpoint
http://localhost:4318

# Health check
curl http://localhost:13133
```

---

## 🌐 Application Services

### NextGen Identity API (Duende IdentityServer)

**Primary Service:** OAuth 2.0 / OpenID Connect authentication

- **HTTP Port:** `5001`
- **Protocol:** HTTP
- **Configurable Range:** `5001-5010`
- **HTTPS Port (Production):** `5443`

**Endpoints:**

```bash
# Discovery document
http://localhost:5001/.well-known/openid-configuration

# Token endpoint
http://localhost:5001/connect/token

# UserInfo endpoint
http://localhost:5001/connect/userinfo
```

### DeepLens WebUI (React SPA)

**Primary Service:** Web user interface

- **Dev Server Port:** `3000`
- **Protocol:** HTTP
- **Configurable Range:** `3000-3005`
- **Production Port:** Varies (behind reverse proxy)

**Connection:**

```bash
# Development server
http://localhost:3000
```

### DeepLens API Gateway

**Primary Service:** API routing and gateway

- **HTTP Port:** `5100`
- **Protocol:** HTTP
- **Configurable Range:** `5100-5110`

### DeepLens Admin API

**Primary Service:** Platform administration

- **HTTP Port:** `5200`
- **Protocol:** HTTP
- **Configurable Range:** `5200-5210`

### DeepLens Search API

**Primary Service:** Vector search and retrieval

- **HTTP Port:** `5300`
- **Protocol:** HTTP
- **Configurable Range:** `5300-5310`

---

## 🔒 Port Allocation Strategy

### Fixed Ports (Never Change)

- PostgreSQL: `5433` (dev), `5432` (prod)
- Redis: `6379`
- Kafka: `9092`
- Identity API: `5001`

### Dynamic Ports (Tenant-Specific)

- Qdrant HTTP: `6333 + (tenantId * 2)`
- Qdrant gRPC: `6334 + (tenantId * 2)`

**Note:** MinIO uses bucket-based multi-tenancy with a single instance (no dynamic ports)

### Conflict Resolution

If a port is in use:

1. **Check process:** `netstat -ano | findstr :PORT` (Windows) or `lsof -i :PORT` (Linux/Mac)
2. **Stop service:** `podman stop <container>`
3. **Change port:** Update environment variable or config
4. **Update docs:** Reflect the change in this file

---

## 📝 Configuration Files

### Docker Compose

```yaml
# infrastructure/docker-compose.infrastructure.yml
services:
  postgres:
    ports:
      - "${POSTGRES_HOST_PORT:-5433}:5432"

  redis:
    ports:
      - "${REDIS_HOST_PORT:-6379}:6379"

  qdrant:
    ports:
      - "${QDRANT_HTTP_PORT:-6333}:6333"
      - "${QDRANT_GRPC_PORT:-6334}:6334"
```

### Environment Variables

```bash
# .env file
POSTGRES_HOST_PORT=5433
REDIS_HOST_PORT=6379
QDRANT_HTTP_PORT=6333
QDRANT_GRPC_PORT=6334
GRAFANA_HOST_PORT=3001
PROMETHEUS_HOST_PORT=9090
MINIO_BASE_PORT=9000
```

---

## 🚨 Common Port Conflicts

### Port 5432 (PostgreSQL)

**Conflict:** Windows/macOS PostgreSQL installation  
**Solution:** Use port `5433` for containerized PostgreSQL

### Port 3000 (React/Grafana)

**Conflict:** React dev server and Grafana  
**Solution:** Grafana on `3001`, React on `3000`

### Port 9000 (MinIO/SonarQube)

**Conflict:** Multiple services use 9000  
**Solution:** MinIO tenant ports start at `9000` with gaps

### Port 8080 (Common HTTP)

**Conflict:** Many dev tools use 8080  
**Solution:** Avoid 8080, use 5xxx for APIs

---

## 📦 Port Ranges by Category

### Database Layer (5xxx, 6xxx)

- `5433-5439`: PostgreSQL instances
- `6379-6389`: Redis instances
- `6333-6343`: Qdrant HTTP
- `6334-6344`: Qdrant gRPC

### Object Storage & Messaging (9xxx)

- `9000`: MinIO API (single instance)
- `9001`: MinIO Console (single instance)
- `9092-9095`: Kafka brokers

### Application APIs (5xxx)

- `5001-5010`: Identity API
- `5100-5110`: API Gateway
- `5200-5210`: Admin API
- `5300-5310`: Search API

### Monitoring (3xxx, 9xxx, 1xxxx)

- `3001-3010`: Grafana
- `3100-3110`: Loki
- `9080-9089`: Promtail
- `9090-9099`: Prometheus
- `16686-16696`: Jaeger UI

### Telemetry (4xxx, 1xxxx)

- `4317-4327`: OTLP gRPC
- `4318-4328`: OTLP HTTP
- `14250-14260`: Jaeger Collector

---

## 🔄 Port Update Checklist

When changing a service port:

- [ ] Update `docker-compose.infrastructure.yml`
- [ ] Update `appsettings.Development.json`
- [ ] Update `appsettings.json`
- [ ] Update `CREDENTIALS.md`
- [ ] Update `PORTS.md` (this file)
- [ ] Update `handover.md`
- [ ] Update infrastructure PowerShell scripts
- [ ] Update connection strings in code
- [ ] Restart affected containers
- [ ] Test connectivity

---

**Note:** All ports listed are for **local development**. Production deployments should use standard ports behind load balancers and ingress controllers with proper TLS termination.
