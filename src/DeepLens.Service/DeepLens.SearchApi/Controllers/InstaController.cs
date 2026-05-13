using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Instagram;
using DeepLens.Application.Abstractions.Data;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Dapper;
using DeepLens.Infrastructure.Services;
using DeepLens.Domain.Enums;
using System.Linq;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class InstaController : ControllerBase
{
    private readonly IMetaGraphService _metaGraph;
    private readonly IDbConnectionFactory _db;
    private readonly IStorageService _storage;
    private readonly IInstagramMediaService _instaMedia;
    private readonly ILogger<InstaController> _logger;

    private const string MetaPostSelectSql = @"
        SELECT 
            cv.id::text AS Id, 
            cv.platform_video_id AS PlatformId,
            cv.url AS Permalink, 
            cv.description AS Caption,
            cv.media_type AS MediaType, 
            cv.thumbnail_url AS ThumbnailUrl, 
            cv.media_url AS MediaUrl,
            cv.like_count AS LikeCount, 
            cv.comment_count AS CommentCount, 
            cv.posted_at AS Timestamp,
            cv.storage_path AS StoragePath,
            cv.youtube_video_id AS YoutubeVideoId,
            cv.youtube_url AS YoutubeUrl,
            (SELECT p.base_sku FROM instagram_product_links ipl JOIN products p ON p.id = ipl.product_id WHERE ipl.post_id = cv.id AND ipl.link_type = 'is' LIMIT 1) as ProductCode
        FROM competitor_videos cv";

    public InstaController(
        IMetaGraphService metaGraph,
        IDbConnectionFactory db,
        IStorageService storage,
        IInstagramMediaService instaMedia,
        ILogger<InstaController> logger)
    {
        _metaGraph = metaGraph;
        _db = db;
        _storage = storage;
        _instaMedia = instaMedia;
        _logger = logger;
    }

    public class WatchlistItem
    {
        [JsonPropertyName("id")]
        public Guid Id { get; set; }
        [JsonPropertyName("username")]
        public string Username { get; set; } = string.Empty;
        [JsonPropertyName("name")]
        public string? Name { get; set; }
        [JsonPropertyName("profilePictureUrl")]
        public string? ProfilePictureUrl { get; set; }
        [JsonPropertyName("storagePath")]
        public string? StoragePath { get; set; }
        [JsonPropertyName("biography")]
        public string? Biography { get; set; }
        [JsonPropertyName("followersCount")]
        public int FollowersCount { get; set; }
        [JsonPropertyName("mediaCount")]
        public int MediaCount { get; set; }
        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; }
        [JsonPropertyName("isOwnAccount")]
        public bool IsOwnAccount { get; set; }
        [JsonPropertyName("lastSyncedAt")]
        public DateTime? LastSyncedAt { get; set; }
    }

    [HttpGet]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> GetWatchlist()
    {
        using var conn = await _db.CreateConnectionAsync();
        var watchlist = await conn.QueryAsync<WatchlistItem>(@"
            SELECT 
                id AS Id, 
                username AS Username, 
                display_name AS Name, 
                profile_pic_url AS ProfilePictureUrl, 
                profile_pic_storage_path AS StoragePath,
                bio AS Biography, 
                follower_count AS FollowersCount, 
                post_count AS MediaCount, 
                is_active AS IsActive, 
                is_own_account AS IsOwnAccount, 
                last_scraped_at AS LastSyncedAt
            FROM competitor_watchlist 
            WHERE platform = 'instagram' 
            ORDER BY is_own_account DESC, username ASC");

        return Ok(watchlist);
    }

    [HttpGet("profile/{username}")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> GetProfile(
        string username, 
        [FromQuery] string sortBy = "date", 
        [FromQuery] string sortOrder = "desc",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        using var conn = await _db.CreateConnectionAsync();
        var profileInfo = await conn.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT id, username, display_name, profile_pic_url, profile_pic_storage_path, bio, 
                   follower_count, following_count, post_count, last_scraped_at, 
                   external_id, is_active, is_data_deleted, is_own_account 
            FROM competitor_watchlist 
            WHERE LOWER(username) = LOWER(@username) AND platform = 'instagram'", 
            new { username });

        if (profileInfo == null) return NotFound();

        bool isDeleted = profileInfo.is_data_deleted ?? false;
        var videos = new List<MetaPost>();
        
        if (!isDeleted)
        {
            // Dynamic Sort Logic
            string orderBy = sortBy.ToLower() switch {
                "likes" => "like_count",
                "comments" => "comment_count",
                _ => "posted_at"
            };
            string direction = sortOrder.ToLower() == "asc" ? "ASC" : "DESC";

            var dateFilter = "";
            if (fromDate.HasValue) dateFilter += " AND posted_at >= @fromDate";
            if (toDate.HasValue) dateFilter += " AND posted_at <= @toDate";

            // 2. Get Recent Posts from Database to avoid API throttling
            var sql = $@"{MetaPostSelectSql}
                WHERE cv.watchlist_id = (SELECT id FROM competitor_watchlist WHERE LOWER(username) = LOWER(@username) AND platform = 'instagram')
                {dateFilter}
                ORDER BY {orderBy} {direction}
                LIMIT 1000";

            videos = (await conn.QueryAsync<MetaPost>(sql, new { username, fromDate, toDate })).ToList();
        }

        double postFrequency = 0;
        if (videos.Count > 1)
        {
            try
            {
                // Find latest and oldest since order may vary
                var dates = videos.Where(v => v.Timestamp.HasValue)
                                  .Select(v => v.Timestamp!.Value)
                                  .OrderByDescending(d => d).ToList();
                var latest = dates.First();
                var oldest = dates.Last();
                var days = (latest - oldest).TotalDays;
                if (days > 0)
                {
                    postFrequency = (double)videos.Count / days * 7; // Posts per week
                }
            }
            catch { /* Ignore parsing errors */ }
        }

        var composite = new InstagramProfileDetailsDto
        {
            Profile = new InstagramProfileDto
            {
                UserId = (string?)profileInfo.external_id ?? string.Empty,
                Username = (string?)profileInfo.username ?? string.Empty,
                Name = (string?)profileInfo.display_name ?? string.Empty,
                Biography = (string?)profileInfo.bio ?? string.Empty,
                FollowersCount = profileInfo.follower_count ?? 0,
                FollowingCount = profileInfo.following_count ?? 0,
                MediaCount = profileInfo.post_count ?? 0,
                ProfilePictureUrl = (string?)profileInfo.profile_pic_url ?? string.Empty,
                StoragePath = (string?)profileInfo.profile_pic_storage_path,
                IsPrivate = false,
                IsVerified = false,
                IsActive = profileInfo.is_active ?? true,
                IsOwnAccount = profileInfo.is_own_account ?? false,
                IsDataDeleted = isDeleted,
                LastSyncedAt = (DateTime?)profileInfo.last_scraped_at
            },
            Videos = videos,
            Metrics = new InstagramMetricsDto
            {
                AvgLikes = videos.Count > 0 ? videos.Average(v => v.LikeCount) : 0,
                EngagementRate = (videos.Count > 0 && (profileInfo.follower_count ?? 0) > 0) ? (videos.Average(v => v.LikeCount) / (double)profileInfo.follower_count) * 100 : 0,
                PostFrequency = postFrequency
            }
        };

        return Ok(composite);
    }

    [HttpPost("profile/{username}")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> AddToWatchlist(string username)
    {
        using var conn = await _db.CreateConnectionAsync();
        var exists = await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM competitor_watchlist WHERE LOWER(username) = LOWER(@Username) AND platform = 'instagram')", 
            new { Username = username });

        if (exists) return BadRequest(new { message = "Profile already in watchlist" });

        await _metaGraph.ReloadFromDbAsync();
        var profile = await _metaGraph.GetProfileAsync(username);
        if (profile == null) return NotFound(new { message = "Profile not found on Instagram" });

        await conn.ExecuteAsync(@"
            INSERT INTO competitor_watchlist (
                username, platform, display_name, profile_pic_url, bio, 
                follower_count, following_count, post_count, last_scraped_at, external_id)
            VALUES (
                @Username, 'instagram', @Name, @ProfilePictureUrl, @Bio, 
                @FollowersCount, @FollowingCount, @MediaCount, NULL, @ExternalId)",
            new { 
                Username = username, 
                Name = profile.Name, 
                ProfilePictureUrl = profile.ProfilePictureUrl, 
                Bio = profile.Biography,
                FollowersCount = (int)profile.FollowersCount, 
                FollowingCount = (int)profile.FollowingCount,
                MediaCount = profile.MediaCount,
                ExternalId = profile.ExternalId
            });

        return Ok(new { message = "Profile added to watchlist", profile });
    }

    [HttpDelete("profile/{username}")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> RemoveFromWatchlist(string username)
    {
        using var conn = await _db.CreateConnectionAsync();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM competitor_watchlist WHERE LOWER(username) = LOWER(@Username) AND platform = 'instagram'", 
            new { Username = username });

        if (rows == 0) return NotFound();
        return Ok(new { message = "Profile removed from watchlist" });
    }

    [HttpGet("posts/{username}")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult<List<MetaPost>>> GetPosts(string username, [FromQuery] int limit = 10)
    {
        await _metaGraph.ReloadFromDbAsync();
        var posts = await _metaGraph.GetPostsAsync(username, limit > 10 ? 2 : 1);
        return Ok(posts.Take(limit).ToList());
    }

    [HttpGet("token")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> GetTokenHealth()
    {
        await _metaGraph.ReloadFromDbAsync();
        var health = _metaGraph.GetTokenHealth();
        return Ok(health);
    }

    [HttpGet("quota")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult<MetaQuotaInfo>> GetQuota()
    {
        await _metaGraph.ReloadFromDbAsync();
        var quota = await _metaGraph.GetQuotaAsync();
        return Ok(quota);
    }

    [HttpPost("token/exchange")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> ExchangeToken([FromBody] string shortLivedToken)
    {
        await _metaGraph.ReloadFromDbAsync();
        var longLivedToken = await _metaGraph.ExchangeForLongLivedTokenAsync(shortLivedToken);
        
        if (string.IsNullOrEmpty(longLivedToken))
            return BadRequest(new { message = "Token exchange failed" });

        return Ok(new { message = "Token exchanged and saved" });
    }

    [HttpPost("token/refresh")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> RefreshToken()
    {
        await _metaGraph.ReloadFromDbAsync();
        var success = await _metaGraph.RefreshTokenAsync();

        if (!success) 
            return BadRequest(new { message = "Token refresh failed. The current token might be invalid or expired. Please provide a new Short-Lived Token in Settings." });
        
        var health = _metaGraph.GetTokenHealth();
        return Ok(new { message = "Token updated successfully", health });
    }

    [HttpPost("profile/{username}/sync")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> SyncProfile(string username, [FromQuery] int maxPosts = 50)
    {
        await _metaGraph.ReloadFromDbAsync();
        
        using var conn = await _db.CreateConnectionAsync();
        
        // 1. Ensure in watchlist
        var watchlistId = await conn.QueryFirstOrDefaultAsync<Guid?>(
            "SELECT id FROM competitor_watchlist WHERE LOWER(username) = LOWER(@username) AND platform = 'instagram'", 
            new { username });

        if (watchlistId == null)
        {
            var profile = await _metaGraph.GetProfileAsync(username);
            if (profile == null) return NotFound(new { message = "Profile not found on Instagram" });

            watchlistId = Guid.NewGuid();
            await conn.ExecuteAsync(@"
                INSERT INTO competitor_watchlist (
                    id, username, platform, display_name, profile_pic_url, bio, 
                    follower_count, following_count, post_count, last_scraped_at, external_id)
                VALUES (
                    @Id, @Username, 'instagram', @Name, @ProfilePictureUrl, @Bio, 
                    @FollowersCount, @FollowingCount, @MediaCount, NULL, @ExternalId)",
                new { 
                    Id = watchlistId,
                    Username = username, 
                    Name = profile.Name, 
                    ProfilePictureUrl = profile.ProfilePictureUrl, 
                    Bio = profile.Biography,
                    FollowersCount = (int)profile.FollowersCount, 
                    FollowingCount = (int)profile.FollowingCount,
                    MediaCount = profile.MediaCount,
                    ExternalId = profile.ExternalId
                });
        }

        // 2. Queue Job (Priority 10 for manual)
        var jobId = Guid.NewGuid();
        await conn.ExecuteAsync(@"
            INSERT INTO scraper_queue (id, watchlist_id, job_type, status, priority, target_count)
            VALUES (@Id, @watchlistId, 'manual', 'pending', 10, @targetCount)",
            new { Id = jobId, watchlistId, targetCount = maxPosts });

        return Ok(new { 
            message = "Deep Sync Job Queued", 
            jobId,
            username,
            targetCount = maxPosts
        });
    }

    // ── Job & Queue Management ──────────────────────────────────────────────────

    [HttpGet("jobs/active")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> GetActiveJobs()
    {
        using var conn = await _db.CreateConnectionAsync();
        var jobs = await conn.QueryAsync<ScraperJobDto>(@"
            SELECT j.id, w.username, j.job_type as JobType, j.status, j.priority, 
                   j.target_count as TargetCount, j.scraped_count as ScrapedCount, 
                   j.next_run_at as NextRunAt, j.started_at as StartedAt,
                   'Instagram' as Origin
            FROM scraper_queue j
            JOIN competitor_watchlist w ON j.watchlist_id = w.id
            ORDER BY j.priority DESC, j.created_at ASC");
        return Ok(jobs);
    }

    [HttpGet("jobs/history")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> GetJobHistory()
    {
        using var conn = await _db.CreateConnectionAsync();
        var jobs = await conn.QueryAsync<ScraperJobDto>(@"
            SELECT j.id, w.username, j.job_type as JobType, j.status, 
                   j.items_processed as ScrapedCount, j.started_at as StartedAt, j.completed_at as CompletedAt,
                   'Instagram' as Origin
            FROM scraper_history j
            JOIN competitor_watchlist w ON j.watchlist_id = w.id
            ORDER BY j.completed_at DESC
            LIMIT 50");
        return Ok(jobs);
    }

    [HttpPost("jobs")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> CreateJob([FromBody] System.Text.Json.JsonElement payload)
    {
        string username = payload.GetProperty("watchlistId").GetString();
        int targetCount = payload.GetProperty("target_count").GetInt32();
        int priority = 1;
        if (payload.TryGetProperty("priority", out var p)) priority = p.GetInt32();
        
        string jobType = "manual";
        if (payload.TryGetProperty("job_type", out var jt)) jobType = jt.GetString();

        using var conn = _db.CreateConnection();
        var watchlistId = await conn.QueryFirstOrDefaultAsync<Guid?>(
            "SELECT id FROM competitor_watchlist WHERE LOWER(username) = LOWER(@username)", new { username });

        if (watchlistId == null) return NotFound(new { message = "Profile not in watchlist" });

        var jobId = Guid.NewGuid();
        await conn.ExecuteAsync(@"
            INSERT INTO scraper_queue (id, watchlist_id, job_type, status, priority, target_count)
            VALUES (@Id, @watchlistId, @jobType, 'pending', @priority, @targetCount)",
            new { Id = jobId, watchlistId, jobType, priority, targetCount });

        return Ok(new { message = "Job queued successfully", jobId });
    }

    [HttpPatch("jobs/{id}")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> UpdateJob(Guid id, [FromBody] System.Text.Json.JsonElement payload)
    {
        using var conn = _db.CreateConnection();
        
        if (payload.TryGetProperty("status", out var s))
        {
            string status = s.GetString();
            await conn.ExecuteAsync("UPDATE scraper_queue SET status = @status WHERE id = @id", new { status, id });
        }
        
        if (payload.TryGetProperty("priority", out var p))
        {
            int priority = p.GetInt32();
            await conn.ExecuteAsync("UPDATE scraper_queue SET priority = @priority WHERE id = @id", new { priority, id });
        }
        
        return Ok();
    }

    [HttpDelete("jobs/{id}")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> DeleteJob(Guid id)
    {
        using var conn = _db.CreateConnection();
        await conn.ExecuteAsync("DELETE FROM scraper_queue WHERE id = @id", new { id });
        return Ok(new { success = true });
    }

    [HttpPost("jobs/heal")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> HealQueue()
    {
        using var conn = _db.CreateConnection();
        // Reset stuck running jobs back to pending in the queue
        await conn.ExecuteAsync("UPDATE scraper_queue SET status = 'pending' WHERE status = 'running' AND created_at < NOW() - INTERVAL '1 hour'");
        return Ok(new { message = "Queue healed" });
    }

    [HttpGet("jobs/{jobId}/logs")]
        public async Task<IActionResult> GetJobLogs(Guid jobId)
        {
            using var conn = await _db.CreateConnectionAsync();
            var logs = await conn.QueryAsync<dynamic>(@"
                SELECT id, log_level, message, raw_payload, created_at
                FROM scraper_logs
                WHERE job_id = @jobId
                ORDER BY created_at ASC",
                new { jobId });
            return Ok(logs);
        }

    [HttpPost("watchlist/toggle")]
    public async Task<IActionResult> ToggleWatchStatus([FromQuery] string username, [FromQuery] bool active)
    {
            using var conn = await _db.CreateConnectionAsync();
            await conn.ExecuteAsync(@"
                UPDATE competitor_watchlist 
                SET is_active = @active 
                WHERE LOWER(username) = LOWER(@username) AND platform = 'instagram'",
                new { username, active });
            return Ok(new { username, isActive = active });
        }

    [HttpPost("profile/{username}/toggle-own")]
    public async Task<IActionResult> ToggleOwnAccount(string username, [FromQuery] bool isOwn)
    {
            using var conn = await _db.CreateConnectionAsync();
            await conn.ExecuteAsync(@"
                UPDATE competitor_watchlist 
                SET is_own_account = @isOwn 
                WHERE LOWER(username) = LOWER(@username) AND platform = 'instagram'",
                new { username, isOwn });
            return Ok(new { username, isOwnAccount = isOwn });
        }

    [HttpDelete("profile/{username}/data")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> DeleteProfileData(string username)
    {
        var success = await _instaMedia.DeleteProfileDataAsync(username);
        if (!success) return NotFound();
        
        return Ok(new { message = "Profile data deleted successfully" });
    }

    [HttpGet("video/{id}")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult<MetaPost>> GetVideo([FromRoute] Guid id)
    {
        using var conn = await _db.CreateConnectionAsync();
        var video = await conn.QueryFirstOrDefaultAsync<MetaPost>($@"
            {MetaPostSelectSql}
            WHERE cv.id = @id", 
            new { id });

        if (video == null) return NotFound();

        return Ok(video);
    }

    [HttpGet("video/{id}/media")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult<List<InstagramMediaDto>>> GetMediaLinks([FromRoute] Guid id)
    {
        using var conn = await _db.CreateConnectionAsync();
        var allMedia = await conn.QueryAsync<InstagramMediaDto>(@"
            SELECT m.id AS Id, m.storage_path AS StoragePath, m.media_type AS MediaType, 
                   m.subcategory AS Subcategory, ml.is_primary AS IsPrimary, ml.display_order AS DisplayOrder
            FROM media m
            JOIN media_links ml ON m.id = ml.media_id
            WHERE ml.entity_id = @id AND ml.entity_type = 'competitor_video'
            ORDER BY ml.display_order ASC, m.media_type DESC", 
            new { id });

        var list = allMedia.ToList();

        // 1. If we have any video, hide static thumbnails (Subcategory 'thumbnail')
        if (list.Any(m => m.MediaType == InstagramMediaType.VIDEO))
        {
            list = list.Where(m => m.MediaType != InstagramMediaType.IMAGE || m.Subcategory == "carousel_item").ToList();
        }

        // 2. If we have 'full_media', hide 'thumbnail' to avoid double images
        if (list.Any(m => m.Subcategory == "full_media"))
        {
            list = list.Where(m => m.Subcategory != "thumbnail").ToList();
        }

        return Ok(list);
    }

    [HttpGet("video/lookup")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> LookupVideo([FromQuery] string url)
    {
        if (string.IsNullOrEmpty(url)) return BadRequest();

        var shortcode = url;
        if (url.Contains("/p/") || url.Contains("/reel/"))
        {
            var parts = url.Split('/');
            var index = Array.FindIndex(parts, p => p == "p" || p == "reel");
            if (index >= 0 && index + 1 < parts.Length)
            {
                shortcode = parts[index + 1];
            }
        }

        using var conn = await _db.CreateConnectionAsync();
        
        var video = await conn.QueryFirstOrDefaultAsync<MetaPost>($@"
            {MetaPostSelectSql}
            WHERE cv.url = @Url OR cv.url LIKE @Pattern", 
            new { 
                Url = url.Split('?')[0], 
                Pattern = $"%/p/{shortcode}/%"
            });

        if (video == null) return NotFound(new { message = "Post not found in local database" });

        return Ok(video);
    }

    [HttpPost("video/{id}/youtube")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> UpdateYoutubeSyncStatus(Guid id, [FromBody] YoutubeSyncUpdateDto update)
    {
        using var conn = await _db.CreateConnectionAsync();
        await conn.ExecuteAsync(@"
            UPDATE competitor_videos 
            SET youtube_video_id = @VideoId,
                youtube_url = @VideoUrl,
                youtube_sync_status = @Status,
                scheduled_publish_time = @ScheduledTime
            WHERE id = @Id", 
            new { 
                Id = id,
                update.VideoId,
                update.VideoUrl,
                update.Status,
                update.ScheduledTime
            });
        return Ok();
    }

    [HttpPost("video/{id}/refresh")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> RefreshMedia(Guid id)
    {
        var success = await _instaMedia.RefreshPostMediaAsync(id);
        if (!success)
        {
            return BadRequest(new { message = "Failed to refresh media from Instagram." });
        }
        return Ok(new { message = "Media refreshed successfully." });
    }
}




