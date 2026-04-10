# Follower & Following Count Tracking - Simplified Strategy

## Overview

Track **follower and following counts only** (no individual follower lists) to monitor competitor growth patterns, engagement quality, and detect viral spikes.

**Frequency**: Twice daily (every 12 hours)

---

## What We Track

### Daily Metrics (Twice Per Day)

- ✅ **Follower count** (total followers)
- ✅ **Following count** (total following)
- ✅ **Follower/following ratio** (quality metric)
- ✅ **Growth velocity** (followers gained per day)
- ✅ **Engagement rate** (calculated with video metrics)

### What We DON'T Track

- ❌ Individual follower usernames
- ❌ Individual follower profiles
- ❌ Follower lists
- ❌ Following lists
- ❌ Audience overlap
- ❌ Date followed timestamps

**Why**: 
- Too slow for large accounts (300K+ followers = 10+ days)
- High Instagram ban risk
- Storage intensive (150MB+ per account)
- Limited value vs counts-only approach

---

## Tracking Schedule

### Twice Daily Snapshots

| Time (UTC)   | Purpose                         |
| ------------ | ------------------------------- |
| **06:00 AM** | Morning snapshot (start of day) |
| **06:00 PM** | Evening snapshot (end of day)   |

**Why twice daily**:
- ✅ Catch intra-day growth spikes
- ✅ More granular than once daily
- ✅ Still very low scraping load (30 sec per competitor)
- ✅ Detect time-of-day patterns

---

## Platform Support

### Instagram ✅
- Follower count: ✅ Available
- Following count: ✅ Available
- Frequency: Twice daily
- Time: 30 seconds per account

### YouTube ✅
- Subscriber count: ✅ Available (public metric)
- Subscription count: ❌ Not available
- Frequency: Twice daily
- Time: 10 seconds per account

---

## Database Schema

### Table: `follower_snapshots`

```sql
CREATE TABLE follower_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES competitor_watchlist(id) ON DELETE CASCADE,
    
    -- Counts
    follower_count INTEGER NOT NULL,
    following_count INTEGER NOT NULL,
    follower_following_ratio DECIMAL(10,2),
    
    -- Calculated metrics (from engagement data)
    engagement_rate DECIMAL(5,2),  -- (avg_likes + avg_comments) / follower_count * 100
    
    -- Metadata
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_watchlist_snapshot UNIQUE(watchlist_id, snapshot_at)
);

CREATE INDEX idx_follower_snapshots_watchlist_time 
    ON follower_snapshots(watchlist_id, snapshot_at DESC);
CREATE INDEX idx_follower_snapshots_time 
    ON follower_snapshots(snapshot_at DESC);
```

### Growth Rate View

```sql
CREATE VIEW vw_follower_growth AS
WITH snapshot_pairs AS (
    SELECT
        watchlist_id,
        follower_count,
        following_count,
        snapshot_at,
        LAG(follower_count) OVER (PARTITION BY watchlist_id ORDER BY snapshot_at) as prev_followers,
        LAG(following_count) OVER (PARTITION BY watchlist_id ORDER BY snapshot_at) as prev_following,
        LAG(snapshot_at) OVER (PARTITION BY watchlist_id ORDER BY snapshot_at) as prev_snapshot_at
    FROM follower_snapshots
)
SELECT
    w.username,
    w.platform,
    s.watchlist_id,
    s.snapshot_at,
    s.follower_count,
    s.following_count,
    s.follower_count - COALESCE(s.prev_followers, 0) as followers_gained,
    ROUND(
        CASE
            WHEN s.prev_followers > 0 THEN
                ((s.follower_count - s.prev_followers)::numeric / s.prev_followers * 100)
            ELSE 0
        END, 2
    ) as follower_growth_percent,
    EXTRACT(EPOCH FROM (s.snapshot_at - s.prev_snapshot_at)) / 3600 as hours_since_last,
    ROUND(
        (s.follower_count - COALESCE(s.prev_followers, 0))::numeric / 
        NULLIF(EXTRACT(EPOCH FROM (s.snapshot_at - s.prev_snapshot_at)) / 86400, 0),
        0
    ) as followers_per_day
FROM snapshot_pairs s
JOIN competitor_watchlist w ON w.id = s.watchlist_id
WHERE s.prev_snapshot_at IS NOT NULL;
```

