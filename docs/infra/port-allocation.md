# DeepLens Port Allocation Map (External Managed)

This document tracks ports used by DeepLens services. Many core services are now hosted externally at `192.168.0.170`.

## 🌐 External Services (Shared)

| Port | Service            | Host            | Purpose                        |
| ---- | ------------------ | --------------- | ------------------------------ |
| 5432 | PostgreSQL         | `192.168.0.170` | Primary relational database & LiteLLM spend state |
| 6379 | Redis              | `192.168.0.170` | Distributed cache, LiteLLM response cache & RPM sync |
| 9092 | Kafka              | `192.168.0.170` | Message broker                 |
| 9000 | MinIO (API)        | `192.168.0.170` | Object storage API             |
| 9001 | MinIO (Console)    | `192.168.0.170` | Object storage UI              |
| 8086 | InfluxDB           | `192.168.0.170` | Time-series database           |
| 3000 | Grafana            | `192.168.0.170` | Monitoring dashboards          |
| 6333 | Qdrant Dashboard   | `192.168.0.170` | Vector database UI             |
| 8080 | Kafka UI           | `192.168.0.170` | Topic management               |
| 9090 | Prometheus         | `192.168.0.170` | Metrics database               |
| 16686| Jaeger UI          | `192.168.0.170` | Distributed tracing UI         |

## 🏗️ Startup Dependency Sequence

All infrastructure must launch in strict dependency order:
1. **Core Data Tier**: `postgres` (5432) & `redis` (6379) initialize and pass healthchecks.
2. **Inference Tier**: `litellm` (4000) & `ollama-gpu` (11434) boot after `postgres` and `redis` become healthy.
3. **Gateway & Applications**: `gateway` (80) starts once `litellm` is healthy; application containers (`deeplens-api` 5000, `reasoning-api` 8002) attach to `deeplens-network`.

## 🚀 Application Services (Local)

| Port | Service            | Protocol | Purpose                        |
| ---- | ------------------ | -------- | ------------------------------ |
| 4000 | LiteLLM Proxy & UI | HTTP     | LLM Gateway & Admin UI         |
| 5000 | Search API         | HTTP     | Image search & ingestion       |
| 5198 | Identity API       | HTTP     | Authentication & authorization |
| 8001 | Feature Extraction | HTTP     | AI/ML feature extraction       |
| 8002 | Reasoning API      | HTTP     | LLM reasoning service          |
| 3005 | WhatsApp Processor | HTTP     | WhatsApp message processing    |
| 8081 | Vayyari Expo Dev   | HTTP/WS  | React Native Metro bundler     |
| 8090 | OpenWhispr (V2T)   | HTTP     | Voice-to-Text Control Panel    |
| 8091 | Handy (V2T)        | HTTP     | Voice-to-Text Parakeet/Whisper |
| 8092 | whisper.cpp (V2T)  | HTTP     | Voice-to-Text Vulkan Server    |
| 9749 | Codebase Memory MCP| HTTP     | Repository Graph & Knowledge UI|
| 24282| Serena MCP         | HTTP     | Semantic Code & LSP Dashboard  |

## 🚪 Gateway Reverse Proxy Routes (Port 80)

The Nginx Gateway on port 80 routes internal and public requests across local containers:

| Route Path | Upstream Target | Purpose |
| ---------- | --------------- | ------- |
| `/` | Nginx Static (`/usr/share/nginx/html`) | DeepLens Portal Landing Page |
| `/grafana/` | `http://grafana:3000/` | Grafana Telemetry & Dashboards |
| `/minio/` | `http://minio:9001/` | MinIO Console |
| `/kafka-ui/` | `http://kafka-ui:8080/` | Kafka Topic Management |
| `/influx/` | `http://influxdb:8086/` | InfluxDB Time-Series Explorer |
| `/qdrant/` | `http://qdrant:6333/` | Qdrant Vector DB UI |
| `/pgadmin/` | `http://pgadmin:80/` | PostgreSQL Admin Web UI |
| `/jaeger/` | `http://jaeger:16686/` | Jaeger Distributed Tracing |
| `/prometheus/` | `http://prometheus:9090/` | Prometheus Metrics UI |
| `/chat/` | `http://open-webui:8080/` | Open WebUI / Ollama Chat |
| `/vayyari-updates/` | `http://minio:9000/vayyari-updates/` | Vayyari Self-Hosted OTA Manifests & JS Bundles |

## 🪣 MinIO Object Storage Buckets

| Bucket Name | Access Policy | Purpose |
| ----------- | ------------- | ------- |
| `tenant-<uuid>` | Authenticated / IAM | Tenant image assets, thumbnails, and embeddings |
| `whatsapp-media` | Authenticated / IAM | Ingested WhatsApp chat attachments and media |
| `vayyari-updates` | Public (`download`) | Self-hosted Vayyari JS bundles, assets, and `manifest.json` |

## 🏢 Tenant Specific (Local)

Tenants may have dedicated local containers for high performance vector storage.

| Port Range  | Service       | Purpose                      |
| ----------- | ------------- | ---------------------------- |
| 6433-6533   | Qdrant (HTTP) | Tenant vector database (API) |
| 6434-6534   | Qdrant (gRPC) | Tenant vector database (gRPC)|

---

## 🔑 Dashboard & Admin Console Credentials

| Service | URL / Port | Auth Method | Default Credentials / Key | Config Location |
| ------- | ---------- | ----------- | -------------------------- | --------------- |
| **LiteLLM Admin UI** | `http://localhost:4000/ui` | Username / Password or Master Key | `admin` / `sk-deeplens-master-key` | `deploy/litellm/.env` (`LITELLM_UI_USERNAME`, `LITELLM_UI_PASSWORD`, `DATABASE_URL`) |
| **LiteLLM Swagger Docs** | `http://localhost:4000/` | Bearer Token | `sk-deeplens-master-key` | `deploy/litellm/.env` (`LITELLM_MASTER_KEY`) |
| **MinIO Console** | `http://192.168.0.170:9001` | Basic Auth | `minioadmin` / `minioadmin` | `.env` (`MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`) |
| **Vayyari OTA Endpoint** | `http://krikanserver.taild227d9.ts.net/vayyari-updates/manifest.json` | Public / Gateway | Anonymous Download | `src/vayyari/push-update.sh` / `setupscripts/core/gateway/nginx.conf` |
| **Kafka UI** | `http://192.168.0.170:8080` | Anonymous / No Auth | *(No password required)* | `setupscripts/core/Kafka/docker-compose.yaml` |
| **Serena MCP Dashboard** | `http://localhost:24282/dashboard/index.html` | Anonymous / Local | *(No password required)* | Serena MCP config |
| **Codebase Memory MCP** | `http://localhost:9749` | Anonymous / Local | *(No password required)* | Codebase Memory MCP config |

---
*Generated by DeepLens Infrastructure Management*

