# DeepLens Development Credentials Reference

**⚠️ DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION**

This document lists all standardized credentials for local development. All passwords use `DeepLens123!` for consistency.

---

## PostgreSQL

### Main Database (postgres superuser)

- **User:** `postgres`
- **Password:** `DeepLens123!`
- **Host Port:** `5433` (mapped to container port 5432)
- **Connection:** `Host=localhost;Port=5433;Database=postgres;Username=postgres;Password=DeepLens123!`

### Service Users (created by init scripts)

#### NextGen Identity Service

- **User:** `nextgen_identity_service`
- **Password:** `DeepLens123!`
- **Database:** `nextgen_identity`
- **Connection:** `Host=localhost;Port=5433;Database=nextgen_identity;Username=nextgen_identity_service;Password=DeepLens123!`

#### Platform Service

- **User:** `platform_service`
- **Password:** `DeepLens123!`
- **Database:** `deeplens_platform`
- **Connection:** `Host=localhost;Port=5433;Database=deeplens_platform;Username=platform_service;Password=DeepLens123!`

#### Tenant Service

- **User:** `tenant_service`
- **Password:** `DeepLens123!`
- **Privileges:** CREATEDB
- **Connection:** `Host=localhost;Port=5433;Database=tenant_metadata_template;Username=tenant_service;Password=DeepLensPassword123`

#### Analytics User (Read-Only)

- **User:** `analytics_readonly`
- **Password:** `DeepLens123!`
- **Access:** Read-only to `deeplens_platform`

---

## Identity API (NextGen.Identity.Api)

### Admin User (Created on First Run)

- **Email:** `admin@deeplens.local`
- **Password:** `DeepLens@Admin123!`
- **Tenant:** `deeplens-admin`
- **Role:** `Admin`

### IdentityServer Clients

#### WebUI Client (SPA with PKCE)

- **Client ID:** `deeplens-webui`
- **Client Secret:** None (public client)
- **Redirect URI:** `http://localhost:3000/callback`
- **Grant Types:** `authorization_code`, `refresh_token`, `password`
- **Scopes:** `openid`, `profile`, `email`, `roles`, `deeplens.api`, `offline_access`

#### Mobile Client

- **Client ID:** `deeplens-mobile`
- **Client Secret:** `mobile-secret-change-in-production`
- **Grant Types:** `authorization_code`, `refresh_token`

#### Machine-to-Machine Client

- **Client ID:** `deeplens-m2m`
- **Client Secret:** `m2m-secret-change-in-production`
- **Grant Types:** `client_credentials`

#### API Gateway Client

- **Client ID:** `deeplens-gateway`
- **Client Secret:** `gateway-secret-change-in-production`
- **Grant Types:** `client_credentials`, `delegation`

---

## MinIO (Object Storage)

### Single Instance Architecture

MinIO uses **bucket-based multi-tenancy** with one shared instance.

### Root Admin Credentials

- **Access Key:** `admin`
- **Secret Key:** `DeepLens123!`
- **Console:** `http://localhost:9001`
- **API Endpoint:** `http://localhost:9000`

### Tenant Access Pattern

Each tenant gets:

- Dedicated bucket (e.g., `deeplens-admin`, `deeplens-tenant1`)
- Unique IAM user with access key/secret
- Restricted policy (access only to their bucket)

**Example Tenant Credentials:**

- **Bucket:** `deeplens-admin`
- **Access Key:** `admin-access-key-{random}`
- **Secret Key:** `{generated-secure-secret}`
- **Policy:** Read/write access to `deeplens-admin/*` only

---

## Redis

### No Authentication (Development)

- **Host:** `localhost`
- **Port:** `6379`
- **Connection:** `localhost:6379`

---

## Qdrant (Vector Database)

### No Authentication (Development)

- **Host:** `localhost`
- **HTTP Port:** `6333`
- **gRPC Port:** `6334`
- **Dashboard:** `http://localhost:6333/dashboard`

---

## Kafka

### No Authentication (Development)

- **Bootstrap Servers:** `localhost:9092`
- **Zookeeper:** `localhost:2181`

---

## Grafana (Monitoring)

### Admin User

- **Username:** `admin`
- **Password:** `DeepLens123!`
- **URL:** `http://localhost:3001`

---

## Prometheus

### No Authentication (Development)

- **URL:** `http://localhost:9090`

---

## Loki (Logging)

### No Authentication (Development)

- **URL:** `http://localhost:3100`

---

## Jaeger (Tracing)

### No Authentication (Development)

- **UI:** `http://localhost:16686`
- **Collector:** `localhost:14250`

---

## OpenTelemetry Collector

### No Authentication (Development)

- **gRPC:** `localhost:4317`
- **HTTP:** `localhost:4318`

---

## Quick Start Commands

### PostgreSQL Container (Clean Start)

```powershell
podman stop deeplens-postgres
podman rm -v deeplens-postgres
podman run -d --name deeplens-postgres \
  -p 5433:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=DeepLensPassword123 \
  postgres:16-alpine
```

### Test PostgreSQL Connection

```powershell
podman exec deeplens-postgres psql -U postgres -c "SELECT version();"
```

### Identity API

```powershell
cd src/NextGen.Identity.Api
$env:ASPNETCORE_URLS="http://localhost:5001"
dotnet run
```

### WebUI

```powershell
cd src/DeepLens.WebUI
npm run dev
```

---

## Password Policy (Development)

All development passwords follow this pattern:

- **Format:** `ServiceName123!`
- **Examples:**
  - PostgreSQL: `DeepLens123!`
  - Admin User: `DeepLens@Admin123!`
  - Grafana: `DeepLens123!`

**⚠️ Production Note:** All these credentials MUST be changed for production deployments using proper secrets management (Azure Key Vault, HashiCorp Vault, etc.)

---

## Environment Variables

### For Identity API

```bash
ASPNETCORE_URLS=http://localhost:5001
ASPNETCORE_ENVIRONMENT=Development
ConnectionStrings__DefaultConnection=Host=localhost;Port=5433;Database=nextgen_identity;Username=postgres;Password=DeepLensPassword123
```

### For Infrastructure Setup

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=DeepLensPassword123
POSTGRES_DB=postgres
POSTGRES_HOST_PORT=5433
GRAFANA_ADMIN_PASSWORD=DeepLensPassword123
```

---

**Last Updated:** December 18, 2025
