# Event-Driven Competitor Intelligence Architecture

## Overview

This architecture uses **Kafka-based event orchestration** with **stateless scraper workers**, following DeepLens's existing patterns for the WhatsApp processor and other services.

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│  DeepLens WebUI (React)                                        │
│  └─ Competitor Intel Module                                    │
└────────────────────────────────────────────────────────────────┘
                          ↓ REST API
┌────────────────────────────────────────────────────────────────┐
│  Competitor Intel Orchestrator (C# / .NET)                     │
│  ├─ Watchlist Management                                       │
│  ├─ Job Scheduling (Hangfire or Quartz.NET)                   │
│  ├─ Kafka Event Publisher                                      │
│  ├─ Kafka Event Consumer                                       │
│  ├─ Delta Sync Logic (what's new since last scrape)           │
│  └─ Media Download Planning                                    │
└────────────────────────────────────────────────────────────────┘
         ↓ publishes                      ↑ reads responses
    ┌────────────────────────────────────────────────┐
    │          Kafka Message Broker                  │
    │                                                 │
    │  Topics:                                        │
    │  • competitor.scrape.metadata.requests          │
    │  • competitor.scrape.metadata.responses         │
    │  • competitor.download.media.requests           │
    │  • competitor.download.media.responses          │
    │  • competitor.sku.linking.requests              │
    └────────────────────────────────────────────────┘
         ↓ consumes                       ↑ publishes
┌──────────────────────────┬─────────────────────────────┐
│  Instagram Scraper       │  YouTube Scraper            │
│  (Python Container)      │  (Python Container)         │
│  • Stateless             │  • Stateless                │
│  • Multiple replicas     │  • Multiple replicas        │
│  • Instaloader           │  • yt-dlp                   │
│  • Session from event    │  • Cookies from event       │
└──────────────────────────┴─────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│  DeepLens Infrastructure                                       │
│  ├─ PostgreSQL (metadata, jobs, SKU mappings)                 │
│  └─ MinIO (media files, thumbnails)                           │
└────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Competitor Intel Orchestrator (C#/.NET)

**Responsibilities**:
- Accept REST API requests from WebUI
- Manage watchlist (CRUD operations)
- Schedule periodic scraping jobs (every 6-12 hours)
- Calculate delta sync windows (what's new since last scrape)
- Publish metadata scraping events to Kafka
- Consume metadata responses from workers
- Update PostgreSQL with scraped metadata
- Publish media download events to Kafka
- Consume media download responses
- Update PostgreSQL with MinIO URLs
- Trigger SKU linking jobs

**Why C#/.NET**:
- Matches existing DeepLens stack
- Integrates with NextGen.Identity.Api for auth
- Can use Hangfire/Quartz for scheduling
- Strong Kafka client libraries (Confluent.Kafka)
- Entity Framework for PostgreSQL

**File Location**: `src/CompetitorIntel.Orchestrator/`

---

### 2. Instagram Scraper Worker (Python Container)

**Responsibilities**:
- Subscribe to `competitor.scrape.metadata.requests` (filter: platform=instagram)
- Receive scraping job event
- Deserialize session cookies from event payload
- Load session into Instaloader (in-memory)
- Fetch posts from target account (within date range from event)
- Extract metadata (likes, views, comments, captions, etc.)
- Publish metadata to `competitor.scrape.metadata.responses`
- Terminate (stateless - no persistent state)

**Stateless Design**:
- No session files on disk
- Session cookies passed via Kafka event
- Each job = new container instance (or reused from pool)
- No database connections (publishes to Kafka only)

**Scaling**:
- Run multiple replicas (e.g., 3-5 containers)
- Kafka consumer group for load balancing
- Each instance processes jobs in parallel

**File Location**: `src/scraper-workers/instagram/`

---

### 3. YouTube Scraper Worker (Python Container)

**Responsibilities**:
- Subscribe to `competitor.scrape.metadata.requests` (filter: platform=youtube)
- Receive scraping job event
- Deserialize OAuth tokens/cookies from event
- Use yt-dlp to fetch channel videos (within date range)
- Extract metadata
- Publish metadata to `competitor.scrape.metadata.responses`
- Terminate (stateless)

**Stateless Design**:
- OAuth tokens passed via Kafka event
- No persistent cookies

**Scaling**:
- Multiple replicas
- Kafka consumer group

**File Location**: `src/scraper-workers/youtube/`

---

## Kafka Topics & Message Schemas

### Topic 1: `competitor.scrape.metadata.requests`

**Purpose**: Orchestrator requests metadata scraping from workers

**Partitioning**: By `account_id` (ensures same account always goes to same worker instance for rate limit consistency)

**Message Schema**:

```json
{
  "job_id": "uuid",
  "account_id": "uuid",
  "platform": "instagram" | "youtube",
  "target_username": "competitor1_sarees",
  "target_account_id": "12345678", // Platform-specific ID
  
  // Delta sync window
  "fetch_from_date": "2026-01-10T00:00:00Z",
  "fetch_to_date": "2026-01-18T23:59:59Z",
  "max_items": 50,
  
  // Session credentials (encrypted or from vault)
  "scraper_session": {
    "instagram": {
      "session_cookies": "base64-encoded-cookie-jar",
      "user_agent": "Mozilla/5.0..."
    },
    "youtube": {
      "oauth_token": "...",
      "oauth_refresh_token": "...",
      "cookies": "..."
    }
  },
  
  // Configuration
  "config": {
    "rate_limit_delay_seconds": [3, 7],
    "max_retries": 3,
    "download_media": false // Phase 1: metadata only
  },
  
  // Trace context
  "correlation_id": "uuid",
  "timestamp": "2026-01-18T10:30:00Z",
  "requested_by": "scheduler" | "manual" | "api"
}
```

---

### Topic 2: `competitor.scrape.metadata.responses`

**Purpose**: Workers report scraped metadata back to orchestrator

**Message Schema**:

```json
{
  "job_id": "uuid",
  "correlation_id": "uuid",
  "account_id": "uuid",
  "platform": "instagram" | "youtube",
  
  // Status
  "status": "success" | "partial" | "failed",
  "error_message": null | "Login required",
  "error_code": null | "SESSION_EXPIRED",
  
  // Results
  "items_found": 25,
  "items_returned": 25,
  
  // Metadata (array of posts/videos)
  "metadata": [
    {
      "platform_id": "CxxxxxYZ", // Instagram shortcode or YouTube video ID
      "url": "https://instagram.com/p/CxxxxxYZ",
      "title": null, // Instagram doesn't have titles
      "description": "Beautiful wedding saree collection...",
      "posted_at": "2026-01-15T14:30:00Z",
      
      // Engagement metrics (counts only - no individual comments/likes/shares)
      "view_count": 12500,
      "like_count": 450,
      "comment_count": 23,
      "share_count": 12,
      "repost_count": 5,  // For platforms that support reposts
      
      // Media info
      "media_type": "video" | "image" | "carousel",
      "media_urls": ["https://instagram.com/...direct-media-url"],
      "thumbnail_url": "https://...",
      "duration_seconds": 45,
      "width": 1080,
      "height": 1920,
      
      // Instagram-specific
      "hashtags": ["#saree", "#wedding", "#bridal"],
      "mentions": ["@designer_name"],
      "location": "Mumbai, India",
      "is_reel": true,
      
      // YouTube-specific
      "category": "Howto & Style",
      "tags": ["saree draping", "tutorial"],
      "subtitles_available": true,
      
      // Raw dump
      "raw_metadata": { /* full JSON from platform */ }
    }
  ],
  
  // Worker info
  "worker_id": "instagram-worker-1",
  "processing_time_ms": 12500,
  "timestamp": "2026-01-18T10:32:00Z"
}
```

---

### Topic 3: `competitor.download.media.requests`

**Purpose**: Orchestrator requests actual media file downloads

**Partitioning**: By `account_id`

**Message Schema**:

```json
{
  "job_id": "uuid",
  "video_id": "uuid", // competitor_videos table ID
  "platform": "instagram" | "youtube",
  "platform_video_id": "CxxxxxYZ",
  
  // Download source
  "media_url": "https://instagram.com/...direct-url",
  "media_urls": ["url1", "url2"], // For carousels
  "media_type": "video" | "image" | "carousel",
  
  // MinIO destination
  "minio_bucket": "competitor-intel-media",
  "minio_path": "instagram/2026/01/18/CxxxxxYZ.mp4",
  
  // Configuration
  "config": {
    "max_file_size_mb": 500,
    "video_quality": "best[height<=1080]",
    "generate_thumbnail": true,
    "thumbnail_width": 400
  },
  
  // Session (if auth required for download)
  "scraper_session": { /* same as metadata request */ },
  
  // Trace
  "correlation_id": "uuid",
  "timestamp": "2026-01-18T10:35:00Z"
}
```

---

### Topic 4: `competitor.download.media.responses`

**Purpose**: Workers report download completion

**Message Schema**:

```json
{
  "job_id": "uuid",
  "correlation_id": "uuid",
  "video_id": "uuid",
  "platform_video_id": "CxxxxxYZ",
  
  // Status
  "status": "success" | "failed" | "skipped",
  "error_message": null | "File too large",
  
  // Results
  "minio_media_url": "competitor-intel-media/instagram/2026/01/18/CxxxxxYZ.mp4",
  "minio_thumbnail_url": "competitor-intel-thumbnails/instagram/2026/01/18/CxxxxxYZ.jpg",
  "file_size_bytes": 12500000,
  "duration_seconds": 45,
  
  // Processing info
  "worker_id": "instagram-worker-2",
  "processing_time_ms": 8500,
  "timestamp": "2026-01-18T10:36:00Z"
}
```

---

### Topic 5: `competitor.sku.linking.requests`

**Purpose**: Trigger SKU linking job (AI/manual)

**Message Schema**:

```json
{
  "job_id": "uuid",
  "video_ids": ["uuid1", "uuid2", "uuid3"], // Batch of videos
  
  // Linking strategy
  "strategy": "ai_suggestion" | "manual_review" | "keyword_match",
  
  // For AI linking
  "ai_config": {
    "model": "clip-vit-large",
    "similarity_threshold": 0.75
  },
  
  "correlation_id": "uuid",
  "timestamp": "2026-01-18T11:00:00Z"
}
```

---

## Event Flow Diagrams

### Flow 1: Metadata Scraping (Phase 1)

```
┌─────────────┐
│ Orchestrator│
└──────┬──────┘
       │ 1. Calculate delta sync window
       │    (last_scraped_at → now)
       │
       │ 2. Publish event
       ├────────────────────────────────────────────►
       │   Topic: competitor.scrape.metadata.requests
       │   {job_id, account_id, platform, date_range, session}
       │
       │                                    ┌──────────────┐
       │                                    │Instagram     │
       │                                    │Worker        │
       │                                    └──────┬───────┘
       │                                           │ 3. Load session
       │                                           │ 4. Fetch posts
       │                                           │    (from date_range)
       │                                           │ 5. Extract metadata
       │                                           │
       │   Topic: competitor.scrape.metadata.responses
       │   {job_id, status, metadata[]}
       │◄────────────────────────────────────────────
       │ 6. Receive metadata
       │
     ┌─▼──────────────────────────────────┐
     │ 7. Orchestrator processes response  │
     │    • Upsert to competitor_videos    │
     │    • Mark new vs updated            │
     │    • Identify videos needing DL     │
     └─┬──────────────────────────────────┘
       │
```

### Flow 2: Media Download (Phase 2)

```
┌─────────────┐
│ Orchestrator│
└──────┬──────┘
       │ 8. Query videos where media_url IS NULL
       │    AND download_status = 'pending'
       │
       │ 9. For each video, publish event
       ├────────────────────────────────────────────►
       │   Topic: competitor.download.media.requests
       │   {job_id, video_id, media_url, minio_path}
       │
       │                                    ┌──────────────┐
       │                                    │Instagram     │
       │                                    │Worker        │
       │                                    └──────┬───────┘
       │                                           │ 10. Download media
       │                                           │     (stream to memory)
       │                                           │ 11. Upload to MinIO
       │                                           │ 12. Generate thumbnail
       │                                           │ 13. Upload thumbnail
       │                                           │
       │   Topic: competitor.download.media.responses
       │   {job_id, video_id, minio_url, thumbnail_url}
       │◄────────────────────────────────────────────
       │ 14. Receive download confirmation
       │
     ┌─▼──────────────────────────────────┐
     │ 15. Update competitor_videos table  │
     │     SET media_url = minio_url       │
     │     SET thumbnail_url = ...         │
     │     SET download_status = 'success' │
     └─────────────────────────────────────┘
```

---

## API Callbacks vs Kafka Responses - Recommendation

### Option 1: Kafka Responses (Recommended ✅)

**Pros**:
- ✅ Consistent with DeepLens architecture
- ✅ Decoupled (workers don't need to know orchestrator URL)
- ✅ Guaranteed delivery (Kafka persistence)
- ✅ Replay capability (can reprocess responses)
- ✅ Easier to scale (consumer groups)
- ✅ No network failures (workers can't reach orchestrator)
- ✅ Better observability (Kafka UI shows message flow)

**Cons**:
- Slightly more complex (need Kafka consumer in orchestrator)
- Message ordering considerations (handled by partitioning)

### Option 2: API Callbacks

**Pros**:
- Simpler (just HTTP POST)
- Immediate feedback

**Cons**:
- ❌ Workers need orchestrator URL (coupling)
- ❌ No retry if orchestrator is down
- ❌ Network failures lose data
- ❌ Harder to scale (load balancing callbacks)

**Recommendation**: **Use Kafka for responses**. This matches your WhatsApp processor pattern and provides better reliability.

---

## Orchestrator Implementation

### Technology Stack

**Language**: C# / .NET 8  
**Scheduler**: Hangfire (matches DeepLens patterns)  
**Kafka Client**: Confluent.Kafka  
**ORM**: Entity Framework Core  
**API**: ASP.NET Core Web API

### Project Structure

```
src/CompetitorIntel.Orchestrator/
├── Program.cs
├── Controllers/
│   ├── WatchlistController.cs
│   ├── VideosController.cs
│   ├── JobsController.cs
│   └── ScraperAccountsController.cs
├── Services/
│   ├── OrchestratorService.cs
│   ├── DeltaSyncCalculator.cs
│   ├── KafkaProducerService.cs
│   ├── KafkaConsumerService.cs
│   ├── MediaDownloadPlanner.cs
│   └── SessionManager.cs
├── BackgroundJobs/
│   ├── MetadataScrapingJob.cs
│   ├── MediaDownloadJob.cs
│   └── SkuLinkingJob.cs
├── Models/
│   ├── Events/
│   │   ├── MetadataRequest.cs
│   │   ├── MetadataResponse.cs
│   │   ├── MediaDownloadRequest.cs
│   │   └── MediaDownloadResponse.cs
│   └── Entities/
│       ├── WatchlistItem.cs
│       ├── CompetitorVideo.cs
│       └── ScraperJob.cs
└── appsettings.json
```

### Key Service: OrchestratorService.cs

```csharp
public class OrchestratorService : BackgroundService
{
    private readonly IKafkaProducerService _kafkaProducer;
    private readonly IKafkaConsumerService _kafkaConsumer;
    private readonly IDbContextFactory _dbFactory;
    private readonly ILogger _logger;

    // Called by Hangfire every 6 hours
    public async Task RunMetadataScrapingJob()
    {
        using var db = _dbFactory.CreateDbContext();
        
        // Get all enabled watchlist items
        var watchlist = await db.CompetitorWatchlist
            .Where(w => w.Enabled)
            .ToListAsync();

        foreach (var item in watchlist)
        {
            // Calculate delta sync window
            var lastScraped = item.LastScrapedAt ?? DateTime.UtcNow.AddDays(-90);
            var now = DateTime.UtcNow;

            // Create metadata request event
            var request = new MetadataRequest
            {
                JobId = Guid.NewGuid(),
                AccountId = item.Id,
                Platform = item.Platform,
                TargetUsername = item.Username,
                FetchFromDate = lastScraped,
                FetchToDate = now,
                MaxItems = 50,
                ScraperSession = await GetSessionForPlatform(item.Platform),
                Config = GetScrapingConfig()
            };

            // Publish to Kafka
            await _kafkaProducer.PublishAsync(
                "competitor.scrape.metadata.requests", 
                key: item.Id.ToString(), 
                value: request
            );

            // Log job
            await db.ScraperJobs.AddAsync(new ScraperJob
            {
                Id = request.JobId,
                WatchlistId = item.Id,
                JobType = "metadata_scraping",
                Status = "pending",
                CreatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
        _logger.LogInformation($"Published {watchlist.Count} metadata scraping jobs");
    }

    // Kafka consumer for metadata responses
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _kafkaConsumer.ConsumeAsync<MetadataResponse>(
            topic: "competitor.scrape.metadata.responses",
            handler: HandleMetadataResponse,
            cancellationToken: stoppingToken
        );
    }

    private async Task HandleMetadataResponse(MetadataResponse response)
    {
        using var db = _dbFactory.CreateDbContext();

        // Update job status
        var job = await db.ScraperJobs.FindAsync(response.JobId);
        if (job != null)
        {
            job.Status = response.Status;
            job.VideosFound = response.ItemsFound;
            job.VideosNew = 0; // Will increment below
            job.CompletedAt = DateTime.UtcNow;
        }

        // Upsert metadata to database
        foreach (var item in response.Metadata)
        {
            var existing = await db.CompetitorVideos
                .FirstOrDefaultAsync(v => 
                    v.Platform == response.Platform && 
                    v.PlatformVideoId == item.PlatformId
                );

            if (existing == null)
            {
                // New video
                var video = new CompetitorVideo
                {
                    Id = Guid.NewGuid(),
                    WatchlistId = response.AccountId,
                    Platform = response.Platform,
                    PlatformVideoId = item.PlatformId,
                    Url = item.Url,
                    Title = item.Title,
                    Description = item.Description,
                    PostedAt = item.PostedAt,
                    ViewCount = item.ViewCount,
                    LikeCount = item.LikeCount,
                    CommentCount = item.CommentCount,
                    MediaType = item.MediaType,
                    DurationSeconds = item.DurationSeconds,
                    RawMetadata = JsonSerializer.Serialize(item.RawMetadata),
                    DownloadStatus = "pending", // Will be downloaded in phase 2
                    ScrapedAt = DateTime.UtcNow
                };

                await db.CompetitorVideos.AddAsync(video);
                job.VideosNew++;
            }
            else
            {
                // Update engagement metrics
                existing.ViewCount = item.ViewCount;
                existing.LikeCount = item.LikeCount;
                existing.CommentCount = item.CommentCount;
                existing.UpdatedAt = DateTime.UtcNow;
                job.VideosUpdated++;

                // Create engagement snapshot
                await db.EngagementSnapshots.AddAsync(new EngagementSnapshot
                {
                    VideoId = existing.Id,
                    ViewCount = item.ViewCount,
                    LikeCount = item.LikeCount,
                    CommentCount = item.CommentCount,
                    SnapshotAt = DateTime.UtcNow
                });
            }
        }

        await db.SaveChangesAsync();
        _logger.LogInformation($"Processed metadata response: {response.ItemsFound} items");

        // Trigger media download for new videos
        await PlanMediaDownloads(response.AccountId);
    }

    private async Task PlanMediaDownloads(Guid accountId)
    {
        using var db = _dbFactory.CreateDbContext();

        // Get videos that need downloading
        var pendingVideos = await db.CompetitorVideos
            .Where(v => v.WatchlistId == accountId && v.DownloadStatus == "pending")
            .OrderByDescending(v => v.PostedAt)
            .Take(20) // Batch size
            .ToListAsync();

        foreach (var video in pendingVideos)
        {
            var request = new MediaDownloadRequest
            {
                JobId = Guid.NewGuid(),
                VideoId = video.Id,
                Platform = video.Platform,
                PlatformVideoId = video.PlatformVideoId,
                MediaUrl = video.Url, // May need direct URL extraction
                MediaType = video.MediaType,
                MinIOBucket = "competitor-intel-media",
                MinIOPath = $"{video.Platform}/{video.PostedAt:yyyy/MM/dd}/{video.PlatformVideoId}",
                Config = GetDownloadConfig()
            };

            await _kafkaProducer.PublishAsync(
                "competitor.download.media.requests",
                key: accountId.ToString(),
                value: request
            );

            video.DownloadStatus = "downloading";
        }

        await db.SaveChangesAsync();
    }
}
```

---

## Worker Implementation (Instagram)

### Project Structure

```
src/scraper-workers/instagram/
├── main.py
├── requirements.txt
├── Dockerfile
├── config.py
├── kafka_consumer.py
├── kafka_producer.py
├── instagram_scraper.py
├── minio_uploader.py
└── models/
    ├── events.py
    └── metadata.py
```

### Key File: main.py

```python
import asyncio
import json
import pickle
import base64
from confluent_kafka import Consumer, Producer
from instagram_scraper import InstagramScraper
from minio_uploader import MinIOUploader
from models.events import MetadataRequest, MetadataResponse

class InstagramWorker:
    def __init__(self):
        self.kafka_consumer = Consumer({
            'bootstrap.servers': os.getenv('KAFKA_BROKERS'),
            'group.id': 'instagram-scrapers',
            'auto.offset.reset': 'earliest',
            'enable.auto.commit': True
        })
        
        self.kafka_producer = Producer({
            'bootstrap.servers': os.getenv('KAFKA_BROKERS')
        })
        
        self.minio = MinIOUploader()
        self.kafka_consumer.subscribe(['competitor.scrape.metadata.requests'])
    
    def run(self):
        print("Instagram worker started, listening for jobs...")
        
        while True:
            msg = self.kafka_consumer.poll(timeout=1.0)
            
            if msg is None:
                continue
            if msg.error():
                print(f"Consumer error: {msg.error()}")
                continue
            
            # Deserialize event
            event_json = msg.value().decode('utf-8')
            request = MetadataRequest.from_json(event_json)
            
            # Filter: only process Instagram jobs
            if request.platform != 'instagram':
                continue
            
            print(f"Processing job {request.job_id} for {request.target_username}")
            
            # Process job
            response = self.process_metadata_request(request)
            
            # Publish response
            self.publish_response(response)
    
   def process_metadata_request(self, request: MetadataRequest) -> MetadataResponse:
        try:
            # Deserialize session cookies
            session_data = base64.b64decode(request.scraper_session['instagram']['session_cookies'])
            cookies = pickle.loads(session_data)
            
            # Create scraper with in-memory session
            scraper = InstagramScraper(cookies=cookies)
            
            # Fetch posts in date range
            posts = scraper.get_posts(
                username=request.target_username,
                from_date=request.fetch_from_date,
                to_date=request.fetch_to_date,
                max_posts=request.max_items
            )
            
            # Extract metadata
            metadata = []
            for post in posts:
                metadata.append({
                    'platform_id': post.shortcode,
                    'url': f"https://instagram.com/p/{post.shortcode}",
                    'description': post.caption,
                    'posted_at': post.date.isoformat(),
                    'view_count': post.video_view_count if post.is_video else 0,
                    'like_count': post.likes,
                    'comment_count': post.comments,
                    'media_type': 'video' if post.is_video else 'image',
                    'is_reel': post.typename == 'GraphVideo' and post.is_video,
                    'hashtags': post.caption_hashtags,
                    'raw_metadata': post.__dict__  # Full dump
                })
            
            return MetadataResponse(
                job_id=request.job_id,
                correlation_id=request.correlation_id,
                account_id=request.account_id,
                platform='instagram',
                status='success',
                items_found=len(metadata),
                items_returned=len(metadata),
                metadata=metadata,
                worker_id=os.getenv('HOSTNAME', 'unknown')
            )
            
        except Exception as e:
            print(f"Error processing job: {e}")
            return MetadataResponse(
                job_id=request.job_id,
                status='failed',
                error_message=str(e),
                error_code='SCRAPING_ERROR',
                metadata=[]
            )
    
    def publish_response(self, response: MetadataResponse):
        self.kafka_producer.produce(
            topic='competitor.scrape.metadata.responses',
            key=str(response.account_id),
            value=response.to_json()
        )
        self.kafka_producer.flush()

if __name__ == '__main__':
    worker = InstagramWorker()
    worker.run()
```

---

## Database Schema Updates

### Add download_status column

```sql
-- Update competitor_videos table
ALTER TABLE competitor_videos 
ADD COLUMN download_status VARCHAR(20) DEFAULT 'pending' 
CHECK (download_status IN ('pending', 'downloading', 'downloaded', 'failed', 'skipped'));

CREATE INDEX idx_videos_download_status ON competitor_videos(download_status);
```

### Add media_download_jobs table (optional, for tracking)

```sql
CREATE TABLE media_download_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES competitor_videos(id),
    job_id UUID UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    worker_id VARCHAR(100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Thumbnail Generation Strategy

**Following DeepLens Pattern**: Generate thumbnails **on first read** if missing, or async after media upload.

### Option 1: On First Read (Lazy)

```csharp
// In API endpoint GET /api/videos/{id}
public async Task<VideoDto> GetVideo(Guid id)
{
    var video = await _db.CompetitorVideos.FindAsync(id);
    
    // Check if thumbnail exists
    if (string.IsNullOrEmpty(video.ThumbnailUrl))
    {
        // Generate thumbnail from media file
        var thumbnail = await _thumbnailService.GenerateFromMinIO(video.MediaUrl);
        video.ThumbnailUrl = thumbnail.Url;
        await _db.SaveChangesAsync();
    }
    
    return MapToDto(video);
}
```

### Option 2: Async After Upload (Eager)

```csharp
// In Kafka consumer for media download responses
private async Task HandleMediaDownloadResponse(MediaDownloadResponse response)
{
    // ... update video record ...
    
    // Publish thumbnail generation event
    if (string.IsNullOrEmpty(response.MinIOThumbnailUrl))
    {
        await _kafkaProducer.PublishAsync(
            "competitor.thumbnail.generation.requests",
            new { video_id = response.VideoId, media_url = response.MinIOMediaUrl }
        );
    }
}
```

**Recommendation**: Use **Option 2** (async after upload) - generates thumbnails proactively, better UX.

---

## SKU Linking Job

**Separate async job** runs after media download:

```csharp
// Hangfire job: runs daily
public async Task RunSkuLinkingJob()
{
    using var db = _dbFactory.CreateDbContext();
    
    // Get videos without SKU tags, downloaded in last 7 days
    var untaggedVideos = await db.CompetitorVideos
        .Where(v => v.DownloadStatus == "downloaded")
        .Where(v => v.TaggedSkuIds == null || v.TaggedSkuIds.Length == 0)
        .Where(v => v.ScrapedAt > DateTime.UtcNow.AddDays(-7))
        .ToListAsync();
    
    // Batch into groups of 50
    var batches = untaggedVideos.Chunk(50);
    
    foreach (var batch in batches)
    {
        var request = new SkuLinkingRequest
        {
            JobId = Guid.NewGuid(),
            VideoIds = batch.Select(v => v.Id).ToList(),
            Strategy = "ai_suggestion"
        };
        
        await _kafkaProducer.PublishAsync(
            "competitor.sku.linking.requests",
            request
        );
    }
}
```

---

## Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  competitor-orchestrator:
    image: deeplens/competitor-orchestrator:latest
    build: ./src/CompetitorIntel.Orchestrator
    environment:
      - DATABASE_URL=postgresql://...
      - KAFKA_BROKERS=kafka:9092
      - MINIO_ENDPOINT=minio:9000
    depends_on:
      - kafka
      - postgres
      - minio
    networks:
      - deeplens-network

  instagram-worker:
    image: deeplens/instagram-scraper:latest
    build: ./src/scraper-workers/instagram
    deploy:
      replicas: 3  # Run 3 instances
    environment:
      - KAFKA_BROKERS=kafka:9092
      - MINIO_ENDPOINT=minio:9000
    depends_on:
      - kafka
      - minio
    networks:
      - deeplens-network

  youtube-worker:
    image: deeplens/youtube-scraper:latest
    build: ./src/scraper-workers/youtube
    deploy:
      replicas: 2  # Run 2 instances
    environment:
      - KAFKA_BROKERS=kafka:9092
      - MINIO_ENDPOINT=minio:9000
    depends_on:
      - kafka
      - minio
    networks:
      - deeplens-network

networks:
  deeplens-network:
    external: true
```

---

## Advantages of This Architecture

✅ **Stateless Workers**: Scale horizontally, no session files on disk  
✅ **Event-Driven**: Matches DeepLens patterns, proven reliability  
✅ **Fault Tolerant**: Kafka guarantees delivery, can replay events  
✅ **Decoupled**: Workers don't know about orchestrator  
✅ **Observable**: Kafka UI shows message flow  
✅ **Scalable**: Add more worker replicas as needed  
✅ **Two-Phase**: Metadata → Download (can prioritize)  
✅ **Delta Sync**: Only fetch new content since last scrape  
✅ **Async SKU Linking**: Doesn't block scraping pipeline  

---

## Next Steps

1. ✅ Review this architecture
2. 🔄 Update database schema (add download_status)
3. 🔄 Define Kafka topic configs (retention, partitions)
4. 🔄 Implement Orchestrator (.NET)
5. 🔄 Implement Instagram Worker (Python)
6. 🔄 Implement YouTube Worker (Python)
7. 🔄 Test end-to-end flow
8. 🔄 Deploy to staging

Would you like me to proceed with implementing the orchestrator or workers?


---

## Data Collection & Privacy Policy

# Data Collection Scope - What We Scrape

## ✅ What We DO Collect

### Post/Video Metadata
- Platform ID (Instagram shortcode, YouTube video ID)
- URL
- Title (YouTube only)
- Description/Caption
- Posted timestamp
- Poster username

### Engagement Metrics (Counts Only)
- ✅ **View count** (number)
- ✅ **Like count** (number)
- ✅ **Comment count** (number)
- ✅ **Share count** (number)
- ✅ **Repost count** (number, if applicable)
- ✅ **Save count** (Instagram, if available)

### Media Information
- Media type (video/image/carousel)
- Media URLs (for download)
- Thumbnail URL
- Video duration (seconds)
- Dimensions (width × height)
- File size (after download)

### Content Details
- Hashtags (array of strings)
- User mentions (array of usernames)
- Location (if tagged)
- Is Reel / Is Short (boolean)

### Platform-Specific
**Instagram**:
- Is Reel
- Is carousel
- Location tag

**YouTube**:
- Category
- Tags
- Subtitles available
- Language

---

## ❌ What We DON'T Collect

### Individual Interactions
- ❌ List of users who liked
- ❌ List of users who commented
- ❌ List of users who shared
- ❌ List of followers
- ❌ List of viewers

### Comment Details
- ❌ Individual comment text
- ❌ Comment authors
- ❌ Comment timestamps
- ❌ Comment threads/replies

**Why**: Privacy, storage efficiency, and we only need aggregated metrics for competitive intelligence.

### Private Information
- ❌ DMs/Private messages
- ❌ Story views (individual viewers)
- ❌ Private account posts
- ❌ Email addresses
- ❌ Phone numbers

### Platform Internals
- ❌ Instagram algorithm data
- ❌ Recommended posts
- ❌ Ad performance data
- ❌ Platform analytics (unless publicly shown)

---

## Data Schema Example

```json
{
  "platform_id": "CxxxxxYZ",
  "url": "https://instagram.com/p/CxxxxxYZ",
  "description": "Beautiful wedding saree collection",
  "posted_at": "2026-01-15T14:30:00Z",
  
  // ✅ COUNTS ONLY
  "view_count": 12500,
  "like_count": 450,
  "comment_count": 23,
  "share_count": 12,
  
  // ✅ METADATA
  "hashtags": ["#saree", "#wedding"],
  "mentions": ["@designer"],
  "location": "Mumbai",
  
  // ✅ MEDIA INFO
  "media_type": "video",
  "duration_seconds": 45,
  "media_url": "https://...",
  
  // ❌ NO INDIVIDUAL DATA
  "liked_by": null,  // We DON'T collect this
  "comments": null,  // We DON'T collect this
  "shared_by": null  // We DON'T collect this
}
```

---

## Engagement Snapshot Tracking

For **trend detection**, we store engagement metric snapshots over time:

```sql
CREATE TABLE engagement_snapshots (
    id UUID PRIMARY KEY,
    video_id UUID REFERENCES competitor_videos(id),
    
    -- ✅ Snapshot metrics (counts only)
    view_count INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    share_count INTEGER,
    
    -- ❌ NO individual user data
    
    snapshot_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Track growth rate (e.g., +500 views in 24 hours = viral spike).

---

## Privacy & Storage Benefits

### Privacy
- ✅ No PII (Personally Identifiable Information)
- ✅ No collection of individual user interactions
- ✅ Compliant with public data scraping guidelines

### Storage Efficiency
- ✅ ~5KB per video (metadata + counts)
- ❌ NOT 500KB+ (with all comments/likes)
- 100 videos = ~500KB vs 50MB

### Performance
- ✅ Fast queries (simple aggregates)
- ✅ Efficient indexing
- ✅ Smaller Kafka messages

---

## Comparison: With vs Without Individual Data

| Data Type                  | With Individual Data           | Counts Only (Our Approach) |
| -------------------------- | ------------------------------ | -------------------------- |
| **Storage per video**      | 500KB - 5MB                    | 5-10KB                     |
| **Kafka message size**     | 1-10MB                         | 10-50KB                    |
| **PostgreSQL performance** | Slow (JSON queries)            | Fast (indexed integers)    |
| **Privacy concerns**       | High                           | Low                        |
| **Useful for CI**          | No (we don't analyze comments) | Yes (metrics sufficient)   |

---

## What Matters for Competitive Intelligence

### ✅ We Need
- How many people engaged (counts)
- What content performed well (metrics)
- When spikes happened (trends)
- What hashtags were used (SEO)
- What products were featured (SKU linking)

### ❌ We Don't Need
- Who specifically liked/commented (individual users)
- Exact comment text (qualitative analysis)
- Follower lists (not relevant)
- Private interactions (not accessible anyway)

---

## Implementation Note

### Worker Scraping Logic

```python
# ✅ CORRECT: Extract counts only
metadata = {
    "view_count": post.video_view_count,
    "like_count": post.likes,
    "comment_count": post.comments,
    "share_count": post.shares
}

# ❌ WRONG: Don't iterate through individual items
# Don't do this:
# "liked_by": [user for user in post.get_likes()]  # NO!
# "comments": [comment.text for comment in post.get_comments()]  # NO!
```

### Database Storage

```sql
-- ✅ CORRECT: Numeric columns for counts
view_count INTEGER,
like_count INTEGER,
comment_count INTEGER,

-- ❌ WRONG: Don't store individual interactions
-- liked_by_users JSONB,  -- NO!
-- comment_list JSONB     -- NO!
```

---

## Summary

**Data Collection Philosophy**: 
> "Collect aggregated engagement metrics, not individual user interactions."

**Benefits**:
- ✅ Privacy-friendly
- ✅ Storage-efficient
- ✅ Fast performance
- ✅ Sufficient for competitive intelligence

**What We Track**:
- Content metadata (title, description, hashtags)
- Engagement counts (views, likes, comments, shares)
- Media information (type, duration, URL)
- Trend over time (snapshot counts)

**What We Skip**:
- Individual users (who liked, who commented)
- Comment text (unless manually reviewed later)
- Private data (not accessible)

---

**Status**: ✅ Documented  
**Applies To**: All scraper workers (Instagram, YouTube)  
**See Also**: `event-driven-architecture.md` - Metadata Response Schema

