# FFmpeg Installation Guide for DeepLens Video Processing

## Quick Installation (Windows)

### Option 1: Manual Download (Recommended)
1. Download FFmpeg from: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
2. Extract the ZIP file to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your System PATH:
   ```powershell
   $env:Path += ";C:\ffmpeg\bin"
   [Environment]::SetEnvironmentVariable("Path", $env:Path, [System.EnvironmentVariableTarget]::Machine)
   ```
4. Verify installation:
   ```powershell
   ffmpeg -version
   ffprobe -version
   ```

### Option 2: Using Chocolatey
```powershell
# Install Chocolatey first if not installed
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install FFmpeg
choco install ffmpeg -y
```

### Option 3: Using Scoop
```powershell
# Install Scoop
iwr -useb get.scoop.sh | iex

# Install FFmpeg
scoop install ffmpeg
```

## After Installation

1. Restart your terminal/PowerShell
2. Verify FFmpeg is in PATH:
   ```powershell
   where.exe ffmpeg
   where.exe ffprobe
   ```
3. Restart the DeepLens WorkerService:
   ```powershell
   cd C:\productivity\deeplens
   dotnet run --project src\DeepLens.WorkerService\DeepLens.WorkerService.csproj
   ```

## What FFmpeg Does for DeepLens

The VideoProcessingWorker uses FFmpeg to:
- **Extract poster frames** from videos (saved as WebP thumbnails)
- **Generate 3-second GIF previews** for hover effects in the UI
- **Extract video metadata** (duration, dimensions, codec info)
- **Analyze video streams** for quality and format detection

## Current Status

- ✅ Videos are being uploaded and stored in MinIO
- ✅ Video metadata is saved in PostgreSQL (status = 0 "Uploaded")
- ❌ VideoProcessingWorker cannot start without FFmpeg
- ❌ No thumbnails or GIF previews are generated

## Once FFmpeg is Installed

The worker will automatically:
1. Subscribe to `deeplens.videos.uploaded` Kafka topic
2. Process pending videos (3 videos currently waiting)
3. Generate WebP thumbnails at 512x512
4. Create 3-second GIF previews (256px wide)
5. Update database with thumbnail_path and preview_path
6. Set status to 1 (Processed)

Then the Visual Catalog UI will display:
- Video thumbnails in the grid
- Animated GIF previews on hover
- Play button overlay on video items
- Full video playback in modal on click
