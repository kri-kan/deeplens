# Vayyari Mobile App (React Native / Expo Bare Workflow)

**Vayyari** is the mobile client for DeepLens, providing high-performance product browsing, WhatsApp catalog curation, and vector-similarity visual search.

---

## 🏗️ Architecture & Stack

- **Framework**: React Native 0.76+ / Expo SDK 54 (**Bare Workflow**).
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

Standalone release APKs are compiled locally without cloud build dependencies:

```bash
# From workspace root
make build-vayyari-apk
# OR
./infrastructure/deploy.sh vayyari-apk
```

### Direct Gradle Command
```bash
cd android
./gradlew assembleRelease \
  -x lint \
  -x lintVitalAnalyzeRelease \
  -Pandroid.enablePngCrunchInReleaseBuilds=false
```

### Build Notes:
- **AAPT2 Flag**: `-Pandroid.enablePngCrunchInReleaseBuilds=false` bypasses AAPT2 failures on JPEG images stored with `.png` extensions.
- **Output**: Built APK is saved to `/home/krikan/productivity/deeplens/publish/vayyari/`:
  - `vayyari-latest.apk` (current release)
  - `vayyari-v1.0.0-YYYYMMDD.apk` (versioned build)
- **Retention**: Keeps the **newest 3 versioned APKs** automatically.

---

## 🔄 Self-Hosted OTA Updates (MinIO + Nginx)

JavaScript bundles and assets can be exported and mirrored to MinIO:

```bash
./push-update.sh --notes "Release description"
```

1. **Expo Export**: Runs `npx expo export --platform android` to emit Hermes bytecode (`.hbc`) and assets in `dist/`.
2. **MinIO Mirror**: Uses `mc` to upload the bundle to bucket `vayyari-updates` at `bundles/vYYYYMMDDHHMM/`.
3. **Manifest**: Uploads latest `manifest.json` referencing bundle and asset URLs.
4. **Pruning**: MinIO retains the **3 most recent bundle versions**.
5. **Gateway URL**: Accessible publicly via `http://krikanserver.taild227d9.ts.net/vayyari-updates/manifest.json`.
6. **Protocol Deferral**: Runtime `expo-updates` is disabled in `app.json`. Delivery is managed via standalone APKs while MinIO serves as the artifact archive.

---

## 📚 Related Documentation
- `publish/vayyari/README.md` — Distribution and installation instructions
- `src/vayyari/SKILL.md` — Developer patterns and coding conventions
- `docs/architecture/vayyari-mobile-architecture.md` — Detailed architectural design
- `DEVELOPMENT.md` — Monorepo development guide

