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
using DeepLens.Shared.Telemetry;
using System.Diagnostics;
using OpenTelemetry.Trace;
using Confluent.Kafka;
using DeepLens.Contracts.Events;

namespace DeepLens.WorkerService.Workers
{
    public class InstagramSyncWorker : BackgroundService
    {
        private readonly ILogger<InstagramSyncWorker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly string _connectionString;
        private readonly IProducer<string, string> _producer;

        public InstagramSyncWorker(
            ILogger<InstagramSyncWorker> logger,
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            IProducer<string, string> producer)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _connectionString = configuration.GetConnectionString("DefaultConnection") ?? "";
            _producer = producer;
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
            _logger.LogDebug("Database connection opened for queue processing.");

            // Fetch highest priority pending job that is due
            // Using a transaction with FOR UPDATE SKIP LOCKED to strictly ensure 
            // only one worker can pick up a specific job at a time.
            using var tx = await conn.BeginTransactionAsync(ct);
            var jobSql = @"
                SELECT j.id, j.watchlist_id, j.job_type, j.target_count, w.username, w.profile_category, w.is_competitor
                FROM scraper_queue j
                JOIN competitor_watchlist w ON j.watchlist_id = w.id
                WHERE j.status = 'pending' 
                  AND (w.is_active = true OR j.job_type = 'manual')
                  AND (j.next_run_at IS NULL OR j.next_run_at <= NOW())
                ORDER BY j.priority DESC, j.created_at ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED";
            var job = await conn.QueryFirstOrDefaultAsync<dynamic>(jobSql, transaction: tx);

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
            string jobType = job.job_type;
            bool isCompetitor = (bool)(job.is_competitor ?? false);
            string profileCategory = (string?)job.profile_category ?? "";

            using var activity = DeepLensActivitySource.StartActivity("InstagramSyncWorker.ProcessQueue");
            activity?.SetTag("job.id", jobId.ToString());
            activity?.SetTag("job.type", jobType);
            activity?.SetTag("username", username);

            var startTime = DateTime.UtcNow;
            int scrapedCount = 0;
            string? errorMessage = null;

            try
            {
                graph.SetActiveJobId(jobId);
                await graph.ReloadFromDbAsync();
                
                // Logging Table Link
                // Note: We use the jobId from scraper_queue as the unique job identifier in logs and history
                int targetCount = job.target_count ?? 50;
                
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

                // 3. Update Database (Ingest Posts)
                int newCount = await IngestPostsAsync(conn, jobId, watchlistId, posts, graphProfile.ExternalId ?? "", storage, httpClient, instaMedia, profileCategory, isCompetitor, ct);
                scrapedCount = posts.Count;

                await LogAsync(conn, jobId, "INFO", $"Sync complete. {newCount} new/updated posts processed.");
                activity?.SetTag("items.found", scrapedCount);
                activity?.SetTag("items.processed", newCount);

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
                activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
                activity?.RecordException(ex);
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
            finally
            {
                graph.SetActiveJobId(null);
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

                _logger.LogInformation("Downloading fresh profile picture for @{Username}...", profile.Username);
                var context = new InstagramContext(profile.ExternalId ?? "");
                string identifier = "profile_pic.jpg";
                string fullPath = StoragePathRegistry.GetPath(context, identifier);

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
                        
                        if (!string.Equals(oldPath, fullPath, StringComparison.OrdinalIgnoreCase))
                        {
                            _logger.LogInformation("Deleting old profile picture: {Path}", oldPath);
                            await storage.DeleteFileAsync(oldPath);
                            // ON DELETE CASCADE on media_links will handle the relationship cleanup
                            await conn.ExecuteAsync("DELETE FROM media WHERE id = @mediaId", new { mediaId = oldMediaId });
                        }
                    } catch (Exception ex) {
                        _logger.LogWarning(ex, "Failed to clean up old profile picture");
                    }
                }

