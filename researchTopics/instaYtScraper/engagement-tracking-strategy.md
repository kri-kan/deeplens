# Engagement Tracking Strategy - Time-Series Performance

## Overview

Track engagement metrics over time to visualize content performance curves, identify viral spikes, and understand engagement decay patterns.

---

## Tracking Strategy

### New Posts (Age: 0-3 days)
**Frequency**: Every 3 hours  
**Snapshots per day**: 8  
**Total snapshots**: 24 (over 3 days)  
**Why**: Critical period for viral growth, need granular tracking

### Mature Posts (Age: 4+ days)
**Frequency**: Once per day  
**Snapshots per day**: 1  
**Duration**: Configurable (default: 30 days)  
**Why**: Engagement stabilizes, daily tracking sufficient

### Archive Posts (Age: 30+ days)
**Frequency**: Optional (weekly or stop tracking)  
**Why**: Engagement plateaus, minimal changes

---

## Lifecycle Timeline

```
Post Published
    ↓
┌─────────────────────────────────────────────────────────┐
│ Day 0-3: HIGH-FREQUENCY TRACKING (Every 3 hours)       │
│ Snapshots: 00:00, 03:00, 06:00, 09:00, 12:00,          │
│            15:00, 18:00, 21:00                          │
│ Purpose: Catch viral spikes, early engagement patterns │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Day 4-30: LOW-FREQUENCY TRACKING (Once per day)        │
│ Snapshots: Daily at 12:00 PM                           │
│ Purpose: Monitor long-tail engagement, SEO growth      │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Day 30+: ARCHIVE (Weekly or stop tracking)             │
│ Purpose: Historical reference only                      │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Updated: `engagement_snapshots` Table

```sql
CREATE TABLE engagement_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES competitor_videos(id) ON DELETE CASCADE,
    
    -- Engagement metrics (snapshot)
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    repost_count INTEGER DEFAULT 0,
    
    -- Metadata
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    video_age_hours INTEGER,  -- Age of video when snapshot taken
    tracking_phase VARCHAR(20),  -- 'early' | 'mature' | 'archive'
    
    -- Indexes
    CONSTRAINT unique_video_snapshot UNIQUE(video_id, snapshot_at)
);

-- Indexes for time-series queries
CREATE INDEX idx_snapshots_video_time ON engagement_snapshots(video_id, snapshot_at DESC);
CREATE INDEX idx_snapshots_phase ON engagement_snapshots(tracking_phase, snapshot_at DESC);
CREATE INDEX idx_snapshots_age ON engagement_snapshots(video_age_hours);

-- Hypertable for TimescaleDB (optional optimization)
-- SELECT create_hypertable('engagement_snapshots', 'snapshot_at');
```

### View: Latest Snapshot Per Video

```sql
CREATE VIEW vw_latest_engagement AS
SELECT DISTINCT ON (video_id)
    video_id,
    view_count,
    like_count,
    comment_count,
    share_count,
    snapshot_at,
    video_age_hours
FROM engagement_snapshots
ORDER BY video_id, snapshot_at DESC;
```

### View: Engagement Growth Rate

```sql
CREATE VIEW vw_engagement_growth AS
WITH snapshot_pairs AS (
    SELECT
        video_id,
        view_count,
        like_count,
        snapshot_at,
        LAG(view_count) OVER (PARTITION BY video_id ORDER BY snapshot_at) as prev_views,
        LAG(like_count) OVER (PARTITION BY video_id ORDER BY snapshot_at) as prev_likes,
        LAG(snapshot_at) OVER (PARTITION BY video_id ORDER BY snapshot_at) as prev_snapshot_at,
        video_age_hours
    FROM engagement_snapshots
)
SELECT
    video_id,
    snapshot_at,
    view_count,
    like_count,
    view_count - COALESCE(prev_views, 0) as views_gained,
    like_count - COALESCE(prev_likes, 0) as likes_gained,
    EXTRACT(EPOCH FROM (snapshot_at - prev_snapshot_at)) / 3600 as hours_since_last,
    CASE
        WHEN prev_views > 0 THEN 
            ROUND(((view_count - prev_views)::numeric / prev_views * 100), 2)
        ELSE NULL
    END as view_growth_percent,
    video_age_hours
FROM snapshot_pairs
WHERE prev_snapshot_at IS NOT NULL;
```

---

## Orchestrator Implementation

### Background Jobs (Hangfire)

#### Job 1: Early-Phase Tracking (Every 3 Hours)

```csharp
public class EarlyPhaseEngagementTrackingJob
{
    private readonly IDbContextFactory _dbFactory;
    private readonly IKafkaProducerService _kafkaProducer;
    
