using System.Collections.Generic;

namespace DeepLens.Contracts.Media;

public record MediaPreferenceDto
{
    public Guid? Id { get; init; }
    public string? Category { get; init; }
    public string? SubCategory { get; init; }
    public string[] ThumbnailSizes { get; init; } = Array.Empty<string>();
    public string Retention { get; init; } = "days180";
    public bool IsActive { get; init; } = true;
    public bool IsGlobal { get; init; } // Re-adding this for resolution tracking
}
