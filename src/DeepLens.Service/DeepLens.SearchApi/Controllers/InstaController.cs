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
using DeepLens.SearchApi.Services;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class InstaController : ControllerBase
{

    private readonly IMetaGraphService _metaGraph;
    private readonly IDbConnectionFactory _db;
    private readonly IStorageService _storage;
    private readonly IInstagramMediaService _instaMedia;
    private readonly IAttributeExtractionService _attributeService;
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
            cv.status AS Status,
            cv.suspend_until AS SuspendUntil,
            cv.last_reviewed_at AS LastReviewedAt,
            (SELECT MAX(sph.posted_at) FROM story_posting_history sph WHERE sph.post_id = cv.id) AS LastPostedAt,
            (SELECT p.base_sku FROM instagram_product_links ipl JOIN products p ON p.id = ipl.product_id WHERE ipl.post_id = cv.id AND ipl.link_type = 'is' LIMIT 1) as ProductCode
        FROM competitor_videos cv";

    private const string MetaPostWithStarredSelectSql = @"
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
            cv.status AS Status,
            cv.suspend_until AS SuspendUntil,
            cv.last_reviewed_at AS LastReviewedAt,
            (SELECT MAX(sph.posted_at) FROM story_posting_history sph WHERE sph.post_id = cv.id) AS LastPostedAt,
            (SELECT p.base_sku FROM instagram_product_links ipl JOIN products p ON p.id = ipl.product_id WHERE ipl.post_id = cv.id AND ipl.link_type = 'is' LIMIT 1) as ProductCode,
            sgi.is_starred AS IsStarred
        FROM competitor_videos cv";

    public InstaController(
        IMetaGraphService metaGraph,
        IDbConnectionFactory db,
        IStorageService storage,
        IInstagramMediaService instaMedia,
        IAttributeExtractionService attributeService,
        ILogger<InstaController> logger)
    {
        _metaGraph = metaGraph;
        _db = db;
        _storage = storage;
        _instaMedia = instaMedia;
        _attributeService = attributeService;
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
        [JsonPropertyName("isPinned")]
        public bool IsPinned { get; set; }
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
                is_pinned AS IsPinned,
                last_scraped_at AS LastSyncedAt
            FROM competitor_watchlist 
            WHERE platform = 'instagram' 
            ORDER BY is_pinned DESC, is_own_account DESC, username ASC");

        return Ok(watchlist);
    }

    [HttpGet("profile/{username}")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> GetProfile(
        string username, 
        [FromQuery] string sortBy = "date", 
        [FromQuery] string sortOrder = "desc",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int limit = 100,
        [FromQuery] int offset = 0)
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
                LIMIT @limit OFFSET @offset";

            videos = (await conn.QueryAsync<MetaPost>(sql, new { username, fromDate, toDate, limit, offset })).ToList();
            _logger.LogInformation("GetProfile DB query returned {Count} videos for limit {Limit} and offset {Offset}", videos.Count, limit, offset);
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

    [HttpGet("config")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult<List<MetaConfigurationDto>>> GetConfigurations()
    {
        var configs = await _metaGraph.GetConfigurationsAsync();
        return Ok(configs);
    }

    [HttpPost("config")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult<MetaConfigurationDto>> CreateConfiguration([FromBody] MetaConfigurationDto config)
    {
        var result = await _metaGraph.CreateConfigurationAsync(config);
        return Ok(result);
    }

    [HttpPut("config/{id}")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> UpdateConfiguration(Guid id, [FromBody] MetaConfigurationDto config)
    {
        config.Id = id;
        await _metaGraph.UpdateConfigurationAsync(config);
        return Ok();
    }

    [HttpDelete("config/{id}")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> DeleteConfiguration(Guid id)
    {
        await _metaGraph.DeleteConfigurationAsync(id);
        return Ok();
    }

    [HttpPost("config/{id}/default")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> SetDefaultConfiguration(Guid id)
    {
        await _metaGraph.SetDefaultConfigurationAsync(id);
        return Ok();
    }


    [HttpPost("token/exchange")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> ExchangeToken([FromBody] MetaTokenExchangeRequest request)
    {
        await _metaGraph.ReloadFromDbAsync();
        var longLivedToken = await _metaGraph.ExchangeForLongLivedTokenAsync(
            request.ShortLivedToken, 
            request.AppId, 
            request.AppSecret);
        
        if (string.IsNullOrEmpty(longLivedToken))
            return BadRequest(new { message = "Token exchange failed" });

        return Ok(new { message = "Token exchanged successfully", token = longLivedToken });
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

    [HttpPost("profile/{username}/toggle-pin")]
    public async Task<IActionResult> TogglePin(string username, [FromQuery] bool isPinned)
    {
            using var conn = await _db.CreateConnectionAsync();
            await conn.ExecuteAsync(@"
                UPDATE competitor_watchlist 
                SET is_pinned = @isPinned 
                WHERE LOWER(username) = LOWER(@username) AND platform = 'instagram'",
                new { username, isPinned });
            return Ok(new { username, isPinned = isPinned });
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

    [HttpPatch("video/{id}")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> UpdateVideoStatus([FromRoute] Guid id, [FromBody] UpdateVideoStatusRequest req)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            var exists = await conn.ExecuteScalarAsync<bool>("SELECT EXISTS(SELECT 1 FROM competitor_videos WHERE id = @Id)", new { Id = id });
            if (!exists) return NotFound();

            if (req.Status != null)
            {
                DateTime? suspendUntil = null;
                if (req.Status == "suspend" && req.SuspendDays.HasValue)
                {
                    suspendUntil = DateTime.UtcNow.AddDays(req.SuspendDays.Value);
                }
                await conn.ExecuteAsync(@"
                    UPDATE competitor_videos 
                    SET status = @Status, suspend_until = @SuspendUntil, updated_at = now() 
                    WHERE id = @Id", 
                    new { Status = req.Status, SuspendUntil = suspendUntil, Id = id });
            }

            if (req.LastReviewedAt != null)
            {
                await conn.ExecuteAsync(@"
                    UPDATE competitor_videos 
                    SET last_reviewed_at = @LastReviewedAt, updated_at = now() 
                    WHERE id = @Id", 
                    new { LastReviewedAt = req.LastReviewedAt, Id = id });
            }

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update video status");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("videos/suspended")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult<List<MetaPost>>> GetSuspendedVideos()
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            var sql = $@"
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
                    cv.status AS Status,
                    cv.suspend_until AS SuspendUntil,
                    cv.last_reviewed_at AS LastReviewedAt,
                    (SELECT MAX(sph.posted_at) FROM story_posting_history sph WHERE sph.post_id = cv.id) AS LastPostedAt,
                    (SELECT p.base_sku FROM instagram_product_links ipl JOIN products p ON p.id = ipl.product_id WHERE ipl.post_id = cv.id AND ipl.link_type = 'is' LIMIT 1) as ProductCode,
                    cw.username AS OwnerUsername
                FROM competitor_videos cv
                JOIN competitor_watchlist cw ON cv.watchlist_id = cw.id
                WHERE cv.status = 'suspend' AND cw.is_own_account = true AND cw.is_data_deleted = false
                ORDER BY cv.suspend_until ASC";
            var videos = await conn.QueryAsync<MetaPost>(sql);
            return Ok(videos.ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve suspended videos");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("videos/ignored")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult<List<MetaPost>>> GetIgnoredVideos()
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            var sql = $@"
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
                    cv.status AS Status,
                    cv.suspend_until AS SuspendUntil,
                    cv.last_reviewed_at AS LastReviewedAt,
                    (SELECT MAX(sph.posted_at) FROM story_posting_history sph WHERE sph.post_id = cv.id) AS LastPostedAt,
                    (SELECT p.base_sku FROM instagram_product_links ipl JOIN products p ON p.id = ipl.product_id WHERE ipl.post_id = cv.id AND ipl.link_type = 'is' LIMIT 1) as ProductCode,
                    cw.username AS OwnerUsername
                FROM competitor_videos cv
                JOIN competitor_watchlist cw ON cv.watchlist_id = cw.id
                WHERE cv.status = 'ignore' AND cw.is_own_account = true AND cw.is_data_deleted = false
                ORDER BY cv.posted_at DESC";
            var videos = await conn.QueryAsync<MetaPost>(sql);
            return Ok(videos.ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve ignored videos");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("own-accounts/videos")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult<List<MetaPost>>> GetOwnAccountsVideos(
        [FromQuery] string sortBy = "date", 
        [FromQuery] string sortOrder = "desc",
        [FromQuery] int limit = 100,
        [FromQuery] int offset = 0,
        [FromQuery] string? search = null)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            
            string orderBy = sortBy.ToLower() switch {
                "likes" => "cv.like_count",
                "comments" => "cv.comment_count",
                _ => "cv.posted_at"
            };
            string direction = sortOrder.ToLower() == "asc" ? "ASC" : "DESC";

            string searchFilter = "";
            if (!string.IsNullOrEmpty(search))
            {
                searchFilter = "AND (cv.description ILIKE @search OR cw.username ILIKE @search)";
            }

            var sql = $@"
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
                    cv.status AS Status,
                    cv.suspend_until AS SuspendUntil,
                    cv.last_reviewed_at AS LastReviewedAt,
                    cw.username AS OwnerUsername,
                    cw.profile_pic_url AS OwnerProfilePictureUrl,
                    cw.profile_pic_storage_path AS OwnerProfilePicStoragePath,
                    (SELECT p.base_sku FROM instagram_product_links ipl JOIN products p ON p.id = ipl.product_id WHERE ipl.post_id = cv.id AND ipl.link_type = 'is' LIMIT 1) as ProductCode
                FROM competitor_videos cv
                JOIN competitor_watchlist cw ON cv.watchlist_id = cw.id
                WHERE cw.is_own_account = true AND cw.platform = 'instagram'
                  AND cw.is_data_deleted = false
                  {searchFilter}
                ORDER BY {orderBy} {direction}
                LIMIT @limit OFFSET @offset";

            var searchParam = string.IsNullOrEmpty(search) ? null : $"%{search}%";
            var videos = (await conn.QueryAsync<OwnAccountVideoQueryResult>(sql, new { limit, offset, search = searchParam })).ToList();
            var list = new List<MetaPost>();

            foreach (var item in videos)
            {
                var mp = new MetaPost
                {
                    Id = item.Id,
                    Permalink = item.Permalink,
                    Caption = item.Caption,
                    MediaType = Enum.TryParse<InstagramMediaType>(item.MediaType, true, out var mt) ? mt : InstagramMediaType.IMAGE,
                    ThumbnailUrl = item.ThumbnailUrl,
                    MediaUrl = item.MediaUrl,
                    LikeCount = item.LikeCount,
                    CommentCount = item.CommentCount,
                    Timestamp = item.Timestamp,
                    StoragePath = item.StoragePath,
                    YoutubeVideoId = item.YoutubeVideoId,
                    YoutubeUrl = item.YoutubeUrl,
                    Status = item.Status,
                    SuspendUntil = item.SuspendUntil,
                    LastReviewedAt = item.LastReviewedAt,
                    LastPostedAt = item.LastPostedAt,
                    OwnerUsername = item.OwnerUsername,
                    ProductCode = item.ProductCode
                };

                if (!string.IsNullOrEmpty(item.OwnerProfilePicStoragePath))
                {
                    mp.OwnerProfilePictureUrl = $"/api/v1/Attachment/download?path={Uri.EscapeDataString(item.OwnerProfilePicStoragePath)}";
                }
                else
                {
                    mp.OwnerProfilePictureUrl = item.OwnerProfilePictureUrl;
                }

                list.Add(mp);
            }

            return Ok(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve own accounts videos");
            return StatusCode(500, new { error = ex.Message });
        }
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
    public async Task<ActionResult> RefreshMedia(Guid id, CancellationToken ct)
    {
        var success = await _instaMedia.RefreshPostMediaAsync(id, ct);
        if (!success)
        {
            return BadRequest(new { message = "Failed to refresh media from Instagram." });
        }
        return Ok(new { message = "Media refreshed successfully." });
    }

    [HttpPost("video/{id}/comments/sync")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> SyncComments(Guid id, [FromBody] InstagramCommentsSyncRequest request)
    {
        if (string.IsNullOrEmpty(request.AccessToken))
            return BadRequest(new { message = "AccessToken is required." });

        try
        {
            await _metaGraph.SyncPostCommentsAsync(id, request.AccessToken, request.DeepSync);
            return Ok(new { message = "Comments synchronization completed successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Comments synchronization failed for video {VideoId}", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("video/{id}/comments")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> GetComments(Guid id)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            var sql = @"
                SELECT 
                    pc.id AS Id,
                    pc.comment_text AS CommentText,
                    pc.posted_at AS PostedAt,
                    pc.like_count AS LikeCount,
                    pc.is_hidden AS IsHidden,
                    ea.username AS Username,
                    ea.full_name AS FullName
                FROM post_comments pc
                LEFT JOIN instagram_accounts ea ON ea.id = pc.account_id
                WHERE pc.video_id = @VideoId
                ORDER BY pc.posted_at DESC;";

            var comments = await conn.QueryAsync<InstagramCommentDto>(sql, new { VideoId = id });
            return Ok(comments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve comments for video {VideoId}", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── Story Planner Endpoints ──────────────────────────────────────────────

    [HttpGet("story-planner/feed")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult<StoryPlannerFeedResponseDto>> GetStoryPlannerFeed(
        [FromQuery] int limit = 100,
        [FromQuery] int offset = 0,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            
            string postSearchFilter = "";
            string groupSearchFilter = "";
            if (!string.IsNullOrEmpty(search))
            {
                postSearchFilter = "AND (cv.description ILIKE @search OR cw.username ILIKE @search)";
                groupSearchFilter = @"
                    WHERE sg.name ILIKE @search 
                       OR sg.keywords ILIKE @search
                       OR EXISTS (
                           SELECT 1 
                           FROM story_group_items sgi
                           JOIN competitor_videos cv ON cv.id = sgi.post_id
                           JOIN competitor_watchlist cw ON cv.watchlist_id = cw.id
                           WHERE sgi.group_id = sg.id 
                             AND (cv.description ILIKE @search OR cw.username ILIKE @search)
                       )";
            }

            var sql = $@"
                WITH group_timestamps AS (
                    SELECT 
                        sgi.group_id,
                        MAX(cv.posted_at) AS latest_post_at
                    FROM story_group_items sgi
                    JOIN competitor_videos cv ON cv.id = sgi.post_id
                    GROUP BY sgi.group_id
                ),
                unified_feed AS (
                    SELECT 
                        'post' AS item_type,
                        cv.id::text AS id,
                        cv.posted_at AS sort_timestamp
                    FROM competitor_videos cv
                    JOIN competitor_watchlist cw ON cv.watchlist_id = cw.id
                    WHERE cw.is_own_account = true 
                      AND cw.platform = 'instagram'
                      AND cw.is_data_deleted = false
                      AND NOT EXISTS (
                          SELECT 1 FROM story_group_items sgi WHERE sgi.post_id = cv.id
                      )
                      {postSearchFilter}

                    UNION ALL

                    SELECT 
                        'group' AS item_type,
                        sg.id::text AS id,
                        COALESCE(gt.latest_post_at, sg.created_at) AS sort_timestamp
                    FROM story_groups sg
                    LEFT JOIN group_timestamps gt ON gt.group_id = sg.id
                    {groupSearchFilter}
                )
                SELECT item_type AS ItemType, id AS Id, sort_timestamp AS SortTimestamp
                FROM unified_feed
                ORDER BY sort_timestamp DESC
                LIMIT @limit OFFSET @offset;

                WITH group_timestamps AS (
                    SELECT 
                        sgi.group_id,
                        MAX(cv.posted_at) AS latest_post_at
                    FROM story_group_items sgi
                    JOIN competitor_videos cv ON cv.id = sgi.post_id
                    GROUP BY sgi.group_id
                ),
                unified_feed AS (
                    SELECT 
                        'post' AS item_type,
                        cv.id::text AS id,
                        cv.posted_at AS sort_timestamp
                    FROM competitor_videos cv
                    JOIN competitor_watchlist cw ON cv.watchlist_id = cw.id
                    WHERE cw.is_own_account = true 
                      AND cw.platform = 'instagram'
                      AND cw.is_data_deleted = false
                      AND NOT EXISTS (
                          SELECT 1 FROM story_group_items sgi WHERE sgi.post_id = cv.id
                      )
                      {postSearchFilter}

                    UNION ALL

                    SELECT 
                        'group' AS item_type,
                        sg.id::text AS id,
                        COALESCE(gt.latest_post_at, sg.created_at) AS sort_timestamp
                    FROM story_groups sg
                    LEFT JOIN group_timestamps gt ON gt.group_id = sg.id
                    {groupSearchFilter}
                )
                SELECT 
                    COUNT(*) AS TotalCount,
                    COUNT(*) FILTER (WHERE item_type = 'group') AS GroupCount
                FROM unified_feed;";

            var searchParam = string.IsNullOrEmpty(search) ? null : $"%{search}%";
            using var multi = await conn.QueryMultipleAsync(
                new CommandDefinition(sql, new { limit, offset, search = searchParam }, cancellationToken: ct)
            );
            var queryResults = (await multi.ReadAsync<UnifiedFeedQueryResult>()).ToList();
            var counts = await multi.ReadFirstAsync<StoryPlannerQueryCounts>();
            var totalCount = counts.TotalCount;
            var groupCount = counts.GroupCount;

            var unifiedItems = new List<UnifiedPlannerItemDto>();

            // 1. Separate IDs to batch load
            var postIds = queryResults.Where(r => r.ItemType == "post").Select(r => Guid.Parse(r.Id)).ToList();
            var groupIds = queryResults.Where(r => r.ItemType == "group").Select(r => Guid.Parse(r.Id)).ToList();

            // 2. Load Posts details in one batch
            var postsMap = new Dictionary<string, MetaPost>();
            if (postIds.Count > 0)
            {
                var postsSql = $@"
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
                        cv.status AS Status,
                        cv.suspend_until AS SuspendUntil,
                        cv.last_reviewed_at AS LastReviewedAt,
                        cw.username AS OwnerUsername,
                        cw.profile_pic_url AS OwnerProfilePictureUrl,
                        cw.profile_pic_storage_path AS OwnerProfilePicStoragePath,
                        (SELECT p.base_sku FROM instagram_product_links ipl JOIN products p ON p.id = ipl.product_id WHERE ipl.post_id = cv.id AND ipl.link_type = 'is' LIMIT 1) as ProductCode
                    FROM competitor_videos cv
                    JOIN competitor_watchlist cw ON cv.watchlist_id = cw.id
                    WHERE cv.id = ANY(@PostIds)";

                var rawPosts = await conn.QueryAsync<OwnAccountVideoQueryResult>(
                    new CommandDefinition(postsSql, new { PostIds = postIds }, cancellationToken: ct)
                );

                foreach (var item in rawPosts)
                {
                    var mp = new MetaPost
                    {
                        Id = item.Id,
                        Permalink = item.Permalink,
                        Caption = item.Caption,
                        MediaType = Enum.TryParse<InstagramMediaType>(item.MediaType, true, out var mt) ? mt : InstagramMediaType.IMAGE,
                        ThumbnailUrl = item.ThumbnailUrl,
                        MediaUrl = item.MediaUrl,
                        LikeCount = item.LikeCount,
                        CommentCount = item.CommentCount,
                        Timestamp = item.Timestamp,
                        StoragePath = item.StoragePath,
                        YoutubeVideoId = item.YoutubeVideoId,
                        YoutubeUrl = item.YoutubeUrl,
                        Status = item.Status,
                        SuspendUntil = item.SuspendUntil,
                        LastReviewedAt = item.LastReviewedAt,
                        LastPostedAt = item.LastPostedAt,
                        OwnerUsername = item.OwnerUsername,
                        ProductCode = item.ProductCode
                    };

                    if (!string.IsNullOrEmpty(item.OwnerProfilePicStoragePath))
                    {
                        mp.OwnerProfilePictureUrl = $"/api/v1/Attachment/download?path={Uri.EscapeDataString(item.OwnerProfilePicStoragePath)}";
                    }
                    else
                    {
                        mp.OwnerProfilePictureUrl = item.OwnerProfilePictureUrl;
                    }

                    if (item.Id != null)
                    {
                        postsMap[item.Id] = mp;
                    }
                }
            }

            // 3. Load Groups details (batch loaded)
            var groupsMap = new Dictionary<string, StoryGroupDto>();
            if (groupIds.Count > 0)
            {
                var groupsSql = $@"
                    SELECT 
                        sg.id as Id, 
                        sg.name as Name, 
                        sg.status as Status, 
                        sg.suspend_until as SuspendUntil, 
                        sg.last_reviewed_at as LastReviewedAt, 
                        sg.created_at as CreatedAt, 
                        sg.updated_at as UpdatedAt, 
                        sg.keywords as Keywords,
                        (SELECT COALESCE(SUM(CASE WHEN sph.swipe_status = 'right' THEN 1 ELSE 0 END), 0) FROM story_posting_history sph WHERE sph.group_id = sg.id) as RightSwipes,
                        (SELECT COALESCE(SUM(CASE WHEN sph.swipe_status = 'left' THEN 1 ELSE 0 END), 0) FROM story_posting_history sph WHERE sph.group_id = sg.id) as LeftSwipes
                    FROM story_groups sg
                    WHERE sg.id = ANY(@GroupIds)";

                var rawGroups = (await conn.QueryAsync<StoryGroupDto>(
                    new CommandDefinition(groupsSql, new { GroupIds = groupIds }, cancellationToken: ct)
                )).ToDictionary(g => g.Id);

                // Fetch posts for all groups in one batch
                var groupPostsSql = $@"
                    SELECT 
                        sgi.group_id AS GroupId,
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
                        cv.status AS Status,
                        cv.suspend_until AS SuspendUntil,
                        cv.last_reviewed_at AS LastReviewedAt,
                        cw.username AS OwnerUsername,
                        cw.profile_pic_url AS OwnerProfilePictureUrl,
                        cw.profile_pic_storage_path AS OwnerProfilePicStoragePath,
                        (SELECT p.base_sku FROM instagram_product_links ipl JOIN products p ON p.id = ipl.product_id WHERE ipl.post_id = cv.id AND ipl.link_type = 'is' LIMIT 1) as ProductCode,
                        sgi.is_starred AS IsStarred
                    FROM competitor_videos cv
                    JOIN competitor_watchlist cw ON cv.watchlist_id = cw.id
                    JOIN story_group_items sgi ON sgi.post_id = cv.id
                    WHERE sgi.group_id = ANY(@GroupIds)
                    ORDER BY sgi.is_starred DESC, sgi.created_at ASC";

                var rawGroupPosts = await conn.QueryAsync<OwnAccountVideoQueryResult>(
                    new CommandDefinition(groupPostsSql, new { GroupIds = groupIds }, cancellationToken: ct)
                );

                var postsByGroup = rawGroupPosts.GroupBy(p => p.GroupId ?? Guid.Empty).ToDictionary(g => g.Key, g => g.ToList());

                // Fetch eligible watchlist IDs for all groups in one batch
                var eligibilitySql = $@"
                    SELECT group_id AS GroupId, target_watchlist_id AS TargetWatchlistId
                    FROM story_group_eligibility 
                    WHERE group_id = ANY(@GroupIds) AND is_eligible = true";

                var rawEligibility = await conn.QueryAsync<StoryGroupEligibilityQueryResult>(
                    new CommandDefinition(eligibilitySql, new { GroupIds = groupIds }, cancellationToken: ct)
                );

                var eligibilityByGroup = rawEligibility.GroupBy(e => e.GroupId).ToDictionary(g => g.Key, g => g.Select(x => x.TargetWatchlistId).ToList());

                foreach (var gId in groupIds)
                {
                    if (rawGroups.TryGetValue(gId, out var g))
                    {
                        var postsList = new List<MetaPost>();
                        if (postsByGroup.TryGetValue(gId, out var groupPosts))
                        {
                            foreach (var item in groupPosts)
                            {
                                var mp = new MetaPost
                                {
                                    Id = item.Id,
                                    Permalink = item.Permalink,
                                    Caption = item.Caption,
                                    MediaType = Enum.TryParse<InstagramMediaType>(item.MediaType, true, out var mt) ? mt : InstagramMediaType.IMAGE,
                                    ThumbnailUrl = item.ThumbnailUrl,
                                    MediaUrl = item.MediaUrl,
                                    LikeCount = item.LikeCount,
                                    CommentCount = item.CommentCount,
                                    Timestamp = item.Timestamp,
                                    StoragePath = item.StoragePath,
                                    YoutubeVideoId = item.YoutubeVideoId,
                                    YoutubeUrl = item.YoutubeUrl,
                                    Status = item.Status,
                                    SuspendUntil = item.SuspendUntil,
                                    LastReviewedAt = item.LastReviewedAt,
                                    LastPostedAt = item.LastPostedAt,
                                    OwnerUsername = item.OwnerUsername,
                                    ProductCode = item.ProductCode,
                                    IsStarred = item.IsStarred
                                };

                                if (!string.IsNullOrEmpty(item.OwnerProfilePicStoragePath))
                                {
                                    mp.OwnerProfilePictureUrl = $"/api/v1/Attachment/download?path={Uri.EscapeDataString(item.OwnerProfilePicStoragePath)}";
                                }
                                else
                                {
                                    mp.OwnerProfilePictureUrl = item.OwnerProfilePictureUrl;
                                }

                                postsList.Add(mp);
                            }
                        }
                        g.Posts = postsList;

                        if (eligibilityByGroup.TryGetValue(gId, out var eligibleList))
                        {
                            g.EligibleAccounts = eligibleList;
                        }

                        // Calculate needsReview using the helper method on StoryGroupDto
                        g.UpdateNeedsReview();

                        groupsMap[gId.ToString()] = g;
                    }
                }
            }

            // 4. Assemble the final unified feed in the original sorted query order
            foreach (var result in queryResults)
            {
                var item = new UnifiedPlannerItemDto
                {
                    Type = result.ItemType,
                    Id = result.Id,
                    Timestamp = result.SortTimestamp
                };

                if (result.ItemType == "post")
                {
                    if (postsMap.TryGetValue(result.Id, out var post))
                    {
                        item.Post = post;
                        unifiedItems.Add(item);
                    }
                }
                else if (result.ItemType == "group")
                {
                    if (groupsMap.TryGetValue(result.Id, out var group))
                    {
                        item.Group = group;
                        unifiedItems.Add(item);
                    }
                }
            }

            return Ok(new StoryPlannerFeedResponseDto
            {
                Items = unifiedItems,
                TotalCount = totalCount,
                GroupCount = groupCount
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve story planner feed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("story-groups")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult<List<StoryGroupDto>>> GetStoryGroups([FromQuery] string? search, CancellationToken ct)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            
            string searchFilter = "";
            if (!string.IsNullOrEmpty(search))
            {
                searchFilter = @"
                    WHERE sg.name ILIKE @search 
                       OR sg.keywords ILIKE @search
                       OR EXISTS (
                           SELECT 1 
                           FROM story_group_items sgi
                           JOIN competitor_videos cv ON cv.id = sgi.post_id
                           JOIN competitor_watchlist cw ON cv.watchlist_id = cw.id
                           WHERE sgi.group_id = sg.id 
                             AND (cv.description ILIKE @search OR cw.username ILIKE @search)
                       )";
            }

            var sql = $@"
                SELECT 
                    sg.id as Id, 
                    sg.name as Name, 
                    sg.status as Status, 
                    sg.suspend_until as SuspendUntil, 
                    sg.last_reviewed_at as LastReviewedAt, 
                    sg.created_at as CreatedAt, 
                    sg.updated_at as UpdatedAt, 
                    sg.keywords as Keywords,
                    (SELECT COALESCE(SUM(CASE WHEN sph.swipe_status = 'right' THEN 1 ELSE 0 END), 0) FROM story_posting_history sph WHERE sph.group_id = sg.id) as RightSwipes,
                    (SELECT COALESCE(SUM(CASE WHEN sph.swipe_status = 'left' THEN 1 ELSE 0 END), 0) FROM story_posting_history sph WHERE sph.group_id = sg.id) as LeftSwipes
                FROM story_groups sg
                {searchFilter}
                ORDER BY sg.created_at DESC";

            var searchParam = string.IsNullOrEmpty(search) ? null : $"%{search}%";
            var groups = await conn.QueryAsync<StoryGroupDto>(new CommandDefinition(sql, new { search = searchParam }, cancellationToken: ct));

            var groupList = groups.ToList();
            var groupIds = groupList.Select(g => g.Id).ToList();

            if (groupIds.Count > 0)
            {
                // Fetch posts for all groups in one batch
                var groupPostsSql = $@"
                    SELECT 
                        sgi.group_id AS GroupId,
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
                        cv.status AS Status,
                        cv.suspend_until AS SuspendUntil,
                        cv.last_reviewed_at AS LastReviewedAt,
                        cw.username AS OwnerUsername,
                        cw.profile_pic_url AS OwnerProfilePictureUrl,
                        cw.profile_pic_storage_path AS OwnerProfilePicStoragePath,
                        (SELECT p.base_sku FROM instagram_product_links ipl JOIN products p ON p.id = ipl.product_id WHERE ipl.post_id = cv.id AND ipl.link_type = 'is' LIMIT 1) as ProductCode,
                        sgi.is_starred AS IsStarred
                    FROM competitor_videos cv
                    JOIN competitor_watchlist cw ON cv.watchlist_id = cw.id
                    JOIN story_group_items sgi ON sgi.post_id = cv.id
                    WHERE sgi.group_id = ANY(@GroupIds)
                    ORDER BY sgi.is_starred DESC, sgi.created_at ASC";

                var rawGroupPosts = await conn.QueryAsync<OwnAccountVideoQueryResult>(
                    new CommandDefinition(groupPostsSql, new { GroupIds = groupIds }, cancellationToken: ct)
                );

                var postsByGroup = rawGroupPosts.GroupBy(p => p.GroupId ?? Guid.Empty).ToDictionary(g => g.Key, g => g.ToList());

                // Fetch eligible watchlist IDs for all groups in one batch
                var eligibilitySql = $@"
                    SELECT group_id AS GroupId, target_watchlist_id AS TargetWatchlistId
                    FROM story_group_eligibility 
                    WHERE group_id = ANY(@GroupIds) AND is_eligible = true";

                var rawEligibility = await conn.QueryAsync<StoryGroupEligibilityQueryResult>(
                    new CommandDefinition(eligibilitySql, new { GroupIds = groupIds }, cancellationToken: ct)
                );

                var eligibilityByGroup = rawEligibility.GroupBy(e => e.GroupId).ToDictionary(g => g.Key, g => g.Select(x => x.TargetWatchlistId).ToList());

                foreach (var g in groupList)
                {
                    var postsList = new List<MetaPost>();
                    if (postsByGroup.TryGetValue(g.Id, out var groupPosts))
                    {
                        foreach (var item in groupPosts)
                        {
                            var mp = new MetaPost
                            {
                                Id = item.Id,
                                Permalink = item.Permalink,
                                Caption = item.Caption,
                                MediaType = Enum.TryParse<InstagramMediaType>(item.MediaType, true, out var mt) ? mt : InstagramMediaType.IMAGE,
                                ThumbnailUrl = item.ThumbnailUrl,
                                MediaUrl = item.MediaUrl,
                                LikeCount = item.LikeCount,
                                CommentCount = item.CommentCount,
                                Timestamp = item.Timestamp,
                                StoragePath = item.StoragePath,
                                YoutubeVideoId = item.YoutubeVideoId,
                                YoutubeUrl = item.YoutubeUrl,
                                Status = item.Status,
                                SuspendUntil = item.SuspendUntil,
                                LastReviewedAt = item.LastReviewedAt,
                                LastPostedAt = item.LastPostedAt,
                                OwnerUsername = item.OwnerUsername,
                                ProductCode = item.ProductCode,
                                IsStarred = item.IsStarred
                            };

                            if (!string.IsNullOrEmpty(item.OwnerProfilePicStoragePath))
                            {
                                mp.OwnerProfilePictureUrl = $"/api/v1/Attachment/download?path={Uri.EscapeDataString(item.OwnerProfilePicStoragePath)}";
                            }
                            else
                            {
                                mp.OwnerProfilePictureUrl = item.OwnerProfilePictureUrl;
                            }

                            postsList.Add(mp);
                        }
                    }
                    g.Posts = postsList;

                    if (eligibilityByGroup.TryGetValue(g.Id, out var eligibleList))
                    {
                        g.EligibleAccounts = eligibleList;
                    }

                    // Calculate needsReview using the helper method
                    g.UpdateNeedsReview();
                }
            }

            return Ok(groupList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve story groups");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("story-groups/{id}")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> GetStoryGroup(Guid id, CancellationToken ct)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            var sql = $@"
                SELECT 
                    sg.id as Id, 
                    sg.name as Name, 
                    sg.status as Status, 
                    sg.suspend_until as SuspendUntil, 
                    sg.last_reviewed_at as LastReviewedAt, 
                    sg.created_at as CreatedAt, 
                    sg.updated_at as UpdatedAt, 
                    sg.keywords as Keywords,
                    (SELECT COALESCE(SUM(CASE WHEN sph.swipe_status = 'right' THEN 1 ELSE 0 END), 0) FROM story_posting_history sph WHERE sph.group_id = sg.id) as RightSwipes,
                    (SELECT COALESCE(SUM(CASE WHEN sph.swipe_status = 'left' THEN 1 ELSE 0 END), 0) FROM story_posting_history sph WHERE sph.group_id = sg.id) as LeftSwipes
                FROM story_groups sg
                WHERE sg.id = @Id";

            var g = await conn.QueryFirstOrDefaultAsync<StoryGroupDto>(new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
            if (g == null) return NotFound();

            // Fetch items (posts)
            var postsSql = $@"{MetaPostWithStarredSelectSql}
                JOIN story_group_items sgi ON sgi.post_id = cv.id
                WHERE sgi.group_id = @GroupId
                ORDER BY sgi.is_starred DESC, sgi.created_at ASC";
            
            var posts = await conn.QueryAsync<MetaPost>(new CommandDefinition(postsSql, new { GroupId = g.Id }, cancellationToken: ct));
            g.Posts = posts.ToList();

            // Fetch eligible target watchlist IDs
            var eligibleAccounts = await conn.QueryAsync<Guid>(new CommandDefinition(@"
                SELECT target_watchlist_id 
                FROM story_group_eligibility 
                WHERE group_id = @GroupId AND is_eligible = true", new { GroupId = g.Id }, cancellationToken: ct));
            g.EligibleAccounts = eligibleAccounts.ToList();

            // Calculate needsReview using the helper method
            g.UpdateNeedsReview();

            return Ok(g);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve story group {Id}", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("suggest-group-metadata")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> SuggestGroupMetadata([FromBody] SuggestGroupMetadataRequest req)
    {
        if (req.PostIds == null || req.PostIds.Count == 0)
        {
            return BadRequest("At least one post ID is required.");
        }

        try
        {
            using var conn = await _db.CreateConnectionAsync();
            var descriptions = (await conn.QueryAsync<string>(@"
                SELECT description 
                FROM competitor_videos 
                WHERE id = ANY(@PostIds)",
                new { PostIds = req.PostIds.Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty).ToList() }))
                .Where(desc => !string.IsNullOrWhiteSpace(desc))
                .ToList();

            if (descriptions.Count == 0)
            {
                return Ok(new { title = "New Story Group", hashtags = new List<string>() });
            }

            var suggestion = await _attributeService.SuggestGroupMetadataAsync(descriptions);
            return Ok(new { title = suggestion.Title, hashtags = suggestion.Hashtags });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to suggest group metadata for post IDs: {PostIds}", string.Join(", ", req.PostIds));
            return StatusCode(500, new { error = ex.Message });
        }
    }

    public class SuggestGroupMetadataRequest
    {
        public List<string> PostIds { get; set; } = new();
    }

    [HttpPost("story-groups")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> CreateStoryGroup([FromBody] CreateStoryGroupRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || req.PostIds == null || req.PostIds.Count == 0)
        {
            return BadRequest("Name and at least one post ID are required.");
        }

        using var conn = await _db.CreateConnectionAsync();
        using var trans = conn.BeginTransaction();
        try
        {
            var groupId = Guid.NewGuid();
            await conn.ExecuteAsync(new CommandDefinition(@"
                INSERT INTO story_groups (id, name, status, last_reviewed_at, created_at, updated_at, keywords)
                VALUES (@Id, @Name, 'active', now(), now(), now(), @Keywords)",
                new { Id = groupId, Name = req.Name, Keywords = req.Keywords }, transaction: trans, cancellationToken: ct));

            bool isFirst = true;
            foreach (var postId in req.PostIds)
            {
                bool isStarred = isFirst;
                await conn.ExecuteAsync(new CommandDefinition(@"
                    INSERT INTO story_group_items (group_id, post_id, is_starred, created_at)
                    VALUES (@GroupId, @PostId, @IsStarred, now())",
                    new { GroupId = groupId, PostId = postId, IsStarred = isStarred }, transaction: trans, cancellationToken: ct));
                isFirst = false;
            }

            if (req.TargetWatchlistIds != null)
            {
                foreach (var wlId in req.TargetWatchlistIds)
                {
                    await conn.ExecuteAsync(new CommandDefinition(@"
                        INSERT INTO story_group_eligibility (group_id, target_watchlist_id, is_eligible, created_at)
                        VALUES (@GroupId, @TargetWatchlistId, true, now())",
                        new { GroupId = groupId, TargetWatchlistId = wlId }, transaction: trans, cancellationToken: ct));
                }
            }

            trans.Commit();
            return Ok(new { success = true, groupId });
        }
        catch (Exception ex)
        {
            trans.Rollback();
            _logger.LogError(ex, "Failed to create story group");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPatch("story-groups/{id}")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> UpdateStoryGroup(Guid id, [FromBody] UpdateStoryGroupRequest req, CancellationToken ct)
    {
        using var conn = await _db.CreateConnectionAsync();
        using var trans = conn.BeginTransaction();
        try
        {
            var exists = await conn.ExecuteScalarAsync<bool>(new CommandDefinition("SELECT EXISTS(SELECT 1 FROM story_groups WHERE id = @Id)", new { Id = id }, transaction: trans, cancellationToken: ct));
            if (!exists) return NotFound();

            if (req.Name != null)
            {
                await conn.ExecuteAsync(new CommandDefinition("UPDATE story_groups SET name = @Name, updated_at = now() WHERE id = @Id", new { Name = req.Name, Id = id }, transaction: trans, cancellationToken: ct));
            }

            if (req.Keywords != null)
            {
                await conn.ExecuteAsync(new CommandDefinition("UPDATE story_groups SET keywords = @Keywords, updated_at = now() WHERE id = @Id", new { Keywords = req.Keywords, Id = id }, transaction: trans, cancellationToken: ct));
            }

            if (req.Status != null)
            {
                DateTime? suspendUntil = null;
                if (req.Status == "suspend" && req.SuspendDays.HasValue)
                {
                    suspendUntil = DateTime.UtcNow.AddDays(req.SuspendDays.Value);
                }
                await conn.ExecuteAsync(new CommandDefinition(@"
                    UPDATE story_groups 
                    SET status = @Status, suspend_until = @SuspendUntil, updated_at = now() 
                    WHERE id = @Id", 
                    new { Status = req.Status, SuspendUntil = suspendUntil, Id = id }, transaction: trans, cancellationToken: ct));
            }

            if (req.PostIds != null)
            {
                // Fetch existing starred post IDs to preserve them if possible
                var starredPostIds = (await conn.QueryAsync<Guid>(new CommandDefinition(
                    "SELECT post_id FROM story_group_items WHERE group_id = @GroupId AND is_starred = true",
                    new { GroupId = id }, transaction: trans, cancellationToken: ct))).ToList();

                await conn.ExecuteAsync(new CommandDefinition("DELETE FROM story_group_items WHERE group_id = @GroupId", new { GroupId = id }, transaction: trans, cancellationToken: ct));
                
                bool isFirst = true;
                foreach (var postId in req.PostIds)
                {
                    bool isStarred = starredPostIds.Contains(postId) || (isFirst && starredPostIds.Count == 0);
                    await conn.ExecuteAsync(new CommandDefinition(@"
                        INSERT INTO story_group_items (group_id, post_id, is_starred, created_at)
                        VALUES (@GroupId, @PostId, @IsStarred, now())",
                        new { GroupId = id, PostId = postId, IsStarred = isStarred }, transaction: trans, cancellationToken: ct));
                    isFirst = false;
                }
            }

            if (req.StarredPostIds != null)
            {
                await conn.ExecuteAsync(new CommandDefinition("UPDATE story_group_items SET is_starred = false WHERE group_id = @GroupId", new { GroupId = id }, transaction: trans, cancellationToken: ct));
                foreach (var postId in req.StarredPostIds)
                {
                    await conn.ExecuteAsync(new CommandDefinition(@"
                        UPDATE story_group_items 
                        SET is_starred = true 
                        WHERE group_id = @GroupId AND post_id = @PostId", 
                        new { GroupId = id, PostId = postId }, transaction: trans, cancellationToken: ct));
                }
            }

            if (req.TargetWatchlistIds != null)
            {
                await conn.ExecuteAsync(new CommandDefinition("DELETE FROM story_group_eligibility WHERE group_id = @GroupId", new { GroupId = id }, transaction: trans, cancellationToken: ct));
                foreach (var wlId in req.TargetWatchlistIds)
                {
                    await conn.ExecuteAsync(new CommandDefinition(@"
                        INSERT INTO story_group_eligibility (group_id, target_watchlist_id, is_eligible, created_at)
                        VALUES (@GroupId, @TargetWatchlistId, true, now())",
                        new { GroupId = id, TargetWatchlistId = wlId }, transaction: trans, cancellationToken: ct));
                }
            }

            trans.Commit();
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            trans.Rollback();
            _logger.LogError(ex, "Failed to update story group");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("story-groups/{id}/renew")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> RenewStoryGroup(Guid id, CancellationToken ct)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            var affected = await conn.ExecuteAsync(new CommandDefinition(@"
                UPDATE story_groups 
                SET status = 'active', suspend_until = NULL, last_reviewed_at = now(), updated_at = now() 
                WHERE id = @Id", new { Id = id }, cancellationToken: ct));

            if (affected == 0) return NotFound();
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to renew story group");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("story-groups/{id}/finish")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> FinishStoryGroup(Guid id, CancellationToken ct)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            var affected = await conn.ExecuteAsync(new CommandDefinition(@"
                UPDATE story_groups 
                SET status = 'suspend', suspend_until = now() + INTERVAL '24 hours', updated_at = now() 
                WHERE id = @Id", new { Id = id }, cancellationToken: ct));

            if (affected == 0) return NotFound();
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to finish story group");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("story-groups/merge")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> MergeStoryGroups([FromBody] MergeStoryGroupsRequest req, CancellationToken ct)
    {
        if (req.Group1Id == Guid.Empty || req.Group2Id == Guid.Empty)
        {
            return BadRequest("Both Group1Id and Group2Id are required.");
        }

        using var conn = await _db.CreateConnectionAsync();
        using var trans = conn.BeginTransaction();
        try
        {
            var g1 = await conn.QueryFirstOrDefaultAsync<dynamic>(new CommandDefinition(
                "SELECT id, created_at FROM story_groups WHERE id = @Id", new { Id = req.Group1Id }, transaction: trans, cancellationToken: ct));
            var g2 = await conn.QueryFirstOrDefaultAsync<dynamic>(new CommandDefinition(
                "SELECT id, created_at FROM story_groups WHERE id = @Id", new { Id = req.Group2Id }, transaction: trans, cancellationToken: ct));

            if (g1 == null || g2 == null)
            {
                return NotFound("One or both story groups do not exist.");
            }

            DateTime g1Created = g1.created_at;
            DateTime g2Created = g2.created_at;

            Guid parentId = g1Created <= g2Created ? req.Group1Id : req.Group2Id;
            Guid mergedId = parentId == req.Group1Id ? req.Group2Id : req.Group1Id;

            // Move posts
            var existingPosts = (await conn.QueryAsync<Guid>(new CommandDefinition(
                "SELECT post_id FROM story_group_items WHERE group_id = @GroupId", new { GroupId = parentId }, transaction: trans, cancellationToken: ct))).ToList();

            var mergedPosts = (await conn.QueryAsync<dynamic>(new CommandDefinition(
                "SELECT post_id, is_starred FROM story_group_items WHERE group_id = @GroupId", new { GroupId = mergedId }, transaction: trans, cancellationToken: ct))).ToList();

            foreach (var post in mergedPosts)
            {
                Guid pId = post.post_id;
                bool isStarred = post.is_starred;
                if (!existingPosts.Contains(pId))
                {
                    await conn.ExecuteAsync(new CommandDefinition(@"
                        INSERT INTO story_group_items (group_id, post_id, is_starred, created_at)
                        VALUES (@GroupId, @PostId, @IsStarred, now())",
                        new { GroupId = parentId, PostId = pId, IsStarred = isStarred }, transaction: trans, cancellationToken: ct));
                }
            }

            // Combine eligibility
            var parentEl = (await conn.QueryAsync<Guid>(new CommandDefinition(
                "SELECT target_watchlist_id FROM story_group_eligibility WHERE group_id = @GroupId AND is_eligible = true",
                new { GroupId = parentId }, transaction: trans, cancellationToken: ct))).ToList();

            var mergedEl = (await conn.QueryAsync<Guid>(new CommandDefinition(
                "SELECT target_watchlist_id FROM story_group_eligibility WHERE group_id = @GroupId AND is_eligible = true",
                new { GroupId = mergedId }, transaction: trans, cancellationToken: ct))).ToList();

            foreach (var targetId in mergedEl)
            {
                if (!parentEl.Contains(targetId))
                {
                    await conn.ExecuteAsync(new CommandDefinition(@"
                        INSERT INTO story_group_eligibility (group_id, target_watchlist_id, is_eligible, created_at)
                        VALUES (@GroupId, @TargetWatchlistId, true, now())
                        ON CONFLICT (group_id, target_watchlist_id) DO UPDATE SET is_eligible = true",
                        new { GroupId = parentId, TargetWatchlistId = targetId }, transaction: trans, cancellationToken: ct));
                }
            }

            // Rebind history
            await conn.ExecuteAsync(new CommandDefinition(
                "UPDATE story_posting_history SET group_id = @ParentId WHERE group_id = @MergedId",
                new { ParentId = parentId, MergedId = mergedId }, transaction: trans, cancellationToken: ct));

            // Log merge
            await conn.ExecuteAsync(new CommandDefinition(@"
                INSERT INTO story_group_merges (parent_group_id, merged_group_id, merged_at)
                VALUES (@ParentId, @MergedId, now())",
                new { ParentId = parentId, MergedId = mergedId }, transaction: trans, cancellationToken: ct));

            // Delete merged group
            await conn.ExecuteAsync(new CommandDefinition("DELETE FROM story_groups WHERE id = @Id", new { Id = mergedId }, transaction: trans, cancellationToken: ct));

            trans.Commit();
            return Ok(new { success = true, parentGroupId = parentId, mergedGroupId = mergedId });
        }
        catch (Exception ex)
        {
            trans.Rollback();
            _logger.LogError(ex, "Failed to merge story groups {Group1} and {Group2}", req.Group1Id, req.Group2Id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpDelete("story-groups/{id}")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> DeleteStoryGroup(Guid id, CancellationToken ct)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            var affected = await conn.ExecuteAsync(new CommandDefinition("DELETE FROM story_groups WHERE id = @Id", new { Id = id }, cancellationToken: ct));
            if (affected == 0) return NotFound();
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete story group");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("story-groups/{id}/post")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> MarkGroupPosted(Guid id, [FromQuery] Guid targetWatchlistId, CancellationToken ct)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            var historyId = Guid.NewGuid();
            await conn.ExecuteAsync(new CommandDefinition(@"
                INSERT INTO story_posting_history (id, group_id, target_watchlist_id, posted_at, swipe_status)
                VALUES (@Id, @GroupId, @TargetWatchlistId, now(), 'pending')",
                new { Id = historyId, GroupId = id, TargetWatchlistId = targetWatchlistId }, cancellationToken: ct));

            return Ok(new { success = true, historyId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to mark group as posted to story");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("story-posts/{id}/post")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> MarkPostPosted(Guid id, [FromQuery] Guid targetWatchlistId, [FromQuery] Guid? groupId, CancellationToken ct)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            var historyId = Guid.NewGuid();
            await conn.ExecuteAsync(new CommandDefinition(@"
                INSERT INTO story_posting_history (id, post_id, group_id, target_watchlist_id, posted_at, swipe_status)
                VALUES (@Id, @PostId, @GroupId, @TargetWatchlistId, now(), 'pending')",
                new { Id = historyId, PostId = id, GroupId = groupId, TargetWatchlistId = targetWatchlistId }, cancellationToken: ct));

            return Ok(new { success = true, historyId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to mark post as posted to story");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    private class EligibleGroupQueryResult
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Status { get; set; } = "active";
        public DateTime? SuspendUntil { get; set; }
        public DateTime? LastReviewedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? Keywords { get; set; }
        public long RightSwipes { get; set; }
        public long LeftSwipes { get; set; }
        public long ShareCount { get; set; }
        public DateTime? LastPostedAt { get; set; }
    }

    [HttpGet("story-planner/eligible/{targetWatchlistId}")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> GetEligibleShares(
        Guid targetWatchlistId,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        CancellationToken ct = default)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();

            // Same UNION ALL + sort_timestamp pattern as GetStoryPlannerFeed, with story-sharing filters:
            // - Groups must be eligible for this target watchlist, not ignored/suspended
            // - Groups must not have been shared in the last 24 hours (per target)
            // - Ungrouped own-account posts, not ignored/suspended, not shared in last 24h
            // Sort: latest post timestamp DESC (matches curation mode)
            var sql = $@"
                WITH group_timestamps AS (
                    SELECT
                        sgi.group_id,
                        MAX(cv.posted_at) AS latest_post_at
                    FROM story_group_items sgi
                    JOIN competitor_videos cv ON cv.id = sgi.post_id
                    GROUP BY sgi.group_id
                ),
                eligible_feed AS (
                    SELECT
                        'group' AS item_type,
                        sg.id::text AS id,
                        COALESCE(gt.latest_post_at, sg.created_at) AS sort_timestamp
                    FROM story_groups sg
                    JOIN story_group_eligibility sge ON sge.group_id = sg.id
                        AND sge.target_watchlist_id = @TargetWatchlistId
                        AND sge.is_eligible = true
                    LEFT JOIN group_timestamps gt ON gt.group_id = sg.id
                    LEFT JOIN LATERAL (
                        SELECT MAX(sph.posted_at) AS last_shared
                        FROM story_posting_history sph
                        WHERE sph.group_id = sg.id
                          AND sph.target_watchlist_id = @TargetWatchlistId
                    ) last_share ON true
                    WHERE sg.status != 'ignore'
                      AND (sg.status != 'suspend' OR sg.suspend_until IS NULL OR sg.suspend_until < now())
                      AND (last_share.last_shared IS NULL OR last_share.last_shared < now() - INTERVAL '24 hours')

                    UNION ALL

                    SELECT
                        'post' AS item_type,
                        cv.id::text AS id,
                        cv.posted_at AS sort_timestamp
                    FROM competitor_videos cv
                    JOIN competitor_watchlist cw ON cw.id = cv.watchlist_id
                    LEFT JOIN LATERAL (
                        SELECT MAX(sph.posted_at) AS last_shared
                        FROM story_posting_history sph
                        WHERE sph.post_id = cv.id
                          AND sph.target_watchlist_id = @TargetWatchlistId
                    ) last_share ON true
                    WHERE cw.is_own_account = true
                      AND cw.platform = 'instagram'
                      AND cw.is_data_deleted = false
                      AND cv.status != 'ignore'
                      AND (cv.status != 'suspend' OR cv.suspend_until IS NULL OR cv.suspend_until < now())
                      AND NOT EXISTS (SELECT 1 FROM story_group_items sgi WHERE sgi.post_id = cv.id)
                      AND (last_share.last_shared IS NULL OR last_share.last_shared < now() - INTERVAL '24 hours')
                )
                SELECT item_type AS ItemType, id AS Id, sort_timestamp AS SortTimestamp
                FROM eligible_feed
                ORDER BY sort_timestamp DESC
                LIMIT @limit OFFSET @offset;

                WITH group_timestamps AS (
                    SELECT
                        sgi.group_id,
                        MAX(cv.posted_at) AS latest_post_at
                    FROM story_group_items sgi
                    JOIN competitor_videos cv ON cv.id = sgi.post_id
                    GROUP BY sgi.group_id
                ),
                eligible_feed AS (
                    SELECT 'group' AS item_type, sg.id::text AS id
                    FROM story_groups sg
                    JOIN story_group_eligibility sge ON sge.group_id = sg.id
                        AND sge.target_watchlist_id = @TargetWatchlistId
                        AND sge.is_eligible = true
                    LEFT JOIN LATERAL (
                        SELECT MAX(sph.posted_at) AS last_shared
                        FROM story_posting_history sph
                        WHERE sph.group_id = sg.id AND sph.target_watchlist_id = @TargetWatchlistId
                    ) last_share ON true
                    WHERE sg.status != 'ignore'
                      AND (sg.status != 'suspend' OR sg.suspend_until IS NULL OR sg.suspend_until < now())
                      AND (last_share.last_shared IS NULL OR last_share.last_shared < now() - INTERVAL '24 hours')

                    UNION ALL

                    SELECT 'post' AS item_type, cv.id::text AS id
                    FROM competitor_videos cv
                    JOIN competitor_watchlist cw ON cw.id = cv.watchlist_id
                    LEFT JOIN LATERAL (
                        SELECT MAX(sph.posted_at) AS last_shared
                        FROM story_posting_history sph
                        WHERE sph.post_id = cv.id AND sph.target_watchlist_id = @TargetWatchlistId
                    ) last_share ON true
                    WHERE cw.is_own_account = true
                      AND cw.platform = 'instagram'
                      AND cw.is_data_deleted = false
                      AND cv.status != 'ignore'
                      AND (cv.status != 'suspend' OR cv.suspend_until IS NULL OR cv.suspend_until < now())
                      AND NOT EXISTS (SELECT 1 FROM story_group_items sgi WHERE sgi.post_id = cv.id)
                      AND (last_share.last_shared IS NULL OR last_share.last_shared < now() - INTERVAL '24 hours')
                )
                SELECT
                    COUNT(*) AS TotalCount,
                    COUNT(*) FILTER (WHERE item_type = 'group') AS GroupCount
                FROM eligible_feed;";

            using var multi = await conn.QueryMultipleAsync(
                new CommandDefinition(sql, new { TargetWatchlistId = targetWatchlistId, limit, offset }, cancellationToken: ct)
            );
            var queryResults = (await multi.ReadAsync<UnifiedFeedQueryResult>()).ToList();
            var counts = await multi.ReadFirstAsync<StoryPlannerQueryCounts>();

            var postIds = queryResults.Where(r => r.ItemType == "post").Select(r => Guid.Parse(r.Id)).ToList();
            var groupIds = queryResults.Where(r => r.ItemType == "group").Select(r => Guid.Parse(r.Id)).ToList();

            // Batch load posts with swipe + share counts
            var postsMap = new Dictionary<string, MetaPost>();
            if (postIds.Count > 0)
            {
                var postsSql = @"
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
                        cv.status AS Status,
                        cv.suspend_until AS SuspendUntil,
                        cv.last_reviewed_at AS LastReviewedAt,
                        cw.username AS OwnerUsername,
                        cw.profile_pic_url AS OwnerProfilePictureUrl,
                        cw.profile_pic_storage_path AS OwnerProfilePicStoragePath,
                        (SELECT MAX(sph2.posted_at) FROM story_posting_history sph2 WHERE sph2.post_id = cv.id) AS LastPostedAt,
                        (SELECT p.base_sku FROM instagram_product_links ipl JOIN products p ON p.id = ipl.product_id WHERE ipl.post_id = cv.id AND ipl.link_type = 'is' LIMIT 1) as ProductCode,
                        COALESCE(SUM(CASE WHEN sph.swipe_status = 'right' THEN 1 ELSE 0 END), 0) AS RightSwipes,
                        COALESCE(SUM(CASE WHEN sph.swipe_status = 'left' THEN 1 ELSE 0 END), 0) AS LeftSwipes,
                        COUNT(sph.id) FILTER (WHERE sph.posted_at IS NOT NULL) AS ShareCount
                    FROM competitor_videos cv
                    JOIN competitor_watchlist cw ON cw.id = cv.watchlist_id
                    LEFT JOIN story_posting_history sph ON sph.post_id = cv.id
                    WHERE cv.id = ANY(@PostIds)
                    GROUP BY cv.id, cw.id, cw.username, cw.profile_pic_url, cw.profile_pic_storage_path";
                var rawPosts = await conn.QueryAsync<MetaPost>(
                    new CommandDefinition(postsSql, new { PostIds = postIds }, cancellationToken: ct)
                );
                foreach (var p in rawPosts)
                    if (p.Id != null) postsMap[p.Id] = p;
            }

            // Batch load groups (including their posts)
            var groupsMap = new Dictionary<string, StoryGroupDto>();
            if (groupIds.Count > 0)
            {
                var groupsSql = @"
                    SELECT
                        sg.id AS Id,
                        sg.name AS Name,
                        sg.status AS Status,
                        sg.suspend_until AS SuspendUntil,
                        sg.last_reviewed_at AS LastReviewedAt,
                        sg.created_at AS CreatedAt,
                        sg.updated_at AS UpdatedAt,
                        sg.keywords AS Keywords,
                        COALESCE(SUM(CASE WHEN sph.swipe_status = 'right' THEN 1 ELSE 0 END), 0) as RightSwipes,
                        COALESCE(SUM(CASE WHEN sph.swipe_status = 'left' THEN 1 ELSE 0 END), 0) as LeftSwipes,
                        COUNT(sph.id) FILTER (WHERE sph.posted_at IS NOT NULL) AS ShareCount
                    FROM story_groups sg
                    LEFT JOIN story_posting_history sph ON sph.group_id = sg.id
                    WHERE sg.id = ANY(@GroupIds)
                    GROUP BY sg.id, sg.name, sg.status, sg.suspend_until, sg.last_reviewed_at, sg.created_at, sg.updated_at, sg.keywords";
                var rawGroups = await conn.QueryAsync<EligibleGroupQueryResult>(
                    new CommandDefinition(groupsSql, new { GroupIds = groupIds, TargetWatchlistId = targetWatchlistId }, cancellationToken: ct)
                );

                foreach (var item in rawGroups)
                {
                    var g = new StoryGroupDto
                    {
                        Id = item.Id,
                        Name = item.Name,
                        Status = item.Status,
                        SuspendUntil = item.SuspendUntil,
                        LastReviewedAt = item.LastReviewedAt,
                        CreatedAt = item.CreatedAt,
                        UpdatedAt = item.UpdatedAt,
                        Keywords = item.Keywords,
                        RightSwipes = item.RightSwipes,
                        LeftSwipes = item.LeftSwipes,
                        ShareCount = item.ShareCount
                    };

                    var groupPostsSql = $@"{MetaPostWithStarredSelectSql}
                        JOIN story_group_items sgi ON sgi.post_id = cv.id
                        WHERE sgi.group_id = @GroupId
                        ORDER BY sgi.is_starred DESC, sgi.created_at ASC";
                    var groupPosts = await conn.QueryAsync<MetaPost>(
                        new CommandDefinition(groupPostsSql, new { GroupId = g.Id }, cancellationToken: ct)
                    );
                    g.Posts = groupPosts.ToList();

                    var eligibleAccounts = await conn.QueryAsync<Guid>(new CommandDefinition(@"
                        SELECT target_watchlist_id
                        FROM story_group_eligibility
                        WHERE group_id = @GroupId AND is_eligible = true", new { GroupId = g.Id }, cancellationToken: ct));
                    g.EligibleAccounts = eligibleAccounts.ToList();

                    g.UpdateNeedsReview();
                    groupsMap[g.Id.ToString()] = g;
                }
            }

            // Assemble result in SQL-ordered sequence
            var unifiedItems = new List<UnifiedPlannerItemDto>();
            foreach (var row in queryResults)
            {
                if (row.ItemType == "post" && postsMap.TryGetValue(row.Id, out var post))
                {
                    unifiedItems.Add(new UnifiedPlannerItemDto
                    {
                        Type = "post",
                        Id = row.Id,
                        Timestamp = row.SortTimestamp,
                        Post = post
                    });
                }
                else if (row.ItemType == "group" && groupsMap.TryGetValue(row.Id, out var group))
                {
                    unifiedItems.Add(new UnifiedPlannerItemDto
                    {
                        Type = "group",
                        Id = row.Id,
                        Timestamp = row.SortTimestamp,
                        Group = group
                    });
                }
            }

            return Ok(new StoryPlannerFeedResponseDto
            {
                Items = unifiedItems,
                TotalCount = counts.TotalCount,
                GroupCount = counts.GroupCount
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve eligible story shares");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("story-groups/pending-swipes")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> GetPendingSwipeCards(CancellationToken ct)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync();
            
            // 1. Find the last game played time (max swiped_at older than 1 hour to avoid session overlap issues)
            var lastSwipedAt = await conn.ExecuteScalarAsync<DateTime?>(new CommandDefinition(@"
                SELECT MAX(swiped_at) 
                FROM story_posting_history
                WHERE swiped_at < now() - INTERVAL '1 hour'", cancellationToken: ct));
            
            // Default to 7 days ago if no swipes have been made yet
            var queryTime = lastSwipedAt ?? DateTime.UtcNow.AddDays(-7);

            // Use DISTINCT ON (post_id) to ensure each post appears only once in the swipe game
            var sql = @"
                SELECT * FROM (
                    SELECT DISTINCT ON (sph.post_id)
                        sph.id AS Id,
                        sph.group_id AS GroupId,
                        sg.name AS GroupName,
                        sph.post_id AS PostId,
                        sph.target_watchlist_id AS TargetWatchlistId,
                        cw.username AS TargetUsername,
                        sph.posted_at AS PostedAt,
                        sph.swipe_status AS SwipeStatus,
                        sph.swiped_at AS SwipedAt
                    FROM story_posting_history sph
                    LEFT JOIN story_groups sg ON sg.id = sph.group_id
                    JOIN competitor_watchlist cw ON cw.id = sph.target_watchlist_id
                    WHERE sph.swipe_status = 'pending'
                      AND sph.post_id IS NOT NULL
                      AND sph.posted_at >= @QueryTime - INTERVAL '1 day'
                      AND sph.posted_at <= now() - INTERVAL '24 hours'
                    ORDER BY sph.post_id, sph.posted_at ASC
                ) t
                ORDER BY t.PostedAt ASC";

            var rawHistory = await conn.QueryAsync<StoryPostingHistoryDto>(new CommandDefinition(sql, new { QueryTime = queryTime }, cancellationToken: ct));
            var historyList = rawHistory.ToList();

            foreach (var h in historyList)
            {
                if (!string.IsNullOrEmpty(h.PostId))
                {
                    var postSql = $@"{MetaPostSelectSql} WHERE cv.id = @PostId::uuid";
                    h.Post = await conn.QueryFirstOrDefaultAsync<MetaPost>(new CommandDefinition(postSql, new { PostId = h.PostId }, cancellationToken: ct));
                }
            }

            return Ok(historyList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve pending swipe cards");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("story-groups/swipes")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> SubmitSwipes([FromBody] List<SwipeResponseItem> swipes, CancellationToken ct)
    {
        if (swipes == null || swipes.Count == 0) return BadRequest("Swipes data is empty.");

        using var conn = await _db.CreateConnectionAsync();
        using var trans = conn.BeginTransaction();
        try
        {
            foreach (var item in swipes)
            {
                if (item.Direction != "left" && item.Direction != "right") continue;

                // 1. Get the post_id for this history record before we update it
                var postId = await conn.ExecuteScalarAsync<Guid?>(new CommandDefinition(@"
                    SELECT post_id FROM story_posting_history WHERE id = @HistoryId",
                    new { HistoryId = item.HistoryId }, transaction: trans, cancellationToken: ct));

                // 2. Update the specific swiped history record
                await conn.ExecuteAsync(new CommandDefinition(@"
                    UPDATE story_posting_history
                    SET swipe_status = @Direction, swiped_at = now()
                    WHERE id = @HistoryId",
                    new { Direction = item.Direction, HistoryId = item.HistoryId }, transaction: trans, cancellationToken: ct));

                // 3. Update all other pending history records for the same post
                if (postId.HasValue)
                {
                    await conn.ExecuteAsync(new CommandDefinition(@"
                        UPDATE story_posting_history
                        SET swipe_status = @Direction, swiped_at = now()
                        WHERE post_id = @PostId AND swipe_status = 'pending'",
                        new { Direction = item.Direction, PostId = postId.Value }, transaction: trans, cancellationToken: ct));
                }
            }
            trans.Commit();
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            trans.Rollback();
            _logger.LogError(ex, "Failed to submit swipes");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public class InstagramCommentDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("commentText")]
    public string CommentText { get; set; } = string.Empty;

    [JsonPropertyName("postedAt")]
    public DateTime PostedAt { get; set; }

    [JsonPropertyName("likeCount")]
    public int LikeCount { get; set; }

    [JsonPropertyName("isHidden")]
    public bool IsHidden { get; set; }

    [JsonPropertyName("username")]
    public string? Username { get; set; }

    [JsonPropertyName("fullName")]
    public string? FullName { get; set; }
}

public class StoryGroupDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";

    [JsonPropertyName("suspendUntil")]
    public DateTime? SuspendUntil { get; set; }

    [JsonPropertyName("lastReviewedAt")]
    public DateTime? LastReviewedAt { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [JsonPropertyName("posts")]
    public List<MetaPost> Posts { get; set; } = new();

    [JsonPropertyName("eligibleAccounts")]
    public List<Guid> EligibleAccounts { get; set; } = new();

    [JsonPropertyName("needsReview")]
    public bool NeedsReview { get; set; }

    [JsonPropertyName("keywords")]
    public string? Keywords { get; set; }

    [JsonPropertyName("rightSwipes")]
    public long RightSwipes { get; set; }

    [JsonPropertyName("leftSwipes")]
    public long LeftSwipes { get; set; }

    [JsonPropertyName("shareCount")]
    public long ShareCount { get; set; }

    public void UpdateNeedsReview()
    {
        bool needsReview = false;
        if (Status == "suspend" && SuspendUntil.HasValue && SuspendUntil.Value < DateTime.UtcNow)
        {
            needsReview = true;
        }
        else if (Posts.Count > 0)
        {
            var newestPostDate = Posts.Max(p => p.Timestamp ?? DateTime.MinValue);
            if (newestPostDate != DateTime.MinValue && newestPostDate < DateTime.UtcNow.AddDays(-15))
            {
                if (!LastReviewedAt.HasValue || LastReviewedAt.Value < newestPostDate)
                {
                    needsReview = true;
                }
            }
        }
        NeedsReview = needsReview;
    }
}

public class UpdateVideoStatusRequest
{
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("suspendDays")]
    public int? SuspendDays { get; set; }

    [JsonPropertyName("lastReviewedAt")]
    public DateTime? LastReviewedAt { get; set; }
}

public class CreateStoryGroupRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("postIds")]
    public List<Guid> PostIds { get; set; } = new();

    [JsonPropertyName("targetWatchlistIds")]
    public List<Guid> TargetWatchlistIds { get; set; } = new();

    [JsonPropertyName("keywords")]
    public string? Keywords { get; set; }
}

public class UpdateStoryGroupRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("suspendDays")]
    public int? SuspendDays { get; set; }

    [JsonPropertyName("postIds")]
    public List<Guid>? PostIds { get; set; }

    [JsonPropertyName("starredPostIds")]
    public List<Guid>? StarredPostIds { get; set; }

    [JsonPropertyName("targetWatchlistIds")]
    public List<Guid>? TargetWatchlistIds { get; set; }

    [JsonPropertyName("keywords")]
    public string? Keywords { get; set; }
}

public class StoryPostingHistoryDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("groupId")]
    public Guid? GroupId { get; set; }

    [JsonPropertyName("groupName")]
    public string? GroupName { get; set; }

    [JsonPropertyName("postId")]
    public string? PostId { get; set; }

    [JsonPropertyName("targetWatchlistId")]
    public Guid TargetWatchlistId { get; set; }

    [JsonPropertyName("targetUsername")]
    public string TargetUsername { get; set; } = string.Empty;

    [JsonPropertyName("postedAt")]
    public DateTime PostedAt { get; set; }

    [JsonPropertyName("swipeStatus")]
    public string SwipeStatus { get; set; } = "pending";

    [JsonPropertyName("swipedAt")]
    public DateTime? SwipedAt { get; set; }

    [JsonPropertyName("post")]
    public MetaPost? Post { get; set; }

    [JsonPropertyName("posts")]
    public List<MetaPost> Posts { get; set; } = new();
}

public class SwipeResponseItem
{
    [JsonPropertyName("historyId")]
    public Guid HistoryId { get; set; }

    [JsonPropertyName("direction")]
    public string Direction { get; set; } = string.Empty;
}

public class MergeStoryGroupsRequest
{
    [JsonPropertyName("group1Id")]
    public Guid Group1Id { get; set; }

    [JsonPropertyName("group2Id")]
    public Guid Group2Id { get; set; }
}

public class OwnAccountVideoQueryResult
{
    public string? Id { get; set; }
    public string? PlatformId { get; set; }
    public string? Permalink { get; set; }
    public string? Caption { get; set; }
    public string? MediaType { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? MediaUrl { get; set; }
    public long LikeCount { get; set; }
    public long CommentCount { get; set; }
    public DateTime? Timestamp { get; set; }
    public string? StoragePath { get; set; }
    public string? YoutubeVideoId { get; set; }
    public string? YoutubeUrl { get; set; }
    public string Status { get; set; } = "active";
    public DateTime? SuspendUntil { get; set; }
    public DateTime? LastReviewedAt { get; set; }
    public string? OwnerUsername { get; set; }
    public string? OwnerProfilePictureUrl { get; set; }
    public string? OwnerProfilePicStoragePath { get; set; }
    public string? ProductCode { get; set; }
    public bool IsStarred { get; set; }
    public Guid? GroupId { get; set; }
    public DateTime? LastPostedAt { get; set; }
}

public class UnifiedFeedQueryResult
{
    public string ItemType { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
    public DateTime SortTimestamp { get; set; }
}

public class StoryGroupEligibilityQueryResult
{
    public Guid GroupId { get; set; }
    public Guid TargetWatchlistId { get; set; }
}

public class UnifiedPlannerItemDto
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public DateTime? Timestamp { get; set; }

    [JsonPropertyName("post")]
    public MetaPost? Post { get; set; }

    [JsonPropertyName("group")]
    public StoryGroupDto? Group { get; set; }
}

public class StoryPlannerQueryCounts
{
    public int TotalCount { get; set; }
    public int GroupCount { get; set; }
}

public class StoryPlannerFeedResponseDto
{
    [JsonPropertyName("items")]
    public List<UnifiedPlannerItemDto> Items { get; set; } = new();

    [JsonPropertyName("totalCount")]
    public int TotalCount { get; set; }

    [JsonPropertyName("groupCount")]
    public int GroupCount { get; set; }
}