    // Runs every 3 hours
    [AutomaticRetry(Attempts = 3)]
    public async Task TrackEarlyPhaseVideos()
    {
        using var db = _dbFactory.CreateDbContext();
        
        // Get videos that are 0-3 days old
        var cutoffDate = DateTime.UtcNow.AddDays(-3);
        var earlyPhaseVideos = await db.CompetitorVideos
            .Where(v => v.PostedAt >= cutoffDate)
            .Where(v => v.DownloadStatus == "downloaded")  // Only track downloaded videos
            .ToListAsync();
        
        _logger.LogInformation($"Tracking {earlyPhaseVideos.Count} early-phase videos");
        
        foreach (var video in earlyPhaseVideos)
        {
            // Publish metadata refresh request (no media download)
            var request = new MetadataRefreshRequest
            {
                JobId = Guid.NewGuid(),
                VideoId = video.Id,
                PlatformVideoId = video.PlatformVideoId,
                Platform = video.Platform,
                SnapshotOnly = true,  // Only update engagement metrics
                TrackingPhase = "early",
                VideoAgeHours = (int)(DateTime.UtcNow - video.PostedAt).TotalHours
            };
            
            await _kafkaProducer.PublishAsync(
                "competitor.engagement.tracking.requests",
                key: video.Id.ToString(),
                value: request
            );
        }
    }
}
```

#### Job 2: Mature-Phase Tracking (Once Per Day)

```csharp
public class MaturePhaseEngagementTrackingJob
{
    // Runs once per day at 12:00 PM
    [AutomaticRetry(Attempts = 3)]
    public async Task TrackMaturePhaseVideos()
    {
        using var db = _dbFactory.CreateDbContext();
        
        // Get videos that are 4-30 days old
        var startDate = DateTime.UtcNow.AddDays(-30);
        var endDate = DateTime.UtcNow.AddDays(-3);
        
        var maturePhaseVideos = await db.CompetitorVideos
            .Where(v => v.PostedAt >= startDate && v.PostedAt < endDate)
            .Where(v => v.DownloadStatus == "downloaded")
            .ToListAsync();
        
        _logger.LogInformation($"Tracking {maturePhaseVideos.Count} mature-phase videos");
        
        foreach (var video in maturePhaseVideos)
        {
            var request = new MetadataRefreshRequest
            {
                JobId = Guid.NewGuid(),
                VideoId = video.Id,
                PlatformVideoId = video.PlatformVideoId,
                Platform = video.Platform,
                SnapshotOnly = true,
                TrackingPhase = "mature",
                VideoAgeHours = (int)(DateTime.UtcNow - video.PostedAt).TotalHours
            };
            
            await _kafkaProducer.PublishAsync(
                "competitor.engagement.tracking.requests",
                key: video.Id.ToString(),
                value: request
            );
        }
    }
}
```

### Hangfire Configuration

```csharp
// Startup.cs or Program.cs
RecurringJob.AddOrUpdate<EarlyPhaseEngagementTrackingJob>(
    "early-phase-tracking",
    job => job.TrackEarlyPhaseVideos(),
    "0 */3 * * *"  // Every 3 hours: 00:00, 03:00, 06:00, ...
);

RecurringJob.AddOrUpdate<MaturePhaseEngagementTrackingJob>(
    "mature-phase-tracking",
    job => job.TrackMaturePhaseVideos(),
    "0 12 * * *"  // Once per day at 12:00 PM
);
```

---

## Kafka Topics

### New Topic: `competitor.engagement.tracking.requests`

**Purpose**: Request engagement metric updates (no media download)

**Message Schema**:

```json
{
  "job_id": "uuid",
  "video_id": "uuid",
  "platform": "instagram" | "youtube",
  "platform_video_id": "CxxxxxYZ",
  
  // Tracking config
  "snapshot_only": true,  // Don't download media, just update metrics
  "tracking_phase": "early" | "mature" | "archive",
  "video_age_hours": 48,
  
  // Session
  "scraper_session": { /* same as before */ },
  
  "correlation_id": "uuid",
  "timestamp": "2026-01-19T12:00:00Z"
}
```

### New Topic: `competitor.engagement.tracking.responses`

**Message Schema**:

```json
{
  "job_id": "uuid",
  "video_id": "uuid",
  "platform_video_id": "CxxxxxYZ",
  
  // Status
  "status": "success" | "failed",
  "error_message": null,
  
  // Updated metrics
  "engagement": {
    "view_count": 15000,  // +2500 since last snapshot
    "like_count": 520,    // +70 since last snapshot
    "comment_count": 28,  // +5 since last snapshot
    "share_count": 15,     // +3 since last snapshot
    "repost_count": 7
  },
  
  // Snapshot metadata
  "video_age_hours": 48,
  "tracking_phase": "early",
  "snapshot_at": "2026-01-19T12:00:00Z",
  
  "worker_id": "instagram-worker-2",
  "timestamp": "2026-01-19T12:01:30Z"
}
```

---

## Worker Implementation

### Instagram Worker: Engagement Snapshot

```python
def refresh_engagement_metrics(request: MetadataRefreshRequest):
    """
    Fetch only engagement metrics (no media download)
    """
    # Load session
    session_data = base64.b64decode(request.scraper_session['session_cookies'])
    cookies = pickle.loads(session_data)
    
    L = instaloader.Instaloader()
    L.context._session.cookies.update(cookies)
    
    # Fetch post
    post = instaloader.Post.from_shortcode(L.context, request.platform_video_id)
    
    # Extract ONLY engagement metrics
    engagement = {
        "view_count": post.video_view_count if post.is_video else 0,
        "like_count": post.likes,
        "comment_count": post.comments,
        "share_count": 0,  # Instagram doesn't expose share count directly
        "repost_count": 0
    }
    
    # Publish response
    response = {
        "job_id": request.job_id,
        "video_id": request.video_id,
        "platform_video_id": request.platform_video_id,
        "status": "success",
        "engagement": engagement,
        "video_age_hours": request.video_age_hours,
        "tracking_phase": request.tracking_phase,
        "snapshot_at": datetime.utcnow().isoformat()
    }
    
    publish_to_kafka("competitor.engagement.tracking.responses", response)
    
    return response
