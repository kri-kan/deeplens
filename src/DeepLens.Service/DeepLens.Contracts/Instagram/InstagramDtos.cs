using System.Text.Json.Serialization;
using DeepLens.Domain.Enums;

namespace DeepLens.Contracts.Instagram;

public class InstagramProfileDto
{
    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("biography")]
    public string? Biography { get; set; }

    [JsonPropertyName("followersCount")]
    public int FollowersCount { get; set; }

    [JsonPropertyName("followingCount")]
    public int FollowingCount { get; set; }

    [JsonPropertyName("mediaCount")]
    public int MediaCount { get; set; }

    [JsonPropertyName("profilePictureUrl")]
    public string ProfilePictureUrl { get; set; } = string.Empty;

    [JsonPropertyName("storagePath")]
    public string? StoragePath { get; set; }

    [JsonPropertyName("isPrivate")]
    public bool IsPrivate { get; set; }

    [JsonPropertyName("isVerified")]
    public bool IsVerified { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("isOwnAccount")]
    public bool IsOwnAccount { get; set; }

    [JsonPropertyName("isDataDeleted")]
    public bool IsDataDeleted { get; set; }

    [JsonPropertyName("isPinned")]
    public bool IsPinned { get; set; }

    [JsonPropertyName("lastSyncedAt")]
    public DateTime? LastSyncedAt { get; set; }
}

public class InstagramPostDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("shortcode")]
    public string Shortcode { get; set; } = string.Empty;

    [JsonPropertyName("caption")]
    public string? Caption { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }

    [JsonPropertyName("mediaUrl")]
    public string MediaUrl { get; set; } = string.Empty;

    [JsonPropertyName("thumbnailUrl")]
    public string? ThumbnailUrl { get; set; }

    [JsonPropertyName("permalink")]
    public string? Permalink { get; set; }

    [JsonPropertyName("mediaType")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public InstagramMediaType MediaType { get; set; }

    [JsonPropertyName("storagePath")]
    public string? StoragePath { get; set; }

    [JsonPropertyName("likeCount")]
    public long LikeCount { get; set; }

    [JsonPropertyName("commentCount")]
    public long CommentCount { get; set; }
}

public class YoutubeSyncUpdateDto
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

public class InstagramMediaDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("storagePath")]
    public string? StoragePath { get; set; }

    [JsonPropertyName("mediaType")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public InstagramMediaType MediaType { get; set; }

    [JsonPropertyName("subcategory")]
    public string? Subcategory { get; set; }

    [JsonPropertyName("isPrimary")]
    public bool IsPrimary { get; set; }

    [JsonPropertyName("displayOrder")]
    public int DisplayOrder { get; set; }
}

public class MetaPost
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }
    [JsonPropertyName("caption")]
    public string? Caption { get; set; }
    [JsonPropertyName("mediaUrl")]
    public string? MediaUrl { get; set; }
    [JsonPropertyName("thumbnailUrl")]
    public string? ThumbnailUrl { get; set; }
    [JsonPropertyName("permalink")]
    public string? Permalink { get; set; }
    [JsonPropertyName("likeCount")]
    public long LikeCount { get; set; }
    [JsonPropertyName("commentCount")]
    public long CommentCount { get; set; }
    [JsonPropertyName("timestamp")]
    public DateTime? Timestamp { get; set; }
    [JsonPropertyName("mediaType")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public InstagramMediaType MediaType { get; set; }
    [JsonPropertyName("mediaProductType")]
    public string? MediaProductType { get; set; }
    [JsonPropertyName("storagePath")]
    public string? StoragePath { get; set; }
    [JsonPropertyName("productCode")]
    public string? ProductCode { get; set; }
    
    [JsonPropertyName("youtubeVideoId")]
    public string? YoutubeVideoId { get; set; }
    [JsonPropertyName("youtubeUrl")]
    public string? YoutubeUrl { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";

    [JsonPropertyName("suspendUntil")]
    public DateTime? SuspendUntil { get; set; }

    [JsonPropertyName("lastReviewedAt")]
    public DateTime? LastReviewedAt { get; set; }

    [JsonPropertyName("children")]
    public List<MetaPost>? Children { get; set; }

    [JsonPropertyName("ownerUsername")]
    public string? OwnerUsername { get; set; }

    [JsonPropertyName("ownerProfilePictureUrl")]
    public string? OwnerProfilePictureUrl { get; set; }

    [JsonPropertyName("isStarred")]
    public bool IsStarred { get; set; }
}

public class InstagramProfileDetailsDto
{
    [JsonPropertyName("profile")]
    public InstagramProfileDto Profile { get; set; } = new();

    [JsonPropertyName("videos")]
    public List<MetaPost> Videos { get; set; } = new();

    [JsonPropertyName("metrics")]
    public InstagramMetricsDto Metrics { get; set; } = new();
}

public class InstagramMetricsDto
{
    [JsonPropertyName("avgLikes")]
    public double AvgLikes { get; set; }

    [JsonPropertyName("engagementRate")]
    public double EngagementRate { get; set; }

    [JsonPropertyName("postFrequency")]
    public double PostFrequency { get; set; }
}

public class ScraperJobDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("username")]
    public string? Username { get; set; }

    [JsonPropertyName("jobType")]
    public InstagramJobType JobType { get; set; }

    [JsonPropertyName("status")]
    public InstagramJobStatus Status { get; set; }

    [JsonPropertyName("targetCount")]
    public int TargetCount { get; set; }

    [JsonPropertyName("scrapedCount")]
    public int ScrapedCount { get; set; }

    [JsonPropertyName("priority")]
    public int Priority { get; set; }

    [JsonPropertyName("nextRunAt")]
    public DateTime? NextRunAt { get; set; }

    [JsonPropertyName("completedAt")]
    public DateTime? CompletedAt { get; set; }

    [JsonPropertyName("startedAt")]
    public DateTime? StartedAt { get; set; }

    [JsonPropertyName("origin")]
    public string? Origin { get; set; }
}

public class MetaConfigurationDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("appId")]
    public string AppId { get; set; } = string.Empty;

    [JsonPropertyName("appSecret")]
    public string AppSecret { get; set; } = string.Empty;

    [JsonPropertyName("igBizId")]
    public string IgBizId { get; set; } = string.Empty;

    [JsonPropertyName("longAccessToken")]
    public string LongAccessToken { get; set; } = string.Empty;

    [JsonPropertyName("isDefault")]
    public bool IsDefault { get; set; }

    [JsonPropertyName("lastRefreshedAt")]
    public DateTime? LastRefreshedAt { get; set; }

    [JsonPropertyName("callCount")]
    public int CallCount { get; set; }

    [JsonPropertyName("totalTime")]
    public int TotalTime { get; set; }

    [JsonPropertyName("totalCpu")]
    public int TotalCpu { get; set; }
}

public class MetaTokenExchangeRequest
{
    [JsonPropertyName("shortLivedToken")]
    public string ShortLivedToken { get; set; } = string.Empty;

    [JsonPropertyName("appId")]
    public string? AppId { get; set; }

    [JsonPropertyName("appSecret")]
    public string? AppSecret { get; set; }
}

public class InstagramCommentsSyncRequest
{
    [JsonPropertyName("accessToken")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("deepSync")]
    public bool DeepSync { get; set; }
}
