# DeepLens Release Notes

## v0.2.0 - Bulk Image Ingestion & Visual Catalog (December 21, 2025)

### 🎉 New Features

#### Bulk Image Ingestion
- **Multi-file upload API** at `/api/v1/ingest/bulk` supporting batch image uploads with metadata
- **Metadata-driven ingestion** using JSON manifests for SKU, product details, pricing, and attributes
- **Tenant-isolated storage** with automatic partitioning in MinIO
- **Asynchronous processing pipeline** using Kafka for scalable image handling

#### Tenant-Specific Thumbnail Configuration
- **Per-tenant thumbnail settings** stored as JSONB in the tenants table
- **Configurable quality, dimensions, and format** (WebP, JPEG, PNG)
- **Multi-specification support** for different use cases (grid, detail, preview)
- **Worker-driven generation** with automatic dimension tracking

#### Visual Catalog UI
- **Grid-based image browser** with justified layout
- **Infinite scroll pagination** for large collections
- **Real-time status indicators** showing upload/processing states
- **On-demand thumbnail delivery** with caching

### 🔧 Technical Improvements

#### Backend
- Added `UpdateImageStatusAsync` and `UpdateImageDimensionsAsync` to `TenantMetadataService`
- Enhanced `ImageProcessingWorker` to persist image dimensions after thumbnail generation
- Fixed `FeatureExtractionWorker` to use `IStorageService` instead of file system access
- Implemented CORS middleware for frontend-backend communication
- Added `shipping_info` column to `seller_listings` table

#### Frontend
- Updated `imageService` to pass tenant ID for multi-tenant support
- Modified `ImagesPage` to use authenticated user's tenant context
- Fixed React import warnings

#### Testing
- Created `DeepLens.Infrastructure.Tests` with tests for tenant settings and processing options
- Created `DeepLens.SearchApi.Tests` with tests for ingestion and image controllers
- Added sample test data for Vayyari saree collection (7 images)

### 📚 Documentation
- Comprehensive bulk ingestion workflow in `DEVELOPMENT.md`
- Tenant thumbnail configuration examples
- End-to-end testing procedures

### 🐛 Bug Fixes
- Fixed missing `tenant_id` parameter in image list API calls
- Resolved CORS blocking issues between frontend and API
- Corrected database schema inconsistencies in tenant metadata tables

### 📦 Database Migrations
- `002_AddTenantSettings.sql` - Adds JSONB settings column to tenants table
- Updated `03-tenant-metadata-template.sql` with `shipping_info` field

### 🎬 Demo: Vayyari Saree Collection
Successfully ingested and displayed 7 premium saree images:
- VAY-SRI-201: Pure Kanchipuram Silk in Emerald Green
- VAY-SRI-202: Midnight Blue Banarasi with Silver Motifs
- VAY-SRI-203: Hand-painted Kalamkari on Tussar Silk
- VAY-SRI-204: Classic Red Bridal with Zardosi Work
- VAY-SRI-205: Lightweight Chiffon in Pastel Pink
- VAY-SRI-206: Indigo Dabu Print Cotton
- VAY-SRI-207: Elegant Paithani in Magenta

### 🚀 What's Next (v0.3.0)
- ML-powered feature extraction integration
- Visual similarity search
- Advanced image filters and faceted navigation
- Multi-image product support
- Batch thumbnail regeneration tools

---

## v0.1.0 - Initial Platform Setup

Initial release with core infrastructure, identity management, and basic image storage.

(Previous release notes...)
