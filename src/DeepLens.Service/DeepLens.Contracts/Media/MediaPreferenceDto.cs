using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Media;

public record MediaPreferenceDto
{
    [JsonPropertyName("id")]
    public Guid? Id { get; init; }

    [JsonPropertyName("category")]
    public string? Category { get; init; }

    [JsonPropertyName("subCategory")]
    public string? SubCategory { get; init; }

    [JsonPropertyName("thumbnailSizes")]
    public string[] ThumbnailSizes { get; init; } = Array.Empty<string>();

    [JsonPropertyName("retention")]
    public string Retention { get; init; } = "days180";

    [JsonPropertyName("isActive")]
    public bool IsActive { get; init; } = true;

    [JsonPropertyName("isGlobal")]
    public bool IsGlobal { get; init; } // Re-adding this for resolution tracking
}
