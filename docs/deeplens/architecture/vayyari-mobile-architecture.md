# Vayyari Mobile App Architecture & Release Guide

**Comprehensive architecture reference for the DeepLens mobile applications: Vayyari Admin App and Vayyari Store App, standalone APK builds, and release distribution pipelines.**

Last Updated: September 18, 2026  
Related ADO Stories: #336, #340, #537, #542, #546, #552, #558, #563

---

## 📱 Executive Overview: Two Distinct Mobile Applications

The DeepLens mobile ecosystem consists of two specialized React Native / Expo bare-workflow applications:

```mermaid
graph TD
    subgraph "1. Vayyari Admin App (src/vayyari)"
        AdminUI[Admin UI / Tamagui & Paper]
        AdminCuration[Catalog Curation & Swatch Matching]
        AdminWhatsApp[WhatsApp Media Ingestion]
        AdminRouter[Expo Router File Routing]
    end

    subgraph "2. Vayyari Customer Store App (src/store)"
        StoreUI[Customer Storefront / Tamagui]
        StoreCatalog[Handloom & Saree Catalog]
        StoreCart[Cart & Checkout Flow]
        StoreRouter[Expo Router / Fabric New Architecture]
    end

    subgraph "Backend Infrastructure"
        Gateway[Nginx Gateway :80]
        IdentityApi[NextGen.Identity :5198]
        SearchApi[DeepLens.SearchApi :5000]
        StoreApi[Store.Api :5200]
        MinIO[(MinIO Storage :9000)]
    end

    subgraph "Centralized Distribution"
        AdminAPK[publish/admin-app/ - vayyari-admin-*.apk]
        StoreAPK[publish/vayyari/ - vayyari-store-*.apk]
        StoreWeb[publish/vayyari/ - Web & PWA]
    end

    AdminUI --> AdminRouter
    AdminRouter --> IdentityApi
    AdminRouter --> SearchApi
    AdminWhatsApp --> SearchApi
    AdminCuration --> StoreApi

    StoreUI --> StoreRouter
    StoreRouter --> StoreApi
    StoreCatalog --> StoreApi

    AdminUI -->|Build & Publish| AdminAPK
    StoreUI -->|Build & Publish| StoreAPK
    StoreUI -->|Export Web| StoreWeb
```

| Dimension | Vayyari Admin App | Vayyari Customer Store App |
| :--- | :--- | :--- |
| **Source Path** | `src/vayyari` | `src/store` |
| **Target Audience** | Merchants, catalog curators, store admins | End customers browsing & purchasing sarees |
| **Android Package ID** | `com.vayyari.admin` | `com.vayyari.store` |
| **Framework Version** | Expo SDK 57, React Native 0.86.3, React 19.2.3 | Expo SDK 57, React Native 0.86.3, React 19.2.3 |
| **Engine & Architecture** | Hermes Engine, New Architecture | Hermes Engine, New Architecture (Fabric) |
| **UI Component System** | Tamagui 2.7+ & React Native Paper | Tamagui 2.7+, BottomSheet v5, Reanimated 4 |
| **Publishing Location** | `publish/admin-app/` | `publish/vayyari/` |
| **Supported APK Variants** | Release (`vayyari-admin-latest.apk`) | Release & Debug (`vayyari-store-latest.apk`, `vayyari-store-debug-latest.apk`) |

---

## 🏗️ Technical Architecture & Component Layers

### 1. Framework & Core Runtime
- **Runtime**: React Native 0.86.3 with the native **Hermes JavaScript Engine**.
- **Workflow**: **Expo Bare Workflow** (Expo SDK 57) with full control over native `android/` directories.
- **Hermes Setup**: Configured with explicit `hermesCommand` and `postinstall` symlinks to `node_modules/react-native/sdks/hermesc/linux64-bin/hermesc`.
- **Memory Optimization**: Gradle build processes configured with `-Xmx6144m -XX:MaxMetaspaceSize=1024m` to prevent D8 dexer memory starvation.

### 2. Navigation & File-System Routing
- **Routing Engine**: `expo-router` v4+ using file-system conventions.
- **Module Safety**: Native modules like `expo-media-library` are guarded with lazy runtime pre-checks (`requireOptionalNativeModule`) to prevent startup crashes when running on platforms without the native module.

