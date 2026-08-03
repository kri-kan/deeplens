#!/usr/bin/env bash
# deploy-observability.sh
# Script to launch the DeepLens observability stack using docker-compose.observability.yml,
# verify service startup, and execute stack validation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ANSI Color Codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

echo "=================================================="
echo "   Deploying DeepLens Observability Stack         "
echo "=================================================="

# Locate docker-compose.observability.yml
COMPOSE_FILE=""
if [ -f "$SCRIPT_DIR/observability/docker-compose.observability.yml" ]; then
    COMPOSE_FILE="$SCRIPT_DIR/observability/docker-compose.observability.yml"
elif [ -f "$SCRIPT_DIR/docker-compose.observability.yml" ]; then
    COMPOSE_FILE="$SCRIPT_DIR/docker-compose.observability.yml"
elif [ -f "$PROJECT_ROOT/infrastructure/observability/docker-compose.observability.yml" ]; then
    COMPOSE_FILE="$PROJECT_ROOT/infrastructure/observability/docker-compose.observability.yml"
else
    log_error "Could not locate docker-compose.observability.yml"
    exit 1
fi

log_info "Using Compose File: $COMPOSE_FILE"

# Determine Docker Compose command
DOCKER_COMPOSE_CMD=""
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    log_error "Neither 'docker compose' nor 'docker-compose' is available."
    exit 1
fi

log_info "Launching Observability Stack containers..."
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" up -d

log_info "Verifying service startup & health..."
# Polling loop for port readiness (up to 30 seconds)
MAX_WAIT=30
ELAPSED=0
READY=false

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if timeout 1 bash -c "</dev/tcp/127.0.0.1/4318" 2>/dev/null && \
       timeout 1 bash -c "</dev/tcp/127.0.0.1/9090" 2>/dev/null && \
       timeout 1 bash -c "</dev/tcp/127.0.0.1/3000" 2>/dev/null && \
       timeout 1 bash -c "</dev/tcp/127.0.0.1/16686" 2>/dev/null; then
        READY=true
        break
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

if [ "$READY" = true ]; then
    log_success "Services started and ports are responding."
else
    log_error "Timed out waiting for observability ports to become available."
    exit 1
fi

# Run stack validation script
VALIDATION_SCRIPT="$PROJECT_ROOT/setupscripts/core/validate-stack.sh"
if [ -f "$VALIDATION_SCRIPT" ]; then
    log_info "Executing Stack Validation Script..."
    bash "$VALIDATION_SCRIPT"
else
    log_error "Validation script not found at $VALIDATION_SCRIPT"
    exit 1
fi

log_success "Observability stack successfully deployed and verified!"
