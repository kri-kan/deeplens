#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=== DeepLens Store Container & Binary Release Builder ==="

echo "1. Publishing Store.Api Stateless Binary..."
dotnet publish "${ROOT_DIR}/src/services/Store.Api/Store.Api.csproj" \
  -c Release \
  -o "${ROOT_DIR}/publish/store-api" \
  --no-restore

echo "2. Packaging Standalone Production Container Image..."
VERSION="${1:-latest}"
docker build -t "deeplens-store-api:${VERSION}" -f "${ROOT_DIR}/src/services/Store.Api/Dockerfile" "${ROOT_DIR}/src/services/Store.Api/"
echo "✅ Packaged image created: deeplens-store-api:${VERSION}"
