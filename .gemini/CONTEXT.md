# DeepLens Monorepo — AI Context Guide

> **For AI Assistants**: Read this file first. It maps the entire repo, defines hard rules, and tells you where to look before touching anything.

---

## 🗺️ Project Map

This is a monorepo containing **8 sub-projects** across 4 tech stacks. All `src/` projects share the same remote infrastructure (`192.168.0.170`).

| Project | Stack | Location | Dev Port(s) | Skill File |
|---|---|---|---|---|
| **DeepLens Core** | C# / .NET 9 | `src/DeepLens.Service/` | 5000 (Search), 5001 (WebUI) | `src/DeepLens.Service/SKILL.md` |
| **NextGen Identity** | C# / .NET 9 | `src/NextGen.Identity/` | 5198 | `src/NextGen.Identity/SKILL.md` |
| **Feature Extraction** | Python / FastAPI | `src/DeepLens.FeatureExtractionService/` | 8001 | `src/DeepLens.FeatureExtractionService/SKILL.md` |
| **Reasoning Service** | Python / FastAPI | `src/DeepLens.ReasoningService/` | 8002 | — |
| **DeepLens Web UI** | React / Vite / MUI | `src/DeepLens.WebUI/` | 5001 | `src/DeepLens.WebUI/SKILL.md` |
| **Vayyari** (mobile) | React Native / Expo | `src/vayyari/` | Expo DevTools | `src/vayyari/SKILL.md` |
| **WhatsApp Processor** | Node.js / TypeScript / Express | `src/whatsapp-processor/` | 3005 (API), 3006 (React dev) | `src/whatsapp-processor/SKILL.md` |
| **IGReplyBot** | Android / Kotlin | `src/IGReplyBot/` | — | `src/IGReplyBot/SKILL.md` |

---

## 🏗️ Shared Infrastructure (Remote: `192.168.0.170`)

| Service | Host:Port | Purpose |
|---|---|---|
| PostgreSQL | `192.168.0.170:5432` | Metadata & Identity DB |
| Redis | `192.168.0.170:6379` | Caching & state |
| Kafka | `192.168.0.170:9092` | Async event bus |
| MinIO | `192.168.0.170:9000/9001` | Object storage (images, video, media) |
| Qdrant | `192.168.0.170:6333` | Vector DB for similarity search |
| Grafana | `192.168.0.170:3000` | Monitoring dashboards |
| Jaeger | `192.168.0.170:16686` | Distributed tracing UI |

All services use the same `.env` pattern. See `infrastructure/.env.example`.

---

## 📚 Documentation Index (Read Before Coding)

| Topic | File |
|---|---|
| System architecture & ADRs | `docs/architecture/system-overview.md` |
| Codebase & API reference | `docs/technical/codebase-overview.md` |
| **Kafka topics** (all 8 topics) | `docs/technical/KAFKA_TOPICS.md` |
| Database schema dump | `docs/technical/current_schema_dump.txt` |
| Database naming standards | `docs/technical/database-standards.md` |
| Video processing | `docs/technical/VIDEO_PROCESSING.md` |
| Security & RBAC | `docs/technical/SECURITY.md` |
| Observability | `docs/technical/OBSERVABILITY.md` |
| Dev setup & credentials | `DEVELOPMENT.md` |
| Project-wide rules | `PROJECT_GUIDELINES.md` |

---

## ⛔ Hard Rules (Non-Negotiable)

### Data Contracts
- Every C# DTO public property **MUST** have `[JsonPropertyName("camelCaseName")]`
- TypeScript interfaces **MUST** exactly match the `JsonPropertyName` values
- Never use PascalCase JSON in API responses — always camelCase
- See `docs/architecture/dto_standards.md` for the canonical reference

### Database
- Table and column names: `lowercase_with_underscores`
- Use **Dapper** for high-frequency read queries in Identity & Search services
- Use **EF Core** for domain model writes and migrations
- **Never hand-write SQL migrations** — always use `dotnet ef migrations add <Name>`

### Async Processing
- Image and video processing **must** go through Kafka — never process synchronously in the API handler
- API uploads return `202 Accepted`, not `200 OK`
- Topic naming: `deeplens.{domain}.{action}` (e.g., `deeplens.images.uploaded`)

### Observability
- Every .NET API request must propagate OpenTelemetry trace context
- Wrap critical operations in `Activity` spans
- WhatsApp Processor uses `wrapInSpan()` from `src/utils/telemetry`
- Vayyari uses `wrapInSpan()` from `src/vayyari/utils/telemetry`

