# LiteLLM Proxy Gateway & Admin Dashboard

DeepLens containerized LiteLLM proxy router providing multi-key load balancing across Google Gemini API keys with zero-downtime automated failover to local GPU Ollama models.

---

## 🔑 Access Credentials & Dashboard Login

| Item | Details |
| ---- | ------- |
| **Admin UI URL** | `http://localhost:4000/ui` |
| **API Swagger Docs** | `http://localhost:4000/` |
| **Admin UI Username** | `admin` |
| **Admin UI Password** | `sk-deeplens-master-key` |
| **Default Master Key** | `sk-deeplens-master-key` |
| **Database Connection** | `postgresql://postgres:***@192.168.0.170:5432/litellm` |
| **Spend Tracking & DB Storage** | Enabled (`STORE_MODEL_IN_DB=True`) |
| **Distributed Cache & State** | Redis on `192.168.0.170:6379/0` (`cache: true`, `cache_params.type: redis`) |
| **Rate Limit Sync** | Redis (`redis_host`, `redis_port`, `redis_url`) |
| **Config File** | `deploy/litellm/.env` |

> **Note**: When prompted on the `/ui` login screen, enter username `admin` and password `sk-deeplens-master-key` (or your master key / bearer token) to access the dashboard and spend analytics.

---

## 🌐 Endpoints & Health Checks

- **Admin Dashboard**: `http://localhost:4000/ui`
- **Swagger Documentation**: `http://localhost:4000/`
- **Liveliness Probe**: `http://localhost:4000/health/liveliness`
- **Readiness Probe**: `http://localhost:4000/health/readiness`
- **Model Registry**: `http://localhost:4000/models` (requires `Authorization: Bearer sk-deeplens-master-key`)
- **Chat Completions**: `http://localhost:4000/v1/chat/completions`

---

## ⚡ Redis Caching & Rate Limit Synchronization

LiteLLM proxy uses Redis (`192.168.0.170:6379`) for:
1. **Semantic & Exact Response Caching**:
   - Configured via `litellm_settings.cache: true` with `litellm_settings.cache_params` targeting Redis.
   - Repeated identical requests bypass backend LLM and Ollama inferences, returning cached responses with sub-millisecond latencies (< 10ms).
   - Reduces latency and token burn across high-frequency metadata extraction jobs.
2. **Distributed Rate Limiting & Router RPM Tracking**:
   - Router state and token/request rate limits are synchronized centrally in Redis (`global_router:*:rpm:*`, `*_request_count`).
   - Ensures multi-worker LiteLLM instances respect Gemini API tier limits (15 RPM / 1M TPM per key).

---

## 🏗️ Startup Sequence & Dependency Ordering

To ensure zero start-order race conditions, services must boot according to the following strict DAG:

```mermaid
flowchart TD
    A[Core Data Tier: postgres & redis] -->|Healthcheck passed| B[Inference Tier: litellm & ollama-gpu]
    B -->|Healthcheck passed| C[Edge Gateway: nginx gateway]
    B -->|deeplens-network| D[App Tier: reasoning-api & search-api]
```

1. **Tier 1 (Core Storage & Cache)**:
   - `postgres` (Port 5432) & `redis` (Port 6379) initialize and pass their respective `pg_isready` and `redis-cli ping` healthchecks.
2. **Tier 2 (Inference & Routing)**:
   - `deeplens-litellm` (Port 4000) and `ollama-gpu` (Port 11434) boot once `postgres` and `redis` are healthy. LiteLLM establishes Prisma DB migration and Redis cache connections.
3. **Tier 3 (Edge Gateway & Applications)**:
   - `gateway` (Port 80) boots once `litellm` passes `/health/liveliness`.
   - Application services (`reasoning-api` on Port 8002, `deeplens-api` on Port 5000) connect to `http://deeplens-litellm:4000/v1` via the bridge `deeplens-network`.

---

## ⚙️ Model Roster & Routing

| Virtual Model Alias | Provider Hierarchy | Purpose |
| ------------------- | ------------------ | ------- |
| `deeplens-llm` | Gemini 2.5 Flash (`KEY_1..3`) ➔ Ollama `phi4-mini:latest` ➔ `phi3:latest` | Complex reasoning, WhatsApp catalog extraction, title generation |
| `deeplens-fast` | Gemini 2.5 Flash (`KEY_1..3`) ➔ Ollama `phi4-mini:latest` ➔ `phi3:latest` | Fast tag generation, category classification |
| `gemini-2.5-flash` | Direct Google Gemini pool | Direct cloud inference |
| `phi4-mini:latest` | Local Ollama GPU (`http://ollama-gpu:11434`) | Direct local inference |
| `phi3:latest` | Local Ollama GPU (`http://ollama-gpu:11434`) | Fallback local inference |

---

## 🚀 Management Commands

```bash
# Start or restart LiteLLM container
docker compose -f deploy/litellm/docker-compose.litellm.yaml up -d

# Check live logs
docker logs -f deeplens-litellm

# Test liveliness & readiness
curl -i http://localhost:4000/health/liveliness
curl -i http://localhost:4000/health/readiness

# Inspect Redis Cache Keys
docker exec redis redis-cli keys "*"
```
