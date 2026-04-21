using System;

namespace DeepLens.Domain.Entities.Catalog;

public class MediaRegistry
{
    public Guid Id { get; set; }
    public string FileHash { get; set; } = string.Empty;
    public string? PHash { get; set; }
    public string MinioUrl { get; set; } = string.Empty;
    public string? MimeType { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
