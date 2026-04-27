using CompetitorIntel.Orchestrator.Data;
using CompetitorIntel.Orchestrator.Models.Entities;
using CompetitorIntel.Orchestrator.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CompetitorIntel.Orchestrator.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CompetitorController : ControllerBase
    {
        private readonly CompetitorContext _context;
        private readonly MetaGraphService _graph;

        public CompetitorController(CompetitorContext context, MetaGraphService graph)
        {
            _context = context;
            _graph = graph;
        }

        // ── Watchlist ────────────────────────────────────────────────────────

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CompetitorWatchlist>>> GetWatchlist()
        {
            return await _context.Competitors
                .Where(c => c.Platform == "instagram")
                .OrderByDescending(c => c.FollowerCount)
                .ToListAsync();
        }

        [HttpPost("{username}")]
        public async Task<IActionResult> AddToWatchlist(string username)
        {
            var existing = await _context.Competitors
                .FirstOrDefaultAsync(c => c.Platform == "instagram" && c.Username == username);

            if (existing != null)
                return Ok(new { message = "Already in watchlist", profile = existing });

            var profile = new CompetitorWatchlist
            {
                Platform = "instagram",
                Username = username,
                IsActive = true
            };

            _context.Competitors.Add(profile);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Added to watchlist", profile });
        }

        [HttpDelete("{username}")]
        public async Task<IActionResult> RemoveFromWatchlist(string username)
        {
            var profile = await _context.Competitors
                .FirstOrDefaultAsync(c => c.Platform == "instagram" && c.Username == username);

            if (profile == null) return NotFound();

            profile.IsActive = false;
            profile.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Removed from watchlist" });
        }

        // ── Profile Details ──────────────────────────────────────────────────

        [HttpGet("{username}")]
        public async Task<ActionResult<dynamic>> GetProfileDetails(string username)
        {
            var profile = await _context.Competitors
                .FirstOrDefaultAsync(c => c.Platform == "instagram" && c.Username == username);

            if (profile == null) return NotFound();

            var videos = await _context.Posts
                .Where(p => p.WatchlistId == profile.Id)
                .OrderByDescending(p => p.PostedAt)
                .Take(50)
                .ToListAsync();

            var growth = await _context.FollowerSnapshots
                .Where(s => s.CompetitorId == profile.Id)
                .OrderByDescending(s => s.SnapshotAt)
                .Take(30)
                .ToListAsync();

            return Ok(new { profile, videos, growth });
        }

        // ── On-Demand Sync (manual trigger) ─────────────────────────────────

        /// <summary>
        /// Runs an immediate Graph API sync for a single profile.
        /// Returns the latest profile data pulled from the Graph API.
        /// </summary>
        [HttpPost("{username}/sync")]
        public async Task<IActionResult> SyncProfile(string username)
        {
            // Ensure the profile is in the watchlist
            var profile = await _context.Competitors
                .FirstOrDefaultAsync(c => c.Platform == "instagram" && c.Username == username);

            if (profile == null)
            {
                // Auto-add to watchlist on first sync
                profile = new CompetitorWatchlist
                {
                    Platform = "instagram",
                    Username = username,
                    IsActive = true
                };
                _context.Competitors.Add(profile);
                await _context.SaveChangesAsync();
            }

            // ── Step 2: Profile ──────────────────────────────────────────────
            var graphProfile = await _graph.GetProfileAsync(username);
            if (graphProfile == null)
                return StatusCode(502, new { message = $"Graph API returned no data for @{username}. Check IgBizId, AccessToken, and that the target is a Business/Creator account." });

            profile.DisplayName = graphProfile.Name ?? profile.DisplayName;
            profile.Bio = graphProfile.Biography ?? profile.Bio;
            profile.ProfilePicUrl = graphProfile.ProfilePictureUrl ?? profile.ProfilePicUrl;
            profile.FollowerCount = graphProfile.FollowersCount;
            profile.PostCount = graphProfile.MediaCount;
            profile.LastScrapedAt = DateTime.UtcNow;
            profile.UpdatedAt = DateTime.UtcNow;

            _context.FollowerSnapshots.Add(new FollowerSnapshot
            {
                CompetitorId = profile.Id,
                FollowerCount = graphProfile.FollowersCount,
                SnapshotAt = DateTime.UtcNow
            });

            // ── Step 3: New Media ────────────────────────────────────────────
            var posts = await _graph.GetPostsAsync(username);

            var existingIds = await _context.Posts
                .Where(p => p.WatchlistId == profile.Id)
                .Select(p => p.PlatformPostId)
                .ToHashSetAsync();

            int newPosts = 0;
            foreach (var post in posts)
            {
                if (string.IsNullOrEmpty(post.Id) || existingIds.Contains(post.Id)) continue;

                _context.Posts.Add(new CompetitorPost
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
                    PostedAt = TryParseTimestamp(post.Timestamp)
                });
                newPosts++;
            }

            // ── Step 4: Engagement Refresh ───────────────────────────────────
            var limit = _graph.GetEngagementRefreshLimit();
            var engagement = await _graph.GetPostEngagementAsync(username, limit);

            int updated = 0;
            foreach (var eng in engagement)
            {
                if (string.IsNullOrEmpty(eng.Id)) continue;
                var existing = await _context.Posts.FirstOrDefaultAsync(p => p.PlatformPostId == eng.Id);
                if (existing == null) continue;
                existing.LikeCount = eng.LikeCount;
                existing.CommentCount = eng.CommentsCount;
                existing.UpdatedAt = DateTime.UtcNow;
                updated++;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                status = "synced",
                profile = new
                {
                    profile.Username,
                    profile.DisplayName,
                    profile.Bio,
                    profile.FollowerCount,
                    profile.PostCount,
                    profile.LastScrapedAt
                },
                newPosts,
                engagementUpdated = updated,
                totalPosts = posts.Count
            });
        }

        // ── Config ───────────────────────────────────────────────────────────

        [HttpPost("{id}/config")]
        public async Task<IActionResult> UpdateConfig(Guid id, [FromBody] ConfigRequest request)
        {
            var profile = await _context.Competitors.FindAsync(id);
            if (profile == null) return NotFound();

            if (request.IsActive.HasValue)
                profile.IsActive = request.IsActive.Value;

            profile.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Configuration updated" });
        }

        [HttpGet("{id}/history")]
        public async Task<ActionResult<IEnumerable<FollowerSnapshot>>> GetHistory(Guid id)
        {
            return await _context.FollowerSnapshots
                .Where(s => s.CompetitorId == id)
                .OrderByDescending(s => s.SnapshotAt)
                .Take(30)
                .ToListAsync();
        }

        private static DateTime? TryParseTimestamp(string? ts)
        {
            if (string.IsNullOrEmpty(ts)) return null;
            if (DateTime.TryParse(ts, out var dt)) return dt.ToUniversalTime();
            return null;
        }
    }

    public class ConfigRequest
    {
        public int? FrequencyProfileMins { get; set; }
        public int? PostsDepth { get; set; }
        public bool? IsActive { get; set; }
    }
}
