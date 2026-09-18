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

The internal Vayyari Admin app serves catalog curation, WhatsApp message categorization, visual search, and store operations. Package ID: `com.vayyari.admin`.

### 2.1 Automated Build Pipeline Script: `src/vayyari/build-apk.sh`

The canonical script for compiling Admin APKs is located at [`src/vayyari/build-apk.sh`](file:///home/krikan/productivity/deeplens/src/vayyari/build-apk.sh).

#### Syntax
```bash
./src/vayyari/build-apk.sh [release | debug | both] [OPTIONS]
```

#### CLI Options & Flags
| Option / Flag | Description | Default |
| :--- | :--- | :--- |
| `release`, `--release` | Builds optimized production Release APK. AAPT2 PNG crunching bypassed. | **Default** |
| `debug`, `--debug` | Builds Debug APK with Hermes debug symbols, dev menu, and LogBox enabled. | |
| `both`, `--both`, `--all` | Builds both Release and Debug APKs sequentially. | |
| `--arch <arm64\|universal\|x86_64>` | Target CPU ABI architecture: <br>• `universal`: `-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64` (Runs on physical phones + x86_64 AVD emulators)<br>• `arm64`: `-PreactNativeArchitectures=arm64-v8a`<br>• `x86_64`: Emulators | `universal` |
| `--keep <N>` | Number of historical versioned APKs to retain in `publish/admin-app/` before auto-pruning. | `3` |
| `--clean` | Runs `./gradlew clean` prior to compilation. | `false` |
| `--install[=variant]` | Automatically installs the generated APK onto a connected Android device or emulator via ADB. | `false` |
| `-h`, `--help` | Displays the help and usage manual. | |

### 2.2 Quick Build Commands via Infrastructure & Makefile

```bash
# Build Universal Release APK (Recommended for physical devices and emulators)
./infrastructure/deploy.sh admin-apk
# or
make admin-apk

# Build Universal Debug APK (For developer debugging)
./infrastructure/deploy.sh admin-apk-debug
# or
make admin-debug-apk

# Build Both Release & Debug Universal APKs
./infrastructure/deploy.sh admin-apk-both
# or
make admin-apk-both
```

### 2.3 Published Artifacts in `publish/admin-app/`

Artifacts are published directly to [`publish/admin-app/`](file:///home/krikan/productivity/deeplens/publish/admin-app/):
- `vayyari-admin-latest.apk` (111 MB Universal Release build)
- `vayyari-admin-v1.0.0-*.apk` (Versioned Release build)
- `vayyari-admin-debug-latest.apk` (243 MB Universal Debug build)
- `vayyari-admin-debug-v1.0.0-*.apk` (Versioned Debug build)

---

## 🔄 Part 3: 100% Self-Hosted Over-The-Air (OTA) Updates

DeepLens includes an enterprise self-hosted OTA updates system for both **Vayyari Admin** and **Vayyari Store** applications. It bypasses third-party clouds (Expo Updates / EAS) and pulls updates directly from local MinIO storage via the Nginx API gateway.

> [!NOTE]
> For the complete architectural whitepaper covering monotonic subversion arithmetic, native Hermes memory-mapping, two-tier atomic staging, and threat mitigation models, see the [Self-Hosted Mobile OTA Updates White Paper](file:///home/krikan/productivity/deeplens/docs/deeplens/architecture/self-hosted-mobile-ota-whitepaper.md).

### 3.1 OTA Architecture Overview

```
Developer / Git Commit
         │
         ▼
.git/hooks/post-commit  ──(auto-detects JS/TS changes)──►  Background OTA Push
         │
         ├──► src/vayyari/push-update.sh        ──► MinIO: admin-updates/
         └──► scripts/store/push-store-update.sh ──► MinIO: store-updates/
                                                            │
                                                            ▼
                                                   Nginx Gateway :80
                                                   /admin-updates/
                                                   /store-updates/
                                                            │
                                                            ▼
                                                   Mobile App on Boot
                                                   (selfHostedOTA.ts)
                                                            │
                                                   Checks sha256 checksum
                                                   Downloads to ota/staging/
                                                   Atomic swap to ota/active/
                                                            │
                                                            ▼
                                                   MainApplication.kt
                                                   Loads ota/active/bundle.js
```

### 3.2 Monotonic Subversioning Model

Every OTA release is tagged with a deterministic, monotonic version string calculated directly from git history:
```
<BASE_VERSION>.<COMMIT_COUNT>[-dirty]
```
- **`BASE_VERSION`**: Read from the application's `app.json` (e.g., `1.0.0`).
- **`COMMIT_COUNT`**: Number of commits affecting the application's directory (`git rev-list --count HEAD -- <app_dir>`). Increments automatically on every commit.
- **`-dirty`**: Appended automatically if uncommitted changes exist in the working tree.
- **Example Subversions**: `1.0.0.181`, `1.0.0.182`, `1.0.0.11`.

### 3.3 Operating OTA Updates: All Commands

#### A. Publishing Vayyari Admin OTA Bundle
```bash
# Via Makefile (Fastest)
make push-admin-ota

# Via deploy.sh
./infrastructure/deploy.sh admin-ota

# Via direct script (with custom release notes)
./src/vayyari/push-update.sh --notes "Updated curation swatch matching and color picker"
```

#### B. Publishing Vayyari Store OTA Bundle
```bash
# Via Makefile (Fastest)
make push-store-ota

# Via deploy.sh
./infrastructure/deploy.sh store-ota

# Via direct script (with custom release notes)
./scripts/store/push-store-update.sh --notes "Fixed product details page variant grouping"
```

#### C. Publishing Both Apps Concurrently
```bash
make push-all-ota
```

### 3.4 Automated Git Post-Commit Hook

A native git post-commit hook is installed at [`.git/hooks/post-commit`](file:///home/krikan/productivity/deeplens/.git/hooks/post-commit).
- **Trigger**: Runs automatically whenever you execute `git commit`.
- **Intelligent Diff Filtering**: Inspects the committed files using `git diff-tree`. If changes occurred in `src/vayyari/` or `src/store/` outside native `android/` folders, it automatically triggers `push-update.sh` or `push-store-update.sh` in the background.
- **Bypassing the Hook**: If you are making a quick commit and do not want to trigger an OTA upload, set `SKIP_OTA=1`:
  ```bash
  SKIP_OTA=1 git commit -m "docs: update architecture reference"
  ```

### 3.5 Native Android Bundle Hook (`MainApplication.kt`)

In both `src/vayyari` and `src/store`, `MainApplication.kt` intercepts bundle resolution at startup:
```kotlin
val otaFile = File(applicationContext.filesDir, "ota/active/bundle.js")
val bundlePath = if (otaFile.exists() && otaFile.length() > 0) otaFile.absolutePath else null

ExpoReactHostFactory.getDefaultReactHost(
    context = applicationContext,
    packageList = PackageList(this).packages,
    jsBundleFilePath = bundlePath
)
```
- If `ota/active/bundle.js` exists and is valid, the app loads the new OTA bundle dynamically.
- If no OTA bundle is installed, it safely falls back to the embedded APK asset (`assets://index.android.bundle`).

### 3.6 Client-Side OTA Updating Service

Mounted in the root layout components ([`src/vayyari/app/_layout.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/app/_layout.tsx) and [`src/store/App.tsx`](file:///home/krikan/productivity/deeplens/src/store/App.tsx)):
1. Checks `{gateway_url}/manifest.json` on launch.
2. Verifies `targetNativeVersion: 1` matches the binary version (prevents crashing if native modules change).
3. Compares remote `subversion` against locally installed subversion.
4. Downloads the remote Hermes bytecode bundle to `ota/staging/bundle.js`.
5. Verifies SHA-256 and MD5 checksums match the manifest.
6. Atomically moves `ota/staging/` to `ota/active/`.
7. Reloads the JavaScript runtime or activates on the next app boot.

---

## 📲 Part 4: Installation, Testing & Troubleshooting

### 4.1 Installing Applications via ADB

```bash
# List connected devices and emulators
adb devices

# Install Vayyari Admin Release APK (Universal)
adb install -r publish/admin-app/vayyari-admin-latest.apk

# Install Vayyari Admin Debug APK
adb install -r publish/admin-app/vayyari-admin-debug-latest.apk

# Install Vayyari Store Release APK
adb install -r publish/vayyari/vayyari-store-latest.apk

# Install Vayyari Store Debug APK
adb install -r publish/vayyari/vayyari-store-debug-latest.apk
```

### 4.2 Launching Apps from Command Line

```bash
# Launch Vayyari Admin
adb shell am start -n com.vayyari.admin/.MainActivity

# Launch Vayyari Store
adb shell am start -n com.vayyari.store/.MainActivity
```

### 4.3 Verifying OTA Manifests and Bundles

```bash
# Check Vayyari Admin manifest
curl -s http://localhost/admin-updates/manifest.json | jq .

# Check Vayyari Store manifest
curl -s http://localhost/store-updates/manifest.json | jq .

# Test bundle HTTP download headers
curl -I -s http://localhost/admin-updates/bundles/1.0.0.181-dirty/bundle.js | head -n 5
curl -I -s http://localhost/store-updates/bundles/1.0.0.11-dirty/bundle.js | head -n 5
```

### 4.4 Inspecting MinIO Storage

```bash
# List Admin bundle versions
mc ls local/admin-updates/bundles/

# List Store bundle versions
mc ls local/store-updates/bundles/
```

### 4.5 Inspecting Live OTA Logs on Device

```bash
# Filter Android logcat for OTA updates
adb logcat | grep -E "VayyariOTA|StoreOTA|ReactNative"
```

