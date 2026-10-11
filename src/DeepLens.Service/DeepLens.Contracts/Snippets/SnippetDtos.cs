using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Snippets;

public class SnippetDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("emoji")]
    public string Emoji { get; set; } = "📝";

    [JsonPropertyName("color")]
    public string Color { get; set; } = "#10B981";

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("createdAt")]
    public long CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public long? UpdatedAt { get; set; }
}

public class UpsertSnippetRequest
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("emoji")]
    public string Emoji { get; set; } = "📝";

    [JsonPropertyName("color")]
    public string Color { get; set; } = "#10B981";

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("sortOrder")]
    public int? SortOrder { get; set; }
}

public class ReorderSnippetsRequest
{
    [JsonPropertyName("orderedIds")]
    public List<string> OrderedIds { get; set; } = new();
}
