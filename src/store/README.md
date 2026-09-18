# 🛍️ Vayyari Store Mobile & Web Application

The customer-facing e-commerce application for **Vayyari** (authentic Indian handlooms & artisan sarees) in the DeepLens platform.

---

## 🚀 Technology Stack

- **Framework**: Expo SDK 57 (Bare Workflow)
- **Runtime**: React Native 0.86.3, React 19.2.3
- **Engine**: Hermes JavaScript Engine (with Hermes bytecode precompilation)
- **UI & Styling**: Tamagui 2.7+, `@gorhom/bottom-sheet` v5, `react-native-reanimated` 4.5+
- **Routing**: Expo Router v4 (file-based navigation under `src/app`)
- **Package Name**: `com.vayyari.store`

---

## 🛠️ Local Development

### Installation & Pre-requisites
```bash
cd src/store
npm install
# postinstall automatically sets up Hermes compiler symlink:
# node_modules/react-native/sdks/hermesc -> ../../hermes-compiler/hermesc
```

### Running Development Server
```bash
# Start Expo Metro Bundler
npx expo start

# Run on Android Emulator or Connected Device
npx expo run:android

# Run Web Preview
npx expo start --web
```

---

## 📦 Android APK Compilation & Publishing

APK builds are managed via the centralized pipeline script in `scripts/store/build-store-apk.sh` and output to `publish/vayyari/`.

### Commands

```bash
# Build Release APK (Minified, production-ready)
make store-apk
# or: ./infrastructure/deploy.sh store-apk
# or: ./scripts/store/build-store-apk.sh --release

# Build Debug APK (Developer tools, LogBox, Hermes debugger enabled)
make store-debug-apk
# or: ./infrastructure/deploy.sh store-apk-debug
# or: ./scripts/store/build-store-apk.sh --debug

# Build Both Release & Debug APKs sequentially
make store-apk-both
# or: ./infrastructure/deploy.sh store-apk-both
# or: ./scripts/store/build-store-apk.sh --both
```

### Script CLI Options (`scripts/store/build-store-apk.sh`)
- `--release`: Compiles Release APK (`vayyari-store-latest.apk`, ~34MB)
- `--debug`: Compiles Debug APK (`vayyari-store-debug-latest.apk`, ~64MB)
- `--both`: Compiles both variants
- `--arch <arm64|universal|x86_64>`: Target CPU architecture (default: `arm64`)
- `--keep <N>`: Retain latest N historical versions (default: `3`)
- `--clean`: Runs `./gradlew clean` before build
- `--install[=variant]`: Installs output APK directly to device via ADB

---

## 📂 Publishing Directory (`publish/vayyari/`)

Generated binaries and checksums are placed into `publish/vayyari/`:
- `vayyari-store-latest.apk` & `.sha256`
- `vayyari-store-v1.0.0-*.apk` & `.sha256`
- `vayyari-store-debug-latest.apk` & `.sha256`
- `vayyari-store-debug-v1.0.0-*.apk` & `.sha256`
- Web / PWA bundles generated via `./scripts/store/publish-store.sh`

### Installation via ADB
```bash
adb install -r publish/vayyari/vayyari-store-latest.apk
adb install -r publish/vayyari/vayyari-store-debug-latest.apk
```

---

## 🔄 Self-Hosted OTA Updates (MinIO + Nginx)

The Store app features a 100% self-hosted Over-The-Air update system:

```bash
# Publish Store OTA bundle
make push-store-ota
# OR: ./infrastructure/deploy.sh store-ota
# OR: ./scripts/store/push-store-update.sh --notes "Release description"
```

### How It Works:
1. **Expo Hermes Export**: `push-store-update.sh` compiles Android Hermes bytecode (`.hbc`) using `npx expo export --platform android`.
2. **Monotonic Subversioning**: Dynamically computes `<baseVersion>.<commitCount>[-dirty]` from git commits affecting `src/store/` (e.g., `1.0.0.11`).
3. **MinIO Upload**: Uploads bundle and assets to MinIO bucket `store-updates` at `bundles/<subversion>/`.
4. **Manifest**: Uploads `manifest.json` with SHA-256 and MD5 checksums, bundle size, and release notes.
5. **Gateway Routing**: Proxied publicly via `http://<HOST>/store-updates/manifest.json`.
6. **Automatic Git Hook**: Non-native changes committed under `src/store/` automatically push an OTA bundle in the background (bypass with `SKIP_OTA=1 git commit`).
7. **Runtime Loading**: `MainApplication.kt` detects `ota/active/bundle.js` and dynamically loads the update on boot. Client checks for updates via `checkAndApplyStoreOTAUpdate()` in `App.tsx`.

