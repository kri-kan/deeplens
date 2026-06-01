# DeepLens Complete Documentation Guide

**Auto-generated on:** 2026-06-01 20:56:23

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

---

## 🚀 Getting Started

### 🏁 [Quick Start (DEVELOPMENT.md)](DEVELOPMENT.md)
**The first stop for all developers.**
- Prerequisites & Local Setup (15 mins).
- Service Credentials & Port Reference.
- Basic Troubleshooting.

---

## 📚 Documentation Hub

We have organized all system documentation into a central hub to ensure clarity for developers and AI assistants.

### 👉 [**Explore the Documentation Center (docs/)**](docs/README.md)

*   🏗️ **Architecture**: [System Overview](docs/architecture/system-overview.md), [Multi-Tenancy](docs/architecture/multi-tenancy.md)
*   🔧 **Technical**: [Codebase](docs/technical/codebase-overview.md), [API Reference](docs/technical/codebase-overview.md#api-reference), [Database](docs/technical/database-standards.md)
*   🎬 **Media**: [Video Processing](docs/technical/VIDEO_PROCESSING.md), [FFmpeg Setup](docs/guides/ffmpeg-setup.md)
*   🔒 **Security**: [RBAC & Tokens](docs/technical/SECURITY.md)
*   📊 **Observability**: [Monitoring](docs/technical/OBSERVABILITY.md), [Kafka Topics](docs/technical/KAFKA_TOPICS.md)

---

## 🎯 **Key Features**

- **🔍 Advanced Visual Search** - Vector-based similarity matching for images and videos.
- **🎬 Video Processing** - Automated thumbnail and GIF preview generation.
- **🏢 Multi-Tenant Architecture** - Complete tenant isolation with partitioned resources.
- **⚡ High Performance** - Optimized with Redis caching and Qdrant vector database.
- **📊 Full Observability** - Complete monitoring with the LGTM stack.
- **🔒 Enterprise Security** - OAuth 2.0/OpenID Connect with Duende IdentityServer.

---

## 🤝 **Contributing**

1. Read the [DEVELOPMENT.md](DEVELOPMENT.md) and [Codebase Overview](docs/technical/codebase-overview.md).
2. Follow the [Architecture Decision Records](docs/architecture/adr/).
3. Fork the repository and create a feature branch.

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
2.  **Infrastructure**: 
    
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
| **PostgreSQL**     | `postgres`             | `Krikank1$`          | `192.168.0.170:5432`|
| **Identity Admin** | `admin@deeplens.local` | `Krikank1$` | Initial Admin       |
| **MinIO**          | `krikan`               | `Krikank1$`          | Port 9001 (Console) |
| **Grafana**        | `admin`                | `DeepLens123!`       | Port 3000           |
| **Ollama WebUI**   | `kriishnakanth@GMAIL.COM` | `krikank1$`     | `192.168.0.170:11435` |
| **Kafka UI**       | -                      | -                    | `192.168.0.170:8080`|

---

## 🔌 Port Reference

### Core Services
| Port     | Service    | Description            |
| :------- | :--------- | :--------------------- |
| **5432** (remote) | PostgreSQL | Metadata & Identity DB — `192.168.0.170` |
| **6379** (remote) | Redis      | Caching & State — `192.168.0.170`        |
| **6333** (remote) | Qdrant     | Vector DB Dashboard — `192.168.0.170`   |
| **9001** (remote) | MinIO      | Object Storage Console — `192.168.0.170`|
| **9092** (remote) | Kafka      | Message Broker — `192.168.0.170`         |
| **8080** (remote) | Kafka UI   | Kafka Management — `192.168.0.170`       |

### DeepLens APIs
| Port     | Service      | Description                 |
| :------- | :----------- | :-------------------------- |
| **5198** | Identity API | Auth & Tenant Orchestration |
| **5000** | Search API   | Image Upload & Search       |
| **5001** | Web UI       | React Frontend              |
| **8001** | Feature Ext. | Python AI Microservice      |
| **8006** | Competitor Orchestrator | Meta Graph API sync & competitor intel |

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
- **Solution**: Open `src/DeepLens.Service/DeepLens.sln` in VS 2022 or VS Code.
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

1.  **Port Conflicts**: Run `Get-NetTCPConnection -LocalPort <Port>` to find blockers.
2.  **Container Failures**: Check logs using `bash setupscripts/core/orchestrate-linux.sh logs <service-name>`.
3.  **Database Errors**: Ensure `.env` infrastructure host points to `192.168.0.170`.
4.  **Identity API Not Starting**: Check that PostgreSQL is accessible on `192.168.0.170:5432`.

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

## 🌐 Networking & CORS

DeepLens is designed to be accessible across an intranet. Key settings in `src/NextGen.Identity/NextGen.Identity.Api/appsettings.json`:

- **`Cors:AllowAnyIntranetOrigin`**: Set to `true` to automatically allow any request from a local network (10.*, 192.168.*, 172.16-31.*, and localhost).
- **`Cors:AllowedOrigins`**: Array of explicit URLs to allow if they don't fall into the intranet IP ranges.

---

## 📖 Documentation Index
- [**ARCHITECTURE.md**](ARCHITECTURE.md) - High-level design & ADRs.
- [**infrastructure/README.md**](infrastructure/README.md) - Deep dive into container setup.
- [**infrastructure/TENANT-GUIDE.md**](infrastructure/TENANT-GUIDE.md) - How to provision new clients.
- [**docs/SECURITY.md**](docs/SECURITY.md) - Auth & RBAC details.


---

<a name='source-infrastructure-readme-md'></a>

# Documentation: infrastructure/README.md
------------------------------

# DeepLens Infrastructure (External Managed)

This directory contains scripts for provisioning tenants and managing application-level services that leverage the centralized infrastructure at `192.168.0.170`.

## 🏗️ External Infrastructure

The following services are managed externally and utilized by DeepLens:

| Service         | Endpoint                    | Default Credentials     |
| --------------- | --------------------------- | ----------------------- |
| PostgreSQL      | `192.168.0.170:5432`        | `postgres` / `Krikank1$` |
| MinIO (API)     | `http://192.168.0.170:9000` | `krikan` / `Krikank1$`   |
| MinIO Console   | `http://192.168.0.170:9001` | `krikan` / `Krikank1$`   |
| Kafka           | `192.168.0.170:9092`        | None                    |
| Redis           | `192.168.0.170:6379`        | None                    |
| InfluxDB        | `http://192.168.0.170:8086` | `krikan` / `Krikank1$`   |
| Grafana         | `http://192.168.0.170:3000` | `krikan` / `Krikank1$`   |
| Qdrant Dash     | `http://192.168.0.170:6333` | None                    |

## 🚀 Application Services (Local)

While the core infrastructure is external, the specialized DeepLens application services (AI/ML) run locally via Docker:


*(Code block omitted for brevity)*


| Service              | Port   | Purpose                      |
| -------------------- | ------ | ---------------------------- |
| Reasoning API        | `8002` | Phi-3 Metadata Extraction    |
| Feature Extraction   | `8001` | Image/Video Vectorization    |
| Instagram Worker     | -      | Competitor Data Ingestion    |
| WhatsApp Processor   | `3000` | Multi-tenant Messaging Service|

### Build and Deploy Scripts

The `deploy.sh` script automates building and deploying local containerized application code (like the .NET APIs and the Node.js WhatsApp Processor) directly to their respective `/data/hosting` volumes, then restarting their Docker compose services.


*(Code block omitted for brevity)*


For parameterized multi-service deployment, you can use the suite build scripts located in `setupscripts/application/services/`:

*(Code block omitted for brevity)*


## 🏢 Tenant Management

The architecture uses a centralized infrastructure but isolates tenants via prefix-isolated databases and dedicated buckets.

### Provisioning a Tenant


*(Code block omitted for brevity)*


This script will:
1. Create a tenant metadata database on the remote PostgreSQL.
2. Initialize tenant-specific buckets in the remote MinIO.
3. Start a local Qdrant container for vector isolation (optional).
4. Bootstrap initial admin credentials in the Identity service.

### Initializing Baseline Data


*(Code block omitted for brevity)*


This script initializes the core schemas (Identity, Metadata) on the remote PostgreSQL instance using baseline SQL scripts and the CLI tool.

## ⚙️ Configuration

Environment variables are managed via `infrastructure/.env`. See `infrastructure/.env.example` for the required structure.

> [!IMPORTANT]
> Ensure the machine running these scripts has network visibility to `192.168.0.170`.


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
- **Express** - Web server with OOP Controller-Repository pattern (`AdminController`, `ConversationController`, `ManagementController` delegating database and Baileys actions through dedicated services and PostgreSQL repositories)
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

The WhatsApp Processor assumes the PostgreSQL database and its schema are managed externally (e.g., via the main DeepLens `setupscripts`). 

The schema is managed externally in the root `setupscripts/` directory.

To apply or refresh the schema, use the centralized bootstrap script:

*(Code block omitted for brevity)*


**Important:** The database runs on port **5432** at **192.168.0.170** (Remote Server).

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

### Building and Deploying with DeepLens Scripts

The WhatsApp Processor is fully integrated into the DeepLens unified build and deployment pipeline. The deployment process automatically builds the frontend/backend and handles dependency installation on the hosting directory.

- **Single Service Deploy:** Use the `deploy.sh` script to build and deploy just this service.
  
*(Code block omitted for brevity)*

- **Full Suite Deploy:** Use the `build-and-deploy.sh` (Linux) or `build-and-deploy.ps1` (Windows) scripts. You can deploy it alongside other services selectively.
  
*(Code block omitted for brevity)*


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


### 1. Initialize Infrastructure

*(Code block omitted for brevity)*

> [!NOTE]
> This script automatically initializes all databases on the remote server (`192.168.0.170`) using verified Golden Copy backups.

### 3. Configure Environment
Copy `.env.example` to `.env` (if not already done):

*(Code block omitted for brevity)*


The default configuration should work with DeepLens infrastructure.

### 4. Start Application

*(Code block omitted for brevity)*


---

## Database Configuration

### Connection Details

| Setting      | Value                  |
| :----------- | :--------------------- |
| **Host**     | `192.168.0.170`        |
| **Port**     | `5432`                 |
| **Username** | `postgres`             |
| **Password** | `Krikank1$`            |

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


2. Verify port in `.env` is `5432` (remote) or the appropriate port for your server.

3. Restart containers if needed:
   
*(Code block omitted for brevity)*


### Issue: "database does not exist"

**Cause:** Database hasn't been created yet.

**Solution:**
Recreate the database using the centralized orchestration scripts:

*(Code block omitted for brevity)*


3. Connection Errors
- Ensure the remote server `192.168.0.170` is reachable.
- Verify the password `Krikank1$` is correct.
- Use port `5432` for all connections.

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
2. Right-click "Servers" -> "Register" -> "Server"
3. **General Tab:**
   - Name: `DeepLens Remote`
4. **Connection Tab:**
   - Host: `192.168.0.170`
   - Port: `5432`
   - Username: `postgres`
   - Password: `Krikank1$`
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
1. Set up the database using `powershell ./infrastructure/scripts/lifecycle/init-bootstrap-data.ps1`
2. Start the application with the correct database connection string

---

## See Also

- [Main DeepLens Troubleshooting Guide](../../TROUBLESHOOTING_SUMMARY.md)
- [Infrastructure Setup Script](../../infrastructure/setup-deeplens-dev.ps1)
- [Database Schema](../../setupscripts/application/whatsapp/whatsapp_vayyari_data.sql)


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
