# Account Rotation & Anti-Detection Strategy - ADDENDUM

## Anti-Detection Insight

**Key Principle**: Avoid fixed account-to-task affinity to prevent Instagram from detecting predictable patterns.

### Problem with Fixed Accounts

```
❌ PREDICTABLE PATTERN (Easy to Detect):
Account A → always scrapes competitor1 → downloads their videos
Account A → always scrapes competitor2 → downloads their videos
[Instagram can detect: Account A has affinity to these competitors]
```

### Solution: Account Pool with Rotation

```
✅ RANDOMIZED PATTERN (Harder to Detect):
Account A → scrapes competitor1 metadata
Account B → downloads competitor1 videos
Account C → scrapes competitor2 metadata  
Account A → downloads competitor2 videos
[Harder to detect patterns, appears more organic]
```

---

## Account Pool Strategy

### Phase 1: MVP (Single Account)

**Start simple**:
- 1-2 accounts total
- Same account for metadata + download
- Easier to implement and debug

**config.yaml**:
```yaml
scraping:
  account_strategy: "single"
  accounts:
    instagram:
      - account_id: "scraper_1"
        session_file: "session_1.dat"
```

---

### Phase 2: Production (Account Pool)

**Account rotation**:
- 3-5 accounts in pool
- Round-robin for metadata scraping
- Random selection for media downloads (different from metadata account)

**config.yaml**:
```yaml
scraping:
  account_strategy: "pool_rotation"  # or "round_robin" or "random"
  
  accounts:
    instagram:
      - account_id: "scraper_1"
        session_file: "session_1.dat"
        enabled: true
      - account_id: "scraper_2"
        session_file: "session_2.dat"
        enabled: true
      - account_id: "scraper_3"
        session_file: "session_3.dat"
        enabled: true
  
  media_download:
    use_same_account_as_metadata: false  # ← Anti-detection
    refetch_url_with_download_account: true
    randomize_delay_seconds: [60, 300]  # 1-5 min delay
```

---

## Updated Message Schemas

### Updated: `competitor.download.media.requests`

```json
{
  "job_id": "uuid",
  "video_id": "uuid",
  "platform": "instagram",
  "platform_video_id": "CxxxxxYZ",
  "target_username": "competitor1",  // ← NEW: needed for refetch
  
  // Download strategy
  "download_strategy": "direct" | "refetch",  // ← NEW
  
  // If direct: use this URL (same account)
  "media_url": "https://instagram.cdninstagram.com/...",
  
  // If refetch: worker re-fetches post with different account
  "media_url": null,
  
  // Session (can be DIFFERENT account than metadata scraping)
  "scraper_session": {
    "account_id": "scraper_2",  // ← Different from metadata account
    "session_cookies": "base64..."
  },
  
  "minio_bucket": "competitor-intel-media",
  "minio_path": "instagram/2026/01/18/CxxxxxYZ.mp4",
  
  "config": {
    "max_file_size_mb": 500,
    "video_quality": "best[height<=1080]",
    "generate_thumbnail": true,
    "randomize_delay_seconds": [60, 300]  // ← NEW: anti-detection
  },
  
  "correlation_id": "uuid",
  "timestamp": "2026-01-18T10:35:00Z"
}
```

---

## Updated Worker Logic

### Instagram Worker: Media Download with Refetch

```python
def download_instagram_media(request: MediaDownloadRequest):
    """
    Download Instagram media with anti-detection strategy
    """
    # Load session (potentially DIFFERENT account than metadata scraping)
    session_data = base64.b64decode(request.scraper_session['session_cookies'])
    cookies = pickle.loads(session_data)
    
    L = instaloader.Instaloader()
    L.context._session.cookies.update(cookies)
    
    if request.download_strategy == "direct" and request.media_url:
        # Simple: Use direct URL from metadata (same account)
        media = download_url(request.media_url, session=L.context._session)
    
    elif request.download_strategy == "refetch":
        # Anti-detection: Re-fetch post to get fresh URL with different account
        print(f"Re-fetching post {request.platform_video_id} with different account")
        
        # Re-fetch the post with the download account's session
        post = instaloader.Post.from_shortcode(L.context, request.platform_video_id)
        
        # Get fresh media URL (session-scoped to download account)
        media_url = post.video_url if post.is_video else post.url
        
        # Optional: Random delay before download (anti-detection)
        if request.config.get('randomize_delay_seconds'):
            delay = random.randint(*request.config['randomize_delay_seconds'])
            print(f"Waiting {delay}s before download (anti-detection)")
            sleep(delay)
        
        # Download with download account's session
        media = download_url(media_url, session=L.context._session)
    
    # Upload to MinIO
    upload_to_minio(media, request.minio_path)
    
    return {
        "status": "success",
        "minio_url": request.minio_path,
        "account_used": request.scraper_session['account_id']
    }
```

