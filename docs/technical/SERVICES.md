# DeepLens Service Specifications

**Deep dive into microservice implementations and specialized components.**

Last Updated: December 20, 2025

---

## 🔄 Event Streaming (Apache Kafka)

Kafka acts as the backbone for the DeepLens image processing pipeline.

> **📖 For comprehensive Kafka documentation, see [KAFKA_TOPICS.md](./KAFKA_TOPICS.md)**

### Core Topics (Summary)
- `deeplens.images.uploaded`: Image upload notifications → triggers processing pipeline
- `deeplens.videos.uploaded`: Video upload notifications → triggers frame extraction
- `deeplens.features.extraction`: ML feature extraction requests → PythonService
- `deeplens.vectors.indexing`: Vector indexing requests → Qdrant
- `deeplens.processing.completed`: Pipeline completion notifications → SearchAPI
- `deeplens.processing.failed`: Error notifications → SearchAPI (triggers alerts/retry)
- `deeplens.images.maintenance`: Cleanup and maintenance tasks → MaintenanceWorker

### WhatsApp Processor Topic
- `whatsapp-ready-messages`: WhatsApp message queue → MessageQueueService

### Pipeline Flow
1. **Producer**: Search API (Upload / Merge)
2. **Consumer**: Image Processing Worker (Initializes pipeline)
3. **Consumer**: Feature Extraction Worker (Calls ML service)
4. **Consumer**: Vector Indexing Worker (Updates Qdrant)
5. **Consumer**: Image Maintenance Worker (Physical cleanup)

**See [KAFKA_TOPICS.md](./KAFKA_TOPICS.md) for detailed documentation including:**
- Complete data flow diagrams
- Payload examples for each topic
- Monitoring and management commands
- Best practices and troubleshooting

---

## 🖼️ Image & Thumbnail Handling

DeepLens manages large volumes of image data across multiple storage providers.

### Processing
- **Format**: All images are standardized to JPEG/PNG for feature extraction.
- **Thumbnails**:
  - Generated on-the-fly or background-cached.
  - Sizes: `Small (128x128)`, `Medium (512x512)`.
  - Storage: Stored in a dedicated `thumbnails` folder within the tenant's bucket.

---

## ☁️ Object Storage (MinIO / S3)

DeepLens uses a hybrid bucket strategy for object storage:
- **Tenant Isolation**: Each tenant has an isolated bucket (`tenant-<uuid>`) for curated catalog images, thumbnails, and feature embeddings.
- **WhatsApp Ingestion**: Unstructured attachments and voice notes land in the `whatsapp-media` bucket.
- **Mobile Distribution & OTA**: Standalone JS bundles, asset maps, and OTA manifest files are published to the publicly downloadable `vayyari-updates` bucket.

### Multi-Tenancy Strategy
- **Shared Instance**: Typically one MinIO instance serves all development buckets at `http://192.168.0.170:9000`.
- **Isolation**: Each tenant is restricted to their bucket via IAM policies.
- **BYOS**: Support for external endpoints (Azure Blob, AWS S3) allows enterprise tenants to keep their data in their own subscription.

---

## 📱 Vayyari Mobile Application & Distribution Service

Vayyari is the Android mobile client for catalog browsing, visual search, and WhatsApp message grouping.

### Architecture & Native Toolchain
- **Framework**: React Native 0.76+ / Expo SDK 54 (Bare Workflow).
- **Native Platform**: Android Gradle project located under `src/vayyari/android`.
- **UI Engine**: React Native Paper (Material Design 3) with custom Emerald/Nocturne dynamic theming.
- **Telemetry**: Distributed tracing with `@opentelemetry/api` lazy-loaded at runtime.

### Standalone APK Release Pipeline
- **Command**: `make build-vayyari-apk` or `./infrastructure/deploy.sh vayyari-apk`.
- **Gradle Task**: `./gradlew assembleRelease -x lint -x lintVitalAnalyzeRelease -Pandroid.enablePngCrunchInReleaseBuilds=false`.
- **Publish Destination**: `publish/vayyari/`
  - `vayyari-latest.apk` (current release)
  - `vayyari-v1.0.0-YYYYMMDD.apk` (versioned build)
- **Retention Policy**: Automates retention of the **newest 3 versioned APK builds** while pruning older artifacts.

### Self-Hosted OTA Pipeline (MinIO + Nginx)
- **Export & Push Script**: `src/vayyari/push-update.sh`
- **Storage Target**: MinIO bucket `vayyari-updates` via `mc` client.
- **Gateway Route**: Nginx on port 80 proxies `/vayyari-updates/` to `http://minio:9000/vayyari-updates/`.
- **Public Manifest**: `http://krikanserver.taild227d9.ts.net/vayyari-updates/manifest.json`
- **Protocol Deferral Decision**: Expo Updates Protocol v1 (multipart, signed manifests) is deferred at runtime (`expo-updates` disabled in `app.json`) in favor of direct standalone APK sideloading. Bundles in MinIO are maintained for historical release snapshots and future runtime proxying.

---

## 🧪 OAuth 2.0 Testing Guide

To test authentication manually:

### 1. Client Credentials (M2M)
```bash
curl -X POST http://localhost:5198/connect/token \
  -d "grant_type=client_credentials" \
  -d "client_id=deeplens-m2m" \
  -d "client_secret=m2m-secret"
```

### 2. Authorization Code (Web UI)
Use the [OIDC Debugger](https://oidcdebugger.com/) or the built-in Swagger UI at `http://localhost:5198/swagger`.

### Common Scopes
- `openid`, `profile`, `deeplens.api.read`, `deeplens.api.write`.

---

## 🚗 Sidecar Services

Sidecars are lightweight, synchronous services that extend the platform's capabilities with external integrations.

- **Technology**: Python 3.11 / FastAPI / Instaloader
- **Purpose**: Provides a unified API for retrieving public Instagram profile and post metadata without requiring complex scrapers for standard lookups.
- **Key Endpoints**:
    - `GET /profile/{username}`: Metadata for any public profile.
    - `GET /profile/{username}/posts`: Recent posts (shortcode, caption, media URLs).
- **Rate Limiting**: Implementation relies on `instaloader` internal sleep mechanisms. Public endpoint usage only.

