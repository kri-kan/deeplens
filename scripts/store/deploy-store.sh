#!/usr/bin/env bash
# =============================================================================
# DeepLens Store: Production-Grade Build & Deployment Orchestrator
# Builds .NET 9 Store.Api, runs DB migrations, builds PWA, and verifies stack.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "================================================================="
echo "🚀 DeepLens Store Platform: Deployment Orchestration"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "================================================================="

# Step 1: Run Database Migrations
echo "[Step 1/4] Running PostgreSQL Schema Migrations..."
bash "${SCRIPT_DIR}/migrate-db.sh"

# Step 2: Build .NET 9 Store.Api
echo "[Step 2/4] Building Store.Api Release Binaries..."
dotnet build "${ROOT_DIR}/src/services/Store.Api/Store.Api.csproj" -c Release

# Step 3: Launch PostHog Analytics Stack
echo "[Step 3/4] Ensuring Self-Hosted PostHog Stack is Active..."
bash "${SCRIPT_DIR}/start-posthog.sh"

# Step 4: Health & Telemetry Verification
echo "[Step 4/4] Performing Health Verification..."
bash "${SCRIPT_DIR}/health-check.sh"

echo "================================================================="
echo "🎉 DeepLens Store Platform Successfully Deployed & Verified!"
echo "• Store.Api: http://localhost:5050 (Swagger: /swagger)"
echo "• PostHog Analytics: http://localhost:8000"
echo "• PWA Dev Server: cd src/store && npm run dev"
echo "================================================================="
