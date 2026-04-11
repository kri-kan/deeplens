# DeepLens Infrastructure (External Managed)

This directory contains scripts for provisioning tenants and managing application-level services that leverage the centralized infrastructure at `192.168.0.170`.

## 🏗️ External Infrastructure

The following services are managed externally and utilized by DeepLens:

| Service         | Endpoint                    | Default Credentials     |
| --------------- | --------------------------- | ----------------------- |
| PostgreSQL      | `192.168.0.170:5432`        | `postgres` / `Krikank1$` |
| MinIO (API)     | `http://192.168.0.170:9000` | `krikan` / `Krikank1$`   |
| MinIO Console   | `http://192.168.0.170:9001` | `krikan` / `Krikank1$`   |
| Kafka           | `192.168.0.170:9092`        | None                    |
| Redis           | `192.168.0.170:6379`        | None                    |
| InfluxDB        | `http://192.168.0.170:8086` | `krikan` / `Krikank1$`   |
| Grafana         | `http://192.168.0.170:3000` | `krikan` / `Krikank1$`   |
| Qdrant Dash     | `http://192.168.0.170:6333` | None                    |

## 🚀 Application Services (Local)

While the core infrastructure is external, the specialized DeepLens application services (AI/ML) run locally via Docker:

```powershell
# Start local reasoning and feature extraction services
docker compose up -d
```

| Service              | Port   | Purpose                      |
| -------------------- | ------ | ---------------------------- |
| Reasoning API        | `8002` | Phi-3 Metadata Extraction    |
| Feature Extraction   | `8001` | Image/Video Vectorization    |
| Instagram Worker     | -      | Competitor Data Ingestion    |

## 🏢 Tenant Management

The architecture uses a centralized infrastructure but isolates tenants via prefix-isolated databases and dedicated buckets.

### Provisioning a Tenant

```powershell
# Provision a new tenant
./provision-tenant.ps1 -TenantName "tenant-name"
```

This script will:
1. Create a tenant metadata database on the remote PostgreSQL.
2. Initialize tenant-specific buckets in the remote MinIO.
3. Start a local Qdrant container for vector isolation (optional).
4. Bootstrap initial admin credentials in the Identity service.

### Initializing Baseline Data

```powershell
./scripts/lifecycle/init-bootstrap-data.ps1
```

This script initializes the core schemas (Identity, Metadata) on the remote PostgreSQL instance using baseline SQL scripts and the CLI tool.

## ⚙️ Configuration

Environment variables are managed via `infrastructure/.env`. See `infrastructure/.env.example` for the required structure.

> [!IMPORTANT]
> Ensure the machine running these scripts has network visibility to `192.168.0.170`.
