# Ollama Service
 
This folder contains the Docker Compose setup for running Ollama with GPU support and the Open WebUI.
 
## Files

- `docker-compose.yaml` - Primary orchestration file for Ollama and WebUI.
- `init.sh` - Container startup script to pull initial models.
- `CONTEXT_AND_METRICS_GUIDE.md` - Guide for managing context windows, calculating KV cache sizes, and monitoring model execution metrics.
- `MODEL_USAGE_GUIDELINES.md` - Performance recommendations, parameter tuning presets, and model selection guidelines for Gemma 3, Phi-4, and Qwen 3.5.
 
## Running the Setup
 
From this folder, use:
 
```bash
docker compose up -d
```
 
The Open WebUI will be available at `http://192.168.0.170:11435`.
 
## Model Configuration
 
The `init.sh` script pulls models automatically. To pull specific models, set the `OLLAMA_MODELS` environment variable:
 
```bash
OLLAMA_MODELS="phi4-mini:latest,mistral" docker compose up -d
```
 
## Notes
 
- **GPU Support**: Configured for RX 580 (Vulkan).
- **Shared Network**: Attaches to the `deeplens-network`.

## Credentials

- **URL**: [http://192.168.0.170:11435](http://192.168.0.170:11435)
- **Email**: `kriishnakanth@GMAIL.COM`
- **Password**: `krikank1$`

## OpenClaw AI Gateway

OpenClaw automatically installs alongside Ollama and exposes its UI on port `18789`.
- **URL**: [http://192.168.0.170:18789](http://192.168.0.170:18789)

### Authentication
On your very first setup, OpenClaw will require a Gateway Token to secure the connection. To retrieve it or generate a new one, run this from your host machine:

```bash
# Retrieve a quick dashboard login link
docker exec -it ollama-gpu npx openclaw dashboard --no-open

# Or manually generate a new token
docker exec -it ollama-gpu npx openclaw doctor --generate-gateway-token
```
*(Note: Because the configuration directory is mounted persistently, you only need to authenticate once. It will survive machine reboots and container restarts.)*

### UI-Based Provider & Plugin Setup
OpenClaw is highly extensible. While you can configure it via the CLI, using the web UI is the most intuitive approach for new developers:

1. **Install Plugins (e.g., Groq, Web Search):** 
   - Navigate to **Settings > Plugins** in the OpenClaw Dashboard.
   - Use the **Store / Install** feature to search for plugins (e.g., `@openclaw/groq-provider`) and install them directly from the browser.
2. **Configure API Keys (e.g., GROQ_API_KEY):**
   - Navigate to **Settings > Configuration**.
   - Under **Environment Variables** or **Secrets**, add your API keys (e.g., `GROQ_API_KEY`) and save. 
3. **Set Default Models:**
   - Navigate to **Settings > Agents / Defaults**.
   - Select your preferred model (e.g., `groq/llama-3.3-70b-versatile`) from the **Primary Model** dropdown and save.

All configurations set via the UI are instantly saved to the persistent `openclaw.json` config file.

### Connecting the Android Companion App (Tailscale)
When connecting the OpenClaw Android Companion app to a remote gateway via Tailscale (CGNAT bypass), you must follow a specific pairing process to prevent the app from hanging during node compatibility checks.

#### 1. Expose Gateway securely via Tailscale
Ensure `tailscale serve` is forwarding traffic to the gateway port securely:
```bash
sudo tailscale serve --bg 18789
```

#### 2. Trust the Tailscale Proxy
Tailscale passes proxy headers which the gateway blocks by default. You must configure the gateway to trust the proxy IP (usually localhost `127.0.0.1` when using `tailscale serve`):
```bash
# Enter your ollama-gpu container
docker exec -it ollama-gpu bash

# Open /root/.openclaw/openclaw.json and add:
# {
#   "gateway": {
#     "trustedProxies": ["127.0.0.1/32"]
#   }
# }
```
Restart the container (`docker restart ollama-gpu`) after saving.

#### 3. Generate a Node Setup Code
Do **NOT** use the master gateway token (`gateway.auth.token`) as the setup code, as this registers the phone as an Operator (admin) instead of a Node, breaking the Android app's required capabilities handshake.

Instead, generate a specific Node Setup Code targeting your Tailscale URL:
```bash
docker exec ollama-gpu openclaw qr --url wss://<your-tailscale-domain>.ts.net --setup-code-only
```

#### 4. Connect and Approve
1. In the Android App's "Connect" tab, paste the Base64 Setup Code you just generated.
2. Ensure **TLS** is enabled.
3. Tap **Connect**.
4. The app will say "node approval pending". Immediately run the following on your host machine to approve the node request:
```bash
# Find the pending request ID
docker exec ollama-gpu openclaw nodes pending

# Approve it
docker exec ollama-gpu openclaw nodes approve <request_id>
```

If the connection times out while approving, simply force close the Android app, reopen it, and hit Connect again—the app will instantly connect since the node is now permanently paired.
