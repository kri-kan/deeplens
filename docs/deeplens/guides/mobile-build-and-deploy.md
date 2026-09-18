# 📱 DeepLens Mobile Build & Deployment Guide

This guide documents the native build pipelines, command-line interfaces, packaging targets, Over-The-Air (OTA) distribution, and networking architectures for **both mobile applications** in the DeepLens ecosystem:
1. **Vayyari Admin App (`src/vayyari`)**: Internal merchant and catalog curation application.
2. **Vayyari Store App (`src/store`)**: Customer-facing e-commerce application for authentic handlooms and sarees.

---

## 🏛️ Centralized Distribution Directory Standards

The DeepLens project standardizes root-level publishing directories to eliminate ambiguity between administrative tools and customer storefronts:

| Application | Source Directory | Publishing Directory | Produced Artifacts |
| :--- | :--- | :--- | :--- |
| **Vayyari Admin** | `src/vayyari` | `publish/admin-app/` | `vayyari-admin-latest.apk`, versioned APKs, OTA updates (`ota/`) |
| **Vayyari Store** | `src/store` | `publish/vayyari/` | `vayyari-store-latest.apk`, `vayyari-store-debug-latest.apk`, `.sha256` files, Web/PWA distribution |

---

## 🛍️ Part 1: Vayyari Store App (`src/store`)

The customer-facing Vayyari Store app is built with **Expo SDK 57**, **React Native 0.86.3**, and the **Hermes** JavaScript engine. It supports building both **Release** and **Debug** Android APKs directly on Linux workstations without cloud dependencies.

### 1.1 Automated Build Pipeline Script: `scripts/store/build-store-apk.sh`