```

---

## Orchestrator: Snapshot Handler

```csharp
private async Task HandleEngagementTrackingResponse(EngagementTrackingResponse response)
{
    using var db = _dbFactory.CreateDbContext();
    
    // Create engagement snapshot
    var snapshot = new EngagementSnapshot
    {
        Id = Guid.NewGuid(),
        VideoId = response.VideoId,
        ViewCount = response.Engagement.ViewCount,
        LikeCount = response.Engagement.LikeCount,
        CommentCount = response.Engagement.CommentCount,
        ShareCount = response.Engagement.ShareCount,
        RepostCount = response.Engagement.RepostCount,
        SnapshotAt = response.SnapshotAt,
        VideoAgeHours = response.VideoAgeHours,
        TrackingPhase = response.TrackingPhase
    };
    
    await db.EngagementSnapshots.AddAsync(snapshot);
    
    // Also update latest metrics in competitor_videos table
    var video = await db.CompetitorVideos.FindAsync(response.VideoId);
    if (video != null)
    {
        video.ViewCount = response.Engagement.ViewCount;
        video.LikeCount = response.Engagement.LikeCount;
        video.CommentCount = response.Engagement.CommentCount;
        video.UpdatedAt = DateTime.UtcNow;
    }
    
    await db.SaveChangesAsync();
    
    _logger.LogInformation(
        $"Saved engagement snapshot for video {response.VideoId}: " +
        $"{response.Engagement.ViewCount} views (+{GetGrowth(response.VideoId, "view_count")})"
    );
}
```

---

## Configuration

### config.yaml

```yaml
engagement_tracking:
  enabled: true
  
  early_phase:
    age_days: 3  # 0-3 days
    frequency_hours: 3  # Every 3 hours
    snapshots_per_day: 8
    
  mature_phase:
    start_age_days: 4
    end_age_days: 30
    frequency_hours: 24  # Once per day
    snapshot_time: "12:00"  # Noon UTC
    
  archive_phase:
    start_age_days: 31
    enabled: false  # Stop tracking after 30 days
    frequency_days: 7  # Weekly (if enabled)
    
  # Performance limits
  max_videos_per_batch: 100  # Process in batches to avoid rate limits
  batch_delay_seconds: 60  # Wait 1 min between batches
```

---

## UI: Performance Graph

### API Endpoint

```csharp
[HttpGet("videos/{videoId}/engagement-timeline")]
public async Task<ActionResult<EngagementTimelineResponse>> GetEngagementTimeline(
    Guid videoId,
    [FromQuery] int? hours = null  // Optional: limit to last N hours
)
{
    using var db = _dbFactory.CreateDbContext();
    
    var query = db.EngagementSnapshots
        .Where(s => s.VideoId == videoId)
        .OrderBy(s => s.SnapshotAt);
    
    if (hours.HasValue)
    {
        var cutoff = DateTime.UtcNow.AddHours(-hours.Value);
        query = query.Where(s => s.SnapshotAt >= cutoff);
    }
    
    var snapshots = await query.ToListAsync();
    
    return new EngagementTimelineResponse
    {
        VideoId = videoId,
        Snapshots = snapshots.Select(s => new EngagementDataPoint
        {
            Timestamp = s.SnapshotAt,
            ViewCount = s.ViewCount,
            LikeCount = s.LikeCount,
            CommentCount = s.CommentCount,
            VideoAgeHours = s.VideoAgeHours,
            TrackingPhase = s.TrackingPhase
        }).ToList()
    };
}
```

### React Component (Example)

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

function EngagementGraph({ videoId }: { videoId: string }) {
  const { data } = useEngagementTimeline(videoId);
  
  return (
    <LineChart width={800} height={400} data={data.snapshots}>
      <XAxis
        dataKey="timestamp"
        tickFormatter={(ts) => formatDate(ts)}
      />
      <YAxis yAxisId="left" />
      <YAxis yAxisId="right" orientation="right" />
      
      <Tooltip />
      <Legend />
      
      <Line
        yAxisId="left"
        type="monotone"
        dataKey="viewCount"
        stroke="#8884d8"
        name="Views"
        strokeWidth={2}
      />
      <Line
        yAxisId="right"
        type="monotone"
        dataKey="likeCount"
        stroke="#82ca9d"
        name="Likes"
        strokeWidth={2}
      />
      <Line
        yAxisId="right"
        type="monotone"
        dataKey="commentCount"
        stroke="#ffc658"
        name="Comments"
        strokeWidth={2}
      />
    </LineChart>
  );
}
```

