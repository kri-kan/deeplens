using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Instagram;
using DeepLens.Application.Abstractions.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dapper;
using DeepLens.Infrastructure.Services;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class InstaController : ControllerBase
{
    private readonly IMetaGraphService _metaGraph;
    private readonly IDbConnectionFactory _db;
    private readonly IStorageService _storage;

    public InstaController(
        IMetaGraphService metaGraph,
        IDbConnectionFactory db,
        IStorageService storage)
    {
        _metaGraph = metaGraph;
        _db = db;
        _storage = storage;
    }

    [HttpGet]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult<IEnumerable<object>>> GetWatchlist()
    {
        using var conn = await _db.CreateConnectionAsync();
        var watchlist = await conn.QueryAsync("SELECT * FROM competitor_watchlist WHERE platform = 'instagram' ORDER BY username ASC");
        return Ok(watchlist);
    }

    [HttpGet("profile/{username}")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> GetProfile(string username)
    {
        using var conn = await _db.CreateConnectionAsync();
        var profileInfo = await conn.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT id, username, display_name, profile_pic_url, bio, 
                   follower_count, following_count, post_count, last_scraped_at, 
                   external_id, is_active, is_data_deleted 
            FROM competitor_watchlist 
            WHERE username = @username AND platform = 'instagram'", 
            new { username });

        if (profileInfo == null) return NotFound();

        bool isDeleted = profileInfo.is_data_deleted ?? false;
        var videos = new List<MetaPost>();
        
        if (!isDeleted)
        {
            // 2. Get Recent Posts from Database to avoid API throttling
            var sql = @"
                SELECT 
                    platform_video_id AS Id, 
                    url AS Permalink, 
                    description AS Caption,
                    media_type AS MediaType, 
                    thumbnail_url AS ThumbnailUrl, 
                    media_url AS MediaUrl,
                    like_count AS LikeCount, 
                    comment_count AS CommentsCount, 
                    posted_at::text AS Timestamp,
                    storage_path AS StoragePath
                FROM competitor_videos 
                WHERE watchlist_id = (SELECT id FROM competitor_watchlist WHERE username = @username AND platform = 'instagram')
                ORDER BY posted_at DESC
                LIMIT 50";

            videos = (await conn.QueryAsync<MetaPost>(sql, new { username })).ToList();
        }

        double postFrequency = 0;
        if (videos.Count > 1)
        {
            try
            {
                var latest = DateTime.Parse(videos.First().Timestamp!);
                var oldest = DateTime.Parse(videos.Last().Timestamp!);
                var days = (latest - oldest).TotalDays;
                if (days > 0)
                {
                    postFrequency = (videos.Count / days) * 7;
                }
            }
            catch { /* Parsing fallback */ }
        }

        var composite = new
        {
            profile = new
            {
                username = profileInfo.username,
                name = profileInfo.display_name,
                biography = profileInfo.bio,
                followersCount = profileInfo.follower_count ?? 0,
                followsCount = profileInfo.following_count ?? 0,
                mediaCount = profileInfo.post_count ?? 0,
                profilePictureUrl = profileInfo.profile_pic_url,
                website = "", 
                is_verified = false, 
                is_business = true, 
                externalId = profileInfo.external_id,
                is_active = profileInfo.is_active ?? true,
                last_synced_at = profileInfo.last_scraped_at,
                is_data_deleted = isDeleted
            },
            videos,
            metrics = new
            {
                avgLikes = videos.Count > 0 ? videos.Average(v => v.LikeCount) : 0,
                engagementRate = (videos.Count > 0 && (profileInfo.follower_count ?? 0) > 0) ? (videos.Average(v => v.LikeCount) / (double)profileInfo.follower_count) * 100 : 0,
                postFrequency = postFrequency
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
            "SELECT EXISTS(SELECT 1 FROM competitor_watchlist WHERE username = @Username AND platform = 'instagram')", 
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
                @FollowersCount, @FollowsCount, @MediaCount, NULL, @ExternalId)",
            new { 
                Username = username, 
                Name = profile.Name, 
                ProfilePictureUrl = profile.ProfilePictureUrl, 
                Bio = profile.Biography,
                FollowersCount = (int)profile.FollowersCount, 
                FollowsCount = (int)profile.FollowsCount,
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
            "DELETE FROM competitor_watchlist WHERE username = @Username AND platform = 'instagram'", 
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
            "SELECT id FROM competitor_watchlist WHERE username = @username AND platform = 'instagram'", 
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
                    @FollowersCount, @FollowsCount, @MediaCount, NULL, @ExternalId)",
                new { 
                    Id = watchlistId,
                    Username = username, 
                    Name = profile.Name, 
                    ProfilePictureUrl = profile.ProfilePictureUrl, 
                    Bio = profile.Biography,
                    FollowersCount = (int)profile.FollowersCount, 
                    FollowsCount = (int)profile.FollowsCount,
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
        using var conn = _db.CreateConnection();
        var jobs = await conn.QueryAsync<dynamic>(@"
            SELECT j.id, w.username, j.job_type, j.status, j.priority,
                   j.target_count, j.scraped_count,
                   j.created_at as next_run_at, 'mobile_app' as origin
            FROM scraper_queue j
            LEFT JOIN competitor_watchlist w ON j.watchlist_id = w.id
            WHERE j.status IN ('pending', 'running', 'paused')
            ORDER BY j.priority DESC, j.created_at ASC");
        return Ok(jobs);
    }

    [HttpGet("jobs/history")]
    [Authorize(Policy = "SearchPolicy")]
    public async Task<ActionResult> GetJobHistory()
    {
        using var conn = _db.CreateConnection();
        var jobs = await conn.QueryAsync<dynamic>(@"
            SELECT j.id, w.username, j.job_type, j.status, 
                   j.items_processed as scraped_count,
                   j.completed_at, j.triggered_by as origin
            FROM scraper_history j
            LEFT JOIN competitor_watchlist w ON j.watchlist_id = w.id
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
            "SELECT id FROM competitor_watchlist WHERE username = @username", new { username });

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
                WHERE username = @username AND platform = 'instagram'",
                new { username, active });
            return Ok(new { username, is_active = active });
        }

    [HttpDelete("profile/{username}/data")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<ActionResult> DeleteProfileData(string username)
    {
        using var conn = await _db.CreateConnectionAsync();
        var profile = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT id, external_id FROM competitor_watchlist WHERE username = @username AND platform = 'instagram'",
            new { username });

        if (profile == null) return NotFound();

        Guid watchlistId = profile.id;
        string? externalId = profile.external_id;

        // 1. Delete media from MinIO
        if (!string.IsNullOrEmpty(externalId))
        {
            try
            {
                // MinIO doesn't have a direct "delete directory" command, we usually have to list and delete
                // But we can just use the bucket/prefix logic in our storage service if it supported it.
                // For now, we will delete all videos from DB first, then delete MinIO files if we can.
                // Assuming StorageService has a way to delete by path prefix or we just delete individual files.
                
                var storagePaths = await conn.QueryAsync<string>(
                    "SELECT storage_path FROM competitor_videos WHERE watchlist_id = @watchlistId AND storage_path IS NOT NULL",
                    new { watchlistId });

                foreach (var path in storagePaths)
                {
                    await _storage.DeleteFileAsync(path);
                }
            }
            catch (Exception ex)
            {
                // Log but continue
                Console.WriteLine($"Error deleting files from MinIO: {ex.Message}");
            }
        }

        // 2. Delete posts from DB
        await conn.ExecuteAsync("DELETE FROM competitor_videos WHERE watchlist_id = @watchlistId", new { watchlistId });

        // 3. Mark as deleted and inactive
        await conn.ExecuteAsync(@"
            UPDATE competitor_watchlist 
            SET is_active = false, is_data_deleted = true, last_scraped_at = NULL
            WHERE id = @watchlistId",
            new { watchlistId });

        return Ok(new { message = "Profile data deleted successfully" });
    }
}




