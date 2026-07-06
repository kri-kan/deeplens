using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Catalog;

public record StarProductRequest
{
    [JsonPropertyName("isStarred")]
    public bool IsStarred { get; init; }
}
