using System.Text.Json;
using Dapper;
using DeepLens.Infrastructure.Services;
using DeepLens.Application.Abstractions.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using DeepLens.Contracts.Media;
using DeepLens.Shared.Common;
using DeepLens.Domain.Enums;
using DeepLens.Contracts.Instagram;

namespace DeepLens.WorkerService.Workers
{
    public class InstagramSyncWorker : BackgroundService
    {
        private readonly ILogger<InstagramSyncWorker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly string _connectionString;

        public InstagramSyncWorker(
            ILogger<InstagramSyncWorker> logger,
            IServiceProvider serviceProvider,
            IConfiguration configuration)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _connectionString = configuration.GetConnectionString("DefaultConnection") ?? "";
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await Task.Yield(); 

            _logger.LogInformation("InstagramSyncWorker started in Queue-Only mode.");

            // Reset any jobs stuck in 'running' status from previous process crash
            try {
                await HealQueueAsync();
            } catch (Exception ex) {
                _logger.LogWarning(ex, "Failed to heal queue on startup.");
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                int delaySeconds = 5; 
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var graph = scope.ServiceProvider.GetRequiredService<IMetaGraphService>();
                        
                        // 1. Ensure all watched profiles have a scheduled job
                        await EnsureRoutineJobsAreQueuedAsync(graph, stoppingToken);

                        // 2. Process the next available job (Manual or Due Routine)
                        bool jobProcessed = await ProcessQueueAsync(graph, stoppingToken);
                        
                        if (!jobProcessed)
                        {
                            delaySeconds = 15; // Idle
                        }
                        else
                        {
                            delaySeconds = 1; // High throughput
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in worker loop.");
                    delaySeconds = 30;
                }

                await Task.Delay(TimeSpan.FromSeconds(delaySeconds), stoppingToken);
            }
        }

        private async Task<bool> ProcessQueueAsync(IMetaGraphService graph, CancellationToken ct)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync(ct);
            _logger.LogInformation("Database connection opened for queue processing.");

