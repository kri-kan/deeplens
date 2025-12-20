# DeepLens Complete Documentation Guide

**Auto-generated on:** 2025-12-20 20:02:04

> **Note:** This is a consolidated version of all repository documentation. Generic code samples and implementation templates have been omitted for high-level reading.

---

## 📚 Table of Contents

1. [Readme](#source-readme-md)
2. [Development](#source-development-md)
3. [Architecture](#source-architecture-md)
4. [Codebase](#source-codebase-md)
5. [Docs - Security](#source-docs-security-md)
6. [Docs - Services](#source-docs-services-md)
7. [Docs - Observability](#source-docs-observability-md)
8. [Infrastructure - Readme](#source-infrastructure-readme-md)
9. [Infrastructure - Tenant-Guide](#source-infrastructure-tenant-guide-md)
10. [Infrastructure - Troubleshooting](#source-infrastructure-troubleshooting-md)
11. [Src - Deeplens.Featureextractionservice - Readme](#source-src-deeplens-featureextractionservice-readme-md)
12. [Src - Deeplens.Webui - Readme](#source-src-deeplens-webui-readme-md)

---

<a name='source-readme-md'></a>

# Documentation: README.md
------------------------------

# DeepLens - Image Similarity Search Engine

**DeepLens** is a high-performance, multi-tenant image similarity search engine built with modern .NET and Python technologies. It provides fast, accurate image matching using state-of-the-art vector databases and AI/ML models.

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

---

## 🎯 **Key Features**

- **🔍 Advanced Image Search** - Vector-based similarity matching with multiple AI models.
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


---

<a name='source-development-md'></a>

# Documentation: DEVELOPMENT.md
------------------------------

# DeepLens Development Guide

**The ultimate reference for setting up, developing, and troubleshooting the DeepLens ecosystem.**

Last Updated: December 20, 2025

---

## 🚀 Quick Start (15 Minutes)

1.  **Prerequisites**: Install Podman/Docker, .NET 9 SDK, Python 3.11+, and PowerShell 7+.
2.  **Environment**: 
    
*(Code block omitted for brevity)*

3.  **Identity API**:
    
*(Code block omitted for brevity)*

4.  **Checkpoint (Identity)**:
    
*(Code block omitted for brevity)*

5.  **Verification**: 
    
*(Code block omitted for brevity)*


---

## 🔑 Development Credentials

**DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION** (Standard Password: `DeepLens123!`)

| Service            | Username               | Password             | Notes               |
| :----------------- | :--------------------- | :------------------- | :------------------ |
| **PostgreSQL**     | `postgres`             | `DeepLens123!`       | Port 5433           |
| **Identity Admin** | `admin@deeplens.local` | `DeepLens@Admin123!` | Initial Admin       |
| **MinIO Admin**    | `admin`                | `DeepLens123!`       | Port 9001 (Console) |
| **Grafana**        | `admin`                | `DeepLens123!`       | Port 3000           |

---

## 🔌 Port Reference

| Port     | Service      | Description                 |
| :------- | :----------- | :-------------------------- |
| **5433** | PostgreSQL   | Metadata & Identity DB      |
| **6379** | Redis        | Caching & State             |
| **5198** | Identity API | Auth & Tenant Orchestration |
| **5001** | Search API   | Image Upload & Search       |
| **8001** | Feature Ext. | Python AI Microservice      |
| **3000** | Grafana      | Monitoring Dashboards       |
| **6333** | Qdrant       | Vector DB Dashboard         |

---

## 🛠️ Development Workflow

### .NET Development
- **Solution**: Open `src/DeepLens.sln` in VS 2022 or VS Code.
- **Migrations**: Always use `dotnet ef database update` from the project directory.
- **Style**: Follow C# Clean Architecture patterns.

### Python (AI) Development
- **Venv**: Always use a virtual environment.
- **Setup**: 
    
*(Code block omitted for brevity)*


---

## 📋 Roadmaps & Plans

### Current Implementation Status
- ✅ **Phase 1**: Core Infrastructure & Podman Setup.
- ✅ **Phase 2**: Multi-Tenant Provisioning & Identity API.
- 🚧 **Phase 3**: Kafka Integration & Async Processing (In Progress).
- ⏳ **Phase 4**: Web UI Full Implementation.

---

## 🆘 Troubleshooting

1.  **Port Conflicts**: Run `Get-Process -Id (Get-NetTCPConnection -LocalPort <Port>).OwningProcess` to find blockers.
2.  **Container Failures**: Check `podman logs <container-name>`.
3.  **Database Errors**: Ensure `.env` in `infrastructure` matches your local config.
4.  **Identity API Not Starting**: Check that PostgreSQL is accessible on port 5433.

---

## 📸 Image Ingestion Workflow

### Bulk Image Upload

To ingest a collection of images for a tenant:

1. **Prepare Your Images**:
   - Place images in a designated folder (e.g., `tests/saree_images/`)
   - Supported formats: JPEG, PNG, WebP
   - Recommended: High-quality source images for best thumbnail generation

2. **Create Metadata File**:
   Create a JSON file mapping images to product metadata:
   
*(Code block omitted for brevity)*


3. **Upload via API**:
   
*(Code block omitted for brevity)*


4. **Verify in Visual Catalog**:
   - Navigate to http://localhost:3000/images
   - Images should appear with status "Uploaded" → "Processed"
   - Thumbnails auto-generated based on tenant thumbnail settings

### Tenant-Specific Thumbnail Configuration

Configure per-tenant thumbnail settings in the database:


*(Code block omitted for brevity)*


### Testing the End-to-End Pipeline

1. **Start All Services**:
   
*(Code block omitted for brevity)*


2. **Upload Test Images** (as shown above)

3. **Monitor Processing**:
   - Worker logs show thumbnail generation progress
   - Check MinIO for uploaded files and generated thumbnails
   - Database updates: status transitions from 0→1, dimensions populated

4. **Verify in UI**:
   - Login at http://localhost:3000/login
   - Navigate to Images page
   - Grid displays processed images with metadata

---

## 📖 Documentation Index
- [**ARCHITECTURE.md**](ARCHITECTURE.md) - High-level design & ADRs.
- [**infrastructure/README.md**](infrastructure/README.md) - Deep dive into container setup.
- [**infrastructure/TENANT-GUIDE.md**](infrastructure/TENANT-GUIDE.md) - How to provision new clients.
- [**docs/SECURITY.md**](docs/SECURITY.md) - Auth & RBAC details.


---

<a name='source-architecture-md'></a>

# Documentation: ARCHITECTURE.md
------------------------------

# DeepLens Architecture Guide

**Comprehensive reference for system design, data models, and architectural decisions.**

Last Updated: December 20, 2025

---

## 🏗️ System Overview

DeepLens is a high-performance, multi-tenant image similarity search engine built using a **hybrid .NET + Python microservices architecture**. It balances enterprise-grade orchestration with state-of-the-art AI/ML capabilities.

### Core Design Principles
- **Unified .NET Backend**: Centralized orchestration, API gateway, and tenant management.
- **Stateless AI Services**: Python-based services for feature extraction and vector operations.
- **Event-Driven Pipeline**: Asynchronous image processing via Apache Kafka.
- **Multi-Tenant Isolation**: Complete data separation at the database and storage layers.
- **ByOS (Bring Your Own Storage)**: Support for enterprise cloud storage and local NFS.
- **Observable by Design**: Integrated OpenTelemetry, Prometheus, and Jaeger.

---

## 📐 Architecture Diagrams

### High-Level System Flow

*(Code block omitted for brevity)*


---

## 💾 Data & Storage Architecture

### Multi-Tenant Model
DeepLens provides strict isolation between tenants using a partitioned resource model:

1.  **Platform Metadata (PostgreSQL)**: Shared database with row-level or schema-based separation for global configurations.
2.  **Tenant Metadata (PostgreSQL)**: Isolated databases provisioned per tenant for image metadata and local settings.
3.  **Vector Storage (Qdrant)**: Isolated collections (or separate instances) per tenant ensuring no cross-tenant similarity leakage.
4.  **Object Storage (MinIO/S3/Azure)**: Logical isolation via dedicated buckets within a shared master instance (default) or account-level isolation for high-scale tenants.

### Database Schema (Identity & Platform)
Refers to the core tables in the `nextgen_identity` and `deeplens_platform` databases.

| Table                | Purpose                                                 |
| :------------------- | :------------------------------------------------------ |
| `tenants`            | Organization configs, resource limits, and infra ports. |
| `users`              | User accounts, roles, and authentication state.         |
| `refresh_tokens`     | OAuth 2.0 rotation tokens.                              |
| `tenant_api_keys`    | M2M authentication for programmatic access.             |
| `infisical_projects` | Registry for secret management integration.             |

### Catalog & Ingestion Architecture (Tenant-Specific)
DeepLens uses a normalized catalog structure within each tenant's dedicated database to support multi-vendor e-commerce:

1.  **Categories**: Broad product classifications (e.g., Sarees, Lehangas).
2.  **Products**: Represent master SKUs with common titles and a **Union of Tags** consolidated from all sources.
3.  **Product Variants**: Represent sub-SKUs (e.g., by Color, Fabric, or Stitch Type).
4.  **Images**: Managed assets with PHash for deduplication and quality scores for curation. Supports a **Reliable Deletion Queue** for asynchronous storage cleanup.
5.  **Sellers**: Master registry of vendors (e.g., WhatsApp groups, Marketplaces).
6.  **Seller Listings**: Competitive offers for a variant, capturing live price, descriptions, and **Shipping Metadata** (Free/Plus).
7.  **Price History**: Temporal audit trail of every price change per seller listing, enabling long-term performance analysis.

### AI-Driven Ingestion Pipeline
- **Enrichment**: An LLM-based `ReasoningService` (utilizing models like Phi-3) scans unstructured seller descriptions to extract structured metadata (Fabric, Color, Occasion).
- **Parallel Processing**: Bulk ingestion supports high-throughput parallel uploads with concurrency semaphores.
- **SKU Merging**: Intelligent merging of products allows consolidating multiple vendors under one SKU while preserving unique images and all historical pricing data.
- **Reliable Cleanup**: Deduplicated or deleted images are queued for asynchronous cleanup from MinIO and Qdrant via Kafka-driven background workers.

### System Bootstrapping
DeepLens uses a script-based bootstrapping approach to ensure environment consistency:
1.  **Infrastructure (Podman)**: Postgres, Redis, Qdrant, and Kafka are started.
2.  **Platform DB Init**: SQL scripts initialize the system schemas and roles.
3.  **Platform Admin Setup**: `init-platform-admin.ps1` creates the root `admin` tenant and global administrator user.
4.  **Identity API**: The API starts up and handles further multi-tenant orchestration.

---

## 🧠 Architectural Decisions (ADR)

### ADR-001: Hybrid .NET + Python Microservices
- **Decision**: Use .NET 9 for APIs and orchestration; Python (FastAPI) for ML inference.
- **Rationale**: .NET provides superior enterprise features and performance for web APIs, while Python has the richest ecosystem for AI/ML (PyTorch, ONNX).

### ADR-002: API Service Separation
- **Decision**: Three main services + Gateway + Worker.
- **Search API**: User-facing search and ingestion.
- **Admin API**: System and tenant management.
- **Identity API**: Authentication and authorization.
- **Worker Service**: Background Kafka consumption.

### ADR-003: Asynchronous Image Processing
- **Decision**: Return a `202 Accepted` on upload; process features via Kafka.
- **Rationale**: Feature extraction takes ~100-300ms. Async processing prevents blocking the API and allows horizontal scaling of workers.

### ADR-004: Data Access Strategy
- **Decision**: Hybrid EF Core + Dapper.
- **Rationale**: EF Core for complex domain models and migrations; Dapper for high-frequency search metadata queries.

---

## 📊 Observability Strategy

DeepLens implements a full **OpenTelemetry** stack:
- **Metrics**: Exported to Prometheus.
- **Logs**: Structured JSON logs sent to Loki.
- **Traces**: Distributed tracing via Jaeger (correlating API Gateway → Worker → Python AI).

---

## 📁 Related Documents
- [**DEVELOPMENT.md**](DEVELOPMENT.md) - Setup, Workflow, and Credentials
- [**infrastructure/TENANT-GUIDE.md**](infrastructure/TENANT-GUIDE.md) - Provisioning & Storage
- [**docs/SECURITY.md**](docs/SECURITY.md) - RBAC & Token Lifecycle
- [**docs/SERVICES.md**](docs/SERVICES.md) - Detailed Service Specifications


---

<a name='source-codebase-md'></a>

# Documentation: CODEBASE.md
------------------------------

# DeepLens Codebase & API Guide

**Technical reference for the DeepLens source code, project structure, and service endpoints.**

Last Updated: December 20, 2025

---

## 📂 Project Structure

### .NET Microservices (`src/`)
DeepLens is built using a clean architecture pattern across multiple services:

- **NextGen.Identity**: Centralized authentication and tenant management.
  - `.Core`: Domain models (Tenant, User, Token).
  - `.Data`: Dapper-based repositories, PostgreSQL migrations, and stored procedures for provisioning.
  - `.Api`: REST endpoints for login, profile management, and tenant provisioning.
- **DeepLens (Platform)**:
  - `.ReasoningService`: Python FastAPI service utilizing LLMs (Phi-3) for structured metadata extraction.
  - `.SearchApi`: High-traffic semantic search and image ingestion.
  - `.AdminApi`: Resource management and analytics.
  - `.WorkerService`: Background Kafka consumers for feature extraction and indexing.
  - `.Infrastructure`: Multi-tenant drivers for Qdrant, MinIO (Shared Bucket Strategy), and Kafka.
- **Shared Libraries**:
  - `.Shared.Common`: Cross-cutting utilities.
  - `.Shared.Messaging`: Kafka producers and abstract event handlers.
  - `.Shared.Telemetry`: Standardized OpenTelemetry configuration.

### Python AI Services (`src/`)
- **DeepLens.FeatureExtractionService**: FastAPI service using ResNet50/CLIP for vectorizing images.

### Frontend (`src/`)
- **DeepLens.WebUI**: React/TypeScript dashboard for administrators and tenants.

---

## 🔌 API Reference Summary

### Identity Service (Port 5198)
| Endpoint          | Method   | Purpose                               |
| :---------------- | :------- | :------------------------------------ |
| `/api/auth/login` | POST     | Authenticate and get JWT.             |
| `/api/tenants`    | GET/POST | List and provision new organizations. |

### Search & Ingestion Service (Port 5002)
| Endpoint                              | Method | Purpose                                            |
| :------------------------------------ | :----- | :------------------------------------------------- |
| `/api/v1/ingest/upload`               | POST   | Single image upload with metadata.                 |
| `/api/v1/ingest/bulk`                 | POST   | Parallel bulk ingestion with LLM-based enrichment. |
| `/api/v1/catalog/merge`               | POST   | Merge source SKU into target with image dedupe.    |
| `/api/v1/catalog/images/{id}/default` | PATCH  | Set primary image for quick sharing.               |
| `/api/v1/search`                      | POST   | Semantic image-to-image/text similarity search.    |

### Reasoning Service (Port 8002)
| Endpoint   | Method | Purpose                               |
| :--------- | :----- | :------------------------------------ |
| `/health`  | GET    | Check model and service health.       |
| `/extract` | POST   | Structured metadata extraction (LLM). |

### Feature Extraction (Port 8001)
| Endpoint   | Method | Purpose                             |
| :--------- | :----- | :---------------------------------- |
| `/health`  | GET    | Check model status.                 |
| `/extract` | POST   | Raw image-to-vector transformation. |

---

## 🛠️ Implementation Details

### Data Access (Dapper)
We use pure Dapper with raw SQL for the Identity service to ensure maximum performance. 
Example Repository pattern:

*(Code block omitted for brevity)*


### Telemetry (OpenTelemetry)
Every critical operation is wrapped in an `Activity`. Traces flow from the `ApiGateway` into the `SearchApi`, through `Kafka`, and finally into the `Worker` and `AI Service`.

---

## 📋 Roadmap
- [x] Identity API & Tenant Provisioning.
- [x] Kafka Core Integration (Upload, Entry, Indexing).
- [x] Asynchronous Image Maintenance & Reliable Deletion.
- [ ] Multi-Modal Search (Text-to-Image).
- [ ] Real-time WebSocket notifications.


---

<a name='source-docs-security-md'></a>

# Documentation: docs/SECURITY.md
------------------------------

# DeepLens Security Guide

**Reference for Authentication, Authorization, and Protection Mechanisms.**

Last Updated: December 20, 2025

---

## 🔐 Authentication & Identity

DeepLens uses **NextGen.Identity** (based on Duende IdentityServer) as its centralized Identity Provider (IdP).

### Token Lifecycle
- **Access Tokens**: Short-lived JWTs (typically 1 hour).
- **Refresh Tokens**: Long-lived tokens for seamless session extension.
- **Grant Types**: 
  - `authorization_code` (with PKCE) for Web UI.
  - `client_credentials` for machine-to-machine (M2M) communication.
  - `password` (Development only) for quick testing.

### Token Claims
Every JWT issued by DeepLens contains:
- `sub`: Unique User ID.
- `tenant_id`: The ID of the primary tenant.
- `role`: The user's role (Admin, TenantOwner, User).
- `permissions`: Scoped permissions (e.g., `images:read`, `tenants:manage`).

---

## 🛡️ Role-Based Access Control (RBAC)

DeepLens implements a hierarchical RBAC model:

| Role             | Scope           | Permissions                                                    |
| :--------------- | :-------------- | :------------------------------------------------------------- |
| **Global Admin** | System-wide     | Manage all tenants, system-wide metrics, impersonate users.    |
| **Tenant Owner** | Tenant-specific | Manage tenant users, view tenant analytics, configure storage. |
| **User**         | Tenant-specific | Search images, upload images, manage own profile.              |

### Administrative Impersonation
System Admins can impersonate users for troubleshooting. 
- **Mechanism**: The backend generates a temporary context using the target user's ID but flags the request as `impersonated`.
- **Audit**: Every impersonated action is logged with both the Admin's ID and the target User's ID.

---

## 🚦 Rate Limiting & Protection

DeepLens protects its services via a multi-layered rate limiting strategy:

1.  **Global Limits (Gateway)**: Protects against DDoS and general service abuse based on IP.
2.  **Tenant-Based Limits**: Defined in the `tenants` table (e.g., `MaxApiCallsPerDay`).
3.  **Endpoint-Specific Limits**: Hardcoded or configured limits for expensive operations like `Search` or `Feature Extraction`.

### Tenant Tiers
- **Free**: 1,000 API calls/day, 1GB storage.
- **Professional**: 50,000 API calls/day, 100GB storage.
- **Enterprise**: Custom limits, dedicated infrastructure support.

---

## 📝 Security Best Practices

1.  **Transport Security**: All production traffic must use TLS 1.3.
2.  **Secret Management**: Developers should use Infisical or Azure Key Vault for secrets; Never commit `.env` files.
3.  **Data Isolation**: SQL queries must always include a `TenantId` filter to ensure data leakage does not occur.
4.  **Audit Logs**: All security-sensitive actions (login, deletions, RBAC changes) are captured in the platform audit log.


---

<a name='source-docs-services-md'></a>

# Documentation: docs/SERVICES.md
------------------------------

# DeepLens Service Specifications

**Deep dive into microservice implementations and specialized components.**

Last Updated: December 20, 2025

---

## 🔄 Event Streaming (Apache Kafka)

Kafka acts as the backbone for the DeepLens image processing pipeline.

### Core Topics
- `deeplens.images.uploaded`: Triggered when Search API receives a new file.
- `deeplens.features.extraction`: Commands for the Feature Extraction service.
- `deeplens.vectors.indexing`: Requests to index vectors in Qdrant.
- `deeplens.processing.completed`: Emitted when the entire pipeline finishes.
- `deeplens.images.maintenance`: Triggers cleanup of deleted files and vectors.

### Pipeline Flow
1. **Producer**: Search API (Upload / Merge).
2. **Consumer**: Image Processing Worker (Initializes pipeline).
3. **Consumer**: Feature Extraction Worker (Calls ML service).
4. **Consumer**: Vector Indexing Worker (Updates Qdrant).
5. **Consumer**: Image Maintenance Worker (Physical cleanup).

---

## 🖼️ Image & Thumbnail Handling

DeepLens manages large volumes of image data across multiple storage providers.

### Processing
- **Format**: All images are standardized to JPEG/PNG for feature extraction.
- **Thumbnails**:
  - Generated on-the-fly or background-cached.
  - Sizes: `Small (128x128)`, `Medium (512x512)`.
  - Storage: Stored in a dedicated `thumbnails` folder within the tenant's bucket.

---

## ☁️ Object Storage (MinIO / S3)

DeepLens uses a **Bucket-per-Tenant** strategy for object storage.

### Multi-Tenancy Strategy
- **Shared Instance**: Typically one MinIO instance serves many tenants for development.
- **Isolation**: Each tenant is restricted to their bucket via IAM policies.
- **BYOS**: Support for external endpoints (Azure Blob, AWS S3) allows enterprise tenants to keep their data in their own subscription.

---

## 🧪 OAuth 2.0 Testing Guide

To test authentication manually:

### 1. Client Credentials (M2M)

*(Code block omitted for brevity)*


### 2. Authorization Code (Web UI)
Use the [OIDC Debugger](https://oidcdebugger.com/) or the built-in Swagger UI at `http://localhost:5198/swagger`.

### Common Scopes
- `openid`, `profile`, `deeplens.api.read`, `deeplens.api.write`.


---

<a name='source-docs-observability-md'></a>

# Documentation: docs/OBSERVABILITY.md
------------------------------

# DeepLens Observability Guide

**Monitoring, Logging, and Tracing across the DeepLens ecosystem.**

Last Updated: December 20, 2025

---

## 📊 Monitoring Architecture

DeepLens uses the LGTM stack (Loki, Grafana, Tempo/Jaeger, Mimir/Prometheus) for complete visibility.

### 1. Metrics (Prometheus)
- **Service Metrics**: .NET runtime metrics, request counts, latencies.
- **Business Metrics**: Image processing counts, tenant usage, vector database capacity.
- **Port**: `9090` (Prometheus UI).

### 2. Logging (Loki & Serilog)
- **Format**: Structured JSON via Serilog (`Serilog.Sinks.OpenTelemetry`).
- **Correlation**: `TraceId` and `SpanId` are attached to every log message, allowing seamless jumping from logs to traces in Grafana.

### 3. Tracing (Jaeger / OpenTelemetry)
- **Stack**: OpenTelemetry SDKs for both .NET and Python.
- **Context Propagation**: `TraceId` travels across network boundaries (Gateway → Search API → Kafka → Worker → AI Service).
- **Port**: `16686` (Jaeger UI).

---

## 🛠️ OpenTelemetry Implementation Status

| Component                     | Tracing | Metrics | Logs  |
| :---------------------------- | :-----: | :-----: | :---: |
| **API Gateway**               |    ✅    |    ✅    |   ✅   |
| **Search API**                |    ✅    |    ✅    |   ✅   |
| **Identity API**              |    ✅    |    ✅    |   ✅   |
| **Worker Service**            |    ✅    |    ✅    |   ✅   |
| **AI Services (Python)**      |    ✅    |    🚧    |   ✅   |
| **Infrastructure (DB/Kafka)** |    ✅    |    ✅    |   ✅   |

---

## 📈 Pre-built Dashboards

DeepLens comes with several Grafana dashboards:
- **System Overview**: Node health, CPU/Memory usage.
- **Tenant Health**: Per-tenant API request volume and error rates.
- **ML Pipeline**: Feature extraction latency and Qdrant ingestion speed.

---

## 🚨 Alerts

Alerts are managed via **Prometheus AlertManager**:
- **Critical**: Service Down, High Error Rate (>5%), Qdrant Disk Low (<10%).
- **Warning**: High Response Latency (>2s), Redis Memory Usage (>80%).


---

<a name='source-infrastructure-readme-md'></a>

# Documentation: infrastructure/README.md
------------------------------

# DeepLens Infrastructure Setup

**Complete guide for setting up DeepLens with Podman on Windows**

Last Updated: December 20, 2025

---

## 📋 Table of Contents

- [Quick Start](#-quick-start-15-minutes)
- [Prerequisites](#-prerequisites)
- [Core Infrastructure](#-core-infrastructure-setup)
- [Identity API](#-identity-api-setup)
- [Tenant Provisioning](#-tenant-provisioning)
- [Troubleshooting](#-troubleshooting)
- [Advanced Topics](#-advanced-topics)

---

## 🚀 Quick Start (15 Minutes)

### 1. Install Prerequisites

1. **[Podman Desktop](https://podman.io/)** - Container runtime
2. **[PowerShell 7+](https://github.com/PowerShell/PowerShell)** - Shell
3. **[.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)** - For Identity API


*(Code block omitted for brevity)*


### 2. Start Infrastructure
Automation handles the setup of PostgreSQL, Redis, and internal networks.


*(Code block omitted for brevity)*


### 3. Start Identity API & Bootstrap
The Identity API handles database migrations on startup.


*(Code block omitted for brevity)*


### 4. Verify & Checkpoint
Run the automated identity checkpoint to verify Platform and Tenant admin access.


*(Code block omitted for brevity)*


**Done!** You now have:
- ✅ Automated platform bootstrapping (Admin user/tenant)
- ✅ Verified Identity API with correct role claims
- ✅ Multi-tenant resource readiness

---

## 📋 Prerequisites

### Required Software

| Software       | Version | Purpose           |
| -------------- | ------- | ----------------- |
| Podman Desktop | Latest  | Container runtime |
| PowerShell     | 7+      | Scripting         |
| .NET SDK       | 9.0     | Identity API      |

### System Requirements

**Minimum (Development):**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 50 GB free

**Recommended (Multi-Tenant):**
- CPU: 8 cores
- RAM: 16 GB
- Disk: 100 GB SSD

### PowerShell Configuration


*(Code block omitted for brevity)*


---

## 🏗️ Core Infrastructure Setup

### Architecture


*(Code block omitted for brevity)*


### Network Setup


*(Code block omitted for brevity)*


### PostgreSQL Setup


*(Code block omitted for brevity)*


### Redis Setup


*(Code block omitted for brevity)*


### Verify Infrastructure


*(Code block omitted for brevity)*


---

## 🔐 Identity API Setup

### Start the API


*(Code block omitted for brevity)*


### Verify API is Running


*(Code block omitted for brevity)*


### Default Admin Credentials

- **Email:** `admin@deeplens.local`
- **Password:** `DeepLens@Admin123!`
- ⚠️ **Change after first login!**

---

## 🏢 Tenant Provisioning

### Provision a Tenant


*(Code block omitted for brevity)*


### What Gets Created

**For Every Tenant:**
- ✅ Database: `tenant_{name}_metadata`
- ✅ Qdrant: Dedicated vector database (auto-assigned ports)
- ✅ Backup: Automated daily backups
- ✅ Admin User: `admin@{name}.local`

**For DeepLens Storage:**
- ✅ MinIO: Dedicated object storage (auto-assigned ports)
- ✅ Credentials: Saved to tenant directory

### Storage Options

| Option       | What's Provisioned        | Use Case                      |
| ------------ | ------------------------- | ----------------------------- |
| **BYOS**     | Database + Qdrant         | Enterprise with Azure/AWS/GCS |
| **DeepLens** | Database + Qdrant + MinIO | Development, testing          |
| **None**     | Database + Qdrant         | Configure storage later       |

### Verify Tenant


*(Code block omitted for brevity)*


### Remove a Tenant


*(Code block omitted for brevity)*


---

## 🐛 Troubleshooting

### "dotnet: command not found"


*(Code block omitted for brevity)*


### "Scripts are disabled on this system"


*(Code block omitted for brevity)*


### "Production signing credential not configured"


*(Code block omitted for brevity)*


### Containers fail to start


*(Code block omitted for brevity)*


### Port already in use


*(Code block omitted for brevity)*


### Tenant containers in "Created" state


*(Code block omitted for brevity)*


### View Container Logs


*(Code block omitted for brevity)*


---

## 🔧 Advanced Topics

### Stop All Services


*(Code block omitted for brevity)*


### Backup Database


*(Code block omitted for brevity)*


### Restore Database


*(Code block omitted for brevity)*


### Clean Up Everything


*(Code block omitted for brevity)*


### Check Resource Usage


*(Code block omitted for brevity)*


### Migration & Portable Storage

**Core Databases (Named Volumes):**
On Windows, core databases use named volumes. To migrate:

*(Code block omitted for brevity)*


**Tenant Data (Bind Mounts):**
Tenant data is in `C:\productivity\deeplensData\tenants`. Simply copy the directory to migrate.

### Service Endpoints

| Service         | Port | URL                             | Credentials             |
| --------------- | ---- | ------------------------------- | ----------------------- |
| PostgreSQL      | 5433 | -                               | postgres / DeepLens123! |
| Redis           | 6379 | -                               | (no password)           |
| Identity API    | 5198 | http://localhost:5198           | -                       |
| Qdrant (tenant) | 6333 | http://localhost:6333/dashboard | -                       |
| MinIO (tenant)  | 9001 | http://localhost:9001           | See credentials file    |

---

## 📚 Additional Documentation

For more detailed information, see:

- **[TENANT-GUIDE.md](TENANT-GUIDE.md)** - Architecture & provisioning
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Solutions for common issues

---

## 💡 Tips

1. **Keep terminals organized:**
   - Terminal 1: Identity API (must stay running)
   - Terminal 2: Provisioning and management

2. **Check status regularly:**
   
*(Code block omitted for brevity)*


3. **Monitor logs:**
   
*(Code block omitted for brevity)*


4. **Use labels for filtering:**
   
*(Code block omitted for brevity)*


---

**Setup Time:** ~15 minutes  
**Difficulty:** Beginner-friendly  
**Platform:** Windows with Podman


---

<a name='source-infrastructure-tenant-guide-md'></a>

# Documentation: infrastructure/TENANT-GUIDE.md
------------------------------

# DeepLens Tenant Management Guide

**Complete reference for multi-tenant architecture, provisioning, and maintenance.**

Last Updated: December 20, 2025

---

## 🏗️ Architecture Overview

DeepLens uses a "Shared Infrastructure, Isolated Data" approach. While core services like PostgreSQL and Redis are shared, each tenant gets isolated storage and vector database resources.

### Data Separation Strategy

| Component      | Shared | Per-Tenant           | Purpose                         |
| -------------- | ------ | -------------------- | ------------------------------- |
| **PostgreSQL** | ✅      | Database per tenant  | Metadata, users, collections    |
| **Redis**      | ✅      | ❌                    | Shared cache & sessions         |
| **Qdrant**     | ❌      | Dedicated Instance   | Vector search isolation         |
| **MinIO**      | ✅      | **Dedicated Bucket** | Shared instance with IAM search |
| **Backups**    | ❌      | Dedicated Container  | Automated tenant backups        |

### Storage Models

1. **BYOS (Bring Your Own Storage)** ⭐ *Enterprise*
   - Tenant provides their own cloud storage (Azure/AWS/GCS).
   - Custom credentials configured in Admin Portal.
   - DeepLens only provisions Database + Qdrant.

2. **DeepLens-Provisioned Storage** 🛡️ *Optimized*
   - Dedicated bucket created on the shared **Master MinIO** instance.
   - Unique Service Account (Access Key/Secret Key) scoped to that bucket only.
   - DeepLens provisions: Database + Qdrant + Bucket / IAM Security.

---

## 🚀 Provisioning Tenants

### Prerequisites

1. ✅ **Core infrastructure running** (PostgreSQL, Redis)
2. ✅ **`deeplens-network` created**
3. ✅ **Identity API running** at `http://localhost:5198`
4. ✅ **Core Qdrant instances stopped** (if overlapping with new tenant ports)

### Provisioning Commands


*(Code block omitted for brevity)*


### Port Assignments (Auto-managed)

Ports are automatically assigned to avoid conflicts:

| Service      | Starting Port | Pattern               |
| ------------ | ------------- | --------------------- |
| Qdrant HTTP  | 6433          | 6433, 6435, 6437, ... |
| Qdrant gRPC  | 6434          | 6434, 6436, 6438, ... |
| Shared MinIO | 9000          | Fixed at 9000         |

---

## 💾 Backup & Disaster Recovery

Each tenant has a dedicated backup container that handles daily backups at 2 AM.

### Manual Backup


*(Code block omitted for brevity)*


### Restore Procedure


*(Code block omitted for brevity)*


---

## 🔍 Verification & Maintenance

### Verify Tenant Health


*(Code block omitted for brevity)*


### Common Issues

- **Port Conflict:** Ensure core Qdrant/MinIO are stopped or use specific ports.
- **Identity API:** Ensure API is running and accessible at `http://localhost:5198`.
- **Network:** Ensure `deeplens-network` exists.

---

## 📚 Related Files

- `provision-tenant.ps1`: Core provisioning script.
- `init-scripts/02-tenant-provisioning.sql`: SQL logic for tenant DBs.
- `powershell/DeepLensTenantManager.psm1`: Tenant management module.


---

<a name='source-infrastructure-troubleshooting-md'></a>

# Documentation: infrastructure/TROUBLESHOOTING.md
------------------------------

# DeepLens Troubleshooting Guide

**Solutions for common issues found during development and deployment.**

Last Updated: December 20, 2025

---

## 📋 Table of Contents
- [.NET & PowerShell Issues](#-net--powershell-issues)
- [Podman & Container Issues](#-podman--container-issues)
- [Service-Specific Issues](#-service-specific-issues)
- [Tenant & Multi-Tenant Issues](#-tenant--multi-tenant-issues)

---

## 🛠️ .NET & PowerShell Issues

### .NET SDK Not Found
**Symptoms:** `dotnet : The term 'dotnet' is not recognized...`

**Solution:**

*(Code block omitted for brevity)*


### PowerShell Script Execution Blocked
**Symptoms:** `File cannot be loaded because running scripts is disabled on this system`

**Solution:**

*(Code block omitted for brevity)*


### Identity API - "Production signing credential not configured"
**Solution:** Ensure `ASPNETCORE_ENVIRONMENT` is set to `Development`.

*(Code block omitted for brevity)*


---

## 🐳 Podman & Container Issues

### Podman Machine Won't Start
**Solution:** Reset the machine:

*(Code block omitted for brevity)*


### Port Already in Use
**Symptoms:** Container fails to start with "port in use" error.

**Solution:** Find and kill the process:

*(Code block omitted for brevity)*


### Container Stuck in "Created" State
**Solution:** This usually indicates a config file mount error or port conflict on Windows. Check logs:

*(Code block omitted for brevity)*

**Pro Tip:** Use **Named Volumes** instead of bind mounts for persistence on Windows.

---

## 🐘 Service-Specific Issues

### PostgreSQL Authentication Failure
**Symptoms:** "password authentication failed for user postgres"

**Solution:** If you changed passwords, the old volume might still have the old data.

*(Code block omitted for brevity)*


### Identity API Can't Connect to Database
**Check connection status:**

*(Code block omitted for brevity)*

**Common Checks:**
- Port: Ensure it's **5433** (not 5432).
- Password: **DeepLens123!**
- Network: Ensure API and DB are reachable.

---

## 🏢 Tenant & Multi-Tenant Issues

### Missing `deeplens-network`
**Symptoms:** `provision-tenant.ps1` fails during container creation.

**Solution:**

*(Code block omitted for brevity)*


### Tenant Port Conflicts
**Symptoms:** Tenant Qdrant/MinIO containers won't start.

**Solution:** The script handles auto-assignment, but if you have core services running on the same ports, they must be stopped:

*(Code block omitted for brevity)*


### Accessing Tenant Logs

*(Code block omitted for brevity)*


---

## 💡 Best Practices for Troubleshooting
1. **Always check logs first:** `podman logs <container-name>`
2. **Clean starts:** Use `podman rm -f <name>` and repeat provisioning.
3. **Wait for Health:** Wait 5-10 seconds after starting containers for services to fully initialize.
4. **Environment Check:** Ensure your environment variables are set correctly (`$env:ASPNETCORE_ENVIRONMENT`).


---

<a name='source-src-deeplens-featureextractionservice-readme-md'></a>

# Documentation: src/DeepLens.FeatureExtractionService/README.md
------------------------------

# Feature Extraction Service Guide

**AI/ML specialized service for image vectorization and metadata extraction.**

Last Updated: December 20, 2025

---

## 🎯 Overview

The Feature Extraction service is a FastAPI-based Python microservice that transforms raw images into high-dimensional (2048-d) vectors using a **ResNet50** model in ONNX format.

### Key Capabilities
- **Inference**: High-speed vector generation via ONNX Runtime.
- **Image Preprocessing**: Auto-scaling and normalization of input files.
- **Health Monitoring**: Real-time status of model availability.

---

## 🚀 Quick Start

1. **Setup Environment**:
   
*(Code block omitted for brevity)*

2. **Download Model**:
   
*(Code block omitted for brevity)*

3. **Run Service**:
   
*(Code block omitted for brevity)*


---

## 🧪 Testing & Validation

### Running Tests

*(Code block omitted for brevity)*


### Testing Strategy
- **Unit Tests**: Validate image preprocessing and model loading.
- **Integration Tests**: Verify the `/extract-features` endpoint with real image samples.
- **Performance**: Validated to process ~8-10 images per second on standard developer hardware.

---

## 📊 API Reference

### `POST /extract-features`
**Request**: Multipart form-data with `file`.
**Response**:

*(Code block omitted for brevity)*


### `GET /health`
Returns `{"status": "healthy", "model_loaded": true}`.

---

## 📐 Roadmap
- [x] ResNet50 Implementation.
- [ ] CLIP Model Integration (Multi-modal).
- [ ] Batch processing API.
- [ ] OpenTelemetry Metrics integration.


---

<a name='source-src-deeplens-webui-readme-md'></a>

# Documentation: src/DeepLens.WebUI/README.md
------------------------------

# DeepLens Web UI Guide

**Modern React-based administrative and tenant management interface.**

Last Updated: December 20, 2025

---

## 🎯 Overview

The Web UI is a React application built with **Vite**, **TypeScript**, and **Material UI (MUI)**. It serves as the primary gateway for both system admins (managing tenants) and tenant users (managing their images).

---

## 🎨 Design & Responsiveness

DeepLens Web UI utilizes a **Dynamic Grid System** ensuring cross-device compatibility:
- **Desktop**: Full sidebar navigation and detailed data tables.
- **Tablet**: Collapsible sidebar and optimized card layouts.
- **Mobile**: Bottom navigation and touch-friendly interaction models.

### CSS Strategy
- Uses **Emotion** (MUI's default engine) for theme-based component styling.
- Global styles defined in `src/styles/README.md` and `theme.ts`.

---

## 🚀 Getting Started

1. **Install Dependencies**:
   
*(Code block omitted for brevity)*

2. **Environment Config**:
   Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to your Identity API address.
3. **Run Dev Server**:
   
*(Code block omitted for brevity)*


---

## 🔑 Authentication Flow

1. **Login**: User enters credentials.
2. **Token Storage**: JWT Access and Refresh tokens stored in `localStorage`.
3. **Interceptors**: Axios interceptor automatically attaches the `Authorization` header and handles token refresh on `401` errors.

---

## 🏗️ Project Structure
- `/src/components`: Atomic UI pieces (Buttons, Cards).
- `/src/pages`: Feature-level containers (Dashboard, Tenants, Settings).
- `/src/services`: API client definitions.
- `/src/contexts`: Application state (Auth, Theme).

---

## 📋 Feature Roadmap
- ✅ Tenant Listing & Creation.
- ✅ OAuth 2.0 Integration.
- 🚧 Image Search & Dashboard Analytics (In Progress).
- ⏳ Advanced RBAC User Management.


---
