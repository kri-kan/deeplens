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
MODEL_LIST=${OLLAMA_MODELS:-llama3}

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

# Wait for the Ollama server process to exit
wait $SERVER_PID