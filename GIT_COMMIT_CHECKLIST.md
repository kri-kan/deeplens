# Git Commit Checklist

## Files to Stage and Commit

### Core Implementation (Must Commit)
- [ ] src/DeepLens.Infrastructure/Services/TenantMetadataService.cs
- [ ] src/DeepLens.SearchApi/Controllers/MediaController.cs
- [ ] src/DeepLens.SearchApi/Controllers/IngestionController.cs
- [ ] src/DeepLens.SearchApi/Program.cs
- [ ] src/DeepLens.WorkerService/Workers/VideoProcessingWorker.cs (NEW)
- [ ] src/DeepLens.WorkerService/Workers/ImageProcessingWorker.cs
- [ ] src/DeepLens.WorkerService/Workers/FeatureExtractionWorker.cs
- [ ] src/DeepLens.WorkerService/Workers/VectorIndexingWorker.cs
- [ ] src/DeepLens.WorkerService/Program.cs
- [ ] src/DeepLens.Contracts/Events/KafkaEvents.cs
- [ ] src/DeepLens.WebUI/src/services/mediaService.ts
- [ ] src/DeepLens.WebUI/src/pages/Images/ImagesPage.tsx

### Database Migrations (Must Commit)
- [ ] infrastructure/init-scripts/postgres/04-rename-images-to-media.sql (NEW)
- [ ] infrastructure/init-scripts/postgres/03-tenant-metadata-template.sql

### Documentation (Must Commit)
- [ ] README.md
- [ ] ARCHITECTURE.md
- [ ] RELEASE_NOTES.md
- [ ] docs/VIDEO_PROCESSING.md (NEW)
- [ ] FFMPEG_SETUP.md (NEW)
- [ ] IMPLEMENTATION_SUMMARY.md (NEW)

### Temporary/Debug Files (DO NOT Commit)
- [ ] ❌ src/DeepLens.SearchApi/Controllers/FixDbController.cs (DELETE before commit)
- [ ] ❌ test_upload_video.cs
- [ ] ❌ test_video_worker.cs
- [ ] ❌ worker_*.log files
- [ ] ❌ VIDEO_PIPELINE_FIXED.md (optional - troubleshooting doc)
- [ ] ❌ VIDEO_PIPELINE_STATUS.md (optional - troubleshooting doc)
- [ ] ❌ test_thumb.webp
- [ ] ❌ test_video_thumb.webp

## Pre-Commit Actions

### 1. Clean Up Temporary Code
```powershell
# Delete temporary controller
Remove-Item src\DeepLens.SearchApi\Controllers\FixDbController.cs

# Delete test files
Remove-Item test_*.cs, worker_*.log, test_*.webp -ErrorAction SilentlyContinue
```

### 2. Remove Debug Logging (Optional)
Edit these files to remove `Console.WriteLine` debug statements:
- [ ] src/DeepLens.WorkerService/Workers/VideoProcessingWorker.cs
  - Remove lines with `Console.WriteLine("=====")`

### 3. Review Security (Before Production)
- [ ] Remove `[AllowAnonymous]` from:
  - MediaController.cs (lines 37, 54, 153, 199)
  - IngestionController.cs (lines 46, 113)

## Commit Command

```bash
# Stage all changes
git add .

# Commit with detailed message
git commit -m "feat: Add video processing pipeline with FFmpeg integration

- Implement VideoProcessingWorker for automated video processing
- Add thumbnail generation (WebP) and GIF preview creation
- Unify images and videos into single media table
- Update API endpoints to support video streaming
- Integrate video playback in Visual Catalog UI
- Add comprehensive documentation for video features
- Fix Kafka connectivity issues (localhost → 127.0.0.1)
- Configure FFmpeg integration for Windows

BREAKING CHANGE: Renamed 'images' table to 'media' with media_type column

Tested with 4 videos, all successfully processed with thumbnails and previews."

# Push to remote
git push origin main
```

## Post-Commit Verification

- [ ] All services still running
- [ ] No compilation errors
- [ ] Documentation links work
- [ ] README.md renders correctly on GitHub

## Notes

- This is a **major feature release** (v0.3.0)
- Includes **breaking database changes** (images → media table)
- Requires **FFmpeg installation** on all environments
- All **tests passing** (4/4 videos processed successfully)