---

## Example Timeline

```
Video Posted: Jan 15, 2026 at 10:00 AM

Day 0 (Jan 15):
  10:00 - Initial snapshot: 100 views, 5 likes
  13:00 - Snapshot 1: 500 views (+400), 25 likes (+20)
  16:00 - Snapshot 2: 1,200 views (+700), 55 likes (+30)
  19:00 - Snapshot 3: 3,500 views (+2,300), 120 likes (+65) [VIRAL SPIKE]
  22:00 - Snapshot 4: 6,000 views (+2,500), 200 likes (+80)

Day 1 (Jan 16):
  01:00 - Snapshot 5: 7,500 views (+1,500), 250 likes (+50)
  04:00 - Snapshot 6: 8,200 views (+700), 270 likes (+20)
  ... (8 snapshots total)

Day 2-3: Same pattern (8 snapshots/day)

Day 4-30: One snapshot per day at 12:00 PM

Day 30+: Stop tracking (or weekly)
```

---

## Insights Enabled

### 1. Viral Spike Detection
```sql
-- Find videos with >2x growth in 3 hours
SELECT
    v.title,
    s1.view_count as start_views,
    s2.view_count as end_views,
    s2.view_count - s1.view_count as views_gained,
    s2.snapshot_at
FROM engagement_snapshots s1
JOIN engagement_snapshots s2 ON s1.video_id = s2.video_id
JOIN competitor_videos v ON v.id = s1.video_id
WHERE s2.snapshot_at = s1.snapshot_at + INTERVAL '3 hours'
  AND s2.view_count > s1.view_count * 2;
```

### 2. Engagement Decay Rate
```sql
-- Calculate half-life of engagement
SELECT
    video_id,
    MAX(view_count) as peak_views,
    MIN(snapshot_at) FILTER (WHERE view_count >= MAX(view_count) * 0.5) as half_life_date
FROM engagement_snapshots
GROUP BY video_id;
```

### 3. Best Posting Time
```sql
-- Find which posting time gets best early engagement
SELECT
    EXTRACT(HOUR FROM v.posted_at) as posting_hour,
    AVG(s.view_count) FILTER (WHERE s.video_age_hours = 24) as avg_views_24h
FROM competitor_videos v
JOIN engagement_snapshots s ON s.video_id = v.id
GROUP BY posting_hour
ORDER BY avg_views_24h DESC;
```

---

## Storage Estimates

### Example: 100 Competitors, 10 Posts/Day

**Per Video**:
- Early phase (3 days): 24 snapshots × 50 bytes = 1.2KB
- Mature phase (27 days): 27 snapshots × 50 bytes = 1.35KB
- Total per video: ~2.5KB

**Per Month**:
- 100 competitors × 10 posts/day × 30 days = 30,000 videos
- 30,000 videos × 2.5KB = 75MB/month

**Per Year**: ~900MB (less than 1GB)

**Conclusion**: Very reasonable storage requirements ✅

---

## Summary

**Tracking Strategy**:
- ✅ Early phase (0-3 days): Every 3 hours
- ✅ Mature phase (4-30 days): Once per day
- ✅ Archive (30+ days): Stop tracking

**Benefits**:
- 📈 Visualize content performance curves
- 🔥 Detect viral spikes in real-time
- 📊 Understand engagement decay patterns
- 🎯 Identify best posting times
- 💡 Compare competitor performance

**Implementation**:
- 2 Hangfire background jobs
- 1 new Kafka topic pair
- Updated engagement_snapshots table
- Growth rate views
- React performance graphs

---

**Status**: ✅ Design complete  
**Estimated Development**: +2-3 days  
**Storage Impact**: ~1GB/year (minimal)  
**See Also**: `event-driven-architecture.md`, `data-collection-scope.md`
