# DeepLens - Visual Search Engine

**DeepLens** is a high-performance, multi-tenant **visual search engine** built with modern .NET and Python technologies. It provides fast, accurate similarity matching for both **images and videos** using state-of-the-art vector databases and AI/ML models.

## 🧭 **Documentation Guide**

We have consolidated our documentation into several clear, focused guides:

### 🏁 [Quick Start (DEVELOPMENT.md)](DEVELOPMENT.md)
**The first stop for all developers.**
- Prerequisites & Local Setup.
- Service Credentials & Port Reference.
- Basic Troubleshooting.

### 🏗️ [Architecture & Decisions (ARCHITECTURE.md)](ARCHITECTURE.md)
**How the system is built.**
- Hybrid .NET + Python Microservices.
- Multi-Tenant Isolation Model.
- Architecture Decision Records (ADR).

### 💻 [Codebase & API (CODEBASE.md)](CODEBASE.md)
**Deep dive into the source code.**
- Project structures and responsibilities.
- API Endpoints & Contract Reference.
- Dapper & Data Access standards.

### 🏢 [Infrastructure & Tenants (infrastructure/README.md)](infrastructure/README.md)
**Container management and multi-tenancy.**
- Podman/Docker orchestration.
- [Tenant Provisioning & Management](infrastructure/TENANT-GUIDE.md).
- [DeepLens Troubleshooting Guide](infrastructure/TROUBLESHOOTING.md).

### 🔒 [Security & RBAC (docs/SECURITY.md)](docs/SECURITY.md)
- Authentication flows and Token Lifecycle.
- Role-Based Access Control (RBAC).
- Administrative Impersonation.

### 📊 [Observability & Monitoring (docs/OBSERVABILITY.md)](docs/OBSERVABILITY.md)
- OpenTelemetry instrumentation (Traces, Metrics, Logs).
- Grafana Dashboards & Prometheus Alerts.

### 🎬 [Video Processing (docs/VIDEO_PROCESSING.md)](docs/VIDEO_PROCESSING.md)
- Video upload and storage.
- Automated thumbnail and GIF preview generation.
- FFmpeg integration and configuration.

---

## 🎯 **Key Features**

- **🔍 Advanced Visual Search** - Vector-based similarity matching for images and videos with multiple AI models.
- **🎬 Video Processing** - Automated thumbnail and GIF preview generation with FFmpeg.
- **🏢 Multi-Tenant Architecture** - Complete tenant isolation with BYOS (Bring Your Own Storage).
- **⚡ High Performance** - Optimized for speed with Redis caching and Qdrant vector database.
- **📊 Full Observability** - Complete monitoring with the LGTM stack (Loki, Grafana, Tempo, Mimir).
- **🔒 Enterprise Security** - OAuth 2.0/OpenID Connect with Duende IdentityServer.

---

## 🤝 **Contributing**

1. Read the [DEVELOPMENT.md](DEVELOPMENT.md) and [CODEBASE.md](CODEBASE.md) guides.
2. Fork the repository and create a feature branch.
3. Commit your changes and open a Pull Request.

---

**Made with ❤️ by the DeepLens Team**
