# DeepLens — Master Knowledge Index

> **AI Navigation Instructions**
>
> This is the **only file loaded on every session**. It is your entry point to the entire repo.
>
> **How to use this index:**
> 1. Scan the section headers to find what's relevant to the current task
> 2. Read the "Read when" hint next to each link — if it matches your task, fetch that file
> 3. Do NOT read files that don't match your task — preserve context window for what matters
> 4. Hard rules (below) apply to EVERY task without exception

---

## ⛔ Hard Rules — Apply to Every Task

These are non-negotiable. No exceptions.

| Rule | What to do |
|---|---|
| `[JsonPropertyName("camelCase")]` on every C# DTO property | Always. Missing it causes silent frontend crashes |
| TypeScript interfaces must exactly mirror `JsonPropertyName` values | camelCase, same field names |
| Image/video processing → Kafka → `202 Accepted` | Never process media synchronously in an API handler |
| EF Core migrations only | Never write raw `.sql` migration files |
| After any backend change (C#/Node/Python) → run build-and-deploy.sh or Makefile targets | Mandatory before testing |
| Singleton video player in Vayyari | One `expo-video` instance per screen, rebind source — never create per-item |
| Always use entity ID as Kafka message key | Ensures sequential ordering per entity across partitions |
| Dapper for reads, EF Core for writes (.NET) | Dapper in Search/Identity reads; EF Core for domain mutations |
| `lowercase_with_underscores` for all DB table and column names | No PascalCase or camelCase in SQL |
| Never add individual IPs to CORS allowlist | Use `"AllowAnyIntranetOrigin": true` in appsettings |

---

## 🤖 Start Here for Feature Work

Use the **master agent** for any feature that touches more than one service:

```
.gemini/agents/deeplens-feature-agent.md
```

| Agent | Path | Trigger |
|---|---|---|
| **`deeplens-feature-agent`** ← START HERE | `.gemini/agents/deeplens-feature-agent.md` | Any feature touching 2+ services |
| `api-endpoint-agent` | `.gemini/agents/api-endpoint-agent.md` | New HTTP endpoint in .NET or WhatsApp Processor |
| `vayyari-screen-agent` | `.gemini/agents/vayyari-screen-agent.md` | New screen, hook, or service in Vayyari |
| `webui-feature-agent` | `.gemini/agents/webui-feature-agent.md` | New page or component in Web UI dashboard |
| `kafka-event-agent` | `src/DeepLens.Service/.gemini/agents/kafka-event-agent.md` | New Kafka topic or async event |
| `schema-migration-agent` | `src/DeepLens.Service/.gemini/agents/schema-migration-agent.md` | Any DB schema change |
| `whatsapp-feature-agent` | `src/whatsapp-processor/.gemini/agents/whatsapp-feature-agent.md` | Any WhatsApp Processor feature |
| `code-review-agent` | `.gemini/agents/code-review-agent.md` | Review code, review PR, analyze and fix, check standards |
| `giglog` | `.gemini/agents/giglog.agent.md` | Log work activity, summarize progress, analyze time |

---

## 🗺️ Service Map

| Service | Stack | Root | Port | Skill |
|---|---|---|---|---|
| **SearchApi** | C# .NET 9 | `src/DeepLens.Service/DeepLens.SearchApi/` | 5000 | `src/DeepLens.Service/SKILL.md` |
| **AdminApi** | C# .NET 9 | `src/DeepLens.Service/DeepLens.AdminApi/` | — | `src/DeepLens.Service/SKILL.md` |
| **WorkerService** | C# .NET 9 | `src/DeepLens.Service/DeepLens.WorkerService/` | — | `src/DeepLens.Service/SKILL.md` |
| **NextGen Identity** | C# .NET 9 + Duende | `src/NextGen.Identity/` | 5198 | `src/NextGen.Identity/SKILL.md` |
| **Feature Extraction** | Python / FastAPI | `src/DeepLens.FeatureExtractionService/` | 8001 | `src/DeepLens.FeatureExtractionService/SKILL.md` |
| **Reasoning Service** | Python / FastAPI | `src/DeepLens.ReasoningService/` | 8002 | *(WIP — no SKILL.md yet)* |
| **DeepLens Web UI** | React / Vite / MUI | `src/DeepLens.WebUI/` | 5001 | `src/DeepLens.WebUI/SKILL.md` |
| **Vayyari** (mobile) | React Native / Expo | `src/vayyari/` | Expo DevTools | `src/vayyari/SKILL.md` |
| **WhatsApp Processor** | Node.js / TS / Express | `src/whatsapp-processor/` | 3005 | `src/whatsapp-processor/SKILL.md` |
| **IGReplyBot** | Android / Kotlin | `src/IGReplyBot/` | — | *(stable, no SKILL.md)* |

**Start order** (must follow to avoid auth failures):
```
1. Infrastructure (already running at 192.168.0.170)
2. NextGen Identity (port 5198) ← everything else needs JWTs from here
3. DeepLens SearchApi (port 5000)
4. DeepLens WorkerService
5. Feature Extraction (port 8001) — independent
6. WhatsApp Processor (port 3005) — independent
7. Vayyari / Web UI — last (depends on all APIs)
```

---

## 📚 Documentation Index

### Architecture & Design

| Document | Path | Read when |
|---|---|---|
| System Architecture (ADRs, data model, pipeline diagrams) | `docs/architecture/system-overview.md` | Understanding how services connect, reviewing a system-level decision, checking ADRs |
| Hybrid Architecture ADR | `docs/architecture/adr/ADR-001-hybrid-architecture.md` | Questioning the .NET + Python split decision |
| DTO Serialization Standards | `docs/architecture/dto_standards.md` | Any question about JSON naming, camelCase, `[JsonPropertyName]` usage |
| Media Processing Architecture | `docs/MEDIA_ARCHITECTURE.md` | Working on image/video upload, processing pipeline, or MinIO streaming |

### Technical References

| Document | Path | Read when |
|---|---|---|
| **Kafka Topics** (all topics, producers, consumers) | `docs/technical/KAFKA_TOPICS.md` | Before adding any Kafka event — topic may already exist |
| **Current DB Schema** (live schema dump) | `docs/technical/current_schema_dump.txt` | Before any schema migration — understand current state first |
| **Codebase Overview** (API reference) | `docs/technical/codebase-overview.md` | Looking for an existing endpoint before building a new one |
| Database Naming Standards | `docs/technical/database-standards.md` | Adding tables/columns, reviewing DB naming conventions |
| Security & RBAC | `docs/technical/SECURITY.md` | Working on auth flows, JWT claims, RBAC roles, token refresh |
| Observability Setup | `docs/technical/OBSERVABILITY.md` | Adding OpenTelemetry spans, working with Jaeger/Prometheus/Grafana |
| Video Processing | `docs/technical/VIDEO_PROCESSING.md` | Working on video upload, streaming, Vayyari video player |
| SKU Creation Requirements | `docs/technical/SKU_CREATION_REQUIREMENTS.md` | Building product/SKU/catalog features |
| Services Reference | `docs/technical/SERVICES.md` | Looking up service contracts, endpoints, or config specs |

### Infrastructure & Operations

| Document | Path | Read when |
|---|---|---|
| Port Allocation | `docs/infrastructure/port-allocation.md` | Adding a new service or checking port conflicts |
| Port Audit | `docs/infrastructure/port-audit.md` | Diagnosing port conflicts |
| Ollama Context & Metrics Guide | `setupscripts/core/ollama/CONTEXT_AND_METRICS_GUIDE.md` | Monitoring LLM metrics and sizing context windows on 8GB GPUs |


### Guides

| Document | Path | Read when |
|---|---|---|
| Development Setup | `DEVELOPMENT.md` | First-time setup, credentials, local dev workflow |
| Contributing Guide | `docs/guides/contributing.md` | Pull request process, code review standards |
| Troubleshooting Guide | `docs/guides/troubleshooting.md` | Debugging startup failures, connection errors |
| FFmpeg Setup | `docs/guides/ffmpeg-setup.md` | Working with video transcoding locally |

### WhatsApp & Campaign Assets

| Document | Path | Read when |
|---|---|---|
| Campaign Prompt Template | `docs/Prompt templates/whatsapp_campaign_prompt_template.md` | Building WhatsApp broadcast/campaign features |
| Campaign Step Messages | `docs/Prompt templates/campaign_step_messages.json` | Reference for campaign message structure |

### Archived (Historical — Do Not Load Unless Debugging Past Decisions)

| Document | Path | Use when |
|---|---|---|
| Consolidated Guide | `docs/archive/consolidated-guide.md` | Historical reference only |
| Deep Sync Changes | `docs/archive/DEEP_SYNC_CHANGES.md` | Debugging deep sync behavior |
| Migration Test Results | `docs/archive/migration-test-results.md` | Reviewing past migration outcomes |

---

## 🔍 Where to Find Things

| What you need | Where to look |
|---|---|
| API endpoint definitions | `src/DeepLens.Service/DeepLens.SearchApi/Controllers/` |
| Domain models | `src/DeepLens.Service/DeepLens.Domain/Entities/` |
| Application handlers (CQRS) | `src/DeepLens.Service/DeepLens.Application/` |
| Service interfaces | `src/DeepLens.Service/DeepLens.Application/Abstractions/Services/` |
| Service implementations | `src/DeepLens.Service/DeepLens.SearchApi/Services/` |
| Kafka event contracts | `src/DeepLens.Service/DeepLens.Contracts/Events/` |
| EF Core migrations | `src/DeepLens.Service/DeepLens.Infrastructure/Migrations/` |
| Multi-tenant DB drivers | `src/DeepLens.Service/DeepLens.Infrastructure/Repositories/` |
| Vayyari screens (routes) | `src/vayyari/app/` (Expo Router file-system routing) |
| Vayyari API services | `src/vayyari/services/` |
| Vayyari custom hooks | `src/vayyari/hooks/` |
| Vayyari shared state | `src/vayyari/context/` |
| WebUI pages | `src/DeepLens.WebUI/src/pages/` |
| WebUI API services | `src/DeepLens.WebUI/src/services/` |
| WhatsApp controllers | `src/whatsapp-processor/src/controllers/` |
| WhatsApp repositories | `src/whatsapp-processor/src/repositories/` |
| WhatsApp services | `src/whatsapp-processor/src/services/` |
| Infrastructure scripts | `setupscripts/` |
| Tenant provisioning | `infrastructure/` |
| Kafka topic management | `infrastructure/scripts/manage-kafka-topics.sh` |

---

## 🏗️ Shared Infrastructure (Remote: `192.168.0.170`)

| Service | Port | Used by |
|---|---|---|
| PostgreSQL | 5432 | All services (separate DB per tenant: `deeplens_{slug}`) |
| Redis | 6379 | SearchApi (caching), WorkerService |
| Kafka | 9092 | SearchApi, WorkerService, WhatsApp Processor |
| MinIO | 9000 (API), 9001 (console) | SearchApi, WorkerService, WhatsApp Processor |
| Qdrant | 6333 | WorkerService (vector indexing, isolated per tenant) |
| Grafana | 3000 | Monitoring dashboards |
| Jaeger | 16686 | Distributed trace UI |
| Prometheus | 9090 | Metrics scraping |

---

## 🔁 Common Workflows (Quick Reference)

### Add a new API endpoint
→ Run `api-endpoint-agent` or `deeplens-feature-agent`

### Add a database column or table
→ Run `schema-migration-agent` → EF Core migration → update DTO → update TS types → update schema dump

### Add a Kafka event
→ Run `kafka-event-agent` → check `docs/technical/KAFKA_TOPICS.md` first

### Add a Vayyari mobile screen
→ Run `vayyari-screen-agent` → types → service → hook → screen → nav

### Add a Web UI page
→ Run `webui-feature-agent` → types → service → page → route

### Add a WhatsApp feature
→ Run `whatsapp-feature-agent` → types → repo → service → controller → route

### Deploy Backend changes
```bash
# Build/deploy all services
./setupscripts/application/services/build-and-deploy.sh

# Or deploy specific service
make deploy-reasoning-api
```

### Add an EF Core migration
```bash
cd src/DeepLens.Service/DeepLens.Infrastructure
dotnet ef migrations add <MigrationName> --startup-project ../DeepLens.SearchApi
dotnet ef database update --startup-project ../DeepLens.SearchApi
```

### Start services locally
```bash
# Identity API (always first)
dotnet run --project src/NextGen.Identity/NextGen.Identity.Api --urls http://localhost:5198

# Search API
dotnet run --project src/DeepLens.Service/DeepLens.SearchApi --urls http://localhost:5000

# Vayyari mobile
cd src/vayyari && npx expo start

# Web UI
cd src/DeepLens.WebUI && npm run dev

# WhatsApp Processor
cd src/whatsapp-processor && npm run dev

# Python Feature Extraction
cd src/DeepLens.FeatureExtractionService && source venv/bin/activate && uvicorn main:app --reload --port 8001
```