            // Fetch highest priority pending job that is due
            // Using a transaction with FOR UPDATE SKIP LOCKED to strictly ensure 
            // only one worker can pick up a specific job at a time.
            using var tx = await conn.BeginTransactionAsync(ct);
            var job = await conn.QueryFirstOrDefaultAsync<dynamic>(@"
                SELECT j.id, j.watchlist_id, j.job_type, j.target_count, w.username, w.is_own_account
                FROM scraper_queue j
                JOIN competitor_watchlist w ON j.watchlist_id = w.id
                WHERE j.status = 'pending' 
                  AND (j.next_run_at IS NULL OR j.next_run_at <= NOW())
                ORDER BY j.priority DESC, j.created_at ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED", transaction: tx);

            if (job == null)
            {
                await tx.RollbackAsync(ct);
                return false;
            }

            Guid jobId = job.id;
            // Update status to running inside the same transaction
            await conn.ExecuteAsync("UPDATE scraper_queue SET status = 'running', started_at = NOW() WHERE id = @jobId", new { jobId }, transaction: tx);
            await tx.CommitAsync(ct);

            Guid watchlistId = job.watchlist_id;
            string username = job.username;
            int targetCount = job.target_count;
            string jobType = job.job_type;

            var startTime = DateTime.UtcNow;
            int scrapedCount = 0;
            string? errorMessage = null;

            try
            {
                await graph.ReloadFromDbAsync();
                
                // Logging Table Link
                // Note: We use the jobId from scraper_queue as the unique job identifier in logs and history
                
                await LogAsync(conn, jobId, "INFO", $"Starting {jobType} sync for @{username} (Target: {targetCount})");

                // Reset is_data_deleted flag when sync starts
                await conn.ExecuteAsync("UPDATE competitor_watchlist SET is_data_deleted = false WHERE id = @watchlistId", new { watchlistId });

                // --- 1. Profile Sync ---
                var graphProfile = await graph.GetProfileAsync(username);
                if (graphProfile == null) throw new Exception($"Profile @{username} not found or not a business account.");
                
                await LogAsync(conn, jobId, "INFO", $"Found profile: {graphProfile.Name}. {graphProfile.FollowersCount} followers.", graph.LastCall);

                await UpdateProfileAsync(conn, watchlistId, graphProfile);
                await LogAsync(conn, jobId, "INFO", "Profile metadata updated in database.");

                // --- 2. Media Sync (Next Cursor Loop) ---
                await LogAsync(conn, jobId, "INFO", $"Fetching media (Target: {targetCount})...");
                
                // If targetCount is 0, GetPostsAsync treats it as "All"
                var posts = await graph.GetPostsAsync(username, targetCount);
                
                await LogAsync(conn, jobId, "INFO", $"Fetched {posts.Count} posts from Meta API.", graph.LastCall);
                
                using var serviceScope = _serviceProvider.CreateScope();
                var storage = serviceScope.ServiceProvider.GetRequiredService<IStorageService>();
                var httpClient = serviceScope.ServiceProvider.GetRequiredService<HttpClient>();
                var instaMedia = serviceScope.ServiceProvider.GetRequiredService<IInstagramMediaService>();

                int newCount = await IngestPostsAsync(conn, jobId, watchlistId, posts, graphProfile.ExternalId, storage, httpClient, instaMedia, job.is_own_account ?? false);
                scrapedCount = posts.Count;

                await LogAsync(conn, jobId, "INFO", $"Sync complete. {newCount} new/updated posts processed.");

                // --- 3. Engagement Refresh (optional for manual?) ---
                int refreshLimit = graph.GetEngagementRefreshLimit();
                var engagement = await graph.GetPostEngagementAsync(username, refreshLimit);
                await UpdateEngagementAsync(conn, engagement);
                
                await LogAsync(conn, jobId, "INFO", $"Updated engagement for {engagement.Count} recent posts.");

                // Move to History
                await MoveToHistoryAsync(conn, jobId, watchlistId, jobType, "completed", scrapedCount, scrapedCount, 0, null, startTime);
                await conn.ExecuteAsync("DELETE FROM scraper_queue WHERE id = @jobId", new { jobId });

                // --- 4. Auto-Reschedule if Routine ---
                if (jobType == "routine")
                {
                    int interval = graph.GetSyncIntervalMinutes();
                    var nextRun = DateTime.UtcNow.AddMinutes(interval);
                    await conn.ExecuteAsync(@"
                        INSERT INTO scraper_queue (watchlist_id, job_type, status, priority, next_run_at, target_count)
                        VALUES (@watchlistId, 'routine', 'pending', 1, @nextRun, @Target)",
                        new { watchlistId, nextRun, Target = graph.GetEngagementRefreshLimit() });
                    _logger.LogInformation("Rescheduled routine sync for @{Username} at {NextRun}", username, nextRun);
                }
            }
            catch (Exception ex) when (ex.Message.Contains("INSTAGRAM_RATE_LIMIT_REACHED"))
            {
                _logger.LogWarning("Rate limit reached for @{Username}. Re-queueing for later.", username);
                await LogAsync(conn, jobId, "WARNING", "Instagram Rate Limit Reached. Job will resume in 1 hour.");
                
                await conn.ExecuteAsync(@"
                    UPDATE scraper_queue 
                    SET status = 'pending', 
                        next_run_at = @NextRun
                    WHERE id = @JobId", 
                    new { JobId = jobId, NextRun = DateTime.UtcNow.AddHours(1) });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Job {JobId} failed", jobId);
                errorMessage = ex.Message;
                await LogAsync(conn, jobId, "ERROR", $"Job failed: {ex.Message}", ex.ToString());
                
                await MoveToHistoryAsync(conn, jobId, watchlistId, jobType, "failed", scrapedCount, scrapedCount, 0, ex.Message, startTime);
                await conn.ExecuteAsync("DELETE FROM scraper_queue WHERE id = @jobId", new { jobId });

                // Even on failure, if it was routine, we should probably reschedule to try again later
                if (jobType == "routine")
                {
                    var nextRun = DateTime.UtcNow.AddMinutes(30); // Retry sooner on failure
                    await conn.ExecuteAsync(@"
                        INSERT INTO scraper_queue (watchlist_id, job_type, status, priority, next_run_at, target_count)
                        VALUES (@watchlistId, 'routine', 'pending', 1, @nextRun, @Target)",
                        new { watchlistId, nextRun, Target = graph.GetEngagementRefreshLimit() });
                }
            }

            return true;
        }

        private async Task LogAsync(NpgsqlConnection conn, Guid jobId, string level, string message, object? payload = null)
        {
            string? payloadJson = payload != null ? (payload is string s && (s.Trim().StartsWith("{") || s.Trim().StartsWith("[")) ? s : JsonSerializer.Serialize(payload)) : null;
            await conn.ExecuteAsync(@"
                INSERT INTO scraper_logs (job_id, log_level, message, raw_payload)
                VALUES (@jobId, @level, @message, @payloadJson::jsonb)",
                new { jobId, level, message, payloadJson });
        }

