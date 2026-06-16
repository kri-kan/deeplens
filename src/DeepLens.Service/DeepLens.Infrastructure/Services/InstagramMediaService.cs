using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Confluent.Kafka;
using Dapper;
using System.Text.Json;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Instagram;
using DeepLens.Contracts.Media;
using DeepLens.Contracts.Events;
using DeepLens.Domain.Enums;
using DeepLens.Shared.Common;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services
{
    public class InstagramMediaService : IInstagramMediaService
    {
        private readonly IDbConnectionFactory _db;
        private readonly IStorageService _storage;
        private readonly IMetaGraphService _metaGraph;
        private readonly ILogger<InstagramMediaService> _logger;
        private readonly HttpClient _httpClient;
        private readonly IProducer<string, string> _producer;

        public InstagramMediaService(
            IDbConnectionFactory db,
            IStorageService storage,
            IMetaGraphService metaGraph,
            ILogger<InstagramMediaService> logger,
            HttpClient httpClient,
            IProducer<string, string> producer)
        {
            _db = db;
            _storage = storage;
            _metaGraph = metaGraph;
            _logger = logger;
            _httpClient = httpClient;
            _producer = producer;
        }

        public async Task<bool> RefreshPostMediaAsync(Guid dbPostId, CancellationToken ct = default)
        {
            _logger.LogInformation("Starting end-to-end media refresh for post {PostId}", dbPostId);

            using var conn = await _db.CreateConnectionAsync();
            
            // 1. Get current post info
            var postInfo = await conn.QueryFirstOrDefaultAsync<dynamic>(new CommandDefinition(@"
                SELECT cv.platform_video_id, w.external_id, w.username 
                FROM competitor_videos cv
                JOIN competitor_watchlist w ON cv.watchlist_id = w.id
                WHERE cv.id = @dbPostId", new { dbPostId }, cancellationToken: ct));

            if (postInfo == null)
            {
                _logger.LogWarning("Post {PostId} not found in database.", dbPostId);
                return false;
            }

            string platformId = postInfo.platform_video_id;
            string externalId = postInfo.external_id; // IG ID
            string username = postInfo.username;

            // 2. Fetch fresh metadata from Graph API
            await _metaGraph.ReloadFromDbAsync();
            var freshPost = await _metaGraph.GetPostByIdAsync(platformId);
            
            if (freshPost == null)
            {
                _logger.LogInformation("Direct fetch failed for post {PlatformId}. Attempting fallback to Business Discovery for @{Username}.", platformId, username);
                freshPost = await _metaGraph.GetPostByDiscoveryAsync(username, platformId);
            }

            if (freshPost == null)
            {
                _logger.LogWarning("Post {PlatformId} not found on Instagram via direct Graph API or Business Discovery.", platformId);
                return false;
            }

            // Update core metadata in DB
            await conn.ExecuteAsync(new CommandDefinition(@"
                UPDATE competitor_videos 
                SET description = @Caption, 
                    like_count = @LikeCount, 
                    comment_count = @CommentCount,
                    updated_at = NOW()
                WHERE id = @dbPostId", 
                new { 
                    Caption = freshPost.Caption, 
                    LikeCount = freshPost.LikeCount, 
                    CommentCount = freshPost.CommentCount, 
                    dbPostId 
                }, cancellationToken: ct));

            // 3. Cleanup existing media (Storage & DB)
            await CleanupMediaAsync(conn, dbPostId, ct);

            // 4. Download and Ingest new media
            await ProcessFullMediaDownloadAsync(dbPostId, freshPost, externalId, ct);

            // 5. Update main thumbnail on competitor_videos
            var primaryPath = await conn.QueryFirstOrDefaultAsync<string>(new CommandDefinition(@"
                SELECT m.storage_path 
                FROM media m 
                JOIN media_links ml ON m.id = ml.media_id
                WHERE ml.entity_id = @dbPostId AND ml.is_primary = true
                LIMIT 1", new { dbPostId }, cancellationToken: ct));

            if (!string.IsNullOrEmpty(primaryPath))
            {
                await conn.ExecuteAsync(new CommandDefinition("UPDATE competitor_videos SET storage_path = @primaryPath WHERE id = @dbPostId", new { primaryPath, dbPostId }, cancellationToken: ct));
            }

            _logger.LogInformation("Media refresh complete for post {PostId}", dbPostId);
            return true;
        }

        private async Task CleanupMediaAsync(IDbConnection conn, Guid entityId, CancellationToken ct = default)
        {
            _logger.LogInformation("Cleaning up existing media for entity {EntityId}", entityId);

            var mediaToRoot = await conn.QueryAsync<dynamic>(new CommandDefinition(@"
                SELECT m.id, m.storage_path 
                FROM media m
                JOIN media_links ml ON m.id = ml.media_id
                WHERE ml.entity_id = @entityId AND ml.entity_type = 'competitor_video'", new { entityId }, cancellationToken: ct));

            foreach (var m in mediaToRoot)
            {
                try
                {
                    string path = m.storage_path;
                    Guid mediaId = m.id;
                    await _storage.DeleteFileAsync(path);
                    await conn.ExecuteAsync(new CommandDefinition("DELETE FROM media WHERE id = @mediaId", new { mediaId }, cancellationToken: ct));
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error deleting media file/record during cleanup");
                }
            }

            // Also clean up any legacy storage path on the post itself
            await conn.ExecuteAsync(new CommandDefinition("UPDATE competitor_videos SET storage_path = NULL WHERE id = @entityId", new { entityId }, cancellationToken: ct));
        }

        public async Task ProcessFullMediaDownloadAsync(Guid dbPostId, MetaPost post, string externalId, CancellationToken ct = default)
        {
            using var conn = await _db.CreateConnectionAsync();
            
            // 1. Process Main Media
            if (!string.IsNullOrEmpty(post.MediaUrl))
            {
                string mimeType = post.MediaType == InstagramMediaType.VIDEO ? "video/mp4" : "image/jpeg";
                string ext = post.MediaType == InstagramMediaType.VIDEO ? "mp4" : "jpg";
                string identifier = $"{post.Id}_full.{ext}";
                
                var path = await DownloadAndStoreMediaAsync(externalId, post.Id!, post.MediaUrl, identifier, mimeType, ct);
                if (path != null)
                {
                    await RegisterAndLinkMediaAsync(conn, dbPostId, path, (short)post.MediaType, "instagram", "full_media", true, 0, ct);
                    
                    // Ensure the main post record correctly points to the new primary media
                    await conn.ExecuteAsync(new CommandDefinition("UPDATE competitor_videos SET storage_path = @path WHERE id = @dbPostId", new { path, dbPostId }, cancellationToken: ct));
                }

                // If this is a video and has a thumbnail URL, download the thumbnail too (only if missing)
                if (post.MediaType == InstagramMediaType.VIDEO && !string.IsNullOrEmpty(post.ThumbnailUrl))
                {
                    string thumbIdentifier = $"{post.Id}.jpg";
                    var thumbContext = new InstagramContext(externalId);
                    string thumbPath = StoragePathRegistry.GetPath(thumbContext, thumbIdentifier);

                    bool thumbExists = await conn.ExecuteScalarAsync<bool>(new CommandDefinition(
                        "SELECT EXISTS(SELECT 1 FROM media WHERE storage_path = @thumbPath)", 
                        new { thumbPath }, cancellationToken: ct));

                    if (!thumbExists)
                    {
                        var downloadedPath = await DownloadAndStoreMediaAsync(externalId, post.Id!, post.ThumbnailUrl, thumbIdentifier, "image/jpeg", ct);
                        if (downloadedPath != null)
                        {
                            await RegisterAndLinkMediaAsync(conn, dbPostId, downloadedPath, (short)InstagramMediaType.IMAGE, "instagram", "thumbnail", false, 0, ct);
                        }
                    }
                    else
                    {
                        var mediaId = await conn.ExecuteScalarAsync<Guid?>(new CommandDefinition("SELECT id FROM media WHERE storage_path = @thumbPath", new { thumbPath }, cancellationToken: ct));
                        if (mediaId.HasValue)
                        {
                            await conn.ExecuteAsync(new CommandDefinition(@"
                                INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
                                VALUES (@mediaId, @dbPostId, 'competitor_video', false)
                                ON CONFLICT (media_id, entity_id, entity_type) DO NOTHING",
                                new { mediaId = mediaId.Value, dbPostId }, cancellationToken: ct));
                        }
                    }
                }
            }

            // 2. Process Children (Carousel)
            if (post.Children != null && post.Children.Any())
            {
                int order = 0;
                string? firstChildPath = null;
                foreach (var child in post.Children)
                {
                    if (string.IsNullOrEmpty(child.MediaUrl)) continue;

                    string mimeType = child.MediaType == InstagramMediaType.VIDEO ? "video/mp4" : "image/jpeg";
                    string ext = child.MediaType == InstagramMediaType.VIDEO ? "mp4" : "jpg";
                    string identifier = $"{child.Id}_child.{ext}";

                    var path = await DownloadAndStoreMediaAsync(externalId, child.Id!, child.MediaUrl, identifier, mimeType, ct);
                    if (path != null)
                    {
                        await RegisterAndLinkMediaAsync(conn, dbPostId, path, (short)child.MediaType, "instagram", "carousel_item", false, order++, ct);
                        if (firstChildPath == null)
                        {
                            firstChildPath = path;
                        }
                    }

                    // If this child is a video and has a thumbnail URL, download the thumbnail too (only if missing)
                    if (child.MediaType == InstagramMediaType.VIDEO && !string.IsNullOrEmpty(child.ThumbnailUrl))
                    {
                        string thumbIdentifier = $"{child.Id}.jpg";
                        var thumbContext = new InstagramContext(externalId);
                        string thumbPath = StoragePathRegistry.GetPath(thumbContext, thumbIdentifier);

                        bool thumbExists = await conn.ExecuteScalarAsync<bool>(new CommandDefinition(
                            "SELECT EXISTS(SELECT 1 FROM media WHERE storage_path = @thumbPath)", 
                            new { thumbPath }, cancellationToken: ct));

                        if (!thumbExists)
                        {
                            var downloadedPath = await DownloadAndStoreMediaAsync(externalId, child.Id!, child.ThumbnailUrl, thumbIdentifier, "image/jpeg", ct);
                            if (downloadedPath != null)
                            {
                                await RegisterAndLinkMediaAsync(conn, dbPostId, downloadedPath, (short)InstagramMediaType.IMAGE, "instagram", "thumbnail", false, 0, ct);
                            }
                        }
                        else
                        {
                            var mediaId = await conn.ExecuteScalarAsync<Guid?>(new CommandDefinition("SELECT id FROM media WHERE storage_path = @thumbPath", new { thumbPath }, cancellationToken: ct));
                            if (mediaId.HasValue)
                            {
                                await conn.ExecuteAsync(new CommandDefinition(@"
                                    INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
                                    VALUES (@mediaId, @dbPostId, 'competitor_video', false)
                                    ON CONFLICT (media_id, entity_id, entity_type) DO NOTHING",
                                    new { mediaId = mediaId.Value, dbPostId }, cancellationToken: ct));
                            }
                        }
                    }
                }

                // If the main post storage_path is null (because post.MediaUrl was null),
                // set it to the first child's path so the post has a valid thumbnail/media path.
                if (string.IsNullOrEmpty(post.MediaUrl) && !string.IsNullOrEmpty(firstChildPath))
                {
                    await conn.ExecuteAsync(new CommandDefinition("UPDATE competitor_videos SET storage_path = @firstChildPath WHERE id = @dbPostId", new { firstChildPath, dbPostId }, cancellationToken: ct));
                }
            }
        }

        private async Task<string?> DownloadAndStoreMediaAsync(string externalId, string mediaId, string url, string identifier, string mimeType, CancellationToken ct)
        {
            try
            {
                var response = await _httpClient.GetAsync(url, ct);
                if (!response.IsSuccessStatusCode) return null;

                using var stream = await response.Content.ReadAsStreamAsync(ct);
                var context = new InstagramContext(externalId);
                string fullPath = StoragePathRegistry.GetPath(context, identifier);
                
                await _storage.UploadToPathAsync(fullPath, stream, mimeType);
                return fullPath;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to download media {MediaId} from {Url}", mediaId, url);
                return null;
            }
        }

        private async Task RegisterAndLinkMediaAsync(IDbConnection conn, Guid entityId, string path, short mediaType, string category, string subcategory, bool isPrimary, int displayOrder = 0, CancellationToken ct = default)
        {
            var mediaId = Guid.NewGuid();
            await conn.ExecuteAsync(new CommandDefinition(@"
                INSERT INTO media (id, storage_path, media_type, category, subcategory)
                VALUES (@mediaId, @path, @mediaType, @category, @subcategory)
                ON CONFLICT (storage_path) DO NOTHING", 
                new { mediaId, path, mediaType, category, subcategory }, cancellationToken: ct));

            var finalMediaId = await conn.ExecuteScalarAsync<Guid>(new CommandDefinition("SELECT id FROM media WHERE storage_path = @path", new { path }, cancellationToken: ct));

            await conn.ExecuteAsync(new CommandDefinition(@"
                INSERT INTO media_links (media_id, entity_id, entity_type, is_primary, display_order)
                VALUES (@finalMediaId, @entityId, 'competitor_video', @isPrimary, @displayOrder)
                ON CONFLICT (media_id, entity_id, entity_type) DO NOTHING",
                new { finalMediaId, entityId, isPrimary, displayOrder }, cancellationToken: ct));

            // Emit image/video uploaded event to pre-generate thumbnails via Kafka queue
            if (mediaType == 1)
            {
                await EmitImageUploadedEventAsync(finalMediaId, path, Path.GetFileName(path), "image/jpeg", category, subcategory, ct);
            }
            else if (mediaType == 2)
            {
                await EmitVideoUploadedEventAsync(finalMediaId, path, Path.GetFileName(path), "video/mp4", category, subcategory, ct);
            }
        }

        private async Task EmitImageUploadedEventAsync(Guid mediaId, string filePath, string fileName, string contentType, string category, string subCategory, CancellationToken ct)
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
                        UploadedBy = "instagram-sync-service",
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

        private async Task EmitVideoUploadedEventAsync(Guid mediaId, string filePath, string fileName, string contentType, string category, string subCategory, CancellationToken ct)
        {
            try
            {
                var uploadEvent = new VideoUploadedEvent
                {
                    EventId = Guid.NewGuid(),
                    EventType = EventTypes.VideoUploaded,
                    EventVersion = "1.0",
                    TenantId = "SINGLE_TENANT",
                    CorrelationId = Guid.NewGuid(),
                    Timestamp = DateTime.UtcNow,
                    Data = new VideoUploadedData
                    {
                        VideoId = mediaId,
                        FilePath = filePath,
                        FileName = fileName,
                        FileSize = 0,
                        ContentType = contentType,
                        Category = category,
                        SubCategory = subCategory,
                        UploadedBy = "instagram-sync-service"
                    },
                    ProcessingOptions = new ProcessingOptions
                    {
                        TargetThumbnailSizes = new[] { "icon", "medium", "large" },
                        Retention = MediaConstants.Retention.Infinite
                    }
                };

                await _producer.ProduceAsync(KafkaTopics.VideoUploaded, new Message<string, string>
                {
                    Key = mediaId.ToString(),
                    Value = JsonSerializer.Serialize(uploadEvent)
                }, ct);
                _logger.LogInformation("Emitted VideoUploadedEvent to Kafka for media: {MediaId}", mediaId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to emit VideoUploadedEvent to Kafka for media: {MediaId}", mediaId);
            }
        }

        public async Task<bool> DeleteProfileDataAsync(string username, CancellationToken ct = default)
        {
            _logger.LogInformation("Deleting all media and metadata for profile {Username}", username);

            using var conn = await _db.CreateConnectionAsync();
            var profile = await conn.QueryFirstOrDefaultAsync<dynamic>(new CommandDefinition(
                "SELECT id, external_id FROM competitor_watchlist WHERE LOWER(username) = LOWER(@username) AND platform = 'instagram'",
                new { username }, cancellationToken: ct));

            if (profile == null)
            {
                _logger.LogWarning("Profile {Username} not found during data deletion.", username);
                return false;
            }

            Guid watchlistId = profile.id;

            // 1. Delete media files from Storage (MinIO)
            try
            {
                // Get legacy paths from competitor_videos
                var legacyPaths = await conn.QueryAsync<string>(new CommandDefinition(
                    "SELECT storage_path FROM competitor_videos WHERE watchlist_id = @watchlistId AND storage_path IS NOT NULL",
                    new { watchlistId }, cancellationToken: ct));

                // Get modern paths from media table
                var modernPaths = await conn.QueryAsync<string>(new CommandDefinition(@"
                    SELECT m.storage_path 
                    FROM media m 
                    JOIN media_links ml ON m.id = ml.media_id 
                    JOIN competitor_videos cv ON ml.entity_id = cv.id 
                    WHERE cv.watchlist_id = @watchlistId AND ml.entity_type = 'competitor_video'",
                    new { watchlistId }, cancellationToken: ct));

                var allPaths = legacyPaths.Concat(modernPaths).Distinct();

                foreach (var path in allPaths)
                {
                    try
                    {
                        await _storage.DeleteFileAsync(path);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to delete file {Path} from storage during profile cleanup.", path);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error orchestrating file deletion for profile {Username}", username);
            }

            // 2. Delete media records (cascades to media_links)
            await conn.ExecuteAsync(new CommandDefinition(@"
                DELETE FROM media WHERE id IN (
                    SELECT ml.media_id 
                    FROM media_links ml 
                    JOIN competitor_videos cv ON ml.entity_id = cv.id 
                    WHERE cv.watchlist_id = @watchlistId AND ml.entity_type = 'competitor_video'
                )", new { watchlistId }, cancellationToken: ct));

            // 3. Delete posts from DB
            await conn.ExecuteAsync(new CommandDefinition("DELETE FROM competitor_videos WHERE watchlist_id = @watchlistId", new { watchlistId }, cancellationToken: ct));

            // 4. Mark as deleted and inactive in watchlist
            await conn.ExecuteAsync(new CommandDefinition(@"
                UPDATE competitor_watchlist 
                SET is_active = false, is_data_deleted = true, last_scraped_at = NULL
                WHERE id = @watchlistId",
                new { watchlistId }, cancellationToken: ct));

            _logger.LogInformation("Profile data deletion complete for {Username}", username);
            return true;
        }
    }
}
