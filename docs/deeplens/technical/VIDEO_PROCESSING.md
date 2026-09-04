# Video Processing Feature Guide

## Overview
DeepLens now supports **video asset management** alongside images, with automated thumbnail generation, GIF preview creation, and metadata extraction using FFmpeg.

## Features

### 1. Video Upload & Storage
- **Supported Formats**: MP4, MOV, AVI, WebM
- **Storage**: Videos stored in MinIO with tenant isolation
- **Metadata**: Duration, dimensions, codec information extracted automatically

### 2. Automated Processing
When a video is uploaded:
1. **Thumbnail Generation**: WebP poster frame extracted at 1 second (or start if video < 2s)
   - Default size: 512x512 pixels
   - Format: WebP for optimal quality/size ratio
2. **GIF Preview**: 3-second animated preview
   - Starts at 20% into the video (or beginning if < 5s)
   - Width: 256px (height auto-scaled)
   - Looping enabled
3. **Metadata Extraction**: Duration, dimensions, format details

### 3. Visual Catalog Integration
- **Grid View**: Video thumbnails displayed alongside images
- **Hover Preview**: Animated GIF plays on hover
- **Full Playback**: Click to open modal with full video player
- **Media Type Indicator**: Visual distinction between images and videos

## Architecture

### Data Flow
```
Video Upload → MinIO Storage → Kafka Event → VideoProcessingWorker
                                                      ↓
                                            FFmpeg Processing
                                                      ↓
                                    Thumbnail + GIF + Metadata
                                                      ↓
                                    Upload to MinIO + Update DB
```

### Database Schema
```sql
-- media table (unified for images and videos)
CREATE TABLE media (
    id UUID PRIMARY KEY,
    media_type SMALLINT NOT NULL,  -- 1=Image, 2=Video
    mime_type VARCHAR(100),
    original_filename VARCHAR(500),
    storage_path VARCHAR(500),
    thumbnail_path VARCHAR(500),    -- WebP thumbnail
    preview_path VARCHAR(500),      -- GIF preview (videos only)
    duration_seconds NUMERIC,       -- Video duration
    width INTEGER,
    height INTEGER,
    status SMALLINT,                -- 0=Uploaded, 1=Processed
    uploaded_at TIMESTAMP,
    ...
);
```

### Kafka Topics
- **`deeplens.images.uploaded`**: Image upload events
- **`deeplens.videos.uploaded`**: Video upload events

### Workers
- **ImageProcessingWorker**: Handles image thumbnail generation
- **VideoProcessingWorker**: Handles video processing with FFmpeg

## Setup Requirements

### FFmpeg Installation
Video processing requires FFmpeg binaries:

**Windows:**
```powershell
# Download and extract FFmpeg
$url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
Invoke-WebRequest -Uri $url -OutFile "C:\ffmpeg\ffmpeg.zip"
Expand-Archive -Path "C:\ffmpeg\ffmpeg.zip" -DestinationPath "C:\ffmpeg"

# Add to PATH (or configure in VideoProcessingWorker)
$env:PATH += ";C:\ffmpeg\ffmpeg-master-latest-win64-gpl\bin"
```

**Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg
```

### Configuration
The VideoProcessingWorker is configured to look for FFmpeg at:
- Windows: `C:\ffmpeg\ffmpeg-master-latest-win64-gpl\bin`
- Linux/Mac: System PATH

To customize, edit `VideoProcessingWorker.cs`:
```csharp
var ffmpegPath = @"C:\your\custom\path\to\ffmpeg\bin";
GlobalFFOptions.Configure(new FFOptions { BinaryFolder = ffmpegPath });
```

## API Endpoints

### Upload Video
```http
POST /api/v1/ingest/upload
Content-Type: multipart/form-data

File: [video file]
SellerId: seller_id
Sku: product_sku
Category: category_name
```

### Get Media (Images + Videos)
```http
GET /api/v1/catalog/media?tenant={tenantId}&type=2
```
Query params:
- `type`: 1 for images, 2 for videos, omit for both

### Get Video Thumbnail
```http
GET /api/v1/catalog/media/{mediaId}/thumbnail?tenant={tenantId}
```

### Get Video GIF Preview
```http
GET /api/v1/catalog/media/{mediaId}/preview?tenant={tenantId}
```

### Get Full Video
```http
GET /api/v1/catalog/media/{mediaId}/raw?tenant={tenantId}
```
Supports HTTP range requests for streaming.

## Frontend Integration

### MediaPage Component
The `ImagesPage.tsx` (now `MediaPage.tsx`) handles both images and videos:

```typescript
// Detect media type
const isVideo = media.mediaType === 2;

// Display thumbnail in grid
<img src={mediaService.getThumbnailUrl(media.id, tenantId)} />

// Show GIF on hover (videos only)
{isVideo && (
  <img src={mediaService.getPreviewUrl(media.id, tenantId)} />
)}

// Full media viewer
{isVideo ? (
  <video src={mediaService.getRawUrl(media.id, tenantId)} controls autoPlay />
) : (
  <img src={mediaService.getRawUrl(media.id, tenantId)} />
)}
```

## Processing Options

### Thumbnail Customization
Configure in the upload event:
```csharp
ProcessingOptions = new VideoProcessingOptions
{
    ThumbnailWidth = 512,
    ThumbnailHeight = 512,
    GenerateGifPreview = true
}
```

### GIF Preview Settings
- **Duration**: 3 seconds
- **Start Time**: 20% into video (minimum 0s)
- **Width**: 256px
- **Loop**: Enabled

## Performance

### Processing Time
- **Small videos** (< 10MB): ~2-5 seconds
- **Medium videos** (10-50MB): ~5-15 seconds
- **Large videos** (> 50MB): ~15-30 seconds

### Storage Impact
- **Thumbnail**: ~20-50KB (WebP)
- **GIF Preview**: ~200-500KB (3 seconds)
- **Original Video**: Unchanged

## Troubleshooting

### VideoProcessingWorker Not Starting
1. Check FFmpeg installation: `ffmpeg -version`
2. Verify FFmpeg path in `VideoProcessingWorker.cs`
3. Check worker logs for initialization errors
4. Ensure Kafka is running: `podman ps | grep kafka`

### Videos Not Processing
1. Check Kafka topic has messages:
   ```bash
   podman exec -i deeplens-kafka kafka-console-consumer \
     --bootstrap-server localhost:9092 \
     --topic deeplens.videos.uploaded \
     --from-beginning --max-messages 1
   ```
2. Verify worker is consuming:
   ```bash
   podman exec -i deeplens-kafka kafka-consumer-groups \
     --bootstrap-server localhost:9092 \
     --describe --group deeplens-video-processing-workers
   ```
3. Check database for status updates:
   ```sql
   SELECT id, original_filename, status, thumbnail_path 
   FROM media 
   WHERE media_type = 2;
   ```

### Thumbnails Not Appearing in UI
1. Verify thumbnails were generated (check `thumbnail_path` in database)
2. Check MinIO for files:
   ```bash
   mc ls local/tenant-{tenantId}/thumbnails/
   ```
3. Verify API endpoint returns thumbnail:
   ```bash
   curl http://localhost:5000/api/v1/catalog/media/{mediaId}/thumbnail?tenant={tenantId}
   ```

## Future Enhancements
- [ ] Video transcoding for web-optimized formats
- [ ] Multiple thumbnail sizes
- [ ] Scene detection for better preview selection
- [ ] Audio waveform visualization
- [ ] Video quality analysis
- [ ] Automatic subtitle extraction
- [ ] Frame-by-frame search
