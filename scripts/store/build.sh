#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORE_DIR="$(cd "${SCRIPT_DIR}/../../src/store" && pwd)"

echo "=== Building Vayyari Store Web & PWA Bundle ==="
cd "${STORE_DIR}"

npx expo export -p web

echo "Store web & PWA bundle exported successfully to ${STORE_DIR}/dist"
