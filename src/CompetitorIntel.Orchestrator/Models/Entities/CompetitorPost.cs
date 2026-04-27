using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CompetitorIntel.Orchestrator.Models.Entities
{
    /// <summary>
    /// Maps to the existing competitor_videos table.
    /// Populated by the Graph API sync worker (MetaGraphService).
    /// </summary>
    [Table("competitor_videos")]
    public class CompetitorPost
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("watchlist_id")]
        [Required]
        public Guid WatchlistId { get; set; }

        [Column("platform")]
        [MaxLength(50)]
        public string Platform { get; set; } = "instagram";

        /// <summary>Graph API media ID (e.g. "17846368219941196")</summary>
        [Column("platform_video_id")]
        [MaxLength(255)]
        public string? PlatformPostId { get; set; }

        [Column("url")]
        public string? Url { get; set; }

        [Column("thumbnail_url")]
        public string? ThumbnailUrl { get; set; }

        [Column("description")]
        public string? Caption { get; set; }

        [Column("media_type")]
        [MaxLength(50)]
        public string? MediaType { get; set; } // IMAGE, VIDEO, CAROUSEL_ALBUM

        [Column("like_count")]
        public long LikeCount { get; set; } = 0;

        [Column("comment_count")]
        public long CommentCount { get; set; } = 0;

        [Column("view_count")]
        public long ViewCount { get; set; } = 0;

        [Column("posted_at")]
        public DateTime? PostedAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        [ForeignKey("WatchlistId")]
        public CompetitorWatchlist? Watchlist { get; set; }
    }
}
