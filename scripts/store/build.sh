#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORE_DIR="$(cd "${SCRIPT_DIR}/../../src/apps/store" && pwd)"

echo "=== Building DeepLens Store Web Bundle ==="
cd "${STORE_DIR}"

npx expo export -p web

echo "Store web bundle exported successfully to ${STORE_DIR}/dist"
