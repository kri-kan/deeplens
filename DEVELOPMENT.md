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

## OpenClaw Integration

DeepLens uses **OpenClaw** integrated directly into the local `ollama-gpu` container to provide an AI Assistant interface and API endpoint. The integration runs natively on this VM without relying on any external cloud server for hosting. 

### Accessing OpenClaw
OpenClaw is automatically configured and started when the `ollama-gpu` container starts. 
- **Dashboard URL**: `http://<VM_IP>:18789`
- **Data Persistence**: OpenClaw configurations are stored persistently in the `data/openclaw` volume.

### Configuring Google Gemini as the LLM Provider
OpenClaw natively supports Google Gemini as a cloud provider. To configure Gemini:
1. Ensure your `.env` file (or environment variables) contains `GEMINI_API_KEY`. The `docker-compose.yaml` automatically passes this to OpenClaw. Alternatively, you can inject it directly using: `docker exec ollama-gpu npx openclaw config set env.GEMINI_API_KEY YOUR_KEY`
2. Open the OpenClaw Dashboard in your browser (`http://<VM_IP>:18789`).
3. Make sure the Google plugin is enabled. You may need to add it to the allowlist: `docker exec ollama-gpu npx openclaw config set plugins.allow "[\"google\"]" --json` and enable it: `docker exec ollama-gpu npx openclaw plugins enable google`.
4. Select a Gemini model (e.g., `google/gemini-2.5-flash`) as your primary model in the chat UI.

For more details on managing the container, see `setupscripts/core/ollama/docker-compose.yaml`.

## Vayyari Mobile App Development
The Vayyari Expo packager (`npx expo start --android`) runs continuously in the background on system boot. It is managed by a systemd user service (`vayyari-expo.service`) and runs inside a **`tmux`** session to allow interactive access.

### Accessing the Interactive Console
To view the live Expo logs, restart the bundler, or open the debugger (press `j`), attach to the background tmux session:
```bash
tmux attach -t expo
```
**Important:** When you are done, DO NOT press `Ctrl+C` as this will kill the server. Instead, detach from the session by pressing **`Ctrl+B`**, followed by **`D`**.

### Remote Access (Tailscale)
Since the host machine is on Tailscale, you can always connect to the Expo app from your mobile device using the server's Tailscale IP address (e.g., `exp://100.x.y.z:8081`). This works seamlessly whether you are at home or traveling, without needing to change any URLs.
