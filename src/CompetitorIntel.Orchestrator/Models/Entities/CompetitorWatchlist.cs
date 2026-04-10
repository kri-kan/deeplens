using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CompetitorIntel.Orchestrator.Models.Entities
{
    [Table("competitor_watchlist")]
    public class CompetitorWatchlist
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("platform")]
        [Required]
        [MaxLength(50)]
        public string Platform { get; set; } = string.Empty;

        [Column("username")]
        [Required]
        [MaxLength(255)]
        public string Username { get; set; } = string.Empty;

        [Column("platform_id")]
        [MaxLength(255)]
        public string? PlatformId { get; set; }

        [Column("display_name")]
        [MaxLength(255)]
        public string? DisplayName { get; set; }

        [Column("profile_pic_url")]
        public string? ProfilePicUrl { get; set; }

        [Column("bio")]
        public string? Bio { get; set; }

        [Column("enabled")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("last_scraped_at")]
        public DateTime? LastScrapedAt { get; set; }

        [Column("follower_count")]
        public long? FollowerCount { get; set; }

        [Column("following_count")]
        public long? FollowingCount { get; set; }

        [Column("post_count")]
        public int? PostCount { get; set; }

        // Navigation properties
        public ICollection<FollowerSnapshot> FollowerSnapshots { get; set; } = new List<FollowerSnapshot>();
    }
}
