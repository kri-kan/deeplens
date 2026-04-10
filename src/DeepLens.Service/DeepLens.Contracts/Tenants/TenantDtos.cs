using DeepLens.Domain.ValueObjects;

namespace DeepLens.Contracts.Tenants;

/// <summary>
/// Request to create a new tenant
/// </summary>
public record CreateTenantRequest
{
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public StorageConfigurationDto? StorageConfig { get; init; }
    public ThumbnailConfigurationDto? ThumbnailConfig { get; init; }
    public long? MaxStorageSizeBytes { get; init; }
    public long? MaxFileSizeBytes { get; init; }
    public int? MaxImagesPerUpload { get; init; }
}

/// <summary>
/// Request to upload an image
/// </summary>
public record ImageUploadRequest
{
    /// <summary>
    /// Optional storage configuration ID to use for this upload.
    /// If not specified, tenant's default storage will be used.
    /// </summary>
    public string? StorageConfigurationId { get; init; }
    
    /// <summary>
    /// The image file to upload
    /// </summary>
    public required Stream FileStream { get; init; }
    
    /// <summary>
    /// Original filename
    /// </summary>
    public required string FileName { get; init; }
    
    /// <summary>
    /// Content type (e.g., "image/jpeg")
    /// </summary>
    public required string ContentType { get; init; }
    
    /// <summary>
    /// File size in bytes
    /// </summary>
    public long FileSizeBytes { get; init; }
}

/// <summary>
/// Request to update tenant configuration
/// </summary>
public record UpdateTenantRequest
{
    public string? Name { get; init; }
    public string? Description { get; init; }
    public bool? IsActive { get; init; }
    public long? MaxStorageSizeBytes { get; init; }
    public long? MaxFileSizeBytes { get; init; }
    public int? MaxImagesPerUpload { get; init; }
}

/// <summary>
/// Tenant response DTO
/// </summary>
public record TenantResponse
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public StorageConfigurationDto StorageConfig { get; init; } = new();
    public List<StorageConfigurationDto> AdditionalStorageConfigs { get; init; } = new();
    public ThumbnailConfigurationDto ThumbnailConfig { get; init; } = new();
    public long MaxStorageSizeBytes { get; init; }
    public long MaxFileSizeBytes { get; init; }
    public int MaxImagesPerUpload { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

/// <summary>
/// Storage configuration DTO
/// </summary>
public record StorageConfigurationDto
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = "Default";
    public bool IsDefault { get; init; } = true;
    public string Provider { get; init; } = "MinIO";
    public string ConnectionString { get; init; } = string.Empty;
    public string BucketName { get; init; } = string.Empty;
    public string BasePath { get; init; } = string.Empty;
    public string AccessKey { get; init; } = string.Empty;
    public string SecretKey { get; init; } = string.Empty; // Will be encrypted
    public string Region { get; init; } = "us-east-1";
    public bool EnableEncryption { get; init; } = true;
    public Dictionary<string, string>? CustomMetadata { get; init; }
}

/// <summary>
/// Request to update storage configuration
/// </summary>
public record UpdateStorageConfigurationRequest
{
    public string? Provider { get; init; }
    public string? ConnectionString { get; init; }
    public string? BucketName { get; init; }
    public string? BasePath { get; init; }
    public string? AccessKey { get; init; }
    public string? SecretKey { get; init; }
    public string? Region { get; init; }
    public bool? EnableEncryption { get; init; }
    public Dictionary<string, string>? CustomMetadata { get; init; }
}

/// <summary>
/// Thumbnail configuration DTO
/// </summary>
public record ThumbnailConfigurationDto
{
    public bool Enabled { get; init; } = true;
    public List<ThumbnailSpecification> Specifications { get; init; } = new();
    public bool EnableCaching { get; init; } = true;
    public int CacheTtlSeconds { get; init; } = 86400;
    public bool GenerateOnUpload { get; init; } = true;
}

/// <summary>
/// Request to update thumbnail configuration
/// </summary>
public record UpdateThumbnailConfigurationRequest
{
    public bool? Enabled { get; init; }
    public List<ThumbnailSpecification>? Specifications { get; init; }
    public bool? EnableCaching { get; init; }
    public int? CacheTtlSeconds { get; init; }
    public bool? GenerateOnUpload { get; init; }
}

/// <summary>
/// Request to cleanup thumbnails for removed sizes after configuration change.
/// New thumbnail sizes will be generated on-demand when requested.
/// </summary>
public record ApplyThumbnailConfigurationRequest
{
    /// <summary>
    /// Thumbnail specification names that were removed from configuration and should be deleted
    /// </summary>
    public List<string> RemovedSpecificationNames { get; init; } = new();
    
    /// <summary>
    /// Process all images or only specific ones
    /// </summary>
    public bool ProcessAllImages { get; init; } = true;
    
    /// <summary>
    /// Specific image IDs to process (if not processing all)
    /// </summary>
    public List<Guid>? ImageIds { get; init; }
}
