using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CompetitorIntel.Orchestrator.Models.Entities
{
    [Table("follower_snapshots")]
    public class FollowerSnapshot
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("watchlist_id")]
        public Guid CompetitorId { get; set; }

        [ForeignKey("CompetitorId")]
        public CompetitorWatchlist Competitor { get; set; } = null!;

        [Column("follower_count")]
        public long FollowerCount { get; set; }

        [Column("following_count")]
        public long? FollowingCount { get; set; }

        [Column("snapshot_at")]
        public DateTime SnapshotAt { get; set; } = DateTime.UtcNow;
    }
}
