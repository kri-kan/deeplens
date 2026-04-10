namespace DeepLens.Domain.Entities;

/// <summary>
/// Represents an uploaded image with metadata
/// </summary>
public class Image
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    
    // Storage configuration
    /// <summary>
    /// Storage Configuration ID that stores this image.
    /// Specified during upload or defaults to tenant's primary storage.
    /// Used to determine which storage backend contains the image and its thumbnails.
    /// </summary>
    public string StorageConfigurationId { get; set; } = string.Empty;
    
    // File information
    public string OriginalFileName { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string Checksum { get; set; } = string.Empty; // SHA256
    
    // Image dimensions
    public int Width { get; set; }
    public int Height { get; set; }
    
    // EXIF metadata (JSON)
    public string? ExifMetadata { get; set; }
    
    // Processing status
    public ImageStatus Status { get; set; } = ImageStatus.Uploaded;
    public string? ProcessingError { get; set; }
    
    // Thumbnails are automatically generated based on tenant configuration
    // Stored in blob storage at: {tenant_id}/thumbnails/{image_id}_{size}.{format}
    // No separate entity needed - managed via storage paths and tenant config
    
    // Feature extraction (will be populated by AI service)
    public bool FeaturesExtracted { get; set; }
    public DateTime? FeaturesExtractedAt { get; set; }
    
    // Vector indexing (will be populated by indexing service)
    public bool Indexed { get; set; }
    public DateTime? IndexedAt { get; set; }
    
    // Audit fields
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public string? UploadedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; } // Soft delete
    
    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
}

/// <summary>
/// Image processing status
/// </summary>
public enum ImageStatus
{
    Uploaded = 0,
    Validating = 1,
    Validated = 2,
    Processing = 3,
    Processed = 4,
    Indexed = 5,
    Failed = 99
}
