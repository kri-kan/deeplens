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
- **Reference Docs**: Before suggesting changes to architecture, check the `docs/` directory.
- **Deduplication**: Ensure content-addressable storage (hashing) logic is preserved when modifying media ingestion.
