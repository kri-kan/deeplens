using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Catalog;

public class ProductShareLogDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("productId")]
    public Guid ProductId { get; set; }

    [JsonPropertyName("platform")]
    public string Platform { get; set; } = string.Empty;

    [JsonPropertyName("sharedAt")]
    public DateTimeOffset SharedAt { get; set; }

    [JsonPropertyName("descriptionUsed")]
    public string? DescriptionUsed { get; set; }
}
