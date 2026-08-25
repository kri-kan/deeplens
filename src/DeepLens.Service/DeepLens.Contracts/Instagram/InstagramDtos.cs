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

    [JsonPropertyName("profileCategory")]
    public string ProfileCategory { get; set; } = string.Empty;

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

    [JsonPropertyName("lastPostedAt")]
    public DateTime? LastPostedAt { get; set; }

    [JsonPropertyName("rightSwipes")]
    public long RightSwipes { get; set; }

    [JsonPropertyName("leftSwipes")]
    public long LeftSwipes { get; set; }

    [JsonPropertyName("shareCount")]
    public long ShareCount { get; set; }

    [JsonPropertyName("viewCount")]
    public long? ViewCount { get; set; }

    [JsonPropertyName("multiplier")]
    public decimal? Multiplier { get; set; }

    [JsonPropertyName("outlierScore")]
    public decimal? OutlierScore { get; set; }

    [JsonPropertyName("isDay1Breakout")]
    public bool? IsDay1Breakout { get; set; }

    [JsonPropertyName("isDelayedBreakout")]
    public bool? IsDelayedBreakout { get; set; }

    [JsonPropertyName("breakoutArchetype")]
    public string? BreakoutArchetype { get; set; }

    [JsonPropertyName("trajectory")]
    public List<DayNTrajectoryPointDto>? Trajectory { get; set; }

    [JsonPropertyName("curvePoints")]
    public List<DayNTrajectoryPointDto>? CurvePoints => Trajectory;
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

public class CompetitorSummaryDto
{
    [JsonPropertyName("activeCompetitorsCount")]
    public int ActiveCompetitorsCount { get; set; }

    [JsonPropertyName("totalCompetitorsCount")]
    public int TotalCompetitorsCount { get; set; }

    [JsonPropertyName("breakoutsTodayCount")]
    public int BreakoutsTodayCount { get; set; }

    [JsonPropertyName("activeCount")]
    public int ActiveCount => ActiveCompetitorsCount;

    [JsonPropertyName("totalCompetitors")]
    public int TotalCompetitors => TotalCompetitorsCount;

    [JsonPropertyName("totalLimit")]
    public int TotalLimit { get; set; } = 50;

    [JsonPropertyName("dayOneTakeoffsCount")]
    public int DayOneTakeoffsCount { get; set; }

    [JsonPropertyName("delayedSpikesCount")]
    public int DelayedSpikesCount { get; set; }
}

public class CompetitorToggleTrackingDto
{
    [JsonPropertyName("isActive")]
    public bool? IsActive { get; set; }

    [JsonPropertyName("isCompetitor")]
    public bool? IsCompetitor { get; set; }

    [JsonPropertyName("trackingTier")]
    public string? TrackingTier { get; set; }

    [JsonPropertyName("trackingFrequencyHours")]
    public int? TrackingFrequencyHours { get; set; }

    [JsonPropertyName("competitorNiche")]
    public string? CompetitorNiche { get; set; }
}

public class ToggleTrackingRequest : CompetitorToggleTrackingDto
{
}

public class DayNTrajectoryPointDto
{
    [JsonPropertyName("dayOffset")]
    public int DayOffset { get; set; }

    [JsonPropertyName("snapshotDate")]
    public DateTime SnapshotDate { get; set; }

    [JsonPropertyName("cumulativeViews")]
    public long CumulativeViews { get; set; }

    [JsonPropertyName("cumulativeLikes")]
    public long CumulativeLikes { get; set; }

    [JsonPropertyName("cumulativeComments")]
    public long CumulativeComments { get; set; }

    [JsonPropertyName("dailyDeltaViews")]
    public long DailyDeltaViews { get; set; }

    [JsonPropertyName("dailyDeltaLikes")]
    public long DailyDeltaLikes { get; set; }

    [JsonPropertyName("dailyDeltaComments")]
    public long DailyDeltaComments { get; set; }

    [JsonPropertyName("velocityScore")]
    public decimal VelocityScore { get; set; }

