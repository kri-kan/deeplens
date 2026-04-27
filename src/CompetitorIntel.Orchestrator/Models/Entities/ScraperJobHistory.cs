using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CompetitorIntel.Orchestrator.Models.Entities
{
    [Table("scraper_jobs_history")]
    public class ScraperJobHistory
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("watchlist_id")]
        [Required]
        public Guid WatchlistId { get; set; }

        [Column("job_type")]
        [Required]
        [MaxLength(50)]
        public string JobType { get; set; } = string.Empty;

        [Column("status")]
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty; // completed, failed, cancelled

        [Column("priority")]
        public int Priority { get; set; }

        [Column("origin")]
        [MaxLength(20)]
        public string Origin { get; set; } = "SYSTEM";

        [Column("scraped_count")]
        public int ScrapedCount { get; set; }

        [Column("started_at")]
        public DateTime StartedAt { get; set; }

        [Column("completed_at")]
        public DateTime CompletedAt { get; set; } = DateTime.UtcNow;

        [Column("error_message")]
        public string? ErrorMessage { get; set; }

        [Column("metadata")]
        [Column(TypeName = "jsonb")]
        public string? Metadata { get; set; }

        // Navigation
        [ForeignKey("WatchlistId")]
        public CompetitorWatchlist? Watchlist { get; set; }
    }
}
