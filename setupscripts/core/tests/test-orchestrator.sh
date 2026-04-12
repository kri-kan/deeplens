#!/bin/bash

# --- DeepLens Advanced Orchestrator Test Suite ---
# Validates configuration, networking, persistence, and service integrity.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ORCHESTRATOR="$ROOT_DIR/core/orchestrate-linux.sh"
DOTENV="$ROOT_DIR/.env"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}   DeepLens Infrastructure Stability Test Suite      ${NC}"
echo -e "${CYAN}====================================================${NC}"

# --- Helper Functions ---

log_test() {
    echo -n -e "Testing: $1... "
}

pass() {
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
    echo -e "${RED}FAIL${NC}"
    if [ ! -z "$1" ]; then echo -e "  Reason: $1"; fi
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

# --- 1. Environment & Configuration ---

log_test "Unified .env exists"
if [ -f "$DOTENV" ]; then pass; else fail ".env file missing"; fi

log_test "Credential variables are set"
if grep -q "INFRA_ADMIN_PASSWORD=" "$DOTENV"; then pass; else fail "INFRA_ADMIN_PASSWORD not found in .env"; fi

# --- 2. Network & Discovery ---

log_test "Docker Network 'deeplens-network' existence"
if docker network inspect deeplens-network >/dev/null 2>&1; then pass; else fail; fi

log_test "Internal Service Discovery (Grafana -> Prometheus)"
if docker exec grafana ping -c 1 prometheus >/dev/null 2>&1; then 
    pass
else 
    fail "Grafana cannot resolve 'prometheus' internally. Check network."
fi

# --- 3. Persistence & Mount Points ---

log_test "Host Path Persistence (/data/postgres)"
if [ -d "/data/postgres" ]; then pass; else fail "/data/postgres directory not found on host"; fi

log_test "Host Path Persistence (/data/minio)"
if [ -d "/data/minio" ]; then pass; else fail "/data/minio directory not found on host"; fi

# --- 4. Service Integrity ---

log_test "Environment Injection (InfluxDB Admin user)"
INIT_USER=$(docker inspect influxdb --format='{{range .Config.Env}}{{println .}}{{end}}' | grep DOCKER_INFLUXDB_INIT_USERNAME | cut -d'=' -f2)
if [ ! -z "$INIT_USER" ]; then pass; else fail "Environment variables not correctly injected from .env"; fi

log_test "Service health - Postgres"
if docker inspect -f '{{.State.Health.Status}}' krikanpg | grep -q "healthy"; then pass; else fail "Postgres healthcheck failing"; fi

log_test "Service health - MinIO"
if docker inspect -f '{{.State.Running}}' minio | grep -q "true"; then pass; else fail "MinIO container not running"; fi

# --- 5. Navigation & UI Exposure ---

log_test "Dashboard Availability (HTTP 200)"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200"; then pass; else fail "Gateway Landing Page unreachable"; fi

# --- Summary ---
echo -e "\n${CYAN}====================================================${NC}"
echo -e "${CYAN}Test Summary:${NC}"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo -e "${CYAN}====================================================${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}STRATEGY VALIDATED: Infrastructure is stable.${NC}"
    exit 0
else
    echo -e "${RED}STABILITY ALERT: Please check the failures above.${NC}"
    exit 1
fi