---

## Implementation

### Hangfire Job: Follower Count Tracking

```csharp
public class FollowerCountTrackingJob
{
    private readonly IDbContextFactory _dbFactory;
    private readonly IKafkaProducerService _kafkaProducer;
    private readonly ILogger<FollowerCountTrackingJob> _logger;
    
    // Runs twice daily: 6 AM and 6 PM UTC
    [AutomaticRetry(Attempts = 3)]
    public async Task TrackFollowerCounts()
    {
        using var db = _dbFactory.CreateDbContext();
        
        var watchlist = await db.CompetitorWatchlist
            .Where(w => w.Enabled)
            .Where(w => w.Platform == "instagram" || w.Platform == "youtube")
            .ToListAsync();
        
        _logger.LogInformation($"Tracking follower counts for {watchlist.Count} competitors");
        
        foreach (var item in watchlist)
        {
            var request = new FollowerCountRequest
            {
                JobId = Guid.NewGuid(),
                WatchlistId = item.Id,
                Platform = item.Platform,
                TargetUsername = item.Username,
                ScraperSession = await GetSessionForPlatform(item.Platform)
            };
            
            await _kafkaProducer.PublishAsync(
                "competitor.follower.tracking.requests",
                key: item.Id.ToString(),
                value: request
            );
            
            // Rate limiting: 30 second delay between competitors
            await Task.Delay(TimeSpan.FromSeconds(30));
        }
    }
}
```

### Hangfire Configuration

```csharp
// Morning snapshot (6 AM UTC)
RecurringJob.AddOrUpdate<FollowerCountTrackingJob>(
    "follower-count-morning",
    job => job.TrackFollowerCounts(),
    "0 6 * * *"  // 6:00 AM UTC
);

// Evening snapshot (6 PM UTC)
RecurringJob.AddOrUpdate<FollowerCountTrackingJob>(
    "follower-count-evening",
    job => job.TrackFollowerCounts(),
    "0 18 * * *"  // 6:00 PM UTC
);
```

---

## Kafka Topics

### Topic: `competitor.follower.tracking.requests`

```json
{
  "job_id": "uuid",
  "watchlist_id": "uuid",
  "platform": "instagram" | "youtube",
  "target_username": "competitor_sarees",
  
  // Session (for Instagram only)
  "scraper_session": {
    "instagram": {
      "session_cookies": "base64...",
      "user_agent": "Mozilla/5.0..."
    }
  },
  
  "correlation_id": "uuid",
  "timestamp": "2026-01-19T06:00:00Z"
}
```

### Topic: `competitor.follower.tracking.responses`

```json
{
  "job_id": "uuid",
  "watchlist_id": "uuid",
  "target_username": "competitor_sarees",
  "platform": "instagram" | "youtube",
  
  // Status
  "status": "success" | "failed",
  "error_message": null,
  
  // Counts
  "follower_count": 315420,
  "following_count": 342,
  "follower_following_ratio": 922.28,
  
  "worker_id": "instagram-worker-1",
  "processing_time_ms": 1200,
  "timestamp": "2026-01-19T06:01:30Z"
}
```

---

## Worker Implementation

### Instagram Worker: Follower Counts

