using System.Text.Json.Serialization;

namespace CompetitorIntel.Orchestrator.Models
{
    public class ScraperResult
    {
        [JsonPropertyName("job_id")]
        public Guid JobId { get; set; }

        [JsonPropertyName("platform")]
        public string Platform { get; set; } = string.Empty;

        [JsonPropertyName("username")]
        public string Username { get; set; } = string.Empty;

        [JsonPropertyName("followers")]
        public long Followers { get; set; }

        [JsonPropertyName("following")]
        public long Following { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;
        
        [JsonPropertyName("scrape_method")]
        public string? ScrapeMethod { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }
}