### Deployment (Backend Services)
- After **any** backend change (C#, Node.js, or Python FastAPI): run `./setupscripts/application/services/build-and-deploy.sh <service-name>` or the root Makefile command (e.g. `make deploy-reasoning-api`).
- Never suggest manually copying files, DLLs, or build artifacts directly; always use the deploy scripts or Makefile targets.

### Media (Vayyari)
- **Singleton video player**: one `expo-video` player instance per screen — re-bind source, never create new instances
- User media preferences (volume/mute) must persist via `AsyncStorage`
- Backend video delivery must support HTTP 206 (Partial Content) via `MinioSeekableStream`

---

## 🔁 Common Workflows

### Start a specific service for development

```bash
# WhatsApp Processor
cd src/whatsapp-processor && npm run dev

# Vayyari (mobile)
cd src/vayyari && npx expo start

# DeepLens Web UI
cd src/DeepLens.WebUI && npm run dev

# .NET Identity API
dotnet run --project src/NextGen.Identity/NextGen.Identity.Api --urls http://localhost:5198

# .NET Search API
dotnet run --project src/DeepLens.Service/DeepLens.SearchApi --urls http://localhost:5000

# Python Feature Extraction
cd src/DeepLens.FeatureExtractionService && source venv/bin/activate && uvicorn main:app --reload --port 8001
```

### Deploy backend changes
```bash
# Build and deploy all services
./setupscripts/application/services/build-and-deploy.sh

# Or deploy a specific service using Makefile targets:
make deploy-identity-api
make deploy-search-api
make deploy-worker-service
make deploy-whatsapp-processor
make deploy-reasoning-api
```

### Add a Kafka topic
1. Check `docs/technical/KAFKA_TOPICS.md` first — topic may already exist
2. Add the topic name constant to `src/DeepLens.Service/DeepLens.Contracts/Events/KafkaEvents.cs`
3. Create the topic: `.\\infrastructure\\scripts\\WAProcessor\\manage-kafka-topics.ps1 -Action Create -TopicName "deeplens.x.y"`
4. Update `docs/technical/KAFKA_TOPICS.md`

### Add a database migration (.NET)
```bash
cd src/DeepLens.Service/DeepLens.Infrastructure
dotnet ef migrations add <MigrationName> --startup-project ../DeepLens.SearchApi
dotnet ef database update --startup-project ../DeepLens.SearchApi
```

---

## 🤖 AI Agents (Read Before Building Any Feature)

Use the **master agent first** for any multi-service feature. It orchestrates all sub-agents below.

| Agent | Location | Trigger When |
|---|---|---|
| **`deeplens-feature-agent`** ← **START HERE** | `.gemini/agents/deeplens-feature-agent.md` | Building any feature touching 2+ services |
| `api-endpoint-agent` | `.gemini/agents/api-endpoint-agent.md` | Adding HTTP endpoint to .NET or WhatsApp Processor |
| `vayyari-screen-agent` | `.gemini/agents/vayyari-screen-agent.md` | New screen, hook, or service in Vayyari mobile app |
| `webui-feature-agent` | `.gemini/agents/webui-feature-agent.md` | New page or component in the Web UI dashboard |
| `kafka-event-agent` | `src/DeepLens.Service/.gemini/agents/kafka-event-agent.md` | Adding a new Kafka topic or async event |
| `schema-migration-agent` | `src/DeepLens.Service/.gemini/agents/schema-migration-agent.md` | Any DB schema change (columns, tables) |
| `whatsapp-feature-agent` | `src/whatsapp-processor/.gemini/agents/whatsapp-feature-agent.md` | Any new WhatsApp Processor feature |
| `code-review-agent` | `.gemini/agents/code-review-agent.md` | Reviewing code/PRs, analyzing code quality, applying fixes |

---

## 🧭 Where to Look for Things

| What you need | Where to find it |
|---|---|
| API endpoint definitions | `src/DeepLens.Service/DeepLens.SearchApi/Controllers/` |
| Domain models | `src/DeepLens.Service/DeepLens.Domain/` |
| Application handlers (CQRS) | `src/DeepLens.Service/DeepLens.Application/` |
| Kafka event contracts | `src/DeepLens.Service/DeepLens.Contracts/Events/` |
| Multi-tenant DB drivers | `src/DeepLens.Service/DeepLens.Infrastructure/` |
| Vayyari screens (routes) | `src/vayyari/app/` (Expo Router file-system routing) |
| Vayyari API services | `src/vayyari/services/` |
| Vayyari shared state | `src/vayyari/context/` |
| WhatsApp controllers | `src/whatsapp-processor/src/controllers/` |
| WhatsApp repositories | `src/whatsapp-processor/src/repositories/` |
| WhatsApp services | `src/whatsapp-processor/src/services/` |
| Infrastructure setup scripts | `setupscripts/` |
| Tenant provisioning | `infrastructure/` |