```python
def track_follower_counts(request: FollowerCountRequest):
    """
    Fetch follower/following counts (fast, safe operation)
    """
    # Load session
    session_data = base64.b64decode(request.scraper_session['instagram']['session_cookies'])
    cookies = pickle.loads(session_data)
    
    L = instaloader.Instaloader()
    L.context._session.cookies.update(cookies)
    
    # Fetch profile (lightweight - just metadata, no iteration)
    profile = instaloader.Profile.from_username(L.context, request.target_username)
    
    # Extract counts (instant - no scraping required)
    follower_count = profile.followers  # Property, not method
    following_count = profile.followees  # Property, not method
    
    response = {
        "job_id": request.job_id,
        "watchlist_id": request.watchlist_id,
        "target_username": request.target_username,
        "platform": "instagram",
        "status": "success",
        "follower_count": follower_count,
        "following_count": following_count,
        "follower_following_ratio": round(follower_count / following_count, 2) if following_count > 0 else 0,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    publish_to_kafka("competitor.follower.tracking.responses", response)
    
    return response
```

### YouTube Worker: Subscriber Counts

```python
def track_subscriber_counts(request: FollowerCountRequest):
    """
    Fetch YouTube subscriber count
    """
    try:
        # YouTube public data (no auth needed for subscriber count)
        ydl_opts = {'quiet': True, 'no_warnings': True}
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(
                f"https://www.youtube.com/@{request.target_username}",
                download=False
            )
            
            subscriber_count = info.get('channel_follower_count',  0) or \
                              info.get('subscriber_count', 0)
        
        response = {
            "job_id": request.job_id,
            "watchlist_id": request.watchlist_id,
            "target_username": request.target_username,
            "platform": "youtube",
            "status": "success",
            "follower_count": subscriber_count,  # Subscribers = Followers
            "following_count": 0,  # YouTube doesn't expose this
            "follower_following_ratio": 0,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        publish_to_kafka("competitor.follower.tracking.responses", response)
        
        return response
        
    except Exception as e:
        # Error handling
        pass
```

---

## Orchestrator: Response Handler

```csharp
private async Task HandleFollowerCountResponse(FollowerCountResponse response)
{
    using var db = _dbFactory.CreateDbContext();
    
    // Get previous snapshot for comparison
    var previousSnapshot = await db.FollowerSnapshots
        .Where(s => s.WatchlistId == response.WatchlistId)
        .OrderByDescending(s => s.SnapshotAt)
        .FirstOrDefaultAsync();
    
    // Create new snapshot
    var snapshot = new FollowerSnapshot
    {
        Id = Guid.NewGuid(),
        WatchlistId = response.WatchlistId,
        FollowerCount = response.FollowerCount,
        FollowingCount = response.FollowingCount,
        FollowerFollowingRatio = response.FollowerFollowingRatio,
        SnapshotAt = response.Timestamp
    };
    
    await db.FollowerSnapshots.AddAsync(snapshot);
    
    // Update watchlist item with latest counts
    var watchlistItem = await db.CompetitorWatchlist.FindAsync(response.WatchlistId);
    if (watchlistItem != null)
    {
        watchlistItem.FollowerCount = response.FollowerCount;
        watchlistItem.FollowingCount = response.FollowingCount;
        watchlistItem.UpdatedAt = DateTime.UtcNow;
        
        // Check for growth spikes (>10% in 12 hours)
        if (previousSnapshot != null)
        {
            var hoursSinceLastSnapshot = (snapshot.SnapshotAt - previousSnapshot.SnapshotAt).TotalHours;
            
            if (hoursSinceLastSnapshot <= 18)  // Within expected window (12h ± 6h)
            {
                var growthPercent = ((double)(response.FollowerCount - previousSnapshot.FollowerCount) 
                    / previousSnapshot.FollowerCount) * 100;
                
                if (growthPercent > 10)
                {
                    _logger.LogWarning(
                        $"⚡ Viral growth detected: {watchlistItem.Username} " +
                        $"gained {growthPercent:F1}% followers in {hoursSinceLastSnapshot:F1} hours"
                    );
                    
                    // Trigger alert
                    await _alertService.SendAlertAsync(
                        type: "follower_spike",
                        competitor: watchlistItem.Username,
                        message: $"+{growthPercent:F1}% follower growth in {hoursSinceLastSnapshot:F0}h"
                    );
                }
            }
        }
    }
    
    await db.SaveChangesAsync();
    
    _logger.LogInformation(
        $"Saved follower snapshot for {watchlistItem?.Username}: " +
        $"{response.FollowerCount:N0} followers " +
        $"({(previousSnapshot != null ? response.FollowerCount - previousSnapshot.FollowerCount : 0):+#,##0;-#,##0;0})"
    );
}
```

