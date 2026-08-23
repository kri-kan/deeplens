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

# Test liveliness
curl http://localhost:4000/health/liveliness
```
