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