---

## Insights & Analytics

### 1. Growth Velocity

```sql
-- Follower growth over last 30 days
SELECT
    username,
    MIN(snapshot_at) as start_date,
    MAX(snapshot_at) as end_date,
    MIN(follower_count) as start_followers,
    MAX(follower_count) as end_followers,
    MAX(follower_count) - MIN(follower_count) as total_gain,
    ROUND(
        (MAX(follower_count) - MIN(follower_count))::numeric / 
        EXTRACT(DAYS FROM (MAX(snapshot_at) - MIN(snapshot_at))), 
        0
    ) as avg_followers_per_day
FROM vw_follower_growth
WHERE snapshot_at >= NOW() - INTERVAL '30 days'
GROUP BY username
ORDER BY avg_followers_per_day DESC;
```

### 2. Engagement Rate (Follower Quality)

```sql
-- Engagement rate = (avg engagement / follower count) * 100
SELECT
    w.username,
    fs.follower_count,
    AVG(v.like_count + v.comment_count) as avg_engagement,
    ROUND(
        (AVG(v.like_count + v.comment_count) / fs.follower_count * 100), 
        2
    ) as engagement_rate_percent,
    CASE
        WHEN (AVG(v.like_count + v.comment_count) / fs.follower_count * 100) > 5 THEN 'Excellent'
        WHEN (AVG(v.like_count + v.comment_count) / fs.follower_count * 100) > 2 THEN 'Good'
        WHEN (AVG(v.like_count + v.comment_count) / fs.follower_count * 100) > 1 THEN 'Average'
        ELSE 'Poor (bot followers?)'
    END as quality_rating
FROM competitor_watchlist w
JOIN follower_snapshots fs ON fs.watchlist_id = w.id
JOIN competitor_videos v ON v.watchlist_id = w.id
WHERE v.posted_at >= NOW() - INTERVAL '30 days'
  AND fs.snapshot_at = (SELECT MAX(snapshot_at) FROM follower_snapshots WHERE watchlist_id = w.id)
GROUP BY w.username, fs.follower_count
ORDER BY engagement_rate_percent DESC;
```

### 3. Follow-for-Follow Detection

```sql
-- Accounts with suspicious following patterns
SELECT
    username,
    follower_count,
    following_count,
    follower_following_ratio,
    CASE
        WHEN follower_following_ratio < 0.5 THEN '🚩 Likely Follow-for-Follow'
        WHEN follower_following_ratio < 1.0 THEN '⚠️ Moderate Growth Strategy'
        WHEN follower_following_ratio < 10 THEN '✅ Organic Growth'
        ELSE '⭐ Influencer/Brand'
    END as growth_strategy,
    CASE
        WHEN follower_following_ratio < 0.5 THEN 'Low quality followers, high churn risk'
        WHEN follower_following_ratio < 1.0 THEN 'Mixed strategy, moderate quality'
        ELSE 'High quality organic followers'
    END as quality_assessment
FROM vw_follower_growth
WHERE snapshot_at IN (
    SELECT MAX(snapshot_at) FROM follower_snapshots GROUP BY watchlist_id
)
ORDER BY follower_following_ratio ASC;
```

### 4. Viral Spike Detection

