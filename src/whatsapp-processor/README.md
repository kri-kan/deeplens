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

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Build

```bash
# Build frontend
cd client
npm run build
cd ..

# Build backend
npm run build
```

Or use the combined command:
```bash
npm run build:all
```

### 3. Setup Database

The WhatsApp Processor assumes the PostgreSQL database and its schema are managed externally (e.g., via the main DeepLens `setupscripts`). 

The schema is managed externally in the root `setupscripts/` directory.

To apply or refresh the schema, use the centralized bootstrap script:
```powershell
powershell ./infrastructure/scripts/lifecycle/init-bootstrap-data.ps1
```

**Important:** The database runs on port **5432** at **192.168.0.170** (Remote Server).

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed database configuration and troubleshooting.

### 4. Configure

Copy the example environment file and edit with your values:

```bash
cp .env.example .env
```

Edit `.env` with your tenant-specific configuration:
- `TENANT_NAME` - Your tenant name (e.g., "Vayyari")
- `MINIO_BUCKET` - Your tenant's MinIO bucket (format: `tenant-<uuid>`)
- `DB_CONNECTION_STRING` - Your tenant's PostgreSQL database

### 5. Run

```bash
npm start
```

Access the UI at: **http://localhost:3005**

## 📁 Project Structure

```
whatsapp-processor/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Header.tsx
│   │   │   ├── QRSection.tsx
│   │   │   ├── GroupsSection.tsx
│   │   │   └── GroupItem.tsx
│   │   ├── App.tsx           # Main app component
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Global styles
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── src/                       # Backend
│   └── index.ts              # Express + Socket.IO + Baileys
├── public/
│   └── dist/                 # React build output (served by backend)
├── data/                      # Session data (gitignored)
│   ├── <session-id>/         # WhatsApp credentials
│   └── config/
│       └── whitelist.json    # Tracked groups
├── .env                       # Environment config (gitignored)
├── .env.example              # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Development

### Backend Development

```bash
npm run dev
```

Runs the backend with ts-node for hot reload on **port 3005**.

### Frontend Development

```bash
cd client
npm run dev
```

Runs Vite dev server on **port 3006** with:
- Hot module replacement
- Proxy to backend API (port 3005)
- Fast refresh

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
npm run dev:client
```

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

```env
# Session
SESSION_ID=community_alpha          # Unique session identifier
TENANT_NAME=Vayyari                 # Tenant name

# Storage
DATA_DIR=./data                     # Local data directory
MINIO_ENDPOINT=localhost            # MinIO host
MINIO_PORT=9000                     # MinIO port
MINIO_ACCESS_KEY=minioadmin         # MinIO access key
MINIO_SECRET_KEY=minioadmin         # MinIO secret key
MINIO_BUCKET=whatsapp-data          # Tenant bucket name

# Database
DB_CONNECTION_STRING=postgresql://postgres:password@localhost:5432/tenant_name_metadata

# Server
REDIS_DB=1                          # Redis Database Index (0-15)
API_PORT=3005                       # Server port
LOG_LEVEL=info                      # Logging level
SYNC_NEWSLETTERS=false              # Enable WhatsApp Channels (true/false)
```

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
  ```bash
  ./infrastructure/deploy.sh whatsapp-processor
  ```
- **Full Suite Deploy:** Use the `build-and-deploy.sh` (Linux) or `build-and-deploy.ps1` (Windows) scripts. You can deploy it alongside other services selectively.
  ```bash
  # Deploy WhatsApp Processor and Search API only
  ./setupscripts/application/services/build-and-deploy.sh whatsapp-processor search-api
  ```

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
```bash
cd client && npm run build
```

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
