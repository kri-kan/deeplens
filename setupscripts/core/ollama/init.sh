#!/bin/bash
set -e

# Start Ollama server in the background
ollama serve &
SERVER_PID=$!

# Wait for Ollama to be ready
echo "Waiting for Ollama to start..."
until ollama list > /dev/null 2>&1; do
  sleep 2
done

# Determine which models to pull
MODEL_LIST=${OLLAMA_MODELS:-phi4-mini:latest}

echo "Ollama is ready. Pulling models: $MODEL_LIST"
IFS=',' read -r -a MODELS <<< "$MODEL_LIST"
for model in "${MODELS[@]}"; do
  model=$(echo "$model" | xargs)
  if [ -n "$model" ]; then
    echo "Pulling model: $model"
    ollama pull "$model"
  fi
done

echo "Model pulling complete. Ollama is running."

echo "Initializing OpenClaw..."
ollama launch openclaw --yes --model phi4-mini:latest &
# Wait for OpenClaw to install and generate config
sleep 15
if [ -f /root/.openclaw/openclaw.json ]; then
  # Ensure it binds to 0.0.0.0 instead of 127.0.0.1
  sed -i 's/"bind": "loopback"/"bind": "lan"/' /root/.openclaw/openclaw.json
  # Restart the gateway to pick up the LAN binding change
  openclaw gateway stop || true
  sleep 3
  openclaw gateway &
fi

# Wait for the Ollama server process to exit
wait $SERVER_PID