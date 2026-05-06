using System.Collections.Generic;
using System.Threading.Tasks;

namespace DeepLens.Application.Abstractions.Services
{
    public interface IMetaGraphService
    {
        Task ReloadFromDbAsync();
        TokenHealthInfo GetTokenHealth();
        Task<bool> RefreshTokenAsync();
        Task<string?> ExchangeForLongLivedTokenAsync(string shortLivedToken);
        Task<MetaProfile?> GetProfileAsync(string targetUsername);
        Task<List<MetaPost>> GetPostsAsync(string targetUsername, int maxPosts = 50);
        Task<List<MetaPost>> GetPostEngagementAsync(string targetUsername, int limit = 20);
        int GetSyncIntervalMinutes();
        int GetEngagementRefreshLimit();
        Task<MetaQuotaInfo> GetQuotaAsync();
        string? LastRawResponse { get; }
        MetaCallDetails? LastCall { get; }
    }

    public class MetaCallDetails
    {
        public string? RequestUrl { get; set; }
        public string? RequestPayload { get; set; }
        public string? ResponseBody { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class MetaQuotaInfo
    {
        public int RequestsInLastHour { get; set; }
        public int EstimatedRemainingRequests { get; set; }
        public AppUsageMetrics Metrics { get; set; } = new();
        public DateTime LastUpdated { get; set; }
    }

    public class AppUsageMetrics
    {
        public int CallCount { get; set; }
        public int TotalCpuTime { get; set; }
        public int TotalTime { get; set; }
    }

    public class TokenHealthInfo
    {
        public DateTime LastRefreshed { get; set; }
        public DateTime ExpiresAt { get; set; }
        public int DaysRemaining { get; set; }
        public bool NeedsRefresh { get; set; }
        public bool IsExpired { get; set; }
    }

    public class MetaProfile
    {
        public string? Username { get; set; }
        public string? Name { get; set; }
        public string? Biography { get; set; }
        public long FollowersCount { get; set; }
        public long FollowsCount { get; set; }
        public int MediaCount { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public string? Website { get; set; }
        public bool IsVerified { get; set; }
        public bool IsBusiness { get; set; }
        public string? ExternalId { get; set; }
    }

    public class MetaPost
    {
        public string? Id { get; set; }
        public string? Caption { get; set; }
        public string? MediaUrl { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? Permalink { get; set; }
        public long LikeCount { get; set; }
        public long CommentsCount { get; set; }
        public string? Timestamp { get; set; }
        public string? MediaType { get; set; }
        public string? MediaProductType { get; set; }
        public string? StoragePath { get; set; }
        public string? ProductCode { get; set; }
    }
}
