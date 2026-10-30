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
- **Mobile Distribution & OTA**: Standalone JS bundles, asset maps, and OTA manifest files are published to the publicly downloadable `admin-updates` and `store-updates` buckets.

### Multi-Tenancy Strategy
- **Shared Instance**: Typically one MinIO instance serves all development buckets at `http://192.168.0.170:9000`.
- **Isolation**: Each tenant is restricted to their bucket via IAM policies.
- **BYOS**: Support for external endpoints (Azure Blob, AWS S3) allows enterprise tenants to keep their data in their own subscription.

---

## 📱 Vayyari Mobile Application & Distribution Service

Vayyari is the mobile client for catalog browsing, visual search, and WhatsApp message grouping.

### Architecture & Native Toolchain
- **Framework**: React Native 0.86+ / Expo SDK 57 (Bare Workflow).
- **Native Platform**: Android Gradle project located under `src/vayyari/android`.
- **UI Engine**: Tamagui 2.7+ & React Native Paper (Material Design 3).
- **Telemetry**: Distributed tracing with `@opentelemetry/api` lazy-loaded at runtime.

### Standalone APK Release Pipeline
- **Command**: `make admin-apk` or `./infrastructure/deploy.sh admin-apk`.
- **Gradle Task**: `./src/vayyari/build-apk.sh --release --arch universal`.
- **Publish Destination**: `publish/admin-app/`
  - `vayyari-admin-latest.apk` (Universal Release)
  - `vayyari-admin-debug-latest.apk` (Universal Debug)
- **Retention Policy**: Automates retention of the **newest 3 versioned APK builds** while pruning older artifacts.

### Self-Hosted OTA Pipeline (MinIO + Nginx)
- **Export & Push Script**: `src/vayyari/push-update.sh`
- **Storage Target**: MinIO bucket `admin-updates` via `mc` client.
- **Gateway Route**: Nginx on port 80 proxies `/admin-updates/` to `http://minio:9000/admin-updates/`.
- **Public Manifest**: `http://krikanserver.taild227d9.ts.net/admin-updates/manifest.json`
- **Active Runtime Delivery**: `MainApplication.kt` detects `ota/active/bundle.js` and loads the OTA bundle dynamically on boot. Versioning is monotonic based on commit counts (`<baseVersion>.<commitCount>[-dirty]`).

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

---

## 🌐 DeepLens Platform & Store.Api Endpoint Specifications

### 1. Instagram WhatsApp Share Tracking (`DeepLens.SearchApi`)
Tracks and audits shared Instagram competitor media posts across WhatsApp target groups (reseller vs customer cohorts).

- **`POST /api/v1/insta/wa-updates/share`**
  - **Auth**: Bearer token (`SearchPolicy`)
  - **Request Body**:
    ```json
    {
      "postId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "target": "reseller", // or "customer"
      "groupName": "South India Resellers Hub",
      "notes": "Shared price update"
    }
    ```
  - **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "postId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "target": "reseller",
      "groupName": "South India Resellers Hub",
      "sharedAt": "2026-10-30T10:00:00Z"
    }
    ```

- **`POST /api/v1/insta/wa-updates/unshare`**
  - **Auth**: Bearer token (`SearchPolicy`)
  - **Request Body**:
    ```json
    {
      "postId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "target": "reseller"
    }
    ```
  - **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "postId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "target": "reseller"
    }
    ```

### 2. Catalog Product Media Review Required Flag (`DeepLens.SearchApi`)
Enables editorial triaging by flagging catalog products needing image or video inspection.

- **`PATCH /api/v1/catalog/products/{id}/media-review-required`**
  - **Auth**: Bearer token (`SearchPolicy`)
  - **Request Body**:
    ```json
    {
      "isMediaReviewRequired": true
    }
    ```
  - **Response (`200 OK`)**:
    ```json
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "isMediaReviewRequired": true
    }
    ```

### 3. Store Device Growth & Acquisition Telemetry (`Store.Api`)
Surfaces anonymous device growth metrics, DAU/WAU trends, and acquisition attribution.

- **`GET /api/v1/admin/telemetry/growth/daily?days=30&granularity=daily`**
  - **Query Parameters**:
    - `days` / `range` (int, default `30`): Observation window.
    - `granularity` (string, `daily` | `weekly` | `monthly`).
  - **Response (`200 OK`)**:
    ```json
    [
      {
        "date": "2026-10-29",
        "activeDevices": 142,
        "newDevices": 18,
        "totalSessions": 412
      }
    ]
    ```

- **`GET /api/v1/admin/telemetry/growth/acquisitions?range=30&granularity=daily`**
  - **Response (`200 OK`)**:
    ```json
    {
      "cohorts": [
        {
          "period": "2026-10-29",
          "totalFirstSeen": 18,
          "channels": { "direct": 10, "whatsapp_share": 6, "instagram": 2 },
          "platforms": { "android": 14, "ios": 3, "web": 1 }
        }
      ]
    }
    ```

### 4. Fuzzy Trigram Search & Store Catalog Discovery (`Store.Api`)
High-performance customer storefront product search and filtering.

- **`GET /api/v1/products?search={term}&category={slug}`**
  - **Indexing Strategy**: Powered by PostgreSQL `pg_trgm` GIN indexes on title, color, fabric, and search keywords (`041_add_pg_trgm_fuzzy_search_indexes.sql`, `042_add_store_fuzzy_search_indexes.sql`, and `043_optimize_store_partial_gin_indexes.sql`).
  - **Caching**: Multi-tier Redis caching with 15-minute sliding TTL under key `store:search:{category}:{search}`.
  - **Response (`200 OK`)**:
    ```json
    [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "productCode": "VF-101",
        "title": "Kanchipuram Pure Silk Saree",
        "category": "Sarees",
        "fabric": "Pure Silk",
        "color": "Crimson Red",
        "price": 8500.0,
        "originalPrice": 12000.0,
        "discountPercentage": 29,
        "inStock": true,
        "primaryImageUrl": "http://192.168.0.170:9000/..."
      }
    ]
    ```