---

## Orchestrator: Account Manager

### Account Selection Logic

```csharp
public class AccountManager
{
    private List<ScraperAccount> _accounts;
    private int _roundRobinIndex = 0;
    private Random _random = new Random();
    
    // Round-robin selection (for metadata scraping)
    public ScraperAccount GetNextAccount()
    {
        var enabled = _accounts.Where(a => a.Enabled).ToList();
        if (!enabled.Any()) throw new Exception("No enabled accounts");
        
        var account = enabled[_roundRobinIndex % enabled.Count];
        _roundRobinIndex++;
        
        return account;
    }
    
    // Random selection excluding specific account (for media download)
    public ScraperAccount GetRandomAccount(string excludeAccountId = null)
    {
        var pool = _accounts.Where(a => a.Enabled).ToList();
        
        if (excludeAccountId != null)
        {
            pool = pool.Where(a => a.Id != excludeAccountId).ToList();
        }
        
        if (!pool.Any()) return GetNextAccount(); // Fallback
        
        return pool[_random.Next(pool.Count)];
    }
    
    // Get account that was used for metadata scraping
    public ScraperAccount GetAccountUsedFor(Guid watchlistId)
    {
        // Lookup from scraper_jobs table
        // Returns the account that scraped this competitor's metadata
    }
}
```

### Media Download Planning (Anti-Detection Version)

```csharp
private async Task PlanMediaDownloads(Guid accountId, string metadataAccountId)
{
    using var db = _dbFactory.CreateDbContext();
    
    var pendingVideos = await db.CompetitorVideos
        .Where(v => v.WatchlistId == accountId && v.DownloadStatus == "pending")
        .OrderByDescending(v => v.PostedAt)
        .Take(20)
        .ToListAsync();

    foreach (var video in pendingVideos)
    {
        // Get DIFFERENT account for download (anti-detection)
        var downloadAccount = _accountManager.GetRandomAccount(
            excludeAccountId: metadataAccountId
        );
        
        var request = new MediaDownloadRequest
        {
            JobId = Guid.NewGuid(),
            VideoId = video.Id,
            Platform = video.Platform,
            PlatformVideoId = video.PlatformVideoId,
            TargetUsername = video.CompetitorUsername,
            
            // Strategy: refetch (enables different account)
            DownloadStrategy = "refetch",
            MediaUrl = null,  // Will be fetched by worker
            
            // DIFFERENT account session
            ScraperSession = await GetSessionForAccount(downloadAccount),
            
            MinIOBucket = "competitor-intel-media",
            MinIOPath = $"{video.Platform}/{video.PostedAt:yyyy/MM/dd}/{video.PlatformVideoId}",
            Config = new DownloadConfig
            {
                MaxFileSizeMb = 500,
                VideoQuality = "best[height<=1080]",
                GenerateThumbnail = true,
                RandomizeDelaySeconds = new[] { 60, 300 }  // 1-5 min
            }
        };

        await _kafkaProducer.PublishAsync(
            "competitor.download.media.requests",
            key: downloadAccount.Id,  // Different key
            value: request
        );

        video.DownloadStatus = "downloading";
        video.DownloadAccountId = downloadAccount.Id;  // Track which account
    }

    await db.SaveChangesAsync();
}
```

---

## Anti-Detection Best Practices

### Temporal Randomization

✅ **Add jitter to scheduling**:
```csharp
// Instead of exactly 6:00 AM
var baseTime = TimeSpan.FromHours(6);
var jitter = TimeSpan.FromMinutes(Random.Shared.Next(0, 60));
var actualTime = baseTime + jitter;  // 6:00 - 6:59 AM
```

✅ **Delay downloads**:
```csharp
// Don't download immediately after scraping
// Wait 1-5 minutes with randomization
config.RandomizeDelaySeconds = [60, 300];
```

### Account Randomization

✅ **Different account per competitor**:
```
Competitor1 → Account A (today), Account B (tomorrow)
Competitor2 → Account C (today), Account A (tomorrow)
```

✅ **Different account for download**:
```
Scrape metadata: Account A
Download media:  Account B or C (random)
```

### Load Distribution

✅ **Spread downloads over time**:
```csharp
// Instead of downloading all 20 videos immediately
// Download 5 videos every 30 minutes
var batches = pendingVideos.Chunk(5);
foreach (var (batch, index) in batches.Select((b, i) => (b, i)))
{
    var delay = TimeSpan.FromMinutes(30 * index);
    // Schedule batch with delay
}
```

