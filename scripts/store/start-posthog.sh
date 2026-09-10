#!/usr/bin/env bash
# =============================================================================
# DeepLens Store: Launch Self-Hosted PostHog Analytics Stack
# Launches PostHog, Redis 7.0, and Postgres 15 on port 8000.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infrastructure/observability/docker-compose.posthog.yml"

echo "================================================================="
echo "📊 Launching DeepLens Self-Hosted PostHog Analytics Stack"
echo "Compose File: ${COMPOSE_FILE}"
echo "================================================================="

# Ensure observability-net exists
if ! docker network ls | grep -q "observability-net"; then
  echo "Creating Docker network 'observability-net'..."
  docker network create observability-net
fi

echo "Starting PostHog containers..."
docker compose -f "${COMPOSE_FILE}" up -d

echo "Waiting for PostHog web service on port 8000..."
max_retries=30
count=0
until curl -s -I http://localhost:8000/health &> /dev/null || curl -s -I http://localhost:8000/ &> /dev/null || [ $count -ge $max_retries ]; do
  sleep 2
  count=$((count+1))
  echo -n "."
done

echo ""
if [ $count -ge $max_retries ]; then
  echo "⚠️ PostHog is starting in background. Check status with: docker compose -f ${COMPOSE_FILE} ps"
else
  echo "✅ PostHog Analytics UI is live at http://localhost:8000"
fi

echo "================================================================="
echo "🎉 PostHog Stack Ready!"
echo "================================================================="
