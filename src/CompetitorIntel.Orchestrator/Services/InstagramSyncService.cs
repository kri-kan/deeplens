using CompetitorIntel.Orchestrator.Data;
using CompetitorIntel.Orchestrator.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CompetitorIntel.Orchestrator.Services
{
    /// <summary>
    /// Background worker that drives the 4-step Graph API sync logic gate:
    ///   1. Token health check  → refresh if within threshold
    ///   2. Daily profile sync  → update watchlist + snapshot follower count
    ///   3. New media check     → INSERT posts not yet in competitor_videos
    ///   4. Engagement refresh  → UPDATE like/comment counts on recent posts
    /// </summary>
    public class InstagramSyncService : BackgroundService
    {
        private readonly ILogger<InstagramSyncService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly MetaGraphService _graph;

        public InstagramSyncService(
            ILogger<InstagramSyncService> logger,
            IServiceProvider serviceProvider,
            MetaGraphService graph)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _graph = graph;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await Task.Yield(); // Don't block startup

            _logger.LogInformation("InstagramSyncService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunSyncCycleAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unhandled error in sync cycle. Retrying in 10 minutes.");
                }

                var intervalMinutes = _graph.GetSyncIntervalMinutes();
                _logger.LogInformation("Sync cycle complete. Next run in {Minutes} minutes.", intervalMinutes);
                await Task.Delay(TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
            }
        }

        private async Task RunSyncCycleAsync(CancellationToken ct)
        {
            // ── Step 1: Token Health ──────────────────────────────────────────
            var health = _graph.GetTokenHealth();
            if (health.IsExpired)
            {
                _logger.LogCritical("Meta access token has EXPIRED. Sync is blocked until the token is refreshed.");
                return;
            }

            if (health.NeedsRefresh)
            {
                _logger.LogWarning("Token is within {Days} days of expiry. Attempting refresh...", health.DaysRemaining);
                var refreshed = await _graph.RefreshTokenAsync();
                if (!refreshed)
                {
                    _logger.LogError("Token refresh failed. Proceeding with current token but action is required.");
                }
            }

            // ── Load all enabled Instagram watchlist entries ──────────────────
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<CompetitorContext>();

            var profiles = await context.Competitors
                .Where(c => c.Platform == "instagram" && c.IsActive)
                .ToListAsync(ct);

            if (profiles.Count == 0)
            {
                _logger.LogInformation("No active Instagram profiles in watchlist. Skipping cycle.");
                return;
            }

            _logger.LogInformation("Syncing {Count} Instagram profiles...", profiles.Count);

            foreach (var profile in profiles)
            {
                if (ct.IsCancellationRequested) break;
                await SyncProfileAsync(profile, context, ct);

                // Polite delay between profiles to avoid rate limits
                await Task.Delay(TimeSpan.FromSeconds(3), ct);
            }

            await context.SaveChangesAsync(ct);
            _logger.LogInformation("Sync cycle saved.");
        }

        private async Task SyncProfileAsync(
            CompetitorWatchlist profile,
            CompetitorContext context,
            CancellationToken ct)
        {
            var username = profile.Username;
            _logger.LogInformation("Starting sync for @{Username}", username);

            try
            {
                // ── Step 2: Daily Profile Sync ────────────────────────────────
                var graphProfile = await _graph.GetProfileAsync(username);
                if (graphProfile == null)
                {
                    _logger.LogWarning("Could not fetch profile for @{Username} — skipping.", username);
                    return;
                }

                // Update watchlist row
                profile.DisplayName = graphProfile.Name ?? profile.DisplayName;
                profile.Bio = graphProfile.Biography ?? profile.Bio;
                profile.ProfilePicUrl = graphProfile.ProfilePictureUrl ?? profile.ProfilePicUrl;
                profile.FollowerCount = graphProfile.FollowersCount;
                profile.PostCount = graphProfile.MediaCount;
                profile.LastScrapedAt = DateTime.UtcNow;
                profile.UpdatedAt = DateTime.UtcNow;

                // Snapshot followers for growth tracking
                context.FollowerSnapshots.Add(new FollowerSnapshot
                {
                    CompetitorId = profile.Id,
                    FollowerCount = graphProfile.FollowersCount,
                    SnapshotAt = DateTime.UtcNow
                });

                // ── Step 3: New Media Check ────────────────────────────────────
                var posts = await _graph.GetPostsAsync(username);

                // Fetch existing post IDs to detect new ones
                var existingPostIds = await context.Posts
                    .Where(p => p.WatchlistId == profile.Id)
                    .Select(p => p.PlatformPostId)
                    .ToHashSetAsync(ct);

                int newPostCount = 0;
                foreach (var post in posts)
                {
                    if (string.IsNullOrEmpty(post.Id)) continue;

                    if (!existingPostIds.Contains(post.Id))
                    {
                        // INSERT new post
                        context.Posts.Add(new CompetitorPost
                        {
                            WatchlistId = profile.Id,
                            Platform = "instagram",
                            PlatformPostId = post.Id,
                            Url = post.Permalink,
                            ThumbnailUrl = post.ThumbnailUrl ?? post.MediaUrl,
                            Caption = post.Caption,
                            MediaType = post.MediaType?.ToLower(),
                            LikeCount = post.LikeCount,
                            CommentCount = post.CommentsCount,
                            PostedAt = ParseTimestamp(post.Timestamp)
                        });
                        newPostCount++;
                    }
                }

                _logger.LogInformation("@{Username}: {New} new posts inserted out of {Total} fetched.", username, newPostCount, posts.Count);

                // ── Step 4: Engagement Refresh ────────────────────────────────
                var limit = _graph.GetEngagementRefreshLimit();
                var engagement = await _graph.GetPostEngagementAsync(username, limit);

                int updatedCount = 0;
                foreach (var eng in engagement)
                {
                    if (string.IsNullOrEmpty(eng.Id)) continue;

                    var existing = await context.Posts
                        .FirstOrDefaultAsync(p => p.PlatformPostId == eng.Id, ct);

                    if (existing != null)
                    {
                        existing.LikeCount = eng.LikeCount;
                        existing.CommentCount = eng.CommentsCount;
                        existing.UpdatedAt = DateTime.UtcNow;
                        updatedCount++;
                    }
                }

                _logger.LogInformation("@{Username}: Updated engagement for {Count} posts.", username, updatedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to sync @{Username}", username);
            }
        }

        private static DateTime? ParseTimestamp(string? ts)
        {
            if (string.IsNullOrEmpty(ts)) return null;
            if (DateTime.TryParse(ts, out var dt)) return dt.ToUniversalTime();
            return null;
        }
    }
}
