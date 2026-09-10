using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Instagram;

public record PostPlannerItemDto
{
    [JsonPropertyName("productId")]
    public Guid ProductId { get; init; }

    [JsonPropertyName("productCode")]
    public string ProductCode { get; init; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; init; } = string.Empty;

    [JsonPropertyName("category")]
    public string? Category { get; init; }

    [JsonPropertyName("fabric")]
    public string? Fabric { get; init; }

    [JsonPropertyName("price")]
    public decimal Price { get; init; }

    [JsonPropertyName("primaryImageUrl")]
    public string? PrimaryImageUrl { get; init; }

    [JsonPropertyName("isStarred")]
    public bool IsStarred { get; init; } = true;

    [JsonPropertyName("planningStatus")]
    public string PlanningStatus { get; init; } = "in_progress"; // 'in_progress', 'complete'

    [JsonPropertyName("channelAssignments")]
    public List<PostPlannerChannelAssignmentDto> ChannelAssignments { get; init; } = new();
}

public record PostPlannerChannelAssignmentDto
{
    [JsonPropertyName("assignmentId")]
    public Guid AssignmentId { get; init; }

    [JsonPropertyName("watchlistId")]
    public Guid WatchlistId { get; init; }

    [JsonPropertyName("username")]
    public string Username { get; init; } = string.Empty;

    [JsonPropertyName("channelType")]
    public string ChannelType { get; init; } = "focus"; // 'focus' | 'dump'

    [JsonPropertyName("status")]
    public string Status { get; init; } = "assigned"; // 'assigned', 'scheduled', 'shared', 'excluded'

    [JsonPropertyName("scheduledAt")]
    public DateTime? ScheduledAt { get; init; }

    [JsonPropertyName("publishedAt")]
    public DateTime? PublishedAt { get; init; }

    [JsonPropertyName("publishedUrl")]
    public string? PublishedUrl { get; init; }

    [JsonPropertyName("captionUsed")]
    public string? CaptionUsed { get; init; }
}

public record PostPlannerChannelOptionDto
{
    [JsonPropertyName("watchlistId")]
    public Guid WatchlistId { get; init; }

    [JsonPropertyName("username")]
    public string Username { get; init; } = string.Empty;

    [JsonPropertyName("displayName")]
    public string? DisplayName { get; init; }

    [JsonPropertyName("profilePicUrl")]
    public string? ProfilePicUrl { get; init; }

    [JsonPropertyName("channelType")]
    public string ChannelType { get; init; } = "focus"; // 'focus' | 'dump'

    [JsonPropertyName("categoryFocus")]
    public List<string> CategoryFocus { get; init; } = new();

    [JsonPropertyName("targetDemography")]
    public string? TargetDemography { get; init; }
}

public record MatchProductChannelsRequest
{
    [JsonPropertyName("productId")]
    public Guid ProductId { get; init; }

    [JsonPropertyName("watchlistIds")]
    public List<Guid> WatchlistIds { get; init; } = new();

    [JsonPropertyName("isDonePlanning")]
    public bool IsDonePlanning { get; init; }
}

public record RecordPostActionRequest
{
    [JsonPropertyName("productId")]
    public Guid ProductId { get; init; }

    [JsonPropertyName("watchlistId")]
    public Guid WatchlistId { get; init; }

    [JsonPropertyName("actionType")]
    public string ActionType { get; init; } = "shared_now"; // 'shared_now', 'scheduled', 'excluded'

    [JsonPropertyName("scheduledAt")]
    public DateTime? ScheduledAt { get; init; }

    [JsonPropertyName("publishedUrl")]
    public string? PublishedUrl { get; init; }

    [JsonPropertyName("externalPostId")]
    public string? ExternalPostId { get; init; }

    [JsonPropertyName("captionUsed")]
    public string? CaptionUsed { get; init; }
}

public record UpdateChannelClassificationRequest
{
    [JsonPropertyName("watchlistId")]
    public Guid WatchlistId { get; init; }

    [JsonPropertyName("channelType")]
    public string ChannelType { get; init; } = "focus"; // 'focus' | 'dump'

    [JsonPropertyName("categoryFocus")]
    public List<string> CategoryFocus { get; init; } = new();

    [JsonPropertyName("targetDemography")]
    public string? TargetDemography { get; init; }
}