    [JsonPropertyName("baselineMedianViews")]
    public decimal BaselineMedianViews { get; set; }

    [JsonPropertyName("baselineAvgDeltaViews")]
    public decimal BaselineAvgDeltaViews { get; set; }

    [JsonPropertyName("baselineMedianLikes")]
    public decimal BaselineMedianLikes { get; set; }

    [JsonPropertyName("baselineMedianComments")]
    public decimal BaselineMedianComments { get; set; }

    [JsonPropertyName("outlierMultiplier")]
    public decimal OutlierMultiplier { get; set; }
}

public class CompetitorOutlierPostDto
{
    // Post Metadata
    [JsonPropertyName("postId")]
    public Guid PostId { get; set; }

    [JsonPropertyName("platformVideoId")]
    public string PlatformVideoId { get; set; } = string.Empty;

    [JsonPropertyName("postUrl")]
    public string? PostUrl { get; set; }

    [JsonPropertyName("thumbnailUrl")]
    public string? ThumbnailUrl { get; set; }

    [JsonPropertyName("mediaUrl")]
    public string? MediaUrl { get; set; }

    [JsonPropertyName("mediaType")]
    public string? MediaType { get; set; }

    [JsonPropertyName("storagePath")]
    public string? StoragePath { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("caption")]
    public string? Caption { get; set; }

    [JsonPropertyName("postedAt")]
    public DateTime? PostedAt { get; set; }

    // Profile Info
    [JsonPropertyName("profileId")]
    public Guid ProfileId { get; set; }

    [JsonPropertyName("profileUsername")]
    public string ProfileUsername { get; set; } = string.Empty;

    [JsonPropertyName("profileName")]
    public string? ProfileName { get; set; }

    [JsonPropertyName("profilePicUrl")]
    public string? ProfilePicUrl { get; set; }

    [JsonPropertyName("profilePicStoragePath")]
    public string? ProfilePicStoragePath { get; set; }

    [JsonPropertyName("competitorNiche")]
    public string? CompetitorNiche { get; set; }

    [JsonPropertyName("trackingTier")]
    public string? TrackingTier { get; set; }

    // Daily Metrics & Deltas
    [JsonPropertyName("dayOffset")]
    public int DayOffset { get; set; }

    [JsonPropertyName("snapshotDate")]
    public DateTime SnapshotDate { get; set; }

    [JsonPropertyName("viewCount")]
    public long ViewCount { get; set; }

    [JsonPropertyName("likeCount")]
    public long LikeCount { get; set; }

    [JsonPropertyName("commentCount")]
    public long CommentCount { get; set; }

    [JsonPropertyName("shareCount")]
    public long ShareCount { get; set; }

    [JsonPropertyName("dailyDeltaViews")]
    public long DailyDeltaViews { get; set; }

    [JsonPropertyName("dailyDeltaLikes")]
    public long DailyDeltaLikes { get; set; }

    [JsonPropertyName("velocityScore")]
    public decimal VelocityScore { get; set; }

    [JsonPropertyName("engagementRate")]
    public decimal EngagementRate { get; set; }

    // Baselines & Multipliers
    [JsonPropertyName("profileBaselineViews")]
    public decimal ProfileBaselineViews { get; set; }

    [JsonPropertyName("profileBaselineDeltaViews")]
    public decimal ProfileBaselineDeltaViews { get; set; }

    [JsonPropertyName("profileBaselineLikes")]
    public decimal ProfileBaselineLikes { get; set; }

    [JsonPropertyName("nicheBaselineViews")]
    public decimal NicheBaselineViews { get; set; }

    [JsonPropertyName("nicheBaselineLikes")]
    public decimal NicheBaselineLikes { get; set; }

    [JsonPropertyName("outlierScore")]
    public decimal OutlierScore { get; set; }

    [JsonPropertyName("viralityMultiplier")]
    public decimal ViralityMultiplier { get; set; }