        private async Task MoveToHistoryAsync(NpgsqlConnection conn, Guid jobId, Guid watchlistId, string type, string status, int found, int processed, int failed, string? error, DateTime startedAt)
        {
            await conn.ExecuteAsync(@"
                INSERT INTO scraper_history (job_id, watchlist_id, job_type, status, items_found, items_processed, items_failed, error_message, started_at, completed_at, duration_ms)
                VALUES (@jobId, @watchlistId, @type, @status, @found, @processed, @failed, @error, @startedAt, @Now, @Duration)",
                new { 
                    jobId, watchlistId, type, status, found, processed, failed, error, 
                    startedAt, Now = DateTime.UtcNow, 
                    Duration = (int)DateTime.UtcNow.Subtract(startedAt).TotalMilliseconds 
                });
        }

        private async Task HealQueueAsync()
        {
            using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            var count = await conn.ExecuteAsync("UPDATE scraper_queue SET status = 'pending' WHERE status = 'running'");
            if (count > 0)
            {
                _logger.LogInformation("Healed queue: Reset {Count} stuck jobs to pending.", count);
            }
        }

        private async Task UpdateProfileAsync(NpgsqlConnection conn, Guid id, MetaProfile profile)
        {
            // 1. Basic Metadata Update
            var sql = @"
                UPDATE competitor_watchlist 
                SET display_name = @Name, bio = @Bio, profile_pic_url = @Pic,
                    follower_count = @Followers, following_count = @Following, post_count = @Posts,
                    last_scraped_at = @Now
                WHERE id = @Id";
            await conn.ExecuteAsync(sql, new {
                Name = profile.Name, Bio = profile.Biography, Pic = profile.ProfilePictureUrl,
                Followers = (int)profile.FollowersCount, Following = (int)profile.FollowingCount,
                Posts = profile.MediaCount, Now = DateTime.UtcNow, Id = id
            });
            
            await conn.ExecuteAsync(@"
                INSERT INTO follower_snapshots (watchlist_id, follower_count, following_count, snapshot_at)
                VALUES (@Id, @Followers, @Following, @Now)",
                new { Id = id, Followers = (int)profile.FollowersCount, Following = (int)profile.FollowingCount, Now = DateTime.UtcNow });

            // 2. Media Architecture Consistency: Download & Register in Media Tables
            try 
            {
                using var scope = _serviceProvider.CreateScope();
                var storage = scope.ServiceProvider.GetRequiredService<IStorageService>();
                var http = scope.ServiceProvider.GetRequiredService<HttpClient>();

                // --- Singleton Profile Image Rule ---
                // We want to ensure only one profile image exists at a time to prevent storage bloat.
                var oldMedia = await conn.QueryAsync<dynamic>(@"
                    SELECT m.id, m.storage_path 
                    FROM media m
                    JOIN media_links ml ON ml.media_id = m.id
                    WHERE ml.entity_id = @id AND ml.entity_type = 'instagram_profile'", 
                    new { id });

                foreach (var m in oldMedia)
                {
                    try {
                        string oldPath = (string)m.storage_path;
                        Guid oldMediaId = (Guid)m.id;
                        
                        _logger.LogInformation("Deleting old profile picture: {Path}", oldPath);
                        await storage.DeleteFileAsync(oldPath);
                        // ON DELETE CASCADE on media_links will handle the relationship cleanup
                        await conn.ExecuteAsync("DELETE FROM media WHERE id = @mediaId", new { mediaId = oldMediaId });
                    } catch (Exception ex) {
                        _logger.LogWarning(ex, "Failed to clean up old profile picture");
                    }
                }

                _logger.LogInformation("Downloading fresh profile picture for @{Username}...", profile.Username);
                var context = new InstagramContext(profile.ExternalId ?? "");
                string identifier = $"profile_pic_{DateTime.UtcNow:yyyyMMdd_HHmmss}.jpg";
                string fullPath = StoragePathRegistry.GetPath(context, identifier);

                var response = await http.GetAsync(profile.ProfilePictureUrl);
                if (response.IsSuccessStatusCode)
                {
                    using var stream = await response.Content.ReadAsStreamAsync();
                    await storage.UploadToPathAsync(fullPath, stream, "image/jpeg");

                    // Register in central 'media' table
                    var mediaId = Guid.NewGuid();
                    await conn.ExecuteAsync(@"
                        INSERT INTO media (id, storage_path, media_type, category, subcategory)
                        VALUES (@mediaId, @fullPath, 1, 'instagram', 'profile_pic')",
                        new { mediaId, fullPath });

                    // Link to 'competitor_watchlist' via 'media_links'
                    await conn.ExecuteAsync(@"
                        INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
                        VALUES (@mediaId, @id, 'instagram_profile', true)",
                        new { mediaId, id });

                    // Also update the shortcut column in watchlist
                    await conn.ExecuteAsync(
                        "UPDATE competitor_watchlist SET profile_pic_storage_path = @fullPath WHERE id = @id",
                        new { fullPath, id });
                    
                    _logger.LogInformation("Profile picture successfully rotated for @{Username}: {Path}", profile.Username, fullPath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to sync profile picture to local storage for @{Username}", profile.Username);
            }
        }

        private async Task<int> IngestPostsAsync(NpgsqlConnection conn, Guid jobId, Guid watchlistId, List<MetaPost> posts, string externalId, IStorageService storage, HttpClient http, IInstagramMediaService instaMedia, bool isOwnAccount)
        {
            var existingPosts = (await conn.QueryAsync<dynamic>("SELECT platform_video_id, storage_path FROM competitor_videos WHERE watchlist_id = @Id", new { Id = watchlistId }))
                                .ToDictionary(x => (string)x.platform_video_id, x => (string?)x.storage_path);
            int count = 0;
            int total = posts.Count;

            var insertSql = @"
                INSERT INTO competitor_videos (
                    watchlist_id, platform, platform_video_id, url, description, 
                    media_type, thumbnail_url, media_url, like_count, comment_count, posted_at, is_reel, storage_path)
                VALUES (
                    @WatchlistId, 'instagram', @Id, @Url, @Caption, 
                    @MediaType, @ThumbnailUrl, @MediaUrl, @LikeCount, @CommentCount, @PostedAt, @IsReel, @StoragePath)";

            var updateStorageSql = "UPDATE competitor_videos SET storage_path = @StoragePath WHERE platform_video_id = @Id AND watchlist_id = @WatchlistId";
            var updateProgressSql = "UPDATE scraper_queue SET scraped_count = @Count WHERE id = @JobId";

            foreach (var p in posts)
            {
                try {
                    if (string.IsNullOrEmpty(p.Id)) continue;
                    
                    bool exists = existingPosts.TryGetValue(p.Id, out var storagePath);
                    
                    // If it exists and already has a storage path, we skip thumbnail download
                    if (exists && !string.IsNullOrEmpty(storagePath)) 
                    {
                        if (isOwnAccount)
                        {
                            var dbPostId = await conn.ExecuteScalarAsync<Guid>("SELECT id FROM competitor_videos WHERE platform_video_id = @Id AND watchlist_id = @WatchlistId", new { Id = p.Id, WatchlistId = watchlistId });
                            await instaMedia.ProcessFullMediaDownloadAsync(dbPostId, p, externalId);
                        }
                        continue;
                    }

                    // Download thumbnail if missing
                    string? newStoragePath = null;
                    string? thumbUrl = p.ThumbnailUrl ?? p.MediaUrl;
                    if (!string.IsNullOrEmpty(thumbUrl))
                    {
                        newStoragePath = await DownloadAndStoreThumbnailAsync(http, storage, externalId, p.Id, thumbUrl);
                    }

                    if (!exists)
                    {
                        var videoId = Guid.NewGuid();
                        await conn.ExecuteAsync(insertSql, new {
                            WatchlistId = watchlistId, Id = p.Id, Url = p.Permalink ?? "", Caption = p.Caption,
                            MediaType = p.MediaType.ToString().ToUpper(), ThumbnailUrl = thumbUrl,
                            MediaUrl = p.MediaUrl, LikeCount = p.LikeCount, CommentCount = p.CommentCount,
                            PostedAt = p.Timestamp ?? DateTime.UtcNow,
                            IsReel = p.MediaProductType?.ToUpper() == "REELS",
                            StoragePath = newStoragePath
                        });

                        // Fetch the auto-generated ID if we need to link media
                        var dbPostId = await conn.ExecuteScalarAsync<Guid>("SELECT id FROM competitor_videos WHERE platform_video_id = @Id AND watchlist_id = @WatchlistId", new { Id = p.Id, WatchlistId = watchlistId });

                        // Media Architecture Consistency: Register and Link
                        if (!string.IsNullOrEmpty(newStoragePath))
                        {
                            var mediaId = Guid.NewGuid();
                            await conn.ExecuteAsync(@"
                                INSERT INTO media (id, storage_path, media_type, category, subcategory)
                                VALUES (@mediaId, @newStoragePath, 1, 'instagram', 'thumbnail')",
                                new { mediaId, newStoragePath });

                            await conn.ExecuteAsync(@"
                                INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
                                VALUES (@mediaId, @dbPostId, 'competitor_video', true)",
                                new { mediaId, dbPostId });
                        }

                        // Full Media Download for Own Accounts
                        if (isOwnAccount)
                        {
                            await instaMedia.ProcessFullMediaDownloadAsync(dbPostId, p, externalId);
                        }

                        count++;
                    }
                    else 
                    {
                        var dbPostId = await conn.ExecuteScalarAsync<Guid>("SELECT id FROM competitor_videos WHERE platform_video_id = @Id AND watchlist_id = @WatchlistId", new { Id = p.Id, WatchlistId = watchlistId });

                        if (newStoragePath != null)
                        {
                            // Update existing record with missing storage path
                            await conn.ExecuteAsync(updateStorageSql, new { StoragePath = newStoragePath, Id = p.Id, WatchlistId = watchlistId });
                            
                            // Also ensure it's registered in media if it was missing
                            var mediaId = Guid.NewGuid();
                            await conn.ExecuteAsync(@"
                                INSERT INTO media (id, storage_path, media_type, category, subcategory)
                                VALUES (@mediaId, @newStoragePath, 1, 'instagram', 'thumbnail')
                                ON CONFLICT DO NOTHING", 
                                new { mediaId, newStoragePath });

                            await conn.ExecuteAsync(@"
                                INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
                                VALUES (@mediaId, @dbPostId, 'competitor_video', true)
                                ON CONFLICT DO NOTHING",
                                new { mediaId, dbPostId });
                        }

                        // Full Media Download for Own Accounts
                        if (isOwnAccount)
                        {
                            await instaMedia.ProcessFullMediaDownloadAsync(dbPostId, p, externalId);
                        }

                        count++;
                    }

                    // Periodic progress update in DB for long-running jobs
                    if (count % 5 == 0 || count == total)
                    {
                        await conn.ExecuteAsync(updateProgressSql, new { Count = count, JobId = jobId });
                    }
                } catch (Exception ex) {
                    _logger.LogWarning(ex, "Failed to ingest individual post {PostId} for @{ExternalId}. Skipping to next.", p.Id, externalId);
                    await LogAsync(conn, jobId, "WARNING", $"Failed to ingest individual post {p.Id}: {ex.Message}");
                }
            }
            return count;
        }

        private async Task<string?> DownloadAndStoreThumbnailAsync(HttpClient http, IStorageService storage, string externalId, string postId, string url)
        {
            try
            {
                var response = await http.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to download thumbnail for post {PostId}. StatusCode: {StatusCode}, Url: {Url}", postId, response.StatusCode, url);
                    return null;
                }

                using var stream = await response.Content.ReadAsStreamAsync();
                var context = new InstagramContext(externalId);
                
                // We use postId as filename to avoid duplicates and have deterministic paths
                // StoragePathRegistry.GetPath(context, identifier) returns {bucket}/{externalId}/{identifier}
                string identifier = $"{postId}.jpg";
                string fullPath = StoragePathRegistry.GetPath(context, identifier);
                
                // UploadToPathAsync uses the full path (bucket included)
                await storage.UploadToPathAsync(fullPath, stream, "image/jpeg");
                return fullPath;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to download/store thumbnail for post {PostId} from {Url}", postId, url);
                return null;
            }
        }

        private async Task UpdateEngagementAsync(NpgsqlConnection conn, List<MetaPost> engagement)
        {
            var sql = "UPDATE competitor_videos SET like_count = @Likes, comment_count = @Comments WHERE platform_video_id = @Id AND platform = 'instagram'";
            foreach (var e in engagement)
            {
                if (string.IsNullOrEmpty(e.Id)) continue;
                await conn.ExecuteAsync(sql, new { Likes = e.LikeCount, Comments = e.CommentCount, Id = e.Id });
            }
        }

        private async Task EnsureRoutineJobsAreQueuedAsync(IMetaGraphService graph, CancellationToken ct)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync(ct);

            // Find all enabled profiles that don't have a pending or running job in the queue
            var missing = await conn.QueryAsync<Guid>(@"
                SELECT w.id 
                FROM competitor_watchlist w
                LEFT JOIN scraper_queue q ON w.id = q.watchlist_id 
                WHERE w.enabled = true AND w.platform = 'instagram'
                  AND q.id IS NULL");

            foreach (var id in missing)
            {
                if (ct.IsCancellationRequested) break;
                
                _logger.LogInformation("Seeding initial routine job for watchlist item {Id}", id);
                await conn.ExecuteAsync(@"
                    INSERT INTO scraper_queue (watchlist_id, job_type, status, priority, next_run_at, target_count)
                    VALUES (@id, 'routine', 'pending', 1, NOW(), @Target)",
                    new { id, Target = graph.GetEngagementRefreshLimit() });
            }
        }

    }
}
