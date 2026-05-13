using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Youtube;

public class YoutubeTokenHealth
{
    [JsonPropertyName("lastRefreshed")]
    public DateTime LastRefreshed { get; set; }
    
    [JsonPropertyName("needsRefresh")]
    public bool NeedsRefresh { get; set; }
    
    [JsonPropertyName("isAuthorized")]
    public bool IsAuthorized { get; set; }
}

public class YoutubeQuotaInfo
{
    [JsonPropertyName("dailyLimit")]
    public int DailyLimit { get; set; }
    
    [JsonPropertyName("currentUsage")]
    public int CurrentUsage { get; set; }
    
    [JsonPropertyName("remainingUnits")]
    public int RemainingUnits { get; set; }
    
    [JsonPropertyName("lastUpdated")]
    public DateTime LastUpdated { get; set; }

    [JsonPropertyName("hoursUntilReset")]
    public double HoursUntilReset { get; set; }

    [JsonPropertyName("nextResetTime")]
    public DateTime NextResetTime { get; set; }
}

public class YoutubeUploadRequest
{
    [JsonPropertyName("mediaId")]
    public Guid? MediaId { get; set; }
    
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
    
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;
    
    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();
    
    [JsonPropertyName("isShort")]
    public bool IsShort { get; set; } = true;
    
    [JsonPropertyName("scheduleTime")]
    public DateTime? ScheduleTime { get; set; }
}

public class YoutubeUploadResponse
{
    [JsonPropertyName("videoId")]
    public string VideoId { get; set; } = string.Empty;
    
    [JsonPropertyName("videoUrl")]
    public string VideoUrl { get; set; } = string.Empty;
    
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
    
    [JsonPropertyName("scheduledTime")]
    public DateTime? ScheduledTime { get; set; }
}