### 3. Backend API Connectivity
- **Vayyari Admin App**: Connects to `NextGen.Identity` (port 5198), `DeepLens.SearchApi` (port 5000), and `Store.Api` (port 5200).
- **Vayyari Store App**: Connects to `Store.Api` (port 5200) for catalog discovery, product curation details, swatches, and cart operations.
- **Cleartext & LAN Configuration**: Both apps configure `android:usesCleartextTraffic="true"` and network security configs allowing access to `192.168.0.170`, localhost, and Tailscale domain `krikanserver.taild227d9.ts.net`.

---

## 🔨 Android APK Build Pipelines

### 1. Store App Pipeline (`scripts/store/build-store-apk.sh`)
- Multi-variant script supporting `--release`, `--debug`, `--both`, `--arch <arm64|universal|x86_64>`, `--keep <N>`, `--clean`, and `--install`.
- Integrated into `infrastructure/deploy.sh` (`store-apk`, `store-apk-debug`, `store-apk-both`) and root `Makefile`.

### 2. Admin App Pipeline (`src/vayyari/build-apk.sh`)
- Multi-variant universal compilation script:
  ```bash
  ./src/vayyari/build-apk.sh release --arch universal
  ```
- Flags: `release`, `debug`, `both`, `--arch <universal|arm64|x86_64>`, `--keep <N>`, `--clean`, `--install`.
- Integrated into `infrastructure/deploy.sh` (`admin-apk`, `admin-apk-debug`, `admin-apk-both`) and root `Makefile`.
- Output published to `publish/admin-app/` with SHA256 checksums and automated pruning.

---

## 🔄 Self-Hosted Over-The-Air (OTA) Updates Architecture

The DeepLens mobile ecosystem operates an enterprise self-hosted OTA system connecting Expo Hermes bytecode exports directly to MinIO and Nginx.

> [!TIP]
> For the comprehensive technical specification, mathematical versioning formulas, native C++/Kotlin runtime hooks, and security threat mitigations, see the [Self-Hosted Mobile OTA Updates White Paper](file:///home/krikan/productivity/deeplens/docs/deeplens/architecture/self-hosted-mobile-ota-whitepaper.md).

```
Git Commit (JS/TS changes)
        │
        ▼
.git/hooks/post-commit
        │
        ├──► push-update.sh        ──► MinIO: admin-updates/ (Admin)
        └──► push-store-update.sh ──► MinIO: store-updates/   (Store)
                                                │
                                                ▼
                                         Nginx Gateway :80
                                                │
                                                ▼
                                      Mobile App Startup Hook
                                      (MainApplication.kt)
                                                │
                                    ota/active/bundle.js ?
                                     ├── YES ──► Loads OTA bundle
                                     └── NO  ──► Loads bundled asset
```

### Core Components
1. **Dynamic Native Loader**: `MainApplication.kt` checks `context.filesDir/ota/active/bundle.js` and passes `jsBundleFilePath` to `ExpoReactHostFactory.getDefaultReactHost`.
2. **Monotonic Subversioning**: `<baseVersion>.<commitCount>[-dirty]` calculated on each release.
3. **MinIO & Gateway**: Buckets `admin-updates` and `store-updates` proxied through Nginx Gateway `/admin-updates/` and `/store-updates/`.
4. **Client-Side Integrity**: `selfHostedOTA.ts` downloads to `ota/staging/`, verifies SHA-256 and MD5, checks `targetNativeVersion: 1`, and atomically swaps to `ota/active/`.
5. **Git Hook & Make Targets**: Automated background push via `.git/hooks/post-commit`, manual triggers via `make push-admin-ota`, `make push-store-ota`, `make push-all-ota`.

---

## 🗄️ Distribution Directories & Checksum Verification

```
publish/
├── admin-app/
│   ├── README.md
│   ├── vayyari-admin-latest.apk           # Universal Release (111 MB)
│   ├── vayyari-admin-v1.0.0-*.apk
│   ├── vayyari-admin-debug-latest.apk     # Universal Debug (243 MB)
│   └── vayyari-admin-debug-v1.0.0-*.apk
└── vayyari/
    ├── README.md
    ├── vayyari-store-latest.apk           # Store Release (~34 MB)
    ├── vayyari-store-latest.apk.sha256
    ├── vayyari-store-v1.0.0-*.apk
    ├── vayyari-store-debug-latest.apk     # Store Debug (~64 MB)
    ├── vayyari-store-debug-latest.apk.sha256
    ├── vayyari-store-debug-v1.0.0-*.apk
    └── (Web & PWA bundles)
```

Each APK artifact is accompanied by an audit-ready SHA256 checksum file and installation instructions.

