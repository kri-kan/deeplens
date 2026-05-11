using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Ai;

public class GenerateTitleRequest
{
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("context")]
    public string? Context { get; set; }
}

public class GenerateTitleResponse
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;
}
