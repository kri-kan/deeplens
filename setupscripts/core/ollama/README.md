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
OLLAMA_MODELS="llama3,mistral" docker compose up -d
```
 
## Notes
 
- **GPU Support**: Configured for RX 580 (Vulkan).
- **Shared Network**: Attaches to the `deeplens-network`.

## Credentials

- **URL**: [http://192.168.0.170:11435](http://192.168.0.170:11435)
- **Email**: `kriishnakanth@GMAIL.COM`
- **Password**: `krikank1$`
