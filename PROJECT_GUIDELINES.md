# DeepLens Project Guidelines (IDE-Agnostic)

## 🏗️ Project Overview
DeepLens is a high-performance visual search engine.
- **Backend**: .NET 9 (Core APIs, Orchestration, Workers).
- **AI Services**: Python / FastAPI (Feature Extraction, LLM Metadata Extraction).
- **Web UI**: React / TypeScript / Vite.
- **Mobile UI**: React Native / Expo (Vayyari).
- **Infrastructure**: Remote Linux server (PostgreSQL, Redis, Kafka, MinIO, Qdrant).

## 🚀 Deployment & Development
- **Mandatory Deployment**: Any backend C# or service-layer changes **MUST** be finalized by running the deployment script: `./setupscripts/application/services/build-and-deploy.sh`.
- **Async First**: Image/Video processing should always be handled via **Kafka** topics.
- **Observability**: Use `OpenTelemetry` for tracing. Every API request should propagate trace context.

## 📋 Data Contract & Serialization
- **Strict DTO Standards**: All backend data contracts (DTOs) **MUST** enforce `camelCase` consistency.
- **Explicit Attributes**: Every public property in DTOs MUST have an explicit `[JsonPropertyName("camelCaseName")]` attribute to prevent UI property-access crashes.
- **Frontend Alignment**: TypeScript interfaces must exactly match the `JsonPropertyName` defined in the backend.

## 🗄️ Database Standards
- Use `lowercase_with_underscores` for table and column names.
- Prefer **Dapper** for high-frequency search queries.
- Use **EF Core** for complex domain models and migrations.

## 🎥 Media & Playback Patterns
- **Singleton Player Architecture**: Always use exactly one `expo-video` player instance per screen, dynamically re-binding its source during carousel swipes.
- **Streaming & Range Requests**: Backend video delivery must use `MinioSeekableStream` to support **HTTP 206 (Partial Content)** for range-based streaming.
- **Persistent Preferences**: User media preferences (Volume/Mute) must be persisted using `AsyncStorage`.

## 🤖 AI Interaction Guidelines

### Mandatory First Steps
- **Read `.gemini/CONTEXT.md` first** — it maps every project, port, and workflow in this repo.
- **Check `docs/` before architecture changes** — especially `docs/architecture/system-overview.md` and ADRs.
- **Check `docs/technical/KAFKA_TOPICS.md` before adding events** — the topic may already exist.
- **Check `docs/technical/current_schema_dump.txt` before schema changes** — understand current state first.

### Hard Rules for AI-Generated Code
- **DTOs**: Every public C# DTO property MUST have `[JsonPropertyName("camelCaseName")]`. Never omit this.
- **Migrations**: Never write raw SQL migration files. Always use `dotnet ef migrations add <Name>`.
- **Async first**: Image/video processing goes through Kafka. Never process in the API request handler.
- **Deploy**: After .NET changes, always remind to run `./setupscripts/application/services/build-and-deploy.sh`.
- **Deduplication**: Preserve content-addressable storage (PHash) logic when modifying media ingestion.
- **Video playback (Vayyari)**: Singleton `expo-video` player — rebind source, never create new instances per card.

### Project-Specific Skills
Each sub-project has a `SKILL.md` file with its specific patterns, gotchas, and coding conventions.
Load the relevant skill before working in a sub-project:
- WhatsApp Processor → `src/whatsapp-processor/SKILL.md`
- Vayyari (mobile) → `src/vayyari/SKILL.md`
- DeepLens Core (.NET) → `src/DeepLens.Service/SKILL.md`
- Python AI Services → `src/DeepLens.FeatureExtractionService/SKILL.md`
- Web UI → `src/DeepLens.WebUI/SKILL.md`
