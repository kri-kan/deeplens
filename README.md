# DeepLens - Image Similarity Search Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![.NET 8](https://img.shields.io/badge/.NET-8.0-purple.svg)](https://dotnet.microsoft.com/)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docs.docker.com/compose/)

**DeepLens** is a high-performance, multi-tenant image similarity search engine built with modern .NET and Python technologies. It provides fast, accurate image matching using state-of-the-art vector databases and AI/ML models.

## 🎯 **Key Features**

- **🔍 Advanced Image Search** - Vector-based similarity matching with multiple AI models
- **🏢 Multi-Tenant Architecture** - Complete tenant isolation with BYOS (Bring Your Own Storage)
- **⚡ High Performance** - Optimized for speed with Redis caching and vector databases
- **📊 Full Observability** - Complete monitoring with Prometheus, Grafana, Jaeger, and Loki
- **🔒 Enterprise Security** - OAuth 2.0/OpenID Connect with Duende IdentityServer
- **☁️ Cloud Native** - Docker containers with Kubernetes support
- **🔄 Flexible Storage** - Support for Azure Blob, AWS S3, Google Cloud, MinIO, and NFS

## 🧭 **Quick Navigation**

### 👋 New to DeepLens?

**Start here in this order:**

1. Read this README for project overview
2. Check [handover.md](handover.md) - Current system state & quick start
3. Review [CREDENTIALS.md](CREDENTIALS.md) - Get access to all services
4. Browse [DOCS_INDEX.md](DOCS_INDEX.md) - Complete documentation map

### 🔧 Want to Develop?

