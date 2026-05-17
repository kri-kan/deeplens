using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text.Json.Serialization;
using DeepLens.Domain.Enums;
using DeepLens.Contracts.Instagram;

namespace DeepLens.Application.Abstractions.Services
{
    public interface IMetaGraphService
    {
        Task ReloadFromDbAsync();
        TokenHealthInfo GetTokenHealth();
        Task<bool> RefreshTokenAsync();
        Task<string?> ExchangeForLongLivedTokenAsync(string shortLivedToken, string? appId = null, string? appSecret = null);
        Task<MetaPost?> GetPostByIdAsync(string postId);
        Task<MetaPost?> GetPostByDiscoveryAsync(string targetUsername, string postId);
        Task<MetaProfile?> GetProfileAsync(string targetUsername);
        Task<List<MetaPost>> GetPostsAsync(string targetUsername, int maxPosts = 50);
        Task<List<MetaPost>> GetPostEngagementAsync(string targetUsername, int limit = 20);
        int GetSyncIntervalMinutes();
        int GetEngagementRefreshLimit();
        Task<MetaQuotaInfo> GetQuotaAsync();
        Task SyncPostCommentsAsync(Guid competitorVideoId, string accessToken);

        // --- Configuration Management ---
        Task<List<MetaConfigurationDto>> GetConfigurationsAsync();
        Task<MetaConfigurationDto?> GetConfigurationAsync(Guid id);
        Task<MetaConfigurationDto> CreateConfigurationAsync(MetaConfigurationDto config);
        Task UpdateConfigurationAsync(MetaConfigurationDto config);
        Task DeleteConfigurationAsync(Guid id);
        Task SetDefaultConfigurationAsync(Guid id);

        string? LastRawResponse { get; }
        MetaCallDetails? LastCall { get; }
    }

    public class MetaCallDetails
    {
        [JsonPropertyName("requestUrl")]
        public string? RequestUrl { get; set; }
        [JsonPropertyName("requestPayload")]
        public string? RequestPayload { get; set; }
        [JsonPropertyName("responseBody")]
        public string? ResponseBody { get; set; }
        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; }
    }

    public class MetaQuotaInfo
    {
        [JsonPropertyName("requestsInLastHour")]
        public int RequestsInLastHour { get; set; }
        [JsonPropertyName("estimatedRemainingRequests")]
        public int EstimatedRemainingRequests { get; set; }
        [JsonPropertyName("metrics")]
        public AppUsageMetrics Metrics { get; set; } = new();
        [JsonPropertyName("lastUpdated")]
        public DateTime LastUpdated { get; set; }
    }

    public class AppUsageMetrics
    {
        [JsonPropertyName("callCount")]
        public int CallCount { get; set; }
        [JsonPropertyName("totalCpuTime")]
        public int TotalCpuTime { get; set; }
        [JsonPropertyName("totalTime")]
        public int TotalTime { get; set; }
    }

    public class TokenHealthInfo
    {
        [JsonPropertyName("lastRefreshed")]
        public DateTime LastRefreshed { get; set; }
        [JsonPropertyName("expiresAt")]
        public DateTime ExpiresAt { get; set; }
        [JsonPropertyName("daysRemaining")]
        public int DaysRemaining { get; set; }
        [JsonPropertyName("needsRefresh")]
        public bool NeedsRefresh { get; set; }
        [JsonPropertyName("isExpired")]
        public bool IsExpired { get; set; }
    }

    public class MetaProfile
    {
        [JsonPropertyName("username")]
        public string? Username { get; set; }
        [JsonPropertyName("name")]
        public string? Name { get; set; }
        [JsonPropertyName("biography")]
        public string? Biography { get; set; }
        [JsonPropertyName("followersCount")]
        public long FollowersCount { get; set; }
        [JsonPropertyName("followingCount")]
        public long FollowingCount { get; set; }
        [JsonPropertyName("mediaCount")]
        public int MediaCount { get; set; }
        [JsonPropertyName("profilePictureUrl")]
        public string? ProfilePictureUrl { get; set; }
        [JsonPropertyName("website")]
        public string? Website { get; set; }
        [JsonPropertyName("isVerified")]
        public bool IsVerified { get; set; }
        [JsonPropertyName("isBusiness")]
        public bool IsBusiness { get; set; }
        [JsonPropertyName("externalId")]
        public string? ExternalId { get; set; }
        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; }
        [JsonPropertyName("isOwnAccount")]
        public bool IsOwnAccount { get; set; }
        [JsonPropertyName("isDataDeleted")]
        public bool IsDataDeleted { get; set; }
        [JsonPropertyName("lastSyncedAt")]
        public DateTime? LastSyncedAt { get; set; }
    }
}