✅ **Randomize competitor scraping order**:
```csharp
// Don't always scrape in same order
var shuffled = watchlist.OrderBy(_ => Random.Shared.Next());
```

---

## Detection Patterns to Avoid

### ❌ Temporal Patterns
- Same exact time every day (6:00 AM)
- Immediate download after scraping
- Fixed intervals between actions

### ❌ Account Affinity
- Account X always scrapes Competitor Y
- Same account for metadata + download
- Predictable account rotation (A, B, C, A, B, C...)

### ❌ Volume Patterns
- 50 videos downloaded in 2 minutes
- All competitors scraped in 10 minutes
- Burst activity after long silence

---

## Implementation Phases

### Phase 1: MVP (Week 1-2)
- Single account
- `download_strategy: "direct"`
- `use_same_account_as_metadata: true`
- **Goal**: Get it working

### Phase 2: Basic Anti-Detection (Week 3-4)
- 2-3 accounts
- `download_strategy: "refetch"`
- `use_same_account_as_metadata: false`
- Random delays
- **Goal**: Avoid obvious patterns

### Phase 3: Advanced (Post-MVP)
- 3-5 accounts
- Account health tracking
- Automatic cooldowns
- Temporal randomization
- Load distribution
- **Goal**: Production-grade stealth

---

## Monitoring Account Health

### Track Per-Account Metrics

```sql
CREATE TABLE account_health_log (
    id UUID PRIMARY KEY,
    account_id UUID,
    operation_type VARCHAR(20),  -- 'metadata' or 'download'
    success BOOLEAN,
    error_code VARCHAR(50),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Query: Account health last 24 hours
SELECT 
    account_id,
    COUNT(*) as operations,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes,
    ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM account_health_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY account_id;
```

### Auto-Cooldown Logic

```csharp
public async Task<bool> IsAccountHealthy(string accountId)
{
    var recentFailures = await _db.AccountHealthLog
        .Where(l => l.AccountId == accountId)
        .Where(l => l.Timestamp > DateTime.UtcNow.AddHours(-1))
        .Where(l => !l.Success)
        .CountAsync();
    
    if (recentFailures >= 3)
    {
        // Put account on cooldown
        await SetAccountCooldown(accountId, hours: 24);
        return false;
    }
    
    return true;
}
```

---

## Summary

**Anti-Detection Strategy**:
1. **Account Pool**: 3-5 accounts instead of 1
2. **Different Accounts**: Metadata account ≠ Download account
3. **Refetch Strategy**: Worker re-fetches post with download account
4. **Randomization**: Delays, order, timing
5. **Load Distribution**: Spread actions over time

**Configuration Flexibility**:
- Phase 1: `use_same_account_as_metadata: true` (simple)
- Phase 2: `use_same_account_as_metadata: false` (stealth)

**Implementation Complexity**:
- Simple version: +0 days
- Anti-detection version: +1-2 days

**Recommendation**: Start simple (Phase 1), upgrade to anti-detection (Phase 2) after MVP is proven.

---

**Created**: 2026-01-19  
**Status**: Design complete, ready for implementation


---

## Additional Best Practices & Tips

Use a Dedicated Account: Never use your primary account. Instagram frequently suspends accounts showing automated activity.
Implement Delays: Do not scrape all 200 Reels at once. Use a delay of at least 2–5 seconds between each post download to mimic human behavior.
Avoid Parallel Requests: Running multiple instances of Instaloader or using the Instagram app on another device simultaneously will trigger a 429 "Too Many Requests" error.
Session Management: Load your session from a file (--sessionfile or load_session_from_file) rather than logging in with a password every time you run the script. Constant logins are highly suspicious.
Resume Capability: If the process is interrupted by a block, use the --fast-update or --latest-stamps flag to resume from where you left off without re-downloading existing content.
Residential Proxies: If scraping from a server or data center, use a rotating residential proxy to avoid IP-level bans


The "Two-Step" Approach
To safely scrape a large volume like 200 Reels:
Step 1 (Scan): Use a script to iterate through the profile, printing or saving the shortcodes and dates of the Reels you want. This uses fewer requests than a full download.
Step 2 (Targeted Download): Once you have a filtered list of only the 200 Reels you need, run a separate loop to download them one by one with a random sleep delay of 5–10 seconds between each to avoid account flags


Session Management: Always use load_session_from_file. Frequent password-based logins are a major red flag for Instagram's security systems.
Rate Limits: For a batch of 200, do not exceed 30-40 downloads per hour. If you try to do all 200 in a single hour, your account will likely be flagged for "Suspicious Activity".
Post-Scrape Cleanup: Instaloader creates multiple files per post (JSON, TXT, and JPG/MP4). If you only want the video, you can use the --no-captions or --no-metadata-json flags in your initial Instaloader() setup.


