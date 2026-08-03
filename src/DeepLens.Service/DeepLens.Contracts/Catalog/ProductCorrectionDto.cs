using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Catalog;

public class ProductCorrectionDto
{
    [JsonPropertyName("categoryName")]
    public string? CategoryName { get; set; }

    [JsonPropertyName("fabric")]
    public string? Fabric { get; set; }

    [JsonPropertyName("price")]
    public decimal? Price { get; set; }

    [JsonPropertyName("useForTraining")]
    public bool UseForTraining { get; set; }
}
