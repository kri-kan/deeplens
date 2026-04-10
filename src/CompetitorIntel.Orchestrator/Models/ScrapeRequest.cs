using System;

namespace CompetitorIntel.Orchestrator.Models
{
    public class ScrapeRequest
    {
        public Guid JobId { get; set; } = Guid.NewGuid();
        public string Platform { get; set; } = string.Empty;
        public string TargetUsername { get; set; } = string.Empty;
        public bool RequiresLogin { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
