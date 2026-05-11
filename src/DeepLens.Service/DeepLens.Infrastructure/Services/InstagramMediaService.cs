using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Instagram;
using DeepLens.Contracts.Media;
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

        public InstagramMediaService(
            IDbConnectionFactory db,
            IStorageService storage,
            IMetaGraphService metaGraph,
            ILogger<InstagramMediaService> logger,
            HttpClient httpClient)
        {
            _db = db;
            _storage = storage;
            _metaGraph = metaGraph;
            _logger = logger;
            _httpClient = httpClient;
        }

        public async Task<bool> RefreshPostMediaAsync(Guid dbPostId)
        {
            _logger.LogInformation("Starting end-to-end media refresh for post {PostId}", dbPostId);

            using var conn = await _db.CreateConnectionAsync();
            
            // 1. Get current post info
            var postInfo = await conn.QueryFirstOrDefaultAsync<dynamic>(@"
                SELECT cv.platform_video_id, w.external_id, w.username 
                FROM competitor_videos cv
                JOIN competitor_watchlist w ON cv.watchlist_id = w.id
                WHERE cv.id = @dbPostId", new { dbPostId });

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
            await conn.ExecuteAsync(@"
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
                });

            // 3. Cleanup existing media (Storage & DB)
            await CleanupMediaAsync(conn, dbPostId);

            // 4. Download and Ingest new media
            await ProcessFullMediaDownloadAsync(dbPostId, freshPost, externalId);

            // 5. Update main thumbnail on competitor_videos
            var primaryPath = await conn.QueryFirstOrDefaultAsync<string>(@"
                SELECT m.storage_path 
                FROM media m 
                JOIN media_links ml ON m.id = ml.media_id
                WHERE ml.entity_id = @dbPostId AND ml.is_primary = true
                LIMIT 1", new { dbPostId });

            if (!string.IsNullOrEmpty(primaryPath))
            {
                await conn.ExecuteAsync("UPDATE competitor_videos SET storage_path = @primaryPath WHERE id = @dbPostId", new { primaryPath, dbPostId });
            }

            _logger.LogInformation("Media refresh complete for post {PostId}", dbPostId);
            return true;
        }

        private async Task CleanupMediaAsync(IDbConnection conn, Guid entityId)
        {
            _logger.LogInformation("Cleaning up existing media for entity {EntityId}", entityId);

            var mediaToRoot = await conn.QueryAsync<dynamic>(@"
                SELECT m.id, m.storage_path 
                FROM media m
                JOIN media_links ml ON m.id = ml.media_id
                WHERE ml.entity_id = @entityId AND ml.entity_type = 'competitor_video'", new { entityId });

            foreach (var m in mediaToRoot)
            {
                try
                {
                    string path = m.storage_path;
                    Guid mediaId = m.id;
                    await _storage.DeleteFileAsync(path);
                    await conn.ExecuteAsync("DELETE FROM media WHERE id = @mediaId", new { mediaId });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error deleting media file/record during cleanup");
                }
            }

            // Also clean up any legacy storage path on the post itself
            await conn.ExecuteAsync("UPDATE competitor_videos SET storage_path = NULL WHERE id = @entityId", new { entityId });
        }

        public async Task ProcessFullMediaDownloadAsync(Guid dbPostId, MetaPost post, string externalId)
        {
            using var conn = await _db.CreateConnectionAsync();
            
            // 1. Process Main Media
            if (!string.IsNullOrEmpty(post.MediaUrl))
            {
                string mimeType = post.MediaType == InstagramMediaType.VIDEO ? "video/mp4" : "image/jpeg";
                string ext = post.MediaType == InstagramMediaType.VIDEO ? "mp4" : "jpg";
                string identifier = $"{post.Id}_full.{ext}";
                
                var path = await DownloadAndStoreMediaAsync(externalId, post.Id!, post.MediaUrl, identifier, mimeType);
                if (path != null)
                {
                    await RegisterAndLinkMediaAsync(conn, dbPostId, path, (short)post.MediaType, "instagram", "full_media", true);
                }
            }

            // 2. Process Children (Carousel)
            if (post.Children != null && post.Children.Any())
            {
                int order = 0;
                foreach (var child in post.Children)
                {
                    if (string.IsNullOrEmpty(child.MediaUrl)) continue;

                    string mimeType = child.MediaType == InstagramMediaType.VIDEO ? "video/mp4" : "image/jpeg";
                    string ext = child.MediaType == InstagramMediaType.VIDEO ? "mp4" : "jpg";
                    string identifier = $"{child.Id}_child.{ext}";

                    var path = await DownloadAndStoreMediaAsync(externalId, child.Id!, child.MediaUrl, identifier, mimeType);
                    if (path != null)
                    {
                        await RegisterAndLinkMediaAsync(conn, dbPostId, path, (short)child.MediaType, "instagram", "carousel_item", false, order++);
                    }
                }
            }
        }

        private async Task<string?> DownloadAndStoreMediaAsync(string externalId, string mediaId, string url, string identifier, string mimeType)
        {
            try
            {
                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                using var stream = await response.Content.ReadAsStreamAsync();
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

        private async Task RegisterAndLinkMediaAsync(IDbConnection conn, Guid entityId, string path, short mediaType, string category, string subcategory, bool isPrimary, int displayOrder = 0)
        {
            var mediaId = Guid.NewGuid();
            await conn.ExecuteAsync(@"
                INSERT INTO media (id, storage_path, media_type, category, subcategory)
                VALUES (@mediaId, @path, @mediaType, @category, @subcategory)
                ON CONFLICT (storage_path) DO NOTHING", 
                new { mediaId, path, mediaType, category, subcategory });

            var finalMediaId = await conn.ExecuteScalarAsync<Guid>("SELECT id FROM media WHERE storage_path = @path", new { path });

            await conn.ExecuteAsync(@"
                INSERT INTO media_links (media_id, entity_id, entity_type, is_primary, display_order)
                VALUES (@finalMediaId, @entityId, 'competitor_video', @isPrimary, @displayOrder)
                ON CONFLICT DO NOTHING",
                new { finalMediaId, entityId, isPrimary, displayOrder });
        }

        public async Task<bool> DeleteProfileDataAsync(string username)
        {
            _logger.LogInformation("Deleting all media and metadata for profile {Username}", username);

            using var conn = await _db.CreateConnectionAsync();
            var profile = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "SELECT id, external_id FROM competitor_watchlist WHERE LOWER(username) = LOWER(@username) AND platform = 'instagram'",
                new { username });

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
                var legacyPaths = await conn.QueryAsync<string>(
                    "SELECT storage_path FROM competitor_videos WHERE watchlist_id = @watchlistId AND storage_path IS NOT NULL",
                    new { watchlistId });

                // Get modern paths from media table
                var modernPaths = await conn.QueryAsync<string>(@"
                    SELECT m.storage_path 
                    FROM media m 
                    JOIN media_links ml ON m.id = ml.media_id 
                    JOIN competitor_videos cv ON ml.entity_id = cv.id 
                    WHERE cv.watchlist_id = @watchlistId AND ml.entity_type = 'competitor_video'",
                    new { watchlistId });

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
            await conn.ExecuteAsync(@"
                DELETE FROM media WHERE id IN (
                    SELECT ml.media_id 
                    FROM media_links ml 
                    JOIN competitor_videos cv ON ml.entity_id = cv.id 
                    WHERE cv.watchlist_id = @watchlistId AND ml.entity_type = 'competitor_video'
                )", new { watchlistId });

            // 3. Delete posts from DB
            await conn.ExecuteAsync("DELETE FROM competitor_videos WHERE watchlist_id = @watchlistId", new { watchlistId });

            // 4. Mark as deleted and inactive in watchlist
            await conn.ExecuteAsync(@"
                UPDATE competitor_watchlist 
                SET is_active = false, is_data_deleted = true, last_scraped_at = NULL
                WHERE id = @watchlistId",
                new { watchlistId });

            _logger.LogInformation("Profile data deletion complete for {Username}", username);
            return true;
        }
    }
}
