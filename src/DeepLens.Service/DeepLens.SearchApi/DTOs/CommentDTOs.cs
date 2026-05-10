using System.Text.Json.Serialization;
using DeepLens.Domain.Enums;

namespace DeepLens.SearchApi.DTOs;

// ────────────────────────────────────────────────
//  Comment DTOs
// ────────────────────────────────────────────────

/// <summary>
/// Request body for creating a new comment on any entity.
/// </summary>
public class CommentCreateDto
{
    [JsonPropertyName("entityType")]
    public CommentEntityType EntityType { get; set; }

    [JsonPropertyName("entityId")]
    public string EntityId { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("attachmentIds")]
    public Guid[]? AttachmentIds { get; set; }
}

/// <summary>
/// Request body for updating an existing comment.
/// </summary>
public class CommentUpdateDto
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("attachmentIds")]
    public Guid[]? AttachmentIds { get; set; }
}
