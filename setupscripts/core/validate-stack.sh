#!/usr/bin/env bash
# validate-stack.sh
# Validates core infrastructure & observability stack (Docker containers, ports, OTEL pipeline)

set -euo pipefail

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

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

FAILED_CHECKS=0

echo "=================================================="
echo "      DeepLens Stack Validation & Health Check     "
echo "=================================================="

# 1. Check Docker Daemon
log_info "1. Checking Docker Daemon..."
if docker info >/dev/null 2>&1; then
    log_success "Docker daemon is running."
else
    log_error "Docker daemon is not running or current user lacks permissions."
    exit 1
fi

# 2. Check Docker Container Health
log_info "2. Checking Observability Stack Containers..."

CONTAINERS=("otel-collector" "prometheus" "jaeger" "grafana")

for c in "${CONTAINERS[@]}"; do
    CID=$(docker ps --filter "name=${c}" --format "{{.ID}} {{.Names}} {{.Status}}" | head -n 1)
    if [ -n "$CID" ]; then
        log_success "Container matching '$c' is running: $CID"
    else
        log_warn "Container matching '$c' was not found in 'docker ps'."
        ((FAILED_CHECKS++))
    fi
done

# 3. Check Port Readiness
log_info "3. Verifying Port Readiness..."

check_port() {
    local name="$1"
    local host="$2"
    local port="$3"

    if timeout 2 bash -c "</dev/tcp/${host}/${port}" 2>/dev/null; then
        log_success "Port $port ($name) is READY on $host."
    else
        log_error "Port $port ($name) on $host is NOT responding."
        ((FAILED_CHECKS++))
    fi
}

check_port "OTEL Collector OTLP gRPC" "127.0.0.1" 4317
check_port "OTEL Collector OTLP HTTP" "127.0.0.1" 4318
check_port "Prometheus Metrics Server" "127.0.0.1" 9090
check_port "Grafana Dashboard UI" "127.0.0.1" 3000
check_port "Jaeger Tracing UI" "127.0.0.1" 16686

# 4. OTEL & Observability Pipeline Validation
log_info "4. Validating Observability Pipeline Endpoints..."

# Check OTEL HTTP receiver /v1/traces POST ingestion
OTEL_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:4318/v1/traces -H "Content-Type: application/json" -d "{}" || echo "000")
if [ "$OTEL_HTTP_CODE" -eq 200 ]; then
    log_success "OTEL Pipeline (Port 4318 /v1/traces OTLP ingestion) is operational (HTTP $OTEL_HTTP_CODE)."
else
    log_error "OTEL Pipeline OTLP ingestion test failed (HTTP status: $OTEL_HTTP_CODE)."
    ((FAILED_CHECKS++))
fi

# Check Prometheus health endpoint
PROM_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9090/-/healthy || echo "000")
if [ "$PROM_HTTP_CODE" -eq 200 ]; then
    log_success "Prometheus health check passed (HTTP $PROM_HTTP_CODE)."
else
    log_error "Prometheus health check failed (HTTP status: $PROM_HTTP_CODE)."
    ((FAILED_CHECKS++))
fi

# Check Grafana health endpoint
GRAF_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health || echo "000")
if [ "$GRAF_HTTP_CODE" -eq 200 ]; then
    log_success "Grafana API health check passed (HTTP $GRAF_HTTP_CODE)."
else
    log_error "Grafana API health check failed (HTTP status: $GRAF_HTTP_CODE)."
    ((FAILED_CHECKS++))
fi

# Check Jaeger UI endpoint
JAEGER_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:16686/api/services || echo "000")
if [ "$JAEGER_HTTP_CODE" -eq 200 ]; then
    log_success "Jaeger API health check passed (HTTP $JAEGER_HTTP_CODE)."
else
    log_error "Jaeger API health check failed (HTTP status: $JAEGER_HTTP_CODE)."
    ((FAILED_CHECKS++))
fi

echo "=================================================="
if [ "$FAILED_CHECKS" -eq 0 ]; then
    log_success "ALL OBSERVABILITY & STACK VALIDATION CHECKS PASSED!"
    exit 0
else
    log_error "$FAILED_CHECKS validation check(s) failed."
    exit 1
fi
