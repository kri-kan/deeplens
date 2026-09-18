#!/usr/bin/env bash
# =============================================================================
# DeepLens Vayyari Store: Production Build & Publish Pipeline
# Exports Expo Web & PWA bundle directly to publish/vayyari/
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STORE_DIR="${ROOT_DIR}/src/store"
PUBLISH_DIR="${ROOT_DIR}/publish/vayyari/web"

echo "================================================================="
echo "🛍️  Vayyari Store: Web & PWA Production Release Publisher"
echo "Target: ${PUBLISH_DIR}"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "================================================================="

# Step 1: Ensure dependencies are installed
cd "${STORE_DIR}"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing store dependencies..."
    npm install
fi

# Step 2: Ensure publish directory exists
mkdir -p "${PUBLISH_DIR}"

# Step 3: Export Web/PWA distribution
echo "🚀 Exporting Expo Web bundle..."
npx expo export -p web --output-dir "${PUBLISH_DIR}"

# Step 4: Add/Update README for the store publish folder
cat << 'EOF' > "${PUBLISH_DIR}/README.md"
# Vayyari Store Web & PWA Distribution

## 🛍️ Overview
This directory (`publish/vayyari/`) hosts the production Web & PWA distribution for **Vayyari Store** (authentic Indian handlooms & artisan sarees).

## 🚀 Build & Deploy
- Source: `src/store/`
- Build Script: `./scripts/store/publish-store.sh` or `./infrastructure/deploy.sh store-app`
- Gateway URL: `http://store.vayyarifashions.com` (proxied via Nginx)

## 📁 Artifacts
- `index.html`: Web entrypoint
- `_expo/static/js/web/`: Bundled JavaScript modules
- `metadata.json`: PWA metadata and manifest
EOF

echo "================================================================="
echo "✅ Vayyari Store successfully exported and published to ${PUBLISH_DIR}"
echo "================================================================="