    [JsonPropertyName("deltaMultiplier")]
    public decimal DeltaMultiplier { get; set; }

    [JsonPropertyName("day1ViewMultiplier")]
    public decimal Day1ViewMultiplier { get; set; }

    [JsonPropertyName("outlierTier")]
    public string OutlierTier { get; set; } = string.Empty;

    [JsonPropertyName("isDay1Breakout")]
    public bool IsDay1Breakout { get; set; }

    [JsonPropertyName("isDelayedBreakout")]
    public bool IsDelayedBreakout { get; set; }

    [JsonPropertyName("breakoutArchetype")]
    public string BreakoutArchetype { get; set; } = string.Empty;

    [JsonPropertyName("isInspirationCandidate")]
    public bool IsInspirationCandidate { get; set; }

    [JsonPropertyName("captionHook")]
    public string? CaptionHook { get; set; }

    [JsonPropertyName("trajectory")]
    public List<DayNTrajectoryPointDto> Trajectory { get; set; } = new();
}

public class CompetitorOutlierFeedResponse
{
    [JsonPropertyName("totalItems")]
    public int TotalItems { get; set; }

    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }

    [JsonPropertyName("activeCompetitorsCount")]
    public int ActiveCompetitorsCount { get; set; }

    [JsonPropertyName("totalCompetitorsCount")]
    public int TotalCompetitorsCount { get; set; }

    [JsonPropertyName("items")]
    public List<CompetitorOutlierPostDto> Items { get; set; } = new();
}

public class ProfileBaselinePointDto
{
    [JsonPropertyName("dayOffset")]
    public int DayOffset { get; set; }

    [JsonPropertyName("sampleSize")]
    public int SampleSize { get; set; }

    [JsonPropertyName("avgViews")]
    public decimal AvgViews { get; set; }

    [JsonPropertyName("p50Views")]
    public decimal P50Views { get; set; }

    [JsonPropertyName("p75Views")]
    public decimal P75Views { get; set; }

    [JsonPropertyName("p90Views")]
    public decimal P90Views { get; set; }

    [JsonPropertyName("avgDeltaViews")]
    public decimal AvgDeltaViews { get; set; }

    [JsonPropertyName("p50DeltaViews")]
    public decimal P50DeltaViews { get; set; }

    [JsonPropertyName("p50Likes")]
    public decimal P50Likes { get; set; }

    [JsonPropertyName("p50Comments")]
    public decimal P50Comments { get; set; }

    [JsonPropertyName("avgComments")]
    public decimal AvgComments { get; set; }

    [JsonPropertyName("avgVelocityScore")]
    public decimal AvgVelocityScore { get; set; }
}

public class PostTrajectoryDto
{
    [JsonPropertyName("postId")]
    public Guid PostId { get; set; }

    [JsonPropertyName("platformVideoId")]
    public string PlatformVideoId { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("captionHook")]
    public string? CaptionHook { get; set; }

    [JsonPropertyName("postedAt")]
    public DateTime? PostedAt { get; set; }

    [JsonPropertyName("thumbnailUrl")]
    public string? ThumbnailUrl { get; set; }

    [JsonPropertyName("breakoutArchetype")]
    public string? BreakoutArchetype { get; set; }

    [JsonPropertyName("isDay1Breakout")]
    public bool IsDay1Breakout { get; set; }

    [JsonPropertyName("isDelayedBreakout")]
    public bool IsDelayedBreakout { get; set; }

    [JsonPropertyName("points")]
    public List<DayNTrajectoryPointDto> Points { get; set; } = new();
}

public class CompetitorCurveResponseDto
{
    [JsonPropertyName("profileId")]
    public Guid ProfileId { get; set; }

    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("competitorNiche")]
    public string? CompetitorNiche { get; set; }

    [JsonPropertyName("baselinePoints")]
    public List<ProfileBaselinePointDto> BaselinePoints { get; set; } = new();

    [JsonPropertyName("postTrajectories")]
    public List<PostTrajectoryDto> PostTrajectories { get; set; } = new();
}
