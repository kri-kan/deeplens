using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CompetitorIntel.Orchestrator.Models.Entities
{
    [Table("scraper_jobs_active")]
    public class ScraperJobActive
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("watchlist_id")]
        [Required]
        public Guid WatchlistId { get; set; }

        [Column("job_type")]
        [Required]
        [MaxLength(50)]
        public string JobType { get; set; } = "routine"; // routine, deep_scrape

        [Column("status")]
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending"; // pending, running, failed, paused

        [Column("priority")]
        public int Priority { get; set; } = 1;

        [Column("queue_order")]
        public int QueueOrder { get; set; } = 0;

        [Column("origin")]
        [MaxLength(20)]
        public string Origin { get; set; } = "SYSTEM"; // SYSTEM, USER

        [Column("next_run_at")]
        public DateTime NextRunAt { get; set; } = DateTime.UtcNow;

        [Column("last_run_at")]
        public DateTime? LastRunAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Configuration Overrides
        [Column("target_date")]
        public DateTime? TargetDate { get; set; }

        [Column("target_count")]
        public int? TargetCount { get; set; }

        [Column("scraped_count")]
        public int ScrapedCount { get; set; } = 0;

        [Column("last_cursor")]
        public string? LastCursor { get; set; }

        [Column("assigned_burner_username")]
        [MaxLength(255)]
        public string? AssignedBurnerUsername { get; set; }

        [Column("error_message")]
        public string? ErrorMessage { get; set; }

        // Navigation
        [ForeignKey("WatchlistId")]
        public CompetitorWatchlist? Watchlist { get; set; }
    }
}