                var response = await http.GetAsync(profile.ProfilePictureUrl);
                if (response.IsSuccessStatusCode)
                {
                    using var stream = await response.Content.ReadAsStreamAsync();
                    await storage.UploadToPathAsync(fullPath, stream, "image/jpeg");

                    // Register in central 'media' table
                    var mediaId = Guid.NewGuid();
                    await conn.ExecuteAsync(@"
                        INSERT INTO media (id, storage_path, media_type, category, subcategory)
                        VALUES (@mediaId, @fullPath, 1, 'instagram', 'profile_pic')
                        ON CONFLICT (storage_path) DO NOTHING",
                        new { mediaId, fullPath });

                    var actualMediaId = await conn.ExecuteScalarAsync<Guid>("SELECT id FROM media WHERE storage_path = @fullPath", new { fullPath });

                    // Link to 'competitor_watchlist' via 'media_links'
                    await conn.ExecuteAsync(@"
                        INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
                        VALUES (@actualMediaId, @id, 'instagram_profile', true)
                        ON CONFLICT (media_id, entity_id, entity_type) DO NOTHING",
                        new { actualMediaId, id });

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

        private async Task<int> IngestPostsAsync(NpgsqlConnection conn, Guid jobId, Guid watchlistId, List<MetaPost> posts, string externalId, IStorageService storage, HttpClient http, IInstagramMediaService instaMedia, string profileCategory, bool isCompetitor, CancellationToken ct)
        {
            var existingPosts = (await conn.QueryAsync<dynamic>("SELECT platform_video_id, storage_path FROM competitor_videos WHERE watchlist_id = @Id", new { Id = watchlistId }))
                                .ToDictionary(x => (string)x.platform_video_id, x => (string?)x.storage_path);
            int count = 0;
            int total = posts.Count;

            var insertSql = @"
                INSERT INTO competitor_videos (
                    watchlist_id, platform, platform_video_id, url, description, 
                    media_type, thumbnail_url, media_url, like_count, comment_count, posted_at, is_reel, storage_path, download_status, downloaded_at)
                VALUES (
                    @WatchlistId, 'instagram', @Id, @Url, @Caption, 
                    @MediaType, @ThumbnailUrl, @MediaUrl, @LikeCount, @CommentCount, @PostedAt, @IsReel, @StoragePath, @DownloadStatus, @DownloadedAt)";

            var updateStorageSql = "UPDATE competitor_videos SET storage_path = @StoragePath, download_status = 'completed', downloaded_at = COALESCE(downloaded_at, @Now) WHERE platform_video_id = @Id AND watchlist_id = @WatchlistId";
            var updateProgressSql = "UPDATE scraper_queue SET scraped_count = @Count WHERE id = @JobId";

            bool isOwnedProfile = !isCompetitor && string.Equals(profileCategory, "My Business", StringComparison.OrdinalIgnoreCase);

            foreach (var p in posts)
            {
                try {
                    if (string.IsNullOrEmpty(p.Id)) continue;
                    
                    bool exists = existingPosts.TryGetValue(p.Id, out var storagePath);
                    Guid dbPostId;

                    // Download thumbnail if missing
                    string? newStoragePath = null;
                    string? thumbUrl = p.ThumbnailUrl ?? p.MediaUrl;
                    if (string.IsNullOrEmpty(thumbUrl) && p.MediaType == InstagramMediaType.CAROUSEL_ALBUM && p.Children != null && p.Children.Any())
                    {
                        var firstChild = p.Children.First();
                        thumbUrl = firstChild.ThumbnailUrl ?? firstChild.MediaUrl;
                    }

                    if (string.IsNullOrEmpty(storagePath) && !string.IsNullOrEmpty(thumbUrl))
                    {
                        newStoragePath = await DownloadAndStoreThumbnailAsync(http, storage, externalId, p.Id, thumbUrl);
                    }

                    var effectiveStoragePath = newStoragePath ?? storagePath;
                    var now = DateTime.UtcNow;

                    if (!exists)
                    {
                        string downloadStatus = !string.IsNullOrEmpty(effectiveStoragePath) ? "completed" : "pending";
                        DateTime? downloadedAt = !string.IsNullOrEmpty(effectiveStoragePath) ? now : null;

                        await conn.ExecuteAsync(insertSql, new {
                            WatchlistId = watchlistId, Id = p.Id, Url = p.Permalink ?? "", Caption = p.Caption,
                            MediaType = p.MediaType.ToString().ToUpper(), ThumbnailUrl = thumbUrl,
                            MediaUrl = p.MediaUrl, LikeCount = p.LikeCount, CommentCount = p.CommentCount,
                            PostedAt = p.Timestamp ?? DateTime.UtcNow,
                            IsReel = p.MediaProductType?.ToUpper() == "REELS",
                            StoragePath = newStoragePath,
                            DownloadStatus = downloadStatus,
                            DownloadedAt = downloadedAt
                        });

                        // Fetch the auto-generated ID if we need to link media
                        dbPostId = await conn.ExecuteScalarAsync<Guid>("SELECT id FROM competitor_videos WHERE platform_video_id = @Id AND watchlist_id = @WatchlistId", new { Id = p.Id, WatchlistId = watchlistId });

                        // Media Architecture Consistency: Register and Link
                        if (!string.IsNullOrEmpty(newStoragePath))
                        {
                            await conn.ExecuteAsync(@"
                                INSERT INTO media (id, storage_path, media_type, category, subcategory)
                                VALUES (@mediaId, @newStoragePath, 1, 'instagram', 'thumbnail')
                                ON CONFLICT (storage_path) DO NOTHING",
                                new { mediaId = Guid.NewGuid(), newStoragePath });

                            var mediaId = await conn.ExecuteScalarAsync<Guid>("SELECT id FROM media WHERE storage_path = @newStoragePath", new { newStoragePath });

                            await conn.ExecuteAsync(@"
                                INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
                                VALUES (@mediaId, @dbPostId, 'competitor_video', true)
                                ON CONFLICT (media_id, entity_id, entity_type) DO NOTHING",
                                new { mediaId, dbPostId });

                            // Emit image uploaded event to pre-generate thumbnails via Kafka queue
                            await EmitImageUploadedEvent(mediaId, newStoragePath, $"{p.Id}.jpg", "image/jpeg", "instagram", "thumbnail", ct);
                        }

                        // Full Media Download strictly for non-competitor My Business profiles
                        if (isOwnedProfile)
                        {
                            await instaMedia.ProcessFullMediaDownloadAsync(dbPostId, p, externalId, ct);
                            await conn.ExecuteAsync("UPDATE competitor_videos SET download_status = 'completed', downloaded_at = COALESCE(downloaded_at, @now) WHERE id = @dbPostId AND storage_path IS NOT NULL AND storage_path != ''", new { dbPostId, now });
                        }

                        count++;
                    }
                    else 
                    {
                        dbPostId = await conn.ExecuteScalarAsync<Guid>("SELECT id FROM competitor_videos WHERE platform_video_id = @Id AND watchlist_id = @WatchlistId", new { Id = p.Id, WatchlistId = watchlistId });

                        if (newStoragePath != null)
                        {
                            // Update existing record with missing storage path
                            await conn.ExecuteAsync(updateStorageSql, new { StoragePath = newStoragePath, Now = now, Id = p.Id, WatchlistId = watchlistId });
                            
                            // Also ensure it's registered in media if it was missing
                            await conn.ExecuteAsync(@"
                                INSERT INTO media (id, storage_path, media_type, category, subcategory)
                                VALUES (@mediaId, @newStoragePath, 1, 'instagram', 'thumbnail')
                                ON CONFLICT (storage_path) DO NOTHING", 
                                new { mediaId = Guid.NewGuid(), newStoragePath });

                            var mediaId = await conn.ExecuteScalarAsync<Guid>("SELECT id FROM media WHERE storage_path = @newStoragePath", new { newStoragePath });

                            await conn.ExecuteAsync(@"
                                INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
                                VALUES (@mediaId, @dbPostId, 'competitor_video', true)
                                ON CONFLICT (media_id, entity_id, entity_type) DO NOTHING",
                                new { mediaId, dbPostId });

                            // Emit image uploaded event to pre-generate thumbnails via Kafka queue
                            await EmitImageUploadedEvent(mediaId, newStoragePath, $"{p.Id}.jpg", "image/jpeg", "instagram", "thumbnail", ct);
                        }

                        // Check if full media is missing for owned profiles
                        if (isOwnedProfile)
                        {
                            var currentPostRecord = await conn.QueryFirstOrDefaultAsync<dynamic>(
                                "SELECT storage_path, download_status FROM competitor_videos WHERE id = @dbPostId",
                                new { dbPostId });
                            string? currentStoragePath = currentPostRecord?.storage_path;
                            string? currentDownloadStatus = currentPostRecord?.download_status;

                            bool isVideo = p.MediaType == InstagramMediaType.VIDEO;
                            bool hasValidVideoStorage = !string.IsNullOrEmpty(currentStoragePath) &&
                                (currentStoragePath.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase) ||
                                 currentStoragePath.EndsWith(".mov", StringComparison.OrdinalIgnoreCase));

                            bool hasFullMediaLink = await conn.ExecuteScalarAsync<bool>(@"
                                SELECT EXISTS (
                                    SELECT 1 FROM media_links ml
                                    JOIN media m ON ml.media_id = m.id
                                    WHERE ml.entity_id = @dbPostId 
                                      AND ml.entity_type = 'competitor_video'
                                      AND m.subcategory IN ('full_media', 'carousel_item')
                                )", new { dbPostId });

                            bool isCompleted = string.Equals(currentDownloadStatus, "completed", StringComparison.OrdinalIgnoreCase);

                            bool isFullMediaMissing = isVideo
                                ? (!hasValidVideoStorage || !hasFullMediaLink || !isCompleted)
                                : (!hasFullMediaLink || !isCompleted || string.IsNullOrEmpty(currentStoragePath));

                            if (isFullMediaMissing)
                            {
                                await instaMedia.ProcessFullMediaDownloadAsync(dbPostId, p, externalId, ct);
                            }
                        }

                        // Ensure download_status is completed if storage_path is present
                        await conn.ExecuteAsync(@"
                            UPDATE competitor_videos 
                            SET download_status = 'completed', 
                                downloaded_at = COALESCE(downloaded_at, @now) 
                            WHERE id = @dbPostId 
                              AND storage_path IS NOT NULL 
                              AND storage_path != ''", 
                            new { dbPostId, now });

                        count++;
                    }

                    // Upsert Daily Snapshot into instagram_post_daily_metrics for velocity and baseline analytics
                    var postedAt = p.Timestamp ?? DateTime.UtcNow;
                    var viewCount = Math.Max(p.LikeCount * 10, p.LikeCount);

                    await conn.ExecuteAsync(@"
                        INSERT INTO public.instagram_post_daily_metrics (
                            post_id, profile_id, day_offset, snapshot_date, snapshot_timestamp,
                            view_count, like_count, comment_count, share_count
                        )
                        VALUES (
                            @dbPostId, @watchlistId, GREATEST(0, (CURRENT_DATE - (@postedAt AT TIME ZONE 'UTC')::DATE)),
                            CURRENT_DATE, NOW(), @viewCount, @likeCount, @commentCount, @shareCount
                        )
                        ON CONFLICT (post_id, day_offset)
                        DO UPDATE SET
                            view_count = EXCLUDED.view_count,
                            like_count = EXCLUDED.like_count,
                            comment_count = EXCLUDED.comment_count,
                            share_count = EXCLUDED.share_count,
                            snapshot_timestamp = NOW()",
                        new {
                            dbPostId,
                            watchlistId,
                            postedAt,
                            viewCount,
                            likeCount = p.LikeCount,
                            commentCount = p.CommentCount,
                            shareCount = p.ShareCount
                        });

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

        private async Task EmitImageUploadedEvent(Guid mediaId, string filePath, string fileName, string contentType, string category, string subCategory, CancellationToken ct)
        {
            try
            {
                var uploadEvent = new ImageUploadedEvent
                {
                    EventId = Guid.NewGuid(),
                    EventType = EventTypes.ImageUploaded,
                    EventVersion = "1.0",
                    TenantId = "SINGLE_TENANT",
                    CorrelationId = Guid.NewGuid(),
                    Timestamp = DateTime.UtcNow,
                    Data = new ImageUploadedData
                    {
                        ImageId = mediaId,
                        FilePath = filePath,
                        FileName = fileName,
                        FileSize = 0,
                        ContentType = contentType,
                        Category = category,
                        SubCategory = subCategory,
                        UploadedBy = "instagram-sync",
                        Metadata = new ImageMetadata
                        {
                            OriginalFileName = fileName,
                            Format = contentType,
                            ExifData = new Dictionary<string, object>()
                        }
                    },
                    ProcessingOptions = new ProcessingOptions
                    {
                        TargetThumbnailSizes = new[] { "icon", "medium", "large" },
                        Retention = MediaConstants.Retention.Infinite
                    }
                };

                await _producer.ProduceAsync(KafkaTopics.ImageUploaded, new Message<string, string>
                {
                    Key = mediaId.ToString(),
                    Value = JsonSerializer.Serialize(uploadEvent)
                }, ct);
                _logger.LogInformation("Emitted ImageUploadedEvent to Kafka for media: {MediaId}", mediaId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to emit ImageUploadedEvent to Kafka for media: {MediaId}", mediaId);
            }
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
            var updatePostSql = "UPDATE competitor_videos SET like_count = @Likes, comment_count = @Comments, updated_at = NOW() WHERE platform_video_id = @Id AND platform = 'instagram'";
            var upsertMetricSql = @"
                INSERT INTO public.instagram_post_daily_metrics (
                    post_id, profile_id, day_offset, snapshot_date, snapshot_timestamp,
                    view_count, like_count, comment_count, share_count
                )
                SELECT 
                    cv.id AS post_id,
                    cv.watchlist_id AS profile_id,
                    GREATEST(0, (CURRENT_DATE - (cv.posted_at AT TIME ZONE 'UTC')::DATE)) AS day_offset,
                    CURRENT_DATE AS snapshot_date,
                    NOW() AS snapshot_timestamp,
                    GREATEST(COALESCE(cv.like_count, 0) * 10, @Likes * 10, @Likes, 0) AS view_count,
                    @Likes AS like_count,
                    @Comments AS comment_count,
                    COALESCE(cv.share_count, 0) AS share_count
                FROM public.competitor_videos cv
                WHERE cv.platform_video_id = @Id AND cv.platform = 'instagram'
                ON CONFLICT (post_id, day_offset)
                DO UPDATE SET
                    view_count = EXCLUDED.view_count,
                    like_count = EXCLUDED.like_count,
                    comment_count = EXCLUDED.comment_count,
                    share_count = EXCLUDED.share_count,
                    snapshot_timestamp = NOW()";

            foreach (var e in engagement)
            {
                if (string.IsNullOrEmpty(e.Id)) continue;
                await conn.ExecuteAsync(updatePostSql, new { Likes = e.LikeCount, Comments = e.CommentCount, Id = e.Id });
                await conn.ExecuteAsync(upsertMetricSql, new { Likes = e.LikeCount, Comments = e.CommentCount, Id = e.Id });
            }

            try
            {
                await conn.ExecuteAsync("CALL public.sp_populate_competitor_outlier_snapshots(CURRENT_DATE)");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to refresh outlier snapshots procedure during engagement update");
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
                WHERE w.is_active = true AND w.platform = 'instagram'
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