1. [infrastructure/README.md](infrastructure/README.md) - Set up local environment
2. [src/README.md](src/README.md) - Understand codebase structure
3. [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - Development workflow

### 🐛 Troubleshooting?

1. [PORTS.md](PORTS.md) - Port conflicts and service mappings
2. [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md) - Auth issues
3. [CREDENTIALS.md](CREDENTIALS.md) - Login problems
4. [infrastructure/README.md](infrastructure/README.md#troubleshooting) - Container issues

### 📚 Deep Dive?

- **Architecture:** [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) + [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md)
- **Authentication:** [docs/TOKEN_LIFECYCLE.md](docs/TOKEN_LIFECYCLE.md) + [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md)
- **Multi-Tenancy:** [docs/STORAGE_ARCHITECTURE.md](docs/STORAGE_ARCHITECTURE.md) + [infrastructure/README-TENANT-MANAGEMENT.md](infrastructure/README-TENANT-MANAGEMENT.md)
- **Monitoring:** [OBSERVABILITY_PLAN.md](OBSERVABILITY_PLAN.md)

---

## 🏗️ **Architecture Overview**

DeepLens uses an **asynchronous event-driven microservices architecture** with:

- **.NET Core Services** - API Gateway, Search APIs, Admin services, WorkerService for background processing
- **Python AI Services** - Stateless feature extraction and similarity matching
- **Vector Database** - Qdrant for fast similarity search with multi-tenant isolation
- **Event Streaming** - Apache Kafka with SAGA Choreography for async image processing
- **Multi-Database Strategy** - PostgreSQL for metadata, Redis for caching, InfluxDB for metrics
- **Complete Observability** - OpenTelemetry, Prometheus, Grafana, Loki stack

### Performance Highlights

- **< 700ms** image upload response (6-9x faster than synchronous processing)
- **Async Processing Pipeline** for feature extraction and vector storage
- **Multi-tenant isolation** at every architectural layer

## 🚀 **Quick Start**

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or [Podman](https://podman.io/)
- [PowerShell 7+](https://github.com/PowerShell/PowerShell) (recommended)
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (for development)
- [Python 3.11+](https://www.python.org/downloads/) (for AI services)

### 1. Clone & Setup

```bash
git clone https://github.com/your-org/deeplens.git
cd deeplens
```

### 2. Start Infrastructure

```powershell
# Start complete environment (infrastructure + monitoring)
cd infrastructure
./setup-containers.ps1 -StartComplete

# Alternative: Infrastructure only
./setup-infrastructure.ps1 -Start
```

### 3. Verify Services

```powershell
# Check all service health
./setup-containers.ps1 -Status

# Or use PowerShell module
Import-Module ./DeepLensInfrastructure.psm1
Test-DeepLensServices
```

### 4. Access Dashboards

| Service              | URL                             | Credentials           |
| -------------------- | ------------------------------- | --------------------- |
| **Grafana**          | http://localhost:3000           | admin/DeepLens123!    |
| **Prometheus**       | http://localhost:9090           | -                     |
| **Jaeger Tracing**   | http://localhost:16686          | -                     |
| **Qdrant Dashboard** | http://localhost:6333/dashboard | -                     |
| **Kafka UI**         | http://localhost:8080           | -                     |
| **Portainer**        | http://localhost:9443           | Create on first visit |

## 📁 **Project Structure**

```
deeplens/
├── � Core Documentation
│   ├── README.md                           # This file
│   ├── PROJECT_PLAN.md                     # Project roadmap
│   ├── ARCHITECTURE_DECISIONS.md           # ADR with key decisions
│   ├── DEVELOPMENT_PLAN.md                 # Development workflow
│   └── OBSERVABILITY_PLAN.md               # Monitoring strategy
├── 🔵 src/                                 # .NET Core microservices
│   ├── DeepLens.sln                        # Main solution
│   ├── DeepLens.ApiGateway/                # YARP-based API Gateway
│   ├── DeepLens.SearchApi/                 # Image search & upload APIs
│   ├── DeepLens.AdminApi/                  # Administration & collection management
│   ├── DeepLens.WorkerService/             # Background Kafka consumers
│   ├── DeepLens.FeatureExtractionService/  # Python FastAPI ML service
│   └── NextGen.Identity.*/                 # Duende IdentityServer
├── � infrastructure/                      # Docker & infrastructure
│   ├── docker-compose.infrastructure.yml   # Core services (Kafka, Qdrant, etc.)
│   ├── docker-compose.monitoring.yml       # Observability stack
│   └── setup-infrastructure.ps1            # Windows setup script
├── 📖 docs/                                # Detailed documentation
│   ├── working-notes/                      # Session notes & explorations
│   └── *.md                                # Architecture & implementation docs
│   ├── config/                   # Service configurations
│   └── powershell/               # Management scripts
├── 📊 monitoring/                # Observability configurations
├── 🚀 deployment/                # Kubernetes & cloud deployment
└── 📚 docs/                      # Documentation
```

## 🛠️ **Development Setup**

### .NET Services

```bash
cd dotnet-services
dotnet restore
dotnet build
dotnet run --project DeepLens.ApiGateway
```

### Python AI Services

```bash
cd python-services/feature-extraction
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8001
```

### Database Migrations

```bash
# Apply PostgreSQL migrations
cd dotnet-services/DeepLens.Core
dotnet ef database update
```

## 🔧 **Configuration**

### Environment Variables

Copy and customize the environment file:

```bash
cd infrastructure
cp .env.example .env
# Edit .env with your configuration
```

### Multi-Tenant Setup

```powershell
# Import tenant management module
Import-Module ./infrastructure/powershell/DeepLensTenantManager.psm1

# Create a new tenant
New-DeepLensTenant -Name "acme-corp" -Domain "acme.com" -PlanType "premium"

# Configure BYOS (Bring Your Own Storage)
# Supports Azure Blob, AWS S3, Google Cloud, MinIO, NFS
```

## 📊 **Monitoring & Observability**

DeepLens includes a comprehensive observability stack:

- **📈 Metrics** - Prometheus with 30-day retention
- **📋 Logs** - Loki with structured logging and 30-day retention
- **🔍 Tracing** - Jaeger with OpenTelemetry integration
- **📊 Dashboards** - Grafana with pre-built dashboards
- **🚨 Alerting** - AlertManager with email/Slack notifications
- **🐳 Container Monitoring** - cAdvisor + Portainer for complete visibility

### Access Monitoring

```powershell
# Open all monitoring dashboards
Import-Module ./infrastructure/DeepLensInfrastructure.psm1
Start-DeepLensComplete

# Individual dashboards
Open-GrafanaUI      # http://localhost:3000
Open-PrometheusUI   # http://localhost:9090
Open-JaegerUI       # http://localhost:16686
```

## 🔒 **Security**

- **Authentication** - OAuth 2.0/OpenID Connect with Duende IdentityServer
- **Authorization** - Role-based access control (RBAC)
- **Secret Management** - Infisical self-hosted secret vault
- **Data Encryption** - TLS for all communications, encrypted storage
- **Multi-Tenancy** - Complete tenant isolation and Row Level Security (RLS)

## ☁️ **Deployment**

### Docker Compose (Development)

```bash
# Complete environment
docker-compose -f infrastructure/docker-compose.infrastructure.yml up -d
docker-compose -f infrastructure/docker-compose.monitoring.yml up -d
```

### Kubernetes (Production)

```bash
cd deployment/kubernetes
kubectl apply -f base/
kubectl apply -k overlays/production/
```

### Cloud Platforms

- **Azure** - Container Apps, AKS, Azure Database for PostgreSQL
- **AWS** - ECS, EKS, RDS, S3
- **Google Cloud** - GKE, Cloud SQL, Cloud Storage
- **Multi-Cloud** - Portable across all major cloud providers

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📖 **Documentation**

**📚 [Complete Documentation Index](DOCS_INDEX.md)** - Your guide to all DeepLens documentation

### Quick Links

- [🚀 Getting Started](handover.md) - Current state and quick start
- [🔑 Credentials](CREDENTIALS.md) - All development credentials in one place
- [🔌 Port Reference](PORTS.md) - Service ports and conflict resolution
- [🏗️ Architecture](ARCHITECTURE_DECISIONS.md) - Key design decisions
- [💻 Code Structure](src/README.md) - Complete codebase guide
- [🐳 Infrastructure](infrastructure/README.md) - Docker setup and service configuration
- [🔐 OAuth Testing](docs/OAUTH_TESTING_GUIDE.md) - Complete authentication test suite
- [📊 Observability](OBSERVABILITY_PLAN.md) - Monitoring and alerting strategy

## 🆘 **Support**

- **Issues** - [GitHub Issues](https://github.com/your-org/deeplens/issues)
- **Discussions** - [GitHub Discussions](https://github.com/your-org/deeplens/discussions)
- **Email** - support@deeplens.local
- **Documentation** - [Internal Wiki](http://wiki.deeplens.local)

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Qdrant** - High-performance vector database
- **OpenTelemetry** - Observability instrumentation
- **Duende IdentityServer** - Enterprise identity and access management
- **Docker** - Containerization platform
- **Prometheus & Grafana** - Monitoring and visualization

---

**Made with ❤️ by the DeepLens Team**
