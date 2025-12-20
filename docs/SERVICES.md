# DeepLens Service Specifications

**Deep dive into microservice implementations and specialized components.**

Last Updated: December 20, 2025

---

## 🔄 Event Streaming (Apache Kafka)

Kafka acts as the backbone for the DeepLens image processing pipeline.

### Core Topics
- `deeplens.images.uploaded`: Triggered when Search API receives a new file.
- `deeplens.features.extraction`: Commands for the Feature Extraction service.
- `deeplens.vectors.indexing`: Requests to index vectors in Qdrant.
- `deeplens.processing.completed`: Emitted when the entire pipeline finishes.
- `deeplens.images.maintenance`: Triggers cleanup of deleted files and vectors.

### Pipeline Flow
1. **Producer**: Search API (Upload / Merge).
2. **Consumer**: Image Processing Worker (Initializes pipeline).
3. **Consumer**: Feature Extraction Worker (Calls ML service).
4. **Consumer**: Vector Indexing Worker (Updates Qdrant).
5. **Consumer**: Image Maintenance Worker (Physical cleanup).

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

DeepLens uses a **Bucket-per-Tenant** strategy for object storage.

### Multi-Tenancy Strategy
- **Shared Instance**: Typically one MinIO instance serves many tenants for development.
- **Isolation**: Each tenant is restricted to their bucket via IAM policies.
- **BYOS**: Support for external endpoints (Azure Blob, AWS S3) allows enterprise tenants to keep their data in their own subscription.

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
