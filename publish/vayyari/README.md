# Vayyari Store Distribution

## 🛍️ Overview
This directory (`publish/vayyari/`) hosts the production Android APK binaries and web distribution for **Vayyari Store** (authentic Indian handlooms & artisan sarees).

## 📦 Android APK Binaries
- **Release APK**: `vayyari-store-latest.apk` (Optimized, minified release build for customer devices)
- **Debug APK**: `vayyari-store-debug-latest.apk` (Debuggable build with developer tools enabled)
- **Integrity**: SHA256 hashes are provided alongside each APK in `.sha256` files.

## 🚀 Build Commands
- Build Release & Debug APKs: `./scripts/store/build-store-apk.sh --both`
- Build Release APK: `./infrastructure/deploy.sh store-apk` or `make store-apk`
- Build Debug APK: `./infrastructure/deploy.sh store-apk-debug` or `make store-debug-apk`
- Build Web Bundle: `./scripts/store/publish-store.sh` or `make store-app`

## 📲 Installation
```bash
# Install latest release APK
adb install -r publish/vayyari/vayyari-store-latest.apk

# Install latest debug APK
adb install -r publish/vayyari/vayyari-store-debug-latest.apk
```
