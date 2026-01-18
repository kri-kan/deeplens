# DeepLens Complete Documentation Guide

**Auto-generated on:** 2026-01-18 10:29:48

> **Note:** This is a consolidated version of all repository documentation. Generic code samples and implementation templates have been omitted for high-level reading.

---

## 📚 Table of Contents

1. [Readme](#source-readme-md)
2. [Development](#source-development-md)
3. [Architecture](#source-architecture-md)
4. [Codebase](#source-codebase-md)
5. [Database_Naming_Standards](#source-database_naming_standards-md)
6. [Ffmpeg_Setup](#source-ffmpeg_setup-md)
7. [Release_Notes](#source-release_notes-md)
8. [Docs - Security](#source-docs-security-md)
9. [Docs - Services](#source-docs-services-md)
10. [Docs - Observability](#source-docs-observability-md)
11. [Infrastructure - Readme](#source-infrastructure-readme-md)
12. [Infrastructure - Tenant-Guide](#source-infrastructure-tenant-guide-md)
13. [Infrastructure - Troubleshooting](#source-infrastructure-troubleshooting-md)
14. [Src - Deeplens.Featureextractionservice - Readme](#source-src-deeplens-featureextractionservice-readme-md)
15. [Src - Deeplens.Webui - Readme](#source-src-deeplens-webui-readme-md)
16. [Src - Whatsapp-Processor - Readme](#source-src-whatsapp-processor-readme-md)
17. [Src - Whatsapp-Processor - Architecture](#source-src-whatsapp-processor-architecture-md)
18. [Src - Whatsapp-Processor - Database_Setup](#source-src-whatsapp-processor-database_setup-md)
19. [Src - Whatsapp-Processor - Design_Vision](#source-src-whatsapp-processor-design_vision-md)
20. [Src - Whatsapp-Processor - Testing_Guide](#source-src-whatsapp-processor-testing_guide-md)
21. [Src - Whatsapp-Processor - Quick_Reference](#source-src-whatsapp-processor-quick_reference-md)
22. [Src - Whatsapp-Processor - Message_Grouping_System](#source-src-whatsapp-processor-message_grouping_system-md)
23. [Src - Whatsapp-Processor - Docs - Admin_Panel_Guide](#source-src-whatsapp-processor-docs-admin_panel_guide-md)
24. [Src - Whatsapp-Processor - Docs - Baileys_Api_Deep_Dive](#source-src-whatsapp-processor-docs-baileys_api_deep_dive-md)
25. [Src - Whatsapp-Processor - Docs - Deep-Sync-Implementation](#source-src-whatsapp-processor-docs-deep-sync-implementation-md)
26. [Src - Whatsapp-Processor - Docs - Lid_Implementation](#source-src-whatsapp-processor-docs-lid_implementation-md)
27. [Src - Whatsapp-Processor - Scripts - Ddl - Readme](#source-src-whatsapp-processor-scripts-ddl-readme-md)
28. [Src - Whatsapp-Processor - Client - Readme](#source-src-whatsapp-processor-client-readme-md)

---

<a name='source-readme-md'></a>

# Documentation: README.md
------------------------------

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
| **MinIO**          | `deeplens`             | `DeepLens123!`       | Port 9001 (Console) |
| **Grafana**        | `admin`                | `DeepLens123!`       | Port 3000           |

---

## 🔌 Port Reference

### Core Services
| Port     | Service    | Description            |
| :------- | :--------- | :--------------------- |
| **5433** | PostgreSQL | Metadata & Identity DB |
| **6379** | Redis      | Caching & State        |
| **6333** | Qdrant     | Vector DB Dashboard    |
| **9001** | MinIO      | Object Storage Console |

### DeepLens APIs
| Port     | Service      | Description                 |
| :------- | :----------- | :-------------------------- |
| **5198** | Identity API | Auth & Tenant Orchestration |
| **5000** | Search API   | Image Upload & Search       |
| **5001** | Web UI       | React Frontend (Optional)   |
| **8001** | Feature Ext. | Python AI Microservice      |

### WhatsApp Processor
| Port     | Service      | Description               |
| :------- | :----------- | :------------------------ |
| **3005** | WhatsApp API | Express Backend Server    |
| **3006** | WhatsApp UI  | React Frontend (Dev Mode) |

**Note**: In production, the React app is served by the Express backend on port 3005.

### Monitoring & Observability
| Port      | Service    | Description            |
| :-------- | :--------- | :--------------------- |
| **3000**  | Grafana    | Monitoring Dashboards  |
| **9090**  | Prometheus | Metrics Time-Series DB |
| **16686** | Jaeger     | Distributed Tracing UI |

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
   - Navigate to http://localhost:5001/images
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
   - Login at http://localhost:5001/login
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

DeepLens is a high-performance, multi-tenant **visual search engine** built using a **hybrid .NET + Python microservices architecture**. It supports both **image and video assets** with AI-powered similarity search, feature extraction, and intelligent cataloging.

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
### 3. Tracing (Jaeger / OpenTelemetry)
- **Stack**: OpenTelemetry SDKs for .NET, Node.js, and Python.
- **Context Propagation**: `TraceId` travels across network boundaries (Gateway → Search API → Kafka → Worker → AI Service) and (WhatsApp Processor → PostgreSQL/MinIO).
- **Port**: `16686` (Jaeger UI).

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

<a name='source-database_naming_standards-md'></a>

# Documentation: DATABASE_NAMING_STANDARDS.md
------------------------------

# Database Naming Standards - DeepLens Project

## ✅ Standardized Naming Convention

All database names across the DeepLens project now follow a **lowercase with underscores** naming convention.

### Database Names

| Database                   | Purpose                        |     Status     |
| :------------------------- | :----------------------------- | :------------: |
| `whatsapp_vayyari_data`    | WhatsApp message and chat data | ✅ Standardized |
| `tenant_vayyari_metadata`  | Tenant metadata and media info | ✅ Standardized |
| `nextgen_identity`         | Identity and authentication    | ✅ Standardized |
| `tenant_metadata_template` | Template for new tenants       | ✅ Standardized |
| `deeplens_platform`        | Platform-wide data             | ✅ Standardized |

### Environment Variable Names

**Preferred (lowercase with underscores):**

*(Code block omitted for brevity)*


**Legacy (uppercase - deprecated but supported):**

*(Code block omitted for brevity)*


## 🔍 Verification

### Check Current Database Names

*(Code block omitted for brevity)*


Expected output should show:
- `tenant_vayyari_metadata`
- `whatsapp_vayyari_data`

### Verify Connection Strings

**WhatsApp Processor:**

*(Code block omitted for brevity)*


Should show lowercase variable names.

## 📝 Updated Files

### Configuration Files
- ✅ `src/whatsapp-processor/.env.example` - Uses lowercase env vars
- ✅ `src/whatsapp-processor/src/config/index.ts` - Supports both cases with warnings

### Deployment Scripts
- ✅ `deploy-whatsapp-vayyari.ps1` - Uses `tenant_vayyari_metadata`
- ✅ `deploy-debug.ps1` - Uses `tenant_vayyari_metadata`

### Infrastructure Scripts
- ✅ `infrastructure/setup-deeplens-dev.ps1` - Creates `tenant_vayyari_metadata`
- ✅ `infrastructure/test-vayyari-setup.ps1` - References `tenant_vayyari_metadata`

### Documentation
- ✅ `src/whatsapp-processor/DATABASE_SETUP.md` - Documents lowercase convention
- ✅ `src/whatsapp-processor/README.md` - Updated with database setup
- ✅ `TROUBLESHOOTING_SUMMARY.md` - Uses correct database names

## 🎯 Migration Checklist

If you have an existing setup with mixed-case database names:

### 1. Check Current State

*(Code block omitted for brevity)*


### 2. Rename Databases (if needed)

*(Code block omitted for brevity)*


### 3. Update Environment Files

*(Code block omitted for brevity)*


### 4. Restart Services

*(Code block omitted for brevity)*


## 🚨 Common Issues

### Issue: "database does not exist"
**Cause:** Database name mismatch between code and actual database.

**Solution:**
1. Check actual database name: `podman exec deeplens-postgres psql -U postgres -c "\l"`
2. Ensure it matches the connection string in `.env`
3. Both should be lowercase with underscores

### Issue: "WARNING: Using deprecated uppercase env var"
**Cause:** Using old uppercase environment variable names.

**Solution:**
1. Update `.env` to use lowercase: `vayyari_wa_db_connection_string`
2. The app will still work but will show warnings

### Issue: Port confusion (5432 vs 5433)
**Cause:** Podman maps PostgreSQL to port 5433 on host.

**Solution:**
- Always use port **5433** when connecting from host machine
- Use port **5432** only for inter-container communication
- See `DATABASE_SETUP.md` for details

## 📚 References

- [WhatsApp Processor Database Setup](../src/whatsapp-processor/DATABASE_SETUP.md)
- [Infrastructure Setup Script](../infrastructure/setup-deeplens-dev.ps1)
- [Troubleshooting Guide](../TROUBLESHOOTING_SUMMARY.md)

## 🔐 Connection Details Reference

### PostgreSQL (via Podman)

*(Code block omitted for brevity)*


### Databases

*(Code block omitted for brevity)*


### Connection String Format

*(Code block omitted for brevity)*


---

**Last Updated:** 2025-12-29  
**Status:** ✅ All databases and references standardized to lowercase with underscores


---

<a name='source-ffmpeg_setup-md'></a>

# Documentation: FFMPEG_SETUP.md
------------------------------

# FFmpeg Installation Guide for DeepLens Video Processing

## Quick Installation (Windows)

### Option 1: Manual Download (Recommended)
1. Download FFmpeg from: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
2. Extract the ZIP file to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your System PATH:
   
*(Code block omitted for brevity)*

4. Verify installation:
   
*(Code block omitted for brevity)*


### Option 2: Using Chocolatey

*(Code block omitted for brevity)*


### Option 3: Using Scoop

*(Code block omitted for brevity)*


## After Installation

1. Restart your terminal/PowerShell
2. Verify FFmpeg is in PATH:
   
*(Code block omitted for brevity)*

3. Restart the DeepLens WorkerService:
   
*(Code block omitted for brevity)*


## What FFmpeg Does for DeepLens

The VideoProcessingWorker uses FFmpeg to:
- **Extract poster frames** from videos (saved as WebP thumbnails)
- **Generate 3-second GIF previews** for hover effects in the UI
- **Extract video metadata** (duration, dimensions, codec info)
- **Analyze video streams** for quality and format detection

## Current Status

- ✅ Videos are being uploaded and stored in MinIO
- ✅ Video metadata is saved in PostgreSQL (status = 0 "Uploaded")
- ❌ VideoProcessingWorker cannot start without FFmpeg
- ❌ No thumbnails or GIF previews are generated

## Once FFmpeg is Installed

The worker will automatically:
1. Subscribe to `deeplens.videos.uploaded` Kafka topic
2. Process pending videos (3 videos currently waiting)
3. Generate WebP thumbnails at 512x512
4. Create 3-second GIF previews (256px wide)
5. Update database with thumbnail_path and preview_path
6. Set status to 1 (Processed)

Then the Visual Catalog UI will display:
- Video thumbnails in the grid
- Animated GIF previews on hover
- Play button overlay on video items
- Full video playback in modal on click


---

<a name='source-release_notes-md'></a>

# Documentation: RELEASE_NOTES.md
------------------------------

# DeepLens Release Notes

## v0.3.0 - Video Processing & Media Unification (December 21, 2025)

### 🎉 New Features

#### Video Asset Support
- **Video upload and storage** supporting MP4, MOV, AVI, WebM formats
- **Automated thumbnail generation** using FFmpeg (WebP format, 512x512)
- **GIF preview creation** (3-second animated previews, 256px wide)
- **Video metadata extraction** (duration, dimensions, codec information)
- **Unified media table** supporting both images (media_type=1) and videos (media_type=2)

#### VideoProcessingWorker
- **Dedicated Kafka consumer** for `deeplens.videos.uploaded` topic
- **FFmpeg integration** with automatic binary path detection
- **Asynchronous processing** with error handling and retry logic
- **Thumbnail poster frame** extraction at 1 second mark
- **Smart GIF generation** starting at 20% into video for better preview

#### Media API Enhancements
- **Unified `/api/v1/catalog/media` endpoint** for both images and videos
- **Media type filtering** with `?type=1` (images) or `?type=2` (videos)
- **Video-specific endpoints**:
  - `/api/v1/catalog/media/{id}/thumbnail` - WebP poster frame
  - `/api/v1/catalog/media/{id}/preview` - Animated GIF
  - `/api/v1/catalog/media/{id}/raw` - Full video with range request support

#### Visual Catalog UI Updates
- **Video thumbnail display** in grid layout
- **Animated GIF previews** on hover for video items
- **Full video playback** in modal with HTML5 video player
- **Media type indicators** to distinguish images from videos
- **Responsive video player** with controls and autoplay

### 🔧 Technical Improvements

#### Backend
- Renamed `images` table to `media` with `media_type` column
- Added `duration_seconds`, `thumbnail_path`, `preview_path` columns
- Updated `TenantMetadataService` with `UpdateVideoMetadataAsync` method
- Generalized `ImagesController` to `MediaController`
- Added `MimeType` to `MediaDto` for proper content-type handling
- Implemented HTTP range request support for video streaming
- Updated Kafka bootstrap servers to `127.0.0.1:9092` for reliability

#### Frontend
- Renamed `imageService.ts` to `mediaService.ts`
- Updated `ImagesPage.tsx` to handle both images and videos
- Added conditional rendering for video vs image display
- Implemented full-screen media viewer modal
- Added `getRawUrl` function for original media access

#### Infrastructure
- **FFmpeg installation guide** for Windows, Linux, and macOS
- **VideoProcessingWorker configuration** with custom binary paths
- **Kafka topic separation**: `deeplens.images.uploaded` and `deeplens.videos.uploaded`
- **Worker isolation** for image and video processing pipelines

### 📚 Documentation
- New `docs/VIDEO_PROCESSING.md` with comprehensive guide
- Updated `README.md` to reflect visual search capabilities
- Updated `ARCHITECTURE.md` system overview
- Added `FFMPEG_SETUP.md` installation guide
- Created `VIDEO_PIPELINE_FIXED.md` troubleshooting guide

### 🐛 Bug Fixes
- Fixed .NET Generic Host issue with multiple BackgroundServices
- Resolved VideoProcessingWorker ExecuteAsync not being called
- Fixed Kafka connectivity issues with localhost vs 127.0.0.1
- Corrected MinIO upload paths for thumbnails and previews
- Fixed missing MIME type in media responses

### 📦 Database Migrations
- `04-rename-images-to-media.sql` - Renames images table and adds video columns
- Updated `03-tenant-metadata-template.sql` with media_type support

### 🎬 Demo: Video Processing
Successfully processed 4 test videos:
- Automated WebP thumbnail generation
- 3-second GIF preview creation
- Metadata extraction (duration, dimensions)
- All videos displayed in Visual Catalog with hover previews

### ⚡ Performance
- Video processing: 2-5 seconds for small videos (< 10MB)
- Thumbnail generation: ~20-50KB WebP files
- GIF previews: ~200-500KB for 3-second clips
- Asynchronous processing via Kafka for scalability

### 🚀 What's Next (v0.4.0)
- Video transcoding for web-optimized formats
- Scene detection for intelligent preview selection
- Frame-by-frame search capabilities
- Audio waveform visualization
- Video quality analysis
- Automatic subtitle extraction

---

## v0.2.0 - Bulk Image Ingestion & Visual Catalog (December 21, 2025)

### 🎉 New Features

#### Bulk Image Ingestion
- **Multi-file upload API** at `/api/v1/ingest/bulk` supporting batch image uploads with metadata
- **Metadata-driven ingestion** using JSON manifests for SKU, product details, pricing, and attributes
- **Tenant-isolated storage** with automatic partitioning in MinIO
- **Asynchronous processing pipeline** using Kafka for scalable image handling

#### Tenant-Specific Thumbnail Configuration
- **Per-tenant thumbnail settings** stored as JSONB in the tenants table
- **Configurable quality, dimensions, and format** (WebP, JPEG, PNG)
- **Multi-specification support** for different use cases (grid, detail, preview)
- **Worker-driven generation** with automatic dimension tracking

#### Visual Catalog UI
- **Grid-based image browser** with justified layout
- **Infinite scroll pagination** for large collections
- **Real-time status indicators** showing upload/processing states
- **On-demand thumbnail delivery** with caching

### 🔧 Technical Improvements

#### Backend
- Added `UpdateImageStatusAsync` and `UpdateImageDimensionsAsync` to `TenantMetadataService`
- Enhanced `ImageProcessingWorker` to persist image dimensions after thumbnail generation
- Fixed `FeatureExtractionWorker` to use `IStorageService` instead of file system access
- Implemented CORS middleware for frontend-backend communication
- Added `shipping_info` column to `seller_listings` table

#### Frontend
- Updated `imageService` to pass tenant ID for multi-tenant support
- Modified `ImagesPage` to use authenticated user's tenant context
- Fixed React import warnings

#### Testing
- Created `DeepLens.Infrastructure.Tests` with tests for tenant settings and processing options
- Created `DeepLens.SearchApi.Tests` with tests for ingestion and image controllers
- Added sample test data for Vayyari saree collection (7 images)

### 📚 Documentation
- Comprehensive bulk ingestion workflow in `DEVELOPMENT.md`
- Tenant thumbnail configuration examples
- End-to-end testing procedures

### 🐛 Bug Fixes
- Fixed missing `tenant_id` parameter in image list API calls
- Resolved CORS blocking issues between frontend and API
- Corrected database schema inconsistencies in tenant metadata tables

### 📦 Database Migrations
- `002_AddTenantSettings.sql` - Adds JSONB settings column to tenants table
- Updated `03-tenant-metadata-template.sql` with `shipping_info` field

### 🎬 Demo: Vayyari Saree Collection
Successfully ingested and displayed 7 premium saree images:
- VAY-SRI-201: Pure Kanchipuram Silk in Emerald Green
- VAY-SRI-202: Midnight Blue Banarasi with Silver Motifs
- VAY-SRI-203: Hand-painted Kalamkari on Tussar Silk
- VAY-SRI-204: Classic Red Bridal with Zardosi Work
- VAY-SRI-205: Lightweight Chiffon in Pastel Pink
- VAY-SRI-206: Indigo Dabu Print Cotton
- VAY-SRI-207: Elegant Paithani in Magenta

### 🚀 What's Next (v0.3.0)
- ML-powered feature extraction integration
- Visual similarity search
- Advanced image filters and faceted navigation
- Multi-image product support
- Batch thumbnail regeneration tools

---

## v0.1.0 - Initial Platform Setup

Initial release with core infrastructure, identity management, and basic image storage.

(Previous release notes...)


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

> **📖 For comprehensive Kafka documentation, see [KAFKA_TOPICS.md](./KAFKA_TOPICS.md)**

### Core Topics (Summary)
- `deeplens.images.uploaded`: Image upload notifications → triggers processing pipeline
- `deeplens.videos.uploaded`: Video upload notifications → triggers frame extraction
- `deeplens.features.extraction`: ML feature extraction requests → PythonService
- `deeplens.vectors.indexing`: Vector indexing requests → Qdrant
- `deeplens.processing.completed`: Pipeline completion notifications → SearchAPI
- `deeplens.processing.failed`: Error notifications → SearchAPI (triggers alerts/retry)
- `deeplens.images.maintenance`: Cleanup and maintenance tasks → MaintenanceWorker

### WhatsApp Processor Topic
- `whatsapp-ready-messages`: WhatsApp message queue → MessageQueueService

### Pipeline Flow
1. **Producer**: Search API (Upload / Merge)
2. **Consumer**: Image Processing Worker (Initializes pipeline)
3. **Consumer**: Feature Extraction Worker (Calls ML service)
4. **Consumer**: Vector Indexing Worker (Updates Qdrant)
5. **Consumer**: Image Maintenance Worker (Physical cleanup)

**See [KAFKA_TOPICS.md](./KAFKA_TOPICS.md) for detailed documentation including:**
- Complete data flow diagrams
- Payload examples for each topic
- Monitoring and management commands
- Best practices and troubleshooting

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
| **WhatsApp Processor**        |    ✅    |    ✅    |   ✅   |
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
Automation handles the setup of Shared Services (PostgreSQL, Kafka, MinIO, Redis) and internal networks.


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

┌─────────────────────────────────────────────────────────┐
│              Shared Infrastructure                      │
│ (Supports DeepLens, WhatsApp Processor, etc.)           │
├─────────────────────────────────────────────────────────┤
│ PostgreSQL (5433) - Shared Relational DB                 │
│ Kafka (9092)      - Shared Message Backbone              │
│ MinIO (9000/9001) - Shared Object Storage                │
│ Redis (6379)      - Shared Cache                         │
│ deeplens-network  - Shared Container Network             │
├─────────────────────────────────────────────────────────┤
│              Observability Stack                        │
├─────────────────────────────────────────────────────────┤
│ Jaeger (16686)    - Distributed Tracing                  │
│ Grafana (3000)    - Monitoring Dashboards                │
│ Prometheus (9090) - Metrics Database                     │
│ Loki (3100)       - Log Aggregation                      │
└─────────────────────────────────────────────────────────┘
         │
         ├── DeepLens Tenants
         │   ├── Qdrant (6333/6334) - Vector Database
         │   └── Backup Container
         │
         └── Other Applications
             └── WhatsApp Processor Containers...

*(Code block omitted for brevity)*
powershell
# Create network (required for tenant isolation)
podman network create deeplens-network

# Verify
podman network ls

*(Code block omitted for brevity)*
powershell
podman run -d `
  --name deeplens-postgres `
  --network deeplens-network `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=DeepLens123! `
  -e POSTGRES_DB=nextgen_identity `
  -p 5433:5432 `
  -v deeplens-postgres-data:/var/lib/postgresql/data `
  postgres:16-alpine

# Test connection
podman exec deeplens-postgres pg_isready -U postgres

*(Code block omitted for brevity)*
powershell
podman run -d `
  --name deeplens-redis `
  --network deeplens-network `
  -p 6379:6379 `
  redis:7-alpine

# Test connection
podman exec deeplens-redis redis-cli ping

*(Code block omitted for brevity)*
powershell
# Check all containers
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Expected output:
# NAMES              STATUS        PORTS
# deeplens-postgres  Up X seconds  0.0.0.0:5433->5432/tcp
# deeplens-redis     Up X seconds  0.0.0.0:6379->6379/tcp

*(Code block omitted for brevity)*
powershell
cd C:\productivity\deeplens\src\NextGen.Identity.Api

# Set environment (REQUIRED!)
$env:ASPNETCORE_ENVIRONMENT='Development'

# Start API
dotnet run --urls=http://localhost:5198

*(Code block omitted for brevity)*
powershell
# Test OpenID configuration
Invoke-RestMethod http://localhost:5198/.well-known/openid-configuration

# Should return JSON with endpoints

*(Code block omitted for brevity)*
powershell
cd C:\productivity\deeplens\infrastructure

# Interactive (prompts for storage type)
.\provision-tenant.ps1 -TenantName "your-tenant"

# With DeepLens-managed storage
.\provision-tenant.ps1 -TenantName "your-tenant" -StorageType "DeepLens"

# With BYOS (Bring Your Own Storage)
.\provision-tenant.ps1 -TenantName "your-tenant" -StorageType "BYOS"

*(Code block omitted for brevity)*
powershell
# Check tenant containers
podman ps --filter "label=tenant=your-tenant"

# Check database
podman exec deeplens-postgres psql -U postgres -c "\l" | Select-String "tenant_"

# View credentials
Get-Content "C:\productivity\deeplensData\tenants\your-tenant\admin-credentials.txt"

*(Code block omitted for brevity)*
powershell
.\provision-tenant.ps1 -TenantName "old-tenant" -Remove

*(Code block omitted for brevity)*
powershell
# Use full path
& "C:\Program Files\dotnet\dotnet.exe" run --urls=http://localhost:5198

# Or add to PATH
$env:Path += ";C:\Program Files\dotnet"

*(Code block omitted for brevity)*
powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

*(Code block omitted for brevity)*
powershell
# Ensure environment variable is set
$env:ASPNETCORE_ENVIRONMENT='Development'

*(Code block omitted for brevity)*
powershell
# Check if network exists
podman network ls | Select-String "deeplens-network"

# Create if missing
podman network create deeplens-network

*(Code block omitted for brevity)*
powershell
# Find what's using the port
netstat -ano | findstr :5433

# Kill the process
taskkill /PID <PID> /F

*(Code block omitted for brevity)*
powershell
# Check for port conflicts
podman ps -a | Select-String "demo"

# Stop core infrastructure if using multi-tenant
podman stop deeplens-qdrant deeplens-minio

# Start tenant containers
podman start deeplens-qdrant-demo deeplens-minio-demo

*(Code block omitted for brevity)*
powershell
# Identity API logs (if running in background)
podman logs deeplens-identity-api

# Tenant Qdrant logs
podman logs deeplens-qdrant-demo

# Tenant MinIO logs
podman logs deeplens-minio-demo

# PostgreSQL logs
podman logs deeplens-postgres

*(Code block omitted for brevity)*
powershell
# Stop Identity API (Ctrl+C in its terminal)

# Stop all containers
podman stop $(podman ps -aq)

# Or stop specific services
podman stop deeplens-postgres deeplens-redis

*(Code block omitted for brevity)*
powershell
# Backup all databases
podman exec deeplens-postgres pg_dumpall -U postgres > deeplens-backup.sql

# Backup specific tenant database
podman exec deeplens-postgres pg_dump -U postgres tenant_demo_metadata > demo-backup.sql

*(Code block omitted for brevity)*
powershell
# Restore all databases
Get-Content deeplens-backup.sql | podman exec -i deeplens-postgres psql -U postgres

# Restore specific database
Get-Content demo-backup.sql | podman exec -i deeplens-postgres psql -U postgres -d tenant_demo_metadata

*(Code block omitted for brevity)*
powershell
# Stop and remove all containers
podman stop $(podman ps -aq)
podman rm $(podman ps -aq)

# Remove all volumes (⚠️ DELETES ALL DATA)
podman volume rm $(podman volume ls -q)

# Remove network
podman network rm deeplens-network

*(Code block omitted for brevity)*
powershell
# Container stats
podman stats

# Disk usage
podman system df

# Volume usage
podman volume ls

*(Code block omitted for brevity)*
powershell
# Export
podman volume export deeplens-postgres-data > postgres.tar
# Import on new machine
Get-Content postgres.tar | podman volume import deeplens-postgres-data

*(Code block omitted for brevity)*
powershell
   podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
   
*(Code block omitted for brevity)*
powershell
   podman logs -f <container-name>
   
*(Code block omitted for brevity)*
powershell
   podman ps --filter "label=tenant=demo"
   ```

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

DeepLens uses a "Shared Infrastructure, Isolated Data" approach. Core services (Postgres, Kafka, MinIO, Redis) are shared across applications (DeepLens, WhatsApp Processor), while tenant data is logically isolated.

### Data Separation Strategy

| Component      | Shared | Per-Tenant           | Purpose                             |
| -------------- | ------ | -------------------- | ----------------------------------- |
| **PostgreSQL** | ✅      | Database per tenant  | Shared Instance (DeepLens/WhatsApp) |
| **Kafka**      | ✅      | Topic per tenant     | Shared Message Backbone             |
| **Redis**      | ✅      | Key Prefix           | Shared Cache & Sessions             |
| **MinIO**      | ✅      | **Dedicated Bucket** | Shared Instance with IAM Search     |
| **Qdrant**     | ❌      | Dedicated Instance   | Vector Search Isolation             |
| **Backups**    | ❌      | Dedicated Container  | Automated Tenant Backups            |

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

<a name='source-src-whatsapp-processor-readme-md'></a>

# Documentation: src/whatsapp-processor/README.md
------------------------------

# DeepLens WhatsApp Processor

Multi-tenant WhatsApp message processor with modern React UI, integrated into the DeepLens ecosystem.

## 🎯 Overview

This application connects to WhatsApp Web using the Baileys library, allowing you to:
- Monitor WhatsApp groups and communities
- Selectively track messages from whitelisted groups
- Store media in MinIO and metadata in PostgreSQL
- Manage everything through a modern React interface

## 🏗️ Architecture

### Backend
- **Node.js + TypeScript** - Server runtime
- **Express** - Web server
- **Socket.IO** - Real-time WebSocket communication
- **Baileys** - WhatsApp Web API client
- **MinIO SDK** - Object storage for media
- **PostgreSQL Client** - Metadata storage
- **Kafka** - Message processing queue (sequential ordering per chat)

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **Socket.IO Client** - Real-time updates
- **qrcode.react** - QR code rendering

### Storage
- **MinIO** - Media files (images, videos)
- **PostgreSQL** - Chat history and metadata
- **Kafka** - Message queue for reliable, ordered processing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (managed via nvm)
- Running DeepLens infrastructure (PostgreSQL, MinIO, Kafka)

### 1. Install Dependencies


*(Code block omitted for brevity)*


### 2. Build


*(Code block omitted for brevity)*


Or use the combined command:

*(Code block omitted for brevity)*


### 3. Setup Database

The WhatsApp Processor requires a PostgreSQL database. If you're using the DeepLens infrastructure:


*(Code block omitted for brevity)*


**Important:** The database runs on port **5433** (not 5432) when using DeepLens infrastructure.

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed database configuration and troubleshooting.

### 4. Configure

Copy the example environment file and edit with your values:


*(Code block omitted for brevity)*


Edit `.env` with your tenant-specific configuration:
- `TENANT_NAME` - Your tenant name (e.g., "Vayyari")
- `MINIO_BUCKET` - Your tenant's MinIO bucket (format: `tenant-<uuid>`)
- `DB_CONNECTION_STRING` - Your tenant's PostgreSQL database

### 5. Run


*(Code block omitted for brevity)*


Access the UI at: **http://localhost:3005**

## 📁 Project Structure


*(Code block omitted for brevity)*


## 🛠️ Development

### Backend Development


*(Code block omitted for brevity)*


Runs the backend with ts-node for hot reload on **port 3005**.

### Frontend Development


*(Code block omitted for brevity)*


Runs Vite dev server on **port 3006** with:
- Hot module replacement
- Proxy to backend API (port 3005)
- Fast refresh


*(Code block omitted for brevity)*


## 📊 Observability & Tracing

The WhatsApp Processor is fully instrumented with **OpenTelemetry**.

### Distributed Tracing
Traces are automatically collected for:
- Incoming HTTP requests
- Outgoing database queries (PostgreSQL)
- MinIO object storage operations

You can view live traces in **Jaeger** at: [http://localhost:16686](http://localhost:16686)

### Metrics
Application-level metrics are exported via OTLP and can be viewed in **Grafana** (Port 3000) or directly in **Prometheus** (Port 9090).

### Configuration
Tracing is configured via environment variables in `.env`:
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` - Jaeger/OTel Collector endpoint
- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` - Prometheus/OTel Collector endpoint

## 📡 API Reference

### REST Endpoints

| Endpoint             | Method | Description                             |
| -------------------- | ------ | --------------------------------------- |
| `/api/status`        | GET    | Connection status, QR code, tenant info |
| `/api/groups`        | GET    | List all groups with tracking status    |
| `/api/groups/toggle` | POST   | Enable/disable tracking for a group     |

### WebSocket Events

| Event    | Direction       | Data              | Description               |
| -------- | --------------- | ----------------- | ------------------------- |
| `status` | Server → Client | `{ status, qr? }` | Connection status updates |

**Status values:**
- `disconnected` - Not connected to WhatsApp
- `scanning` - Waiting for QR code scan
- `connected` - Successfully connected

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with these variables:


*(Code block omitted for brevity)*


**Note:** Special characters in passwords should be URL-encoded (e.g., `!` becomes `%21`)

## 🐳 Docker Deployment

See `docker-compose.whatsapp.yml` in the DeepLens root for containerized deployment with:
- Isolated containers per tenant
- Network isolation via `deeplens-network`
- Persistent volumes for session data
- Environment-based configuration

## 🎨 Features

✅ **WhatsApp Authentication** - QR code scanning for multi-device login  
✅ **Group Management** - View and whitelist communities/groups  
✅ **Real-time Updates** - Live connection status via WebSocket  
✅ **Multi-tenant** - Isolated data per tenant  
✅ **Modern UI** - React with TypeScript and TailwindCSS  
✅ **Type Safety** - Full TypeScript coverage  
✅ **Hot Reload** - Fast development workflow  

## 📝 NPM Scripts

| Script                 | Description                        |
| ---------------------- | ---------------------------------- |
| `npm start`            | Start production server            |
| `npm run dev`          | Start backend dev server           |
| `npm run dev:client`   | Start frontend dev server          |
| `npm run build`        | Build backend                      |
| `npm run build:client` | Build frontend                     |
| `npm run build:all`    | Build both backend and frontend    |
| `npm run setup`        | Install all dependencies and build |

## 🔒 Security Notes

- `.env` file is gitignored - never commit credentials
- Use `.env.example` as a template for new environments
- Each tenant has isolated MinIO bucket and PostgreSQL database
- Session credentials are stored in `data/` directory (gitignored)

## 🐛 Troubleshooting

### "React build not found" error

Run the build command:

*(Code block omitted for brevity)*


### Database connection errors

Check your `DB_CONNECTION_STRING` in `.env`:
- Ensure password is URL-encoded
- Verify database exists
- Check PostgreSQL is running

### MinIO connection errors

Verify:
- MinIO is running on the specified port
- Bucket exists and credentials are correct
- `MINIO_BUCKET` matches your tenant's bucket name

## 📚 Additional Documentation

- **Frontend**: See `client/README.md` for React-specific details
- **Migration**: See `MIGRATION_COMPLETE.md` for React migration notes
- **DeepLens**: See root `README.md` for overall architecture

## 📄 License

Part of the DeepLens project.


---

<a name='source-src-whatsapp-processor-architecture-md'></a>

# Documentation: src/whatsapp-processor/ARCHITECTURE.md
------------------------------

# Architecture Overview

## System Architecture


*(Code block omitted for brevity)*


## Data Flow

### 1. QR Code Authentication Flow

*(Code block omitted for brevity)*


### 2. Group Management Flow

*(Code block omitted for brevity)*


## Module Responsibilities

### Backend

| Module      | Responsibility                           |
| ----------- | ---------------------------------------- |
| `config/`   | Environment variables and configuration  |
| `clients/`  | External service connections (MinIO, DB) |
| `services/` | Business logic (WhatsApp integration)    |
| `routes/`   | HTTP API endpoints                       |
| `utils/`    | Helper functions (whitelist management)  |
| `index.ts`  | Application orchestration and startup    |

### Frontend

| Module        | Responsibility                          |
| ------------- | --------------------------------------- |
| `pages/`      | Top-level route components              |
| `components/` | Reusable UI components                  |
| `services/`   | External communication (API, Socket.IO) |
| `hooks/`      | Shared state management logic           |
| `App.tsx`     | Routing configuration                   |
| `main.tsx`    | Application bootstrap                   |

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **WhatsApp**: Baileys (@whiskeysockets/baileys)
- **Real-time**: Socket.IO
- **Storage**: MinIO
- **Database**: PostgreSQL

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Real-time**: Socket.IO Client
- **QR Code**: qrcode.react


---

<a name='source-src-whatsapp-processor-database_setup-md'></a>

# Documentation: src/whatsapp-processor/DATABASE_SETUP.md
------------------------------

# WhatsApp Processor - Database Setup

## Quick Start

### 1. Start DeepLens Infrastructure

*(Code block omitted for brevity)*


### 2. Setup WhatsApp Database

*(Code block omitted for brevity)*


### 3. Configure Environment
Copy `.env.example` to `.env` (if not already done):

*(Code block omitted for brevity)*


The default configuration should work with DeepLens infrastructure.

### 4. Start Application

*(Code block omitted for brevity)*


---

## Database Configuration

### Connection Details

| Setting      | Value                   |
| :----------- | :---------------------- |
| **Host**     | `localhost`             |
| **Port**     | `5433` ⚠️ (not 5432!)    |
| **Database** | `whatsapp_vayyari_data` |
| **Username** | `postgres`              |
| **Password** | `DeepLens123!`          |

### Environment Variables

**Preferred (lowercase with underscores):**

*(Code block omitted for brevity)*


**Legacy (uppercase - deprecated):**

*(Code block omitted for brevity)*


> **Note:** The application supports both formats for backward compatibility, but lowercase is preferred.

---

## Common Issues

### Issue: "ECONNREFUSED" or "ECONNRESET"

**Cause:** Database is not running or wrong port is configured.

**Solution:**
1. Check if PostgreSQL container is running:
   
*(Code block omitted for brevity)*


2. Verify port in `.env` is `5433` (not `5432`)

3. Restart containers if needed:
   
*(Code block omitted for brevity)*


### Issue: "database does not exist"

**Cause:** Database hasn't been created yet.

**Solution:**

*(Code block omitted for brevity)*


### Issue: Port 5432 vs 5433 Confusion

**Why 5433?**
- The DeepLens Podman infrastructure maps PostgreSQL to port `5433` on the host
- This is defined in `infrastructure/setup-deeplens-dev.ps1` line 112: `-p 5433:5432`
- The container internally uses port 5432, but it's exposed as 5433 on your machine

**How to remember:**
- If using DeepLens infrastructure → use port `5433`
- If using standalone PostgreSQL → use port `5432`

---

## Database Schema

The WhatsApp Processor uses 5 tables:

1. **chats** - Stores all WhatsApp chats (groups and individual)
2. **messages** - Stores message content and metadata
3. **chat_tracking_state** - Tracks which chats are included/excluded
4. **processing_state** - Global pause/resume state
5. **media_files** - Metadata for downloaded media files

To recreate the schema:

*(Code block omitted for brevity)*


---

## Connecting with pgAdmin

1. Open pgAdmin
2. Right-click "Servers" → "Register" → "Server"
3. **General Tab:**
   - Name: `DeepLens WhatsApp`
4. **Connection Tab:**
   - Host: `localhost`
   - Port: `5433`
   - Database: `whatsapp_vayyari_data`
   - Username: `postgres`
   - Password: `DeepLens123!`
5. Click "Save"

---

## Troubleshooting Commands

### Check if database exists

*(Code block omitted for brevity)*


### List tables in database

*(Code block omitted for brevity)*


### Check table row counts

*(Code block omitted for brevity)*


### Test connection from Node.js

*(Code block omitted for brevity)*


---

## Migration from JSON Files

If you were previously using JSON files for tracking state (`exclusions.json`, `tracking_state.json`), the application now uses the database instead. The old files are no longer used and can be safely deleted.

The migration happens automatically when you:
1. Set up the database with `setup-whatsapp-db.ps1`
2. Start the application with the correct database connection string

---

## See Also

- [Main DeepLens Troubleshooting Guide](../../TROUBLESHOOTING_SUMMARY.md)
- [Infrastructure Setup Script](../../infrastructure/setup-deeplens-dev.ps1)
- [Database DDL Scripts](./scripts/ddl/)


---

<a name='source-src-whatsapp-processor-design_vision-md'></a>

# Documentation: src/whatsapp-processor/DESIGN_VISION.md
------------------------------

# WhatsApp Processor - Design Vision

## Core Philosophy

**Track everything by default, exclude selectively**

This approach ensures comprehensive data capture while giving users granular control over what they don't want to track.

## Key Features

### 1. Smart Landing Page
- **No Session**: Show QR code for authentication
- **Session Exists**: Redirect to dashboard automatically
- Seamless user experience

### 2. Processing Control
- **Pause Button**: Stop processing new messages
- **Resume Button**: Continue processing
- State persisted across restarts
- Visual indicator of processing state

### 3. Inclusive Tracking Model
- **Default**: All chats and groups are tracked
- **User Action**: Selectively exclude specific chats/groups
- **Exclusion Behavior**:
  - Stops further message processing
  - Preserves existing data
  - Can be reversed

### 4. Resume Options
When moving from excluded → included:
- **Option A**: Resume from last tracked message (fill the gap)
- **Option B**: Resume from current time (leave gap in history)
- User chooses based on their needs

### 5. Media Management
All media uploaded to MinIO with organized structure:

*(Code block omitted for brevity)*


- Links stored in database alongside messages
- Future migration to DeepLens bucket supported
- Easy to update locations in database

### 6. Community Groups Support
- Track community announcements
- Track community group chats
- Same exclusion rules apply

## Data Model

### Chat Tracking State

*(Code block omitted for brevity)*


### Processing State

*(Code block omitted for brevity)*


### Message Record

*(Code block omitted for brevity)*


## User Workflows

### Workflow 1: First Time Setup
1. User opens app
2. No session detected → QR code shown
3. User scans QR code
4. Connection established
5. Redirect to dashboard
6. All chats/groups automatically tracked

### Workflow 2: Excluding a Chat
1. User views dashboard
2. Sees list of all chats (included by default)
3. Clicks "Exclude" on specific chat
4. Processing stops for that chat
5. Existing data preserved

### Workflow 3: Re-including a Chat
1. User views excluded chats
2. Clicks "Include" on specific chat
3. Modal appears with options:
   - "Resume from last message" (backfill gap)
   - "Resume from now" (leave gap)
4. User selects option
5. Processing resumes accordingly

### Workflow 4: Pause/Resume Processing
1. User clicks "Pause" button
2. All message processing stops
3. Button changes to "Resume"
4. User clicks "Resume"
5. Processing continues from where it left off

## Technical Implementation

### Backend Changes
- ✅ Inverted whitelist → exclusion list
- ✅ Processing state management
- ✅ Media upload to MinIO
- ✅ Resume mode handling
- ✅ Database schema for tracking state

### Frontend Changes
- ✅ Landing page routing logic
- ✅ Pause/Resume button
- ✅ Exclusion list UI
- ✅ Resume mode modal
- ✅ Processing state indicator

### Database Schema

*(Code block omitted for brevity)*


## Future Enhancements
- Analytics dashboard
- Search across messages
- Export functionality
- Media migration to DeepLens
- Batch operations
- Advanced filtering


---

<a name='source-src-whatsapp-processor-testing_guide-md'></a>

# Documentation: src/whatsapp-processor/TESTING_GUIDE.md
------------------------------

# WhatsApp Processor - Testing & Deployment Guide

## ✅ Implementation Complete!

All features have been implemented:
- ✅ Event handlers (chats.set, chats.upsert, chats.update, messages.update)
- ✅ Enhanced database schema with WhatsApp-like UI support
- ✅ Rate limiter with jitter
- ✅ Frontend connected to real API
- ✅ Real-time data display

---

## 🧪 Testing the Implementation

### Step 1: Restart the Application


*(Code block omitted for brevity)*


### Step 2: Check the Logs

Look for these log messages on startup:


*(Code block omitted for brevity)*


### Step 3: Verify Database


*(Code block omitted for brevity)*


### Step 4: Test Frontend

1. **Open the app**: http://localhost:3000
2. **Navigate to Conversations** → **Chats**
3. **Verify**:
   - ✅ Real chats are displayed (not mock data)
   - ✅ Unread counts show correctly
   - ✅ Last message previews visible
   - ✅ Chats ordered by last message time
   - ✅ Pinned chats at top (if any)

4. **Navigate to Groups**
   - ✅ Real groups displayed
   - ✅ Group icons shown
   - ✅ Unread counts correct

5. **Navigate to Announcements**
   - ✅ Announcement channels displayed
   - ✅ Broadcast icon shown

### Step 5: Test Real-Time Updates

**Send a message to yourself on WhatsApp:**

1. Open WhatsApp on your phone
2. Send a message to any chat
3. **Check logs** for:
   
*(Code block omitted for brevity)*

4. **Refresh the frontend**
5. **Verify**:
   - ✅ Unread count incremented
   - ✅ Last message updated
   - ✅ Chat moved to top

### Step 6: Test Message Edits

**Edit a message on WhatsApp:**

1. Edit a message on your phone
2. **Check logs** for:
   
*(Code block omitted for brevity)*

3. **Check database**:
   
*(Code block omitted for brevity)*


### Step 7: Test Message Deletes

**Delete a message on WhatsApp:**

1. Delete a message on your phone
2. **Check logs** for:
   
*(Code block omitted for brevity)*

3. **Check database**:
   
*(Code block omitted for brevity)*


---

## 🔍 Troubleshooting

### Issue: "No chats displayed"

**Possible causes:**
1. WhatsApp not connected
2. Database connection failed
3. API endpoint not working

**Solutions:**

*(Code block omitted for brevity)*


### Issue: "chats.set event not firing"

**Possible causes:**
1. Already connected before (event fires once)
2. Session cached

**Solution:**

*(Code block omitted for brevity)*


### Issue: "Unread counts not updating"

**Possible causes:**
1. `chats.update` event not handled
2. Database update failing

**Solution:**

*(Code block omitted for brevity)*


---

## 📊 Monitoring

### Key Metrics to Watch

1. **Rate Limiter Stats**
   
*(Code block omitted for brevity)*


2. **Database Performance**
   
*(Code block omitted for brevity)*


3. **Message Processing Rate**
   
*(Code block omitted for brevity)*


---

## 🚀 Production Deployment

### Environment Variables

Add to `.env`:

*(Code block omitted for brevity)*


### Database Migration


*(Code block omitted for brevity)*


### Build Frontend


*(Code block omitted for brevity)*


### Start Production


*(Code block omitted for brevity)*


---

## 📈 Performance Optimization

### Database Indexes

Already created:
- ✅ `idx_chats_last_message_timestamp` - For ordering
- ✅ `idx_chats_unread_count` - For unread filter
- ✅ `idx_chats_pinned` - For pinned chats
- ✅ `idx_chats_name_search` - For search

### Rate Limiter Tuning

Adjust based on your needs:

*(Code block omitted for brevity)*


---

## 🎯 Next Steps

### Phase 1: Real-Time Updates (Recommended)
- [ ] Add Socket.IO listeners in frontend
- [ ] Emit events on message/chat updates
- [ ] Auto-refresh conversation list
- [ ] Show "typing..." indicators

### Phase 2: Message View
- [ ] Create message detail component
- [ ] Display conversation messages
- [ ] Infinite scroll for history
- [ ] Media preview (images, videos)

### Phase 3: Admin Features
- [ ] Sync status dashboard
- [ ] Manual sync trigger buttons
- [ ] Bulk operations
- [ ] Export conversations

### Phase 4: Advanced Features
- [ ] Search across all messages
- [ ] Message reactions
- [ ] Starred messages
- [ ] Archive management

---

## 📝 Summary

**What's Working:**
- ✅ All chats synced to database on connection
- ✅ Real-time message processing
- ✅ Message edits/deletes tracked
- ✅ Unread counts updated automatically
- ✅ WhatsApp-like ordering (pinned first, then by time)
- ✅ Rate limiting prevents API flooding
- ✅ Frontend displays real data
- ✅ Loading states and error handling

**What's Next:**
- ⏳ Real-time UI updates (Socket.IO)
- ⏳ Message detail view
- ⏳ Sync status indicators
- ⏳ Admin dashboard

**Performance:**
- 🚀 Database-first (no in-memory store)
- 🚀 Optimized indexes
- 🚀 Rate-limited API calls
- 🚀 Event-driven architecture

You now have a **production-ready WhatsApp processor** with full database persistence and WhatsApp-like UI support! 🎉


---

<a name='source-src-whatsapp-processor-quick_reference-md'></a>

# Documentation: src/whatsapp-processor/QUICK_REFERENCE.md
------------------------------

# Quick Reference Guide

## 🚀 Starting the Application


*(Code block omitted for brevity)*


Server runs on: `http://localhost:3005`

---

## 🎯 Key Features

### 1. Smart Landing Page
- **No Session**: Automatically shows QR code
- **Has Session**: Automatically shows dashboard

### 2. Dashboard Features
- **Pause/Resume Button**: Control all message processing
- **Statistics**: View total, tracking, and excluded counts
- **Tabs**: Switch between "Tracking" and "Excluded" chats
- **Exclude Button**: Stop tracking a specific chat
- **Include Button**: Resume tracking with options

### 3. Resume Options
When including an excluded chat:
- **Resume from last message**: Backfill all missed messages
- **Resume from now**: Start fresh (leave gap)

---

## 📡 API Endpoints

### Status & Connection

*(Code block omitted for brevity)*

Returns: `{ status, qr, tenant, hasSession, processingState }`

### Chats & Groups

*(Code block omitted for brevity)*


### Exclusion Management

*(Code block omitted for brevity)*


### Processing Control

*(Code block omitted for brevity)*


---

## 📂 Data Files

Located in `data/config/`:

- **exclusions.json**: List of excluded chat JIDs
- **tracking_state.json**: Per-chat tracking metadata
- **processing_state.json**: Global pause/resume state

---

## 🎨 UI Components

### Dashboard Page (`/`)
- Processing control panel
- Statistics cards
- Tabbed chat list
- Exclude/Include actions

### QR Code Page (`/qr`)
- QR code display
- Connection status
- Auto-redirect when connected

### Resume Modal
- Two-option selection
- Clear descriptions
- Visual feedback

---

## 🔄 Workflows

### Exclude a Chat
1. Go to dashboard
2. Find chat in "Tracking" tab
3. Click "Exclude"
4. Chat moves to "Excluded" tab

### Include a Chat
1. Go to "Excluded" tab
2. Find chat
3. Click "Include"
4. Select resume mode in modal
5. Chat moves to "Tracking" tab

### Pause Processing
1. Click "Pause" button
2. All processing stops
3. Button changes to "Resume"

### Resume Processing
1. Click "Resume" button
2. Processing continues
3. Button changes to "Pause"

---

## 🗂️ MinIO Folder Structure


*(Code block omitted for brevity)*


---

## 💾 Message Processing Flow

1. **Message Received** → Check if processing is paused
2. **Not Paused** → Check if chat is excluded
3. **Not Excluded** → Process message
4. **Extract Content** → Download media (if any)
5. **Upload to MinIO** → Store media URL
6. **Update Tracking State** → Save last processed message

---

## 🎯 Default Behavior

- ✅ All chats tracked by default
- ✅ Processing enabled by default
- ✅ Media automatically uploaded
- ✅ State persisted across restarts

---

## 🔧 Configuration

Environment variables in `.env`:


*(Code block omitted for brevity)*


---

## 📊 Monitoring

### Check Processing State

*(Code block omitted for brevity)*


### Check Connection Status

*(Code block omitted for brevity)*


### List All Chats

*(Code block omitted for brevity)*


---

## 🐛 Troubleshooting

### Server Won't Start
- Check if port 3005 is available
- Verify environment variables
- Check logs for errors

### QR Code Not Showing
- Check connection status
- Verify session files don't exist
- Restart server

### Messages Not Processing
- Check if processing is paused
- Verify chat is not excluded
- Check MinIO connection

---

## 📝 Notes

- **Exclusion is reversible**: You can always re-include chats
- **Data is preserved**: Excluding doesn't delete existing data
- **Resume modes**: Choose based on your needs
- **Media URLs**: Stored as `minio://{bucket}/{path}`
- **Future migration**: Easy to update URLs for DeepLens

---

## 🎓 Best Practices

1. **Use pause** when doing maintenance
2. **Exclude temporarily** if a chat is too noisy
3. **Resume from last** to maintain complete history
4. **Resume from now** if you don't need the gap
5. **Monitor stats** to track system health

---

## 🔮 Coming Soon

- Database integration for message storage
- Analytics dashboard
- Export functionality
- Batch operations
- Advanced filtering
- DeepLens bucket migration tools

---

**Quick Start**: Just run `npm start` and open `http://localhost:3005`!


---

<a name='source-src-whatsapp-processor-message_grouping_system-md'></a>

# Documentation: src/whatsapp-processor/MESSAGE_GROUPING_SYSTEM.md
------------------------------

# Message Grouping System - Complete Guide ✅

## Overview
Comprehensive message grouping system with automatic grouping strategies, manual corrections, and per-conversation controls using Kafka for reliable, sequential processing.

---

## 🏗️ Architecture

### 1. Database Schema
- **`chats` Table**:
  - `enable_message_grouping` (BOOLEAN): Master toggle per conversation.
  - `grouping_config` (JSONB): Stores rules (strategy, thresholds).
- **`messages` Table**:
  - `group_id` (UUID): The assigned group identifier with semantic prefixes.
  - `processing_status`: Kafka queue status (pending, ready, queued, processing, processed, failed).

### 2. Grouping Strategies
- **Sticker Separator**:
  - A sticker message acts as a "break" between groups.
  - Messages before and after a sticker get different Group IDs.
  - Useful for: Product photos separated by a sticker.
- **Time Gap**:
  - If the time difference between consecutive messages > threshold, start a new group.
  - Default threshold: 300 seconds (5 minutes).
  - Useful for: distinct sessions of messages.

### 3. Semantic Group ID Prefixes
- `product_` - For image/video/photo messages (product catalogs)
- `sticker_` - For sticker messages
- `chat_` - For text messages and other types

### 4. Kafka-Based Processing
- Messages are processed sequentially per chat JID
- Prevents race conditions in grouping logic
- Reliable retry and error handling
- Rate-limited to prevent WhatsApp API throttling

### 5. Workflow
1. **Enable Grouping**:
   - Admin goes to Conversation Detail Page.
   - Clicks "Not Grouping" badge.
   - Configures strategy (Sticker or Time Gap).
   - Saved to DB.
2. **Processing**:
   - Message saved with `processing_status='pending'`
   - After media download: status → 'ready'
   - Kafka producer polls and sends to topic → status → 'queued'
   - Kafka consumer processes (applies grouping) → status → 'processed'
   - Grouping logic:
     - IF (Strategy == Sticker) AND (Prev or Current is Sticker) → **New Group**.
     - IF (Strategy == Time Gap) AND (Time Diff > Threshold) → **New Group**.
     - ELSE → **Join Previous Group**.

---

## 🛠️ Components

### Backend
- **DDL Scripts**: `001_chats.sql`, `002_messages.sql`
- **API**: 
  - `POST /:jid/message-grouping` - Toggle and configure grouping
  - `POST /:jid/messages/:messageId/split-group` - Split group at message
  - `POST /:jid/messages/:messageId/move-group` - Move message between groups
- **Queue**: `src/services/message-queue.service.ts` - Kafka-based processing
- **Logic**: `src/init-message-queue.ts` - Grouping algorithm

### Frontend
- **Conversation Service**: `toggleMessageGrouping` with config support
- **UI**: Configuration Dialog in `ConversationDetailPage.tsx`
  - Dropdown for Strategy
  - Input for Time Threshold
  - Preview of last N messages with grouping
- **Message List**: Visual group dividers and manual correction controls

---

## 🚀 Usage Guide

### 1. Enable & Configure Grouping
1. Navigate to **Admin > Conversations > [Chat]**.
2. Click the **"✗ Not Grouping"** badge.
3. Select **Grouping Strategy**:
   - *Sticker Separator*: Product shots → Sticker → Product shots.
   - *Time Gap*: 5 mins silence → New Group.
4. Adjust time threshold if using Time Gap (default: 300s).
5. Preview grouping with last 10/25/50/100 messages.
6. Click **"Enable Grouping"**.

### 2. Manual Corrections

#### Split Group
- **What it does**: Starts a new group from the selected message.
- **Use Case**: Two distinct products were grouped together by mistake.
- **Action**: Hover over the message where the new group should start, click **Split Group**.
- **Result**: The selected message and all subsequent messages in the same group get a new Group ID.

#### Boundary Correction (Move Group)
- **What it does**: Moves a message to the Previous or Next group.
- **Use Case**: A photo belonging to Product A was captured in interval of Product B.
- **Action**: Hover over the message, click **< Prev** or **Next >**.
- **Result**: The message joins the adjacent group.

### 3. Disable Grouping
1. Click **"✓ Grouping"** → Disables grouping.
2. Messages from this conversation will be skipped by the queue.

### 4. Verify Grouping
- Send messages matching the criteria.
- Check database:
  
*(Code block omitted for brevity)*

- Verify `group_id` changes correctly based on stickers or time gaps.

---

## 📊 Rate Limiting & Safety

To prevent WhatsApp API throttling and account blocking:

### Default Settings (Conservative)
- **Poll Interval**: 5 seconds between batch checks
- **Batch Size**: 10 messages per batch
- **Message Delay**: 500ms between processing each message
- **Max Throughput**: ~120 messages/minute

### Environment Variables

*(Code block omitted for brevity)*


### Duplicate Prevention
- System checks if media already exists before downloading
- Prevents re-downloading same files (saves bandwidth, reduces throttling)

---

## 🧪 Testing Checklist
- [x] Database columns added
- [x] Kafka integration complete
- [x] API accepts config
- [x] Frontend shows config dialog with preview
- [x] Queue implements Sticker strategy
- [x] Queue implements Time Gap strategy
- [x] Manual split/move corrections work
- [x] Rate limiting prevents throttling
- [x] Duplicate media downloads prevented
- [x] Semantic prefixes applied
- [x] Logs output grouping decisions

---

## 📁 Database Examples

### Get all conversations with grouping enabled:

*(Code block omitted for brevity)*


### Enable grouping for a specific conversation:

*(Code block omitted for brevity)*


### Count messages by group:

*(Code block omitted for brevity)*


### Check processing status:

*(Code block omitted for brevity)*


---

## 🎯 Ready for Production! 🚀

The complete message grouping system is production-ready with:
- ✅ Automatic grouping strategies
- ✅ Manual correction tools
- ✅ Kafka-based reliable processing
- ✅ Rate limiting for safety
- ✅ Duplicate prevention
- ✅ Comprehensive UI controls


---

<a name='source-src-whatsapp-processor-docs-admin_panel_guide-md'></a>

# Documentation: src/whatsapp-processor/docs/ADMIN_PANEL_GUIDE.md
------------------------------

# Admin Panel - Database Management Guide

## 🎛️ New Admin Features

You now have powerful admin tools to manage your WhatsApp database!

---

## 📊 Check Database Statistics

**Endpoint:** `GET /api/admin/stats`


*(Code block omitted for brevity)*


**Response:**

*(Code block omitted for brevity)*


---

## 🗑️ Reset Database (Clean Slate)

**Endpoint:** `POST /api/admin/reset-database`


*(Code block omitted for brevity)*


**What it does:**
- ✅ Deletes ALL chats
- ✅ Deletes ALL messages
- ✅ Deletes ALL sync state
- ✅ Gives you a fresh start

**Response:**

*(Code block omitted for brevity)*


**Logs you'll see:**

*(Code block omitted for brevity)*


---

## 🔄 Force Initial Sync

**Endpoint:** `POST /api/admin/force-initial-sync`


*(Code block omitted for brevity)*


**What it does:**
- ✅ Manually triggers the initial sync
- ✅ Fetches all groups from WhatsApp
- ✅ Syncs them to database
- ✅ Works even if database already has data

**Response:**

*(Code block omitted for brevity)*


**Logs you'll see:**

*(Code block omitted for brevity)*


---

## 🔄 Refresh Groups Cache

**Endpoint:** `POST /api/admin/refresh-groups`


*(Code block omitted for brevity)*


**What it does:**
- ✅ Re-fetches all groups from WhatsApp
- ✅ Updates database with latest metadata
- ✅ Refreshes in-memory cache

---

## 📋 View Sample Data

**Endpoint:** `GET /api/admin/sample-data`


*(Code block omitted for brevity)*


**Response:**

*(Code block omitted for brevity)*


---

## 🎯 Common Workflows

### Workflow 1: Fresh Start


*(Code block omitted for brevity)*


### Workflow 2: Check Current State


*(Code block omitted for brevity)*


### Workflow 3: Resync Groups


*(Code block omitted for brevity)*


---

## 📊 Enhanced Logging

### What You'll See in Logs

**On App Startup:**

*(Code block omitted for brevity)*


**If Database Already Has Data:**

*(Code block omitted for brevity)*


**On Reset:**

*(Code block omitted for brevity)*


---

## 🎨 Emoji Legend

| Emoji | Meaning               |
| ----- | --------------------- |
| 🔍     | Checking/Inspecting   |
| 📊     | Statistics/Data       |
| 🗄️     | Database Operation    |
| 📡     | Network/API Call      |
| 📥     | Receiving/Downloading |
| ✅     | Success               |
| ⚠️     | Warning               |
| ❌     | Error                 |
| 🗑️     | Deletion              |
| 🔄     | Refresh/Sync          |

---

## 🚀 Next Steps

1. **Test the endpoints** - Try resetting and syncing
2. **Watch the logs** - See exactly what's happening
3. **Check the frontend** - Navigate to Conversations → Groups
4. **Monitor stats** - Use the stats endpoint to track growth

All admin features are now available at `/api/admin/*`! 🎉


---

<a name='source-src-whatsapp-processor-docs-baileys_api_deep_dive-md'></a>

# Documentation: src/whatsapp-processor/docs/BAILEYS_API_DEEP_DIVE.md
------------------------------

# Baileys API Deep Dive: Chat Discovery & Message Handling

## Q1: Can we fetch ALL chats on first connection?

### What Baileys Actually Provides

**Available Methods:**

*(Code block omitted for brevity)*


### The Reality: How WhatsApp Web Works

**WhatsApp Web Client Behavior:**
1. **On first connection**: Receives a "chat list" from WhatsApp servers
2. **This includes**: All conversations (groups + individual chats)
3. **Baileys limitation**: This data is in the **message store**, not directly exposed

### Solution: Use Baileys' Store

Baileys has a **built-in store** that captures this data:


*(Code block omitted for brevity)*


**What we're missing:**
- We're NOT using the store currently
- That's why we can't fetch all chats upfront

---

## Q2: Message Edits - Are they captured?

### Current Implementation: ❌ NO

**The Problem:**

*(Code block omitted for brevity)*


### The Solution: Listen to `messages.update`


*(Code block omitted for brevity)*


**What needs to be added:**
1. Listen to `messages.update` event
2. Update existing message in DB (not insert new)
3. Track edit history (optional)

---

## Q3: What does "No getChats()" mean?

### The Confusion

**What I meant:**
- Baileys doesn't have a method called `sock.getChats()` that returns all chats
- I incorrectly assumed this in the code

**What actually exists:**
- Baileys has a **store** that contains chats
- You access it via `store.chats` (not `sock.getChats()`)

### How to Actually Get All Chats

**Option 1: Use the Store (Recommended)**

*(Code block omitted for brevity)*


**Option 2: Track via Events**

*(Code block omitted for brevity)*


**What we should do:**
1. Enable the store
2. Listen to `chats.set` event (fired on connection)
3. Save all chats to DB immediately

---

## Q4: What does "No loadMessages() - requires message store" mean?

### The Explanation

**What I meant:**
- There's no method like `sock.loadMessages(jid, count)` in Baileys
- To access message history, you need the **message store**

**How Message History Actually Works:**

**Without Store:**

*(Code block omitted for brevity)*


**With Store:**

*(Code block omitted for brevity)*


**The Catch:**
- Store only contains messages **received while connected**
- It doesn't fetch old messages from WhatsApp servers
- Old messages are only available if you persist the store

### How to Get Old Messages

**Option 1: Persist the Store**

*(Code block omitted for brevity)*


**Option 2: Use Message History API (Advanced)**

*(Code block omitted for brevity)*


---

## 🎯 What We Need to Fix

### 1. Enable Message Store ✅ HIGH PRIORITY


*(Code block omitted for brevity)*


**Benefits:**
- Access to ALL chats (groups + individual)
- Message history for active conversations
- Offline message queue

### 2. Listen to Chat Events ✅ HIGH PRIORITY


*(Code block omitted for brevity)*


### 3. Handle Message Edits ✅ MEDIUM PRIORITY


*(Code block omitted for brevity)*


### 4. Handle Message Reactions ✅ LOW PRIORITY


*(Code block omitted for brevity)*


---

## 📊 Comparison: Current vs. Should Be

| Feature                         | Current        | Should Be                             |
| ------------------------------- | -------------- | ------------------------------------- |
| **Groups on connect**           | ✅ Fetched      | ✅ Fetched                             |
| **Individual chats on connect** | ❌ Not fetched  | ✅ Should fetch via `chats.set`        |
| **Communities**                 | ❌ Not handled  | ✅ Should fetch                        |
| **Message edits**               | ❌ Not captured | ✅ Should handle via `messages.update` |
| **Message deletes**             | ❌ Not captured | ✅ Should handle via `messages.update` |
| **Message reactions**           | ❌ Not captured | ⏳ Optional                            |
| **Message store**               | ❌ Not enabled  | ✅ Should enable                       |
| **Store persistence**           | ❌ Not saved    | ✅ Should save to file                 |

---

## 🚀 Implementation Priority

### Phase 1: Critical (Do Now)
1. ✅ Enable message store
2. ✅ Listen to `chats.set` event
3. ✅ Persist store to file
4. ✅ Fetch all chats on connection

### Phase 2: Important (Do Soon)
5. ✅ Handle message edits (`messages.update`)
6. ✅ Handle message deletes
7. ✅ Fetch communities

### Phase 3: Nice to Have
8. ⏳ Handle reactions
9. ⏳ Handle status updates
10. ⏳ Handle presence (online/offline)

---

## 💡 Key Takeaways

1. **Baileys HAS the data** - it's in the store, not directly exposed
2. **We need to enable the store** - it's opt-in, not automatic
3. **Events are the key** - `chats.set`, `messages.update`, etc.
4. **Message edits ARE supported** - we just need to listen for them
5. **All chats CAN be fetched** - via `chats.set` event on connection


---

<a name='source-src-whatsapp-processor-docs-deep-sync-implementation-md'></a>

# Documentation: src/whatsapp-processor/docs/deep-sync-implementation.md
------------------------------

# Deep Sync Implementation Summary

## Overview
Implemented manual deep sync trigger with API endpoint and UI button, while disabling automatic historical message synchronization to prevent system overload.

## Changes Made

### 1. Backend Changes

#### Disabled Automatic Deep Sync (`whatsapp.service.ts`)
- **Commented out** `messaging-history.set` bulk message processing
- **Commented out** `history-sync.update` incremental sync listener
- Chat metadata and contacts still sync automatically
- Real-time messages continue to work normally

#### Added Deep Sync API Endpoint (`conversation.routes.ts`)
- **Endpoint**: `POST /api/conversations/:jid/sync-history`
- **Purpose**: Provides sync status information for a specific chat
- **Returns**:
  - `currentMessageCount`: Number of messages currently in database
  - `oldestMessage`: ISO timestamp of oldest message
  - `newestMessage`: ISO timestamp of newest message
  - `note`: Explanation that WhatsApp doesn't support on-demand history fetch

**Important Note**: WhatsApp (Baileys) does NOT provide an API to pull historical messages on demand. Historical messages are only available through:
1. Initial connection sync (which we've disabled)
2. Real-time messages as they arrive
3. WhatsApp's official export feature

### 2. Frontend Changes

#### New Service (`sync.service.ts`)
- Created `syncChatHistory()` function to call the API endpoint

#### Updated MessageList Component
- Added "Sync History" button next to "Exclude" button
- Shows loading spinner while checking sync status
- Displays toast notification with:
  - Current message count
  - Date range of messages
  - Explanation about sync limitations

### 3. UI Features

**Sync History Button**:
- Icon: Rotating arrow (ArrowSync20Regular)
- Location: Message list header
- Behavior: 
  - Disabled while syncing
  - Shows spinner during operation
  - Displays success toast with sync status

**Toast Messages**:
- Success: "Chat has X messages (date1 to date2)"
- Info: Explains WhatsApp API limitations
- Error: Shows if API call fails

## Current Behavior

### ✅ What Works
- Real-time message syncing (new messages are saved as they arrive)
- Chat list population (all conversations appear)
- Manual sync status check (shows what's currently in database)
- Pagination in UI (scroll up to load older messages from DB)

### ❌ What Doesn't Work
- Automatic historical message import on connection
- On-demand fetching of old messages from WhatsApp servers
- Background deep sync

## Alternative Solutions for Historical Messages

Since WhatsApp doesn't provide an API for on-demand history fetching, users can:

1. **Enable Full Sync on Initial Connection**:
   - Uncomment the `messaging-history.set` handler
   - This will import all available history when first connecting
   - Warning: Can be overwhelming for accounts with many chats

2. **Use WhatsApp's Export Feature**:
   - Export chat from WhatsApp mobile app
   - Import the exported file into DeepLens (requires implementation)

3. **Wait for Real-Time Sync**:
   - Keep DeepLens running continuously
   - Messages will accumulate over time as they arrive

## Testing

Test the sync status endpoint:

*(Code block omitted for brevity)*


Expected response:

*(Code block omitted for brevity)*


## Future Enhancements

1. **Selective Full Sync**: Add a toggle in admin UI to enable full sync for specific chats
2. **Import from Export**: Parse WhatsApp export files and import into database
3. **Sync Progress Tracking**: Show real-time progress during initial sync
4. **Batch Processing**: Process historical messages in smaller batches to reduce load


---

<a name='source-src-whatsapp-processor-docs-lid_implementation-md'></a>

# Documentation: src/whatsapp-processor/docs/LID_IMPLEMENTATION.md
------------------------------

# Baileys v7 LID Implementation Summary

## What We Implemented

### 1. **LID-Aware Message Processing**
- ✅ Accept both LID and PN (phone number) as primary identifiers
- ✅ Use `remoteJidAlt` and `participantAlt` for better display
- ✅ Store both primary and alternate IDs in metadata
- ✅ Prefer phone numbers for display when available

### 2. **LID Mapping Event Listener**

*(Code block omitted for brevity)*


### 3. **Enhanced Message Metadata**
Every message now stores:

*(Code block omitted for brevity)*


### 4. **Chat Metadata Enhancement**
Chats now store:
- `alt_jid` - Alternate identifier
- `display_jid` - Preferred identifier for display

## Key Design Decisions

### ✅ What We Did:
1. **Embrace LIDs as primary** - Store whatever WhatsApp gives us (LID or PN)
2. **Use Alt fields for display** - Show phone numbers when available
3. **Store both in metadata** - Keep all information for future use
4. **No forced conversion** - Don't try to convert LIDs to PNs

### ❌ What We Avoided:
1. **No separate LID table** - Our `jid` column works for both
2. **No PN restoration attempts** - LIDs are more reliable per Baileys docs
3. **No complex mapping logic** - Let Baileys handle it

## How It Works

### Message Flow:
1. **Receive message** with `msg.key.remoteJid` (can be LID or PN)
2. **Check for Alt fields** (`remoteJidAlt`, `participantAlt`)
3. **Prefer PN for display** if available via Alt fields
4. **Store primary ID** in database (LID or PN)
5. **Save Alt info** in metadata for reference

### Example:

*(Code block omitted for brevity)*


## Benefits

1. **Future-proof** - Works with WhatsApp's upcoming @username system
2. **Privacy-friendly** - Respects WhatsApp's LID privacy features
3. **Backward compatible** - Still works with phone numbers
4. **Better display** - Shows phone numbers when available
5. **Complete metadata** - All identifier info preserved

## Media Messages

**Yes, `messages.upsert` includes ALL message types:**
- ✅ Text messages
- ✅ Photos (`imageMessage`)
- ✅ Videos (`videoMessage`)
- ✅ Audio (`audioMessage`)
- ✅ Documents (`documentMessage`)
- ✅ Stickers (`stickerMessage`)
- ✅ And more...

Our code already handles all media types in the `processMessage` method.

## Next Steps (Optional)

If needed in the future:
1. Add UI to show both LID and PN
2. Implement LID → PN resolution using `sock.signalRepository.lidMapping`
3. Add database queries to search by either LID or PN
4. Create analytics on LID vs PN usage

## References

- [Baileys v7 Migration Guide](https://baileys.wiki/docs/migration/to-v7.0.0)
- [Baileys LID Documentation](https://baileys.wiki/docs/migration/to-v7.0.0#lids)


---

<a name='source-src-whatsapp-processor-scripts-ddl-readme-md'></a>

# Documentation: src/whatsapp-processor/scripts/ddl/README.md
------------------------------

# Database Scripts

This folder contains all DDL (Data Definition Language) scripts for the WhatsApp Processor database.

## Database Structure

### Database: `whatsapp_vayyari_data`

This is a standalone database dedicated to storing WhatsApp messages, chats, and media metadata.

### Separate from DeepLens Core

- **DeepLens Core DB** (`deeplens_vayyari_core`): Tenant metadata, feature extraction, etc.
- **WhatsApp Data DB** (`whatsapp_vayyari_data`): WhatsApp messages, chats, media

## DDL Scripts

All table definitions are in separate files for easy maintenance:

| File                          | Table                 | Description                        |
| ----------------------------- | --------------------- | ---------------------------------- |
| `001_chats.sql`               | `chats`               | WhatsApp chats and groups          |
| `002_messages.sql`            | `messages`            | All WhatsApp messages              |
| `003_chat_tracking_state.sql` | `chat_tracking_state` | Exclusion list and tracking state  |
| `004_processing_state.sql`    | `processing_state`    | Global pause/resume state          |
| `005_media_files.sql`         | `media_files`         | Media file metadata and MinIO URLs |

## Setup Instructions

### Option 1: Using Master Script (Recommended)


*(Code block omitted for brevity)*


### Option 2: Manual Execution

Execute each file in order:


*(Code block omitted for brevity)*


## Development Workflow

### During Development Phase

- **No migrations needed** - we're in active development
- **Update DDL files directly** - replace existing scripts with new schema
- **Keep files up-to-date** - always reflect current schema

### When Adding New Tables

1. Create new file: `00X_table_name.sql`
2. Add DDL with proper comments and indexes
3. Update `setup.sql` to include new file
4. Update this README

### When Modifying Existing Tables

1. Update the corresponding DDL file
2. Document changes in comments
3. For first-time deployment, just run updated DDL
4. No migration scripts needed during development

## Schema Overview

### Tables

#### 1. chats
Stores all WhatsApp chats (individual and group).

**Key Fields:**
- `jid` (PK): WhatsApp JID
- `name`: Chat/group name
- `is_group`: Boolean flag
- `metadata`: JSONB for additional data

#### 2. messages
Stores all WhatsApp messages with full-text search support.

**Key Fields:**
- `id` (PK): Auto-increment
- `message_id` (Unique): WhatsApp message ID
- `jid` (FK): Reference to chats
- `content`: Message text
- `media_url`: MinIO URL for media
- `timestamp`: Unix timestamp

**Features:**
- Full-text search on content
- Foreign key to chats
- Indexes on timestamp, sender, media type

#### 3. chat_tracking_state
Manages exclusion list and tracking state per chat.

**Key Fields:**
- `jid` (PK, FK): Reference to chats
- `is_excluded`: Exclusion flag
- `last_processed_message_id`: Resume point
- `resume_mode`: 'from_last' or 'from_now'

#### 4. processing_state
Singleton table for global pause/resume state.

**Key Fields:**
- `id` (PK): Always 1
- `is_paused`: Global pause flag
- `paused_at`, `resumed_at`: Timestamps

#### 5. media_files
Tracks all media files with MinIO and DeepLens URLs.

**Key Fields:**
- `id` (PK): Auto-increment
- `minio_url`: Current MinIO location
- `deeplens_url`: Future DeepLens location
- `message_id` (FK): Reference to messages
- `media_type`: photo, video, audio, document

**Features:**
- Supports migration to DeepLens bucket
- Tracks upload status
- JSONB metadata

## Indexes

All tables have appropriate indexes for:
- Primary keys
- Foreign keys
- Timestamp queries
- Search operations
- Filtering by status/type

## Foreign Keys

Proper referential integrity with cascade deletes:
- `messages.jid` → `chats.jid` (CASCADE)
- `chat_tracking_state.jid` → `chats.jid` (CASCADE)
- `media_files.jid` → `chats.jid` (CASCADE)
- `media_files.message_id` → `messages.message_id` (SET NULL)

## Future Enhancements

When moving to production:
- Add migration scripts (Flyway, Liquibase, or custom)
- Version control for schema changes
- Rollback procedures
- Data migration scripts

## Connection String

Set in `.env`:

*(Code block omitted for brevity)*


## Notes

- All DDL scripts use `IF NOT EXISTS` for idempotency
- Scripts can be run multiple times safely
- Comments included for all tables and columns
- JSONB used for flexible metadata storage
- Full-text search enabled on message content


---

<a name='source-src-whatsapp-processor-client-readme-md'></a>

# Documentation: src/whatsapp-processor/client/README.md
------------------------------

# WhatsApp Processor - React Client

Modern React-based UI for the DeepLens WhatsApp Processor.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Socket.IO Client** for real-time updates
- **qrcode.react** for QR code rendering

## Development


*(Code block omitted for brevity)*


## Features

- Real-time connection status updates via WebSocket
- QR code display for WhatsApp authentication
- Groups/Communities list with toggle tracking
- Responsive design with Tailwind CSS
- TypeScript for type safety

## Architecture

The client proxies API requests to the backend server running on port 3005:
- `/api/*` - REST API endpoints
- `/socket.io/*` - WebSocket connection

Production builds are output to `../public/dist` for serving by the Express backend.


---
