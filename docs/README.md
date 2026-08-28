# 📚 DeepLens Documentation Center

Welcome to the DeepLens Documentation Hub. This directory is organized to help both human developers and AI assistants understand, maintain, and extend the DeepLens ecosystem.

---

## 🗺️ Documentation Map

### 🏗️ [Architecture](./architecture/)
*Fundamental design principles, data models, and system structure.*
- [Master System Overview](./system-overview.md) - The "Big Picture" of DeepLens and service topology.
- [Persistent Sessions & Token Lifecycle](./architecture/persistent-sessions-and-auth.md) - 24h JWT lifecycle, 90-day sliding RTR, cross-platform session persistence, and mutexed retry queue.
- [Native RBAC & Security](./architecture/rbac-and-security.md) - Decoupled authorization, L1/L2 multi-tier permission cache, and admin management.
- [WhatsApp & Media Pipeline](./architecture/whatsapp-and-media-pipeline.md) - Event-driven WhatsApp grouping, IST canonical timestamps, 100-day TTL archival, and vibrant image pruning.
- [Instagram Competitor Hub & Intelligence](./architecture/competitor-hub-and-intelligence.md) - Day-$N$ trajectory metrics, within-profile 90-day baselines, outlier discovery, and automated FFmpeg video transcoder.
- [MCP Code Intelligence](./architecture/mcp-code-intelligence.md) - Tool integration, context efficiency, and structural codebase discovery.
- [Multi-Tenancy](./architecture/multi-tenancy.md) - Isolation models and tenant provisioning.
- [Architecture Decisions (ADR)](./architecture/adr/) - Technical decisions log.

### 🏁 [Guides & Operations](./guides/)
*Operational workflows, build procedures, and UI features.*
- [Mobile Build & Deployment](./guides/mobile-build-and-deploy.md) - Standalone native APK builds, self-hosted OTA updates via MinIO, and Android cleartext networking.
- [Catalog & Media Features](./guides/catalog-and-media-features.md) - Fullscreen image preview modal, gesture-driven zoom/pan arbitration, and dynamic category dropdown taxonomy.
- [Development Setup](../DEVELOPMENT.md) (Root) - Quick start for new developers.
- [FFmpeg Setup](./guides/ffmpeg-setup.md) - Video processing prerequisites.
- [AI UI Design Preview Workflow](./guides/AI_UI_DESIGN_PREVIEW_WORKFLOW.md) - Previewing and iterating UI components.
- [Troubleshooting](./guides/troubleshooting.md) - Common issues and solutions.

### 🔧 [Technical Reference](./technical/)
*Deep dives into components, database schemas, and event streams.*
- [Codebase Overview](./technical/codebase-overview.md) - Project structure and responsibilities.
- [Database Standards](./technical/database-standards.md) - Naming and schema conventions.
- [Current Database Schema](./technical/current_schema_dump.txt) - Raw schema dump for reference.
- [Kafka Topics](./technical/KAFKA_TOPICS.md) - Event-driven communication map.
- [Video Processing](./technical/VIDEO_PROCESSING.md) - Pipeline details.
- [Security & RBAC Reference](./technical/SECURITY.md) - Auth and permissions reference.
- [Observability](./technical/OBSERVABILITY.md) - Monitoring and tracing.

### 🌐 [Infrastructure](./infrastructure/)
*Deployment and environment management.*
- [Port Audit](./infrastructure/port-audit.md) - Service port allocations.
- [Container Orchestration](../infrastructure/README.md) - Docker/Podman setup.

### 📦 [Archive](./archive/)
*Historical context and previous versions.*
- [Consolidated Guide](./archive/consolidated-guide.md) - Legacy monolith doc.
- [Release Notes](./archive/release-notes.md) - Version history.

---

## 🤖 AI Assistant Instructions

If you are an AI assistant helping with this codebase:

1. **Start Here**: Read [system-overview.md](./system-overview.md) to understand the hybrid .NET/Python/React Native architecture.
2. **Context**: Use `technical/codebase-overview.md` to locate specific services within `src/`.
3. **Standards**: Adhere to `technical/database-standards.md` when proposing schema changes.
4. **Patterns**: Follow the ADRs in `architecture/adr/` to maintain architectural consistency.
5. **Connectivity**: Most infrastructure (Postgres, Redis, Kafka) resides at `192.168.0.170`. Check `.env` files for confirmation.

---

## 🛠️ Maintenance Note
When adding new features, please create a corresponding document in the appropriate category above and update this master index.
