# Vayyari Admin App (React Native / Expo Bare Workflow)

**Vayyari Admin** is the administrative mobile and web client for DeepLens and Vayyari Fashions, providing high-performance product browsing, WhatsApp catalog curation, order fulfillment, store curation, and vector-similarity visual search.

---

## 🏗️ Architecture & Stack

- **Framework**: React Native 0.86+ / Expo SDK 57 (**Bare Workflow**).
- **Native Project**: Direct Android Gradle configuration under `android/`.
- **Navigation**: `expo-router` v3 (file-system routing in `app/`).
- **UI Engine**: `react-native-paper` (Material Design 3) with dynamic Emerald / Emerald Nocturne themes.
- **State & Auth**: `context/AuthContext.tsx` with `AsyncStorage` session persistence and automatic 401 interception.
- **Media Engine**: Singleton `expo-video` player with HTTP 206 partial content streaming.
- **Telemetry**: Lazy-loaded OpenTelemetry tracing via `@opentelemetry/api`.

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Live Expo Bundler (Interactive / tmux)
The dev server is managed as a systemd service (`vayyari-expo.service`) in a `tmux` session on boot:
```bash
# Attach to live session
tmux attach -t expo
```
> **Note**: Detach using `Ctrl+B` then `D`. Do not use `Ctrl+C`.

To run manually:
```bash
npx expo start --android
```

---

## 🔨 Standalone Android APK Build Pipeline

Universal Android APKs (supporting ARM64 devices and x86_64 emulators) are built using [`build-apk.sh`](file:///home/krikan/productivity/deeplens/src/vayyari/build-apk.sh):

```bash
# Build Universal Release APK
make admin-apk
# OR: ./infrastructure/deploy.sh admin-apk
# OR: ./build-apk.sh release --arch universal

# Build Universal Debug APK (with developer tools & LogBox)
make admin-debug-apk
# OR: ./infrastructure/deploy.sh admin-apk-debug
# OR: ./build-apk.sh debug --arch universal

# Build Both sequentially
make admin-apk-both
# OR: ./infrastructure/deploy.sh admin-apk-both
# OR: ./build-apk.sh both
```

### Build Notes:
- **Universal Architecture**: `-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64` ensures zero DSO linker crashes in x86_64 AVD emulators and native arm64-v8a devices.
- **AAPT2 Flag**: Bypasses AAPT2 failures on JPEG images stored with `.png` extensions.
- **Output**: Built APKs are saved directly to `publish/admin-app/`:
  - `vayyari-admin-latest.apk` (Universal Release, 111 MB)
  - `vayyari-admin-v1.0.0-*.apk` (Versioned Release)
  - `vayyari-admin-debug-latest.apk` (Universal Debug, 243 MB)
- **Retention**: Retains the **newest 3 versioned APKs** automatically.

---

## 🔄 Self-Hosted OTA Updates (MinIO + Nginx)

The app features a 100% self-hosted Over-The-Air update system:

```bash
# Publish Admin OTA bundle
make push-admin-ota
# OR: ./infrastructure/deploy.sh admin-ota
# OR: ./push-update.sh --notes "Release description"
```

1. **Expo Export**: Compiles Hermes bytecode (`.hbc`) and hashed assets into `dist/`.
2. **Monotonic Subversioning**: Automatically calculates `<baseVersion>.<commitCount>[-dirty]` from git (e.g., `1.0.0.181`).
3. **MinIO Upload**: Uploads bundle and assets to `local/admin-updates/bundles/<subversion>/`.
4. **Manifest**: Uploads `manifest.json` with SHA-256 and MD5 checksums, bundle size, and release notes.
5. **Gateway Routing**: Proxied publicly via `http://<HOST>/admin-updates/manifest.json`.
6. **Automatic Git Hook**: Non-native changes committed under `src/vayyari/` automatically push an OTA bundle in the background (bypass with `SKIP_OTA=1 git commit`).
7. **Runtime Loading**: `MainApplication.kt` detects `ota/active/bundle.js` and dynamically loads the update on boot. Client checks for updates via `useOTAUpdate()` in `app/_layout.tsx`.

---

## 📚 Related Documentation
- `publish/admin-app/README.md` — Distribution and installation instructions
- `src/vayyari/SKILL.md` — Developer patterns and coding conventions
- `docs/architecture/vayyari-mobile-architecture.md` — Detailed architectural design
- `DEVELOPMENT.md` — Monorepo development guide

