# DeepLens Development Guide

## Deployment

Whenever building, publishing, or deploying any of the DeepLens backend services or the WhatsApp processor, you **MUST** use the provided deployment scripts. Do not manually run `dotnet publish` or restart Docker containers independently.

### Using the Makefile

The root `Makefile` exposes the following commands for easy discoverability:
- `make deploy-identity-api`
- `make deploy-search-api`
- `make deploy-worker-service`
- `make deploy-whatsapp-processor`
- `make deploy-reasoning-api`

### Using the deploy script directly

You can also run the deployment script directly:
```bash
./infrastructure/deploy.sh [service-name]
```

### Why use these scripts?

The deployment script (`infrastructure/deploy.sh`) automates:
1. Building/publishing the project (`dotnet publish`, `npm run build:all`, or copying Python source files for `reasoning-api`).
2. Copying binaries/files to the correct bind-mounted hosting path (e.g. `/data/hosting/*`).
3. Restarting the appropriate Docker container via `docker compose`.

This ensures critical configuration files (like `appsettings.json` or model dependencies) located in the hosting paths are preserved and not accidentally overwritten during deployments. For Python services like `reasoning-api`, the bind-mounted host volume ensures local updates are immediately reflected and uvicorn hot-reloads the changes when the container restarts.
