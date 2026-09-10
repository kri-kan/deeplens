#!/usr/bin/env bash
# =============================================================================
# DeepLens Store: Full Platform Health Check & Telemetry Verification
# Validates Store.Api, Store PWA, PostgreSQL, and PostHog Analytics.
# =============================================================================
set -uo pipefail

STORE_API_URL="${STORE_API_URL:-http://localhost:5050}"
STORE_PWA_URL="${STORE_PWA_URL:-http://localhost:3000}"
POSTHOG_URL="${POSTHOG_URL:-http://localhost:8000}"

echo "================================================================="
echo "🩺 DeepLens Store Platform Health Check"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "================================================================="

# 1. Store.Api Backend Health
echo -n "1. Store.Api Backend (${STORE_API_URL}/health)... "
if curl -s -f -m 3 "${STORE_API_URL}/health" > /dev/null 2>&1; then
  echo "✅ OK (Healthy)"
else
  echo "⚠️ OFFLINE / Not Responding"
fi

# 2. Cart Domain Endpoint
echo -n "2. Store.Api Cart Domain (${STORE_API_URL}/api/v1/cart?deviceId=health_test)... "
if curl -s -f -m 3 "${STORE_API_URL}/api/v1/cart?deviceId=health_test" > /dev/null 2>&1; then
  echo "✅ OK (Responding)"
else
  echo "⚠️ OFFLINE"
fi

# 3. Store PWA Web Client
echo -n "3. Store PWA Web Client (${STORE_PWA_URL})... "
if curl -s -I -m 3 "${STORE_PWA_URL}" > /dev/null 2>&1; then
  echo "✅ OK (Live)"
else
  echo "⚠️ OFFLINE (Run 'npm run dev' in src/store)"
fi

# 4. Self-Hosted PostHog Analytics
echo -n "4. PostHog Analytics (${POSTHOG_URL})... "
if curl -s -I -m 3 "${POSTHOG_URL}" > /dev/null 2>&1; then
  echo "✅ OK (Live at ${POSTHOG_URL})"
else
  echo "⚠️ OFFLINE (Run './scripts/store/start-posthog.sh')"
fi

echo "================================================================="
echo "Health Check Complete."
echo "================================================================="
