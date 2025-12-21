# DeepLens Release Notes

## v0.3.0 - Video Processing & Media Unification (December 21, 2025)

### 🎉 New Features

#### Video Asset Support
- **Video upload and storage** supporting MP4, MOV, AVI, WebM formats
- **Automated thumbnail generation** using FFmpeg (WebP format, 512x512)
- **GIF preview creation** (3-second animated previews, 256px wide)
- **Video metadata extraction** (duration, dimensions, codec information)
- **Unified media table** supporting both images (media_type=1) and videos (media_type=2)

#### VideoProcessingWorker
- **Dedicated Kafka consumer** for `deeplens.videos.uploaded` topic
- **FFmpeg integration** with automatic binary path detection
- **Asynchronous processing** with error handling and retry logic
- **Thumbnail poster frame** extraction at 1 second mark
- **Smart GIF generation** starting at 20% into video for better preview

#### Media API Enhancements
- **Unified `/api/v1/catalog/media` endpoint** for both images and videos
- **Media type filtering** with `?type=1` (images) or `?type=2` (videos)
- **Video-specific endpoints**:
  - `/api/v1/catalog/media/{id}/thumbnail` - WebP poster frame
  - `/api/v1/catalog/media/{id}/preview` - Animated GIF
  - `/api/v1/catalog/media/{id}/raw` - Full video with range request support

#### Visual Catalog UI Updates
- **Video thumbnail display** in grid layout
- **Animated GIF previews** on hover for video items
- **Full video playback** in modal with HTML5 video player
- **Media type indicators** to distinguish images from videos
- **Responsive video player** with controls and autoplay

### 🔧 Technical Improvements

#### Backend
- Renamed `images` table to `media` with `media_type` column
- Added `duration_seconds`, `thumbnail_path`, `preview_path` columns
- Updated `TenantMetadataService` with `UpdateVideoMetadataAsync` method
- Generalized `ImagesController` to `MediaController`
- Added `MimeType` to `MediaDto` for proper content-type handling
- Implemented HTTP range request support for video streaming
- Updated Kafka bootstrap servers to `127.0.0.1:9092` for reliability

#### Frontend
- Renamed `imageService.ts` to `mediaService.ts`
- Updated `ImagesPage.tsx` to handle both images and videos
- Added conditional rendering for video vs image display
- Implemented full-screen media viewer modal
- Added `getRawUrl` function for original media access

#### Infrastructure
- **FFmpeg installation guide** for Windows, Linux, and macOS
- **VideoProcessingWorker configuration** with custom binary paths
- **Kafka topic separation**: `deeplens.images.uploaded` and `deeplens.videos.uploaded`
- **Worker isolation** for image and video processing pipelines

### 📚 Documentation
- New `docs/VIDEO_PROCESSING.md` with comprehensive guide
- Updated `README.md` to reflect visual search capabilities
- Updated `ARCHITECTURE.md` system overview
- Added `FFMPEG_SETUP.md` installation guide
- Created `VIDEO_PIPELINE_FIXED.md` troubleshooting guide

### 🐛 Bug Fixes
- Fixed .NET Generic Host issue with multiple BackgroundServices
- Resolved VideoProcessingWorker ExecuteAsync not being called
- Fixed Kafka connectivity issues with localhost vs 127.0.0.1
- Corrected MinIO upload paths for thumbnails and previews
- Fixed missing MIME type in media responses

### 📦 Database Migrations
- `04-rename-images-to-media.sql` - Renames images table and adds video columns
- Updated `03-tenant-metadata-template.sql` with media_type support

### 🎬 Demo: Video Processing
Successfully processed 4 test videos:
- Automated WebP thumbnail generation
- 3-second GIF preview creation
- Metadata extraction (duration, dimensions)
- All videos displayed in Visual Catalog with hover previews

### ⚡ Performance
- Video processing: 2-5 seconds for small videos (< 10MB)
- Thumbnail generation: ~20-50KB WebP files
- GIF previews: ~200-500KB for 3-second clips
- Asynchronous processing via Kafka for scalability

### 🚀 What's Next (v0.4.0)
- Video transcoding for web-optimized formats
- Scene detection for intelligent preview selection
- Frame-by-frame search capabilities
- Audio waveform visualization
- Video quality analysis
- Automatic subtitle extraction

---

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