```sql
-- Detect accounts with >20% growth in 24 hours
WITH daily_growth AS (
    SELECT
        watchlist_id,
        username,
        follower_count,
        LAG(follower_count) OVER (PARTITION BY watchlist_id ORDER BY snapshot_at) as prev_count,
        snapshot_at,
        LAG(snapshot_at) OVER (PARTITION BY watchlist_id ORDER BY snapshot_at) as prev_snapshot
    FROM vw_follower_growth
)
SELECT
    username,
    prev_count as before,
    follower_count as after,
    follower_count - prev_count as gained,
    ROUND(
        ((follower_count - prev_count)::numeric / prev_count * 100),
        1
    ) as growth_percent,
    EXTRACT(HOURS FROM (snapshot_at - prev_snapshot)) as hours_elapsed
FROM daily_growth
WHERE EXTRACT(HOURS FROM (snapshot_at - prev_snapshot)) <= 24
  AND ((follower_count - prev_count)::numeric / prev_count * 100) > 20
ORDER BY growth_percent DESC;
```

---

## Configuration

### config.yaml

```yaml
follower_tracking:
  enabled: true
  
  # Tracking schedule
  frequency: "twice_daily"  # Every 12 hours
  schedules:
    - cron: "0 6 * * *"   # 6:00 AM UTC
      name: "morning"
    - cron: "0 18 * * *"  # 6:00 PM UTC
      name: "evening"
  
  # Rate limiting
  delay_between_competitors_seconds: 30
  
  # Alerts
  alerts:
    growth_spike_threshold_percent: 10  # Alert if >10% growth in 12h
    drop_threshold_percent: 5  # Alert if >5% follower loss
```

---

## Storage Estimates

### Per Competitor

- **Snapshots**: 2 per day × 100 bytes = 200 bytes/day
- **Monthly**: 200 bytes × 30 days = 6KB/month
- **Yearly**: 200 bytes × 365 days = 73KB/year

### For 100 Competitors

- **Yearly**: 100 × 73KB = **7.3MB/year** ✅ Minimal!

### Comparison to Full Lists

| Approach        | Storage/Year (100 competitors) |
| --------------- | ------------------------------ |
| **Counts only** | 7.3MB ✅                        |
| **Full lists**  | 6.5GB ❌ (890x more)            |

---

## Benefits

### What We Get ✅

1. **Growth Tracking**: Follower velocity, growth trends
2. **Quality Metrics**: Engagement rate, follower quality
3. **Spike Detection**: Viral growth, suspicious drops
4. **Pattern Analysis**: Follow-for-follow detection
5. **Time-of-Day Insights**: Morning vs evening growth
6. **Minimal Risk**: Fast, safe, low Instagram ban risk
7. **Efficient**: 30 sec per competitor, 2x daily

### What We Don't Get ❌

1. Audience overlap (who follows multiple competitors)
2. Individual follower profiles
3. Influencer network mapping
4. Customer identification from followers

**Trade-off**: Worth it for safety, speed, and simplicity.

---

## Summary

**Tracking Strategy**: Follower/following counts only  
**Frequency**: Twice daily (6 AM, 6 PM UTC)  
**Platforms**: Instagram ✅, YouTube ✅  
**Storage**: ~7MB/year (100 competitors)  
**Time**: 30 seconds per competitor  
**Risk**: Very low (no list iteration)  
**Value**: High (growth velocity, quality metrics)  

**Status**: ✅ Production-ready, safe, scalable  
**Recommendation**: **Implement this** - perfect balance of insights vs complexity

---

**See Also**: 
- `instaloader-follower-api-analysis.md` - Why we don't track full lists
- `ui-settings-configuration.md` - Configuration UI (updated)
- `ui-settings-configuration.md` - Section 4: Follower Tracking UI
- `event-driven-architecture.md` - Integration with Kafka architecture
- `data-collection-scope.md` - Privacy and data collection policies
