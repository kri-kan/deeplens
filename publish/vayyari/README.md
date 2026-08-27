# Vayyari Android APK Distribution & OTA Architecture

## 📱 Overview
Vayyari is the mobile application frontend for the DeepLens visual search platform. This directory (`publish/vayyari/`) serves as the local release distribution point and historical archive for standalone Android APK builds.

---

## 📦 Latest Release
- **Latest Symlink / Primary File**: `vayyari-latest.apk`
- **Current Versioned Build**: `vayyari-v1.0.0-20260828.apk`
- **App Version**: `1.0.0`
- **Build Type**: Release (`assembleRelease`)
- **Package Name**: `com.anonymous.vayyari`
- **Target Platform**: Android (Bare React Native / Expo SDK 54)
- **APK Size**: ~125MB

---

## 🚀 Installation & Sideloading

### Option 1: ADB Install (Developer / USB / WiFi)
```bash
adb install publish/vayyari/vayyari-latest.apk
```
Or for reinstall/update:
```bash
adb install -r publish/vayyari/vayyari-latest.apk
```

### Option 2: Sideload via Tailscale Network
1. Ensure your Android device is connected to the Tailscale mesh network.
2. Download the APK directly from the server or file share:
   - File location: `publish/vayyari/vayyari-latest.apk`
   - HTTP endpoint (when hosted): `http://krikanserver.taild227d9.ts.net/vayyari-updates/vayyari-latest.apk`
3. Enable **"Install unknown apps"** in Android Settings for your browser/file manager.
4. Tap the downloaded APK to install or upgrade.

---

## 🏗️ Standalone APK Build Process

Standalone Android Release APKs are built using Gradle via the DeepLens deploy script or root Makefile:

### Fast Command:
```bash
make build-vayyari-apk
# OR
./infrastructure/deploy.sh vayyari-apk
```

### Direct Gradle Execution:
```bash
cd src/vayyari/android
./gradlew assembleRelease \
  -x lint \
  -x lintVitalAnalyzeRelease
```

### Build Rationale & Compiler Flags:
1. **`-x lint -x lintVitalAnalyzeRelease`**: Skips redundant release linting tasks to accelerate build times and avoid false-positive blocking errors.
2. **Standard AAPT2 PNG Crunching**: Courier logos and image assets are properly encoded RGBA PNG files, fully compatible with standard AAPT2 crunching in release builds (`android.enablePngCrunchInReleaseBuilds=true`).
3. **Debug Keystore Signing**: Internal release builds are signed with the debug keystore for streamlined local testing and internal distribution.

---

## 🗄️ Artifact Retention Policy

The build script automatically maintains an artifact retention policy in `publish/vayyari/`:
- **Retention Count**: **3 newest historical versioned APKs** (`vayyari-v1.0.0-YYYYMMDD.apk`).
- **Latest Pointer**: `vayyari-latest.apk` is refreshed with every successful build.
- **Automated Pruning**: Older builds exceeding the 3-build retention threshold are automatically deleted during the execution of `./infrastructure/deploy.sh vayyari-apk` to conserve disk space.

---

## 🔄 Self-Hosted OTA Updates Architecture (MinIO + Nginx)

DeepLens includes an automated OTA export and publishing pipeline for JavaScript bundles and assets.

### OTA Export & Push Command:
```bash
make push-vayyari-ota
# OR
cd src/vayyari && ./push-update.sh --notes "Release notes"
```

### MinIO & Gateway Infrastructure:
- **MinIO Storage Alias**: `local` (`http://localhost:9000` or `http://192.168.0.170:9000`)
- **Bucket**: `vayyari-updates` (configured with `mc anonymous set download local/vayyari-updates`)
- **Nginx Gateway Proxy**: Nginx proxies requests from `http://<HOST>/vayyari-updates/*` directly to `http://minio:9000/vayyari-updates/*` with host header preservation.
- **Manifest URL**: `http://krikanserver.taild227d9.ts.net/vayyari-updates/manifest.json`

### MinIO Storage Layout:
```
vayyari-updates/
├── manifest.json                    # Latest update manifest (version pointer & release notes)
└── bundles/
    ├── v202608280130/               # Version snapshot (keeps newest 3)
    │   ├── bundle.js                # Hermes bytecode (.hbc) bundle
    │   └── assets/                  # Hashed asset files exported by Expo
    └── ...
```

### Bundle Retention Policy:
`push-update.sh` automatically prunes version snapshots in MinIO, keeping the **3 newest version directories** and deleting older snapshots.

---

## ⚖️ Architectural Decision: Expo Updates Protocol Deferral

- **Current State**: `expo-updates` is disabled in `app.json` (`"updates": { "enabled": false }`), and `src/vayyari/hooks/useOTAUpdate.ts` operates as a no-op stub.
- **Rationale**: The Expo Updates Protocol v1 (Expo SDK 50+) requires a specialized server capable of serving signed, multipart/mixed HTTP responses containing protocol headers. MinIO static object hosting alone cannot generate dynamic multipart protocol responses.
- **Current Delivery Model**: App updates are delivered via standalone APK distribution (`publish/vayyari/vayyari-latest.apk`). The `push-update.sh` script actively maintains MinIO bundle archival and version tracking.
- **Future Roadmap**: A lightweight proxy service or EAS Update integration will be introduced to serve runtime Expo Updates Protocol v1 responses directly from MinIO artifacts.
