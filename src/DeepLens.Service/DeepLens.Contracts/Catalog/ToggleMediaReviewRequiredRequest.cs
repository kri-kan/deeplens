using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Catalog;

public record ToggleMediaReviewRequiredRequest
{
    [JsonPropertyName("isMediaReviewRequired")]
    public bool IsMediaReviewRequired { get; init; }
}
