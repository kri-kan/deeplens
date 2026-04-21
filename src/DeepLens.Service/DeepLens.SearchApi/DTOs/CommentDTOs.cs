namespace DeepLens.SearchApi.DTOs;

// ────────────────────────────────────────────────
//  Comment DTOs
// ────────────────────────────────────────────────

/// <summary>
/// Request body for creating a new comment on any entity.
/// </summary>
public class CommentCreateDto
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string[]? AttachmentIds { get; set; }
}

/// <summary>
/// Request body for updating an existing comment.
/// </summary>
public class CommentUpdateDto
{
    public string Content { get; set; } = string.Empty;
    public Guid[]? AttachmentIds { get; set; }
}
