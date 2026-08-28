# 📚 DeepLens Documentation Center

Welcome to the DeepLens Documentation Hub. This directory is organized to help both human developers and AI assistants (Copilots, Agents) understand, maintain, and extend the DeepLens ecosystem.

---

## 🗺️ Documentation Map

### 🏗️ [Architecture](./architecture/)
*Fundamental design principles and system structure.*
- [System Overview](./architecture/system-overview.md) - The "Big Picture" of DeepLens.
- [Persistent Sessions & Auth](./architecture/persistent-sessions-and-auth.md) - JWT lifecycle, 90-day RTR, and cross-platform session persistence.
- [Multi-Tenancy](./architecture/multi-tenancy.md) - Isolation models and tenant provisioning.
- [Architecture Decisions (ADR)](./architecture/adr/) - Why we made certain technical choices.

### 🏁 [Guides & Onboarding](./guides/)
*How to get things done.*
- [Development Setup](../DEVELOPMENT.md) (Root) - Quick start for new devs.
- [Mobile Build & Deploy](./guides/mobile-build-and-deploy.md) - Standalone APK compilation, self-hosted OTA updates, retention, and network security.
- [Catalog & Media Features](./guides/catalog-and-media-features.md) - Fullscreen image preview modal, gesture zooming, back handlers, and category taxonomy picker.
- [AI UI Design Preview Workflow](./guides/AI_UI_DESIGN_PREVIEW_WORKFLOW.md) - Pre-commit design validation, token extraction, and browser previews.
- [FFmpeg Setup](./guides/ffmpeg-setup.md) - Video processing prerequisites.
- [Troubleshooting](./guides/troubleshooting.md) - Common issues and solutions.

### 🔧 [Technical Reference](./technical/)
*Deep dives into components and APIs.*
- [Codebase Overview](./technical/codebase-overview.md) - Project structure and responsibilities.
- [API Reference](./technical/codebase-overview.md#api-reference) - Endpoints and contracts.
- [Database Standards](./technical/database-standards.md) - Naming and schema conventions.
- [Current Database Schema](./technical/current_schema_dump.txt) - Raw schema dump for reference.
- [Kafka Topics](./technical/KAFKA_TOPICS.md) - Event-driven communication map.
- [Video Processing](./technical/VIDEO_PROCESSING.md) - Pipeline details.
- [Security & RBAC](./technical/SECURITY.md) - Auth and permissions.
- [Observability](./technical/OBSERVABILITY.md) - Monitoring and tracing.

### 🧪 [Research & Experiments](../researchTopics/)
- Deep dives into Instagram/YouTube scraping, account rotation, and engagement tracking.


### 🌐 [Infrastructure](./infrastructure/)
*Deployment and environment management.*
- [Port Audit](./infrastructure/port-audit.md) - Service port allocations.
- [Container Orchestration](../infrastructure/README.md) - Docker/Podman setup.

### 📦 [Archive](./archive/)
*Historical context and previous versions.*
- [Consolidated Guide](./archive/consolidated-guide.md) - Searchable legacy monolith doc.
- [Release Notes](./archive/release-notes.md) - Version history.
- [Migration Results](./archive/migration-test-results.md) - Past database migrations.

---

## 🤖 AI Assistant (Copilot) Instructions

If you are an AI assistant helping with this codebase:

1. **Start Here**: Always read [architecture/system-overview.md](./architecture/system-overview.md) first to understand the hybrid .NET/Python nature of the project.
2. **Context**: Use `technical/codebase-overview.md` to locate specific services within `src/`.
3. **Standards**: Adhere to `technical/database-standards.md` when proposing schema changes.
4. **Patterns**: Follow the ADRs in `architecture/adr/` to maintain architectural consistency.
5. **Connectivity**: Most infrastructure (Postgres, Redis, Kafka) resides at `192.168.0.170`. Check `.env` files for confirmation.

---

## 🛠️ Maintenance Note
When adding new features, please create a corresponding document in the appropriate category above and update this index.
