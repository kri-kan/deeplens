#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=== DeepLens Store Container & Binary Release Builder ==="

echo "1. Publishing Store.Api Stateless Binary..."
dotnet publish "${ROOT_DIR}/src/services/Store.Api/Store.Api.csproj" \
  -c Release \
  -o "${ROOT_DIR}/publish/Store.Api" \
  --no-restore

echo "2. Store.Api binary published to ${ROOT_DIR}/publish/Store.Api"
echo "To deploy to live hosting:"
echo "  mkdir -p /data/hosting/Store.Api"
echo "  cp -r ${ROOT_DIR}/publish/Store.Api/* /data/hosting/Store.Api/"
echo "  docker compose restart store-api 2>/dev/null || true"