The canonical script for compiling Store APKs is located at [`scripts/store/build-store-apk.sh`](file:///home/krikan/productivity/deeplens/scripts/store/build-store-apk.sh).

#### Syntax
```bash
./scripts/store/build-store-apk.sh [release | debug | both] [OPTIONS]
```

#### CLI Options & Flags
| Option / Flag | Description | Default |
| :--- | :--- | :--- |
| `release`, `--release` | Builds the optimized, production Release APK. Minified and optimized with AAPT2. | **Default** |
| `debug`, `--debug` | Builds the Debug APK with Hermes debug symbols, dev menu, and LogBox enabled. | |
| `both`, `--both`, `--all` | Builds both Release and Debug APKs sequentially. | |
| `--arch <arm64\|universal\|x86_64>` | Target CPU ABI architecture: <br>• `arm64`: `-PreactNativeArchitectures=arm64-v8a` (Fastest, standard for modern phones)<br>• `universal`: `-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64`<br>• `x86_64`: Emulators | `arm64` |
| `--keep <N>` | Number of historical versioned APKs to retain in `publish/vayyari/` before auto-pruning. | `3` |
| `--clean` | Runs `./gradlew clean` prior to compilation. | `false` |
| `--install[=variant]` | Automatically installs the generated APK onto a connected Android device or emulator via ADB. | `false` |
| `-h`, `--help` | Displays the help and usage manual. | |

### 1.2 Quick Commands via Infrastructure & Makefile

Common operations are aliased in `./infrastructure/deploy.sh` and root `Makefile`:

```bash
# Build Release APK (Recommended for device testing)
./infrastructure/deploy.sh store-apk
# or
make store-apk

# Build Debug APK (For developer debugging)
./infrastructure/deploy.sh store-apk-debug
# or
make store-debug-apk

# Build Both Release & Debug APKs
./infrastructure/deploy.sh store-apk-both
# or
make store-apk-both

# Build Web / PWA Bundle
./scripts/store/publish-store.sh
# or
make store-app
```

### 1.3 Published Artifact Naming & Structure

When building Store APKs, artifacts are published directly to [`publish/vayyari/`](file:///home/krikan/productivity/deeplens/publish/vayyari/):

```
publish/vayyari/
├── vayyari-store-latest.apk                  # Stable pointer to newest Release build
├── vayyari-store-latest.apk.sha256           # SHA256 checksum for latest Release
├── vayyari-store-v1.0.0-YYYYMMDD_HHMMSS.apk  # Versioned Release build
├── vayyari-store-debug-latest.apk            # Stable pointer to newest Debug build
├── vayyari-store-debug-latest.apk.sha256     # SHA256 checksum for latest Debug
├── vayyari-store-debug-v1.0.0-*.apk          # Versioned Debug build
├── README.md                                 # Distribution directory documentation
└── index.html, manifest.json, sw.js          # Web/PWA distribution files
```

- **Symbolic Link Mirror**: Artifacts are also mirrored in `src/store/dist-apk/` for developer convenience.
- **SHA256 Integrity Verification**: Every build creates a companion `.sha256` checksum file:
  ```bash
  sha256sum -c publish/vayyari/vayyari-store-latest.apk.sha256
  ```

### 1.4 Native Build Mechanics & Environment Requirements

- **Gradle Version**: Gradle 9.3.1 (configured in `src/store/android/gradle/wrapper/gradle-wrapper.properties`).
- **JVM Heap Allocation**: `org.gradle.jvmargs=-Xmx6144m -XX:MaxMetaspaceSize=1024m` in `gradle.properties` ensures D8 dex mergers and C++ CMake linking have sufficient memory.
- **Hermes Compiler Symlink**: React Native 0.86.3 requires `hermesc` in `node_modules/react-native/sdks/hermesc`. The postinstall hook in `src/store/package.json` configures this automatically:
  ```json
  "postinstall": "mkdir -p node_modules/react-native/sdks && ln -sfn ../../hermes-compiler/hermesc node_modules/react-native/sdks/hermesc"
  ```
- **Package ID**: `com.vayyari.store`.

---

## 🛠️ Part 2: Vayyari Admin App (`src/vayyari`)

The internal Vayyari Admin app serves catalog curation, WhatsApp message categorization, and store operations.

### 2.1 Release APK Build Workflow
```bash
# Via deploy.sh
./infrastructure/deploy.sh admin-apk

# Via Makefile
make admin-apk
```

Under the hood, this compiles `src/vayyari/android` with Gradle:
```bash
./gradlew assembleRelease -x lint -x lintVitalAnalyzeRelease -Pandroid.enablePngCrunchInReleaseBuilds=false
```

Published to [`publish/admin-app/`](file:///home/krikan/productivity/deeplens/publish/admin-app/):
- `vayyari-admin-latest.apk`
- `vayyari-admin-v1.0.0-YYYYMMDD_HHMMSS.apk`

### 2.2 Self-Hosted OTA (Over-The-Air) Bundle Deployment

Self-hosted OTA allows fast JS and asset hotfixes without reinstalling APKs.

```bash
./infrastructure/deploy.sh admin-ota
# or
cd src/vayyari && ./push-update.sh
```

- **Export Path**: `publish/admin-app/ota/`
- **MinIO Storage**: Uploaded to bucket `vayyari-updates` at `192.168.0.170:9000`.
- **Reverse Proxy**: Nginx routes `/vayyari-updates/` requests to MinIO so mobile clients can auto-update on launch.

---

## 📲 Part 3: Installation & Device Verification

### 3.1 Installing Vayyari Store APK via ADB
```bash
# Install latest Release APK
adb install -r publish/vayyari/vayyari-store-latest.apk

# Install latest Debug APK
adb install -r publish/vayyari/vayyari-store-debug-latest.apk

# Auto-install directly during build
./scripts/store/build-store-apk.sh --release --install
```

### 3.2 Installing Vayyari Admin APK via ADB
```bash
adb install -r publish/admin-app/vayyari-admin-latest.apk
```

### 3.3 Verifying Cleartext & LAN Connectivity
Both applications include `android:usesCleartextTraffic="true"` and network security configurations to allow communication over local LAN (`192.168.0.170`), localhost, and Tailscale VPN mesh addresses (`krikanserver.taild227d9.ts.net`).
