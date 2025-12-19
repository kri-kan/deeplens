# DeepLens Development Guide

**The ultimate reference for setting up, developing, and troubleshooting the DeepLens ecosystem.**

Last Updated: December 20, 2025

---

## 🚀 Quick Start (15 Minutes)

1.  **Prerequisites**: Install Podman/Docker, .NET 9 SDK, Python 3.11+, and PowerShell 7+.
2.  **Environment**: 
    ```powershell
    cd infrastructure
    cp .env.example .env
    ./setup-infrastructure.ps1 -Start
    ```
3.  **Identity API**:
    ```powershell
    cd src/NextGen.Identity.Api
    $env:ASPNETCORE_ENVIRONMENT="Development"
    dotnet run --urls "http://localhost:5198"
    ```
4.  **Verification**: 
    ```powershell
    podman ps  # Ensure Postgres, Redis, Qdrant are running
    ```

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
    ```powershell
    cd src/DeepLens.FeatureExtractionService
    python -m venv venv
    ./venv/Scripts/Activate.ps1
    pip install -r requirements.txt
    ```

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

## 📖 Documentation Index
- [**ARCHITECTURE.md**](ARCHITECTURE.md) - High-level design & ADRs.
- [**infrastructure/README.md**](infrastructure/README.md) - Deep dive into container setup.
- [**infrastructure/TENANT-GUIDE.md**](infrastructure/TENANT-GUIDE.md) - How to provision new clients.
- [**docs/SECURITY.md**](docs/SECURITY.md) - Auth & RBAC details.
