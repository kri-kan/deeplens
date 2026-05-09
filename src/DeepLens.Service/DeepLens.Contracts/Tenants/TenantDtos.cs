using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json.Serialization;
using DeepLens.Domain.ValueObjects;

namespace DeepLens.Contracts.Tenants;

/// <summary>
/// Request to create a new tenant
/// </summary>
public record CreateTenantRequest
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; init; } = string.Empty;

    [JsonPropertyName("storageConfig")]
    public StorageConfigurationDto? StorageConfig { get; init; }

    [JsonPropertyName("thumbnailConfig")]
    public ThumbnailConfigurationDto? ThumbnailConfig { get; init; }

    [JsonPropertyName("maxStorageSizeBytes")]
    public long? MaxStorageSizeBytes { get; init; }

    [JsonPropertyName("maxFileSizeBytes")]
    public long? MaxFileSizeBytes { get; init; }

    [JsonPropertyName("maxImagesPerUpload")]
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
    [JsonPropertyName("storageConfigurationId")]
    public string? StorageConfigurationId { get; init; }
    
    /// <summary>
    /// The image file to upload
    /// </summary>
    [JsonIgnore]
    public required Stream FileStream { get; init; }
    
    /// <summary>
    /// Original filename
    /// </summary>
    [JsonPropertyName("fileName")]
    public required string FileName { get; init; }
    
    /// <summary>
    /// Content type (e.g., "image/jpeg")
    /// </summary>
    [JsonPropertyName("contentType")]
    public required string ContentType { get; init; }
    
    /// <summary>
    /// File size in bytes
    /// </summary>
    [JsonPropertyName("fileSizeBytes")]
    public long FileSizeBytes { get; init; }
}

/// <summary>
/// Request to update tenant configuration
/// </summary>
public record UpdateTenantRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("description")]
    public string? Description { get; init; }

    [JsonPropertyName("isActive")]
    public bool? IsActive { get; init; }

    [JsonPropertyName("maxStorageSizeBytes")]
    public long? MaxStorageSizeBytes { get; init; }

    [JsonPropertyName("maxFileSizeBytes")]
    public long? MaxFileSizeBytes { get; init; }

    [JsonPropertyName("maxImagesPerUpload")]
    public int? MaxImagesPerUpload { get; init; }
}

/// <summary>
/// Tenant response DTO
/// </summary>
public record TenantResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; init; } = string.Empty;

    [JsonPropertyName("isActive")]
    public bool IsActive { get; init; }

    [JsonPropertyName("storageConfig")]
    public StorageConfigurationDto StorageConfig { get; init; } = new();

    [JsonPropertyName("additionalStorageConfigs")]
    public List<StorageConfigurationDto> AdditionalStorageConfigs { get; init; } = new();

    [JsonPropertyName("thumbnailConfig")]
    public ThumbnailConfigurationDto ThumbnailConfig { get; init; } = new();

    [JsonPropertyName("maxStorageSizeBytes")]
    public long MaxStorageSizeBytes { get; init; }

    [JsonPropertyName("maxFileSizeBytes")]
    public long MaxFileSizeBytes { get; init; }

    [JsonPropertyName("maxImagesPerUpload")]
    public int MaxImagesPerUpload { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("updatedAt")]
    public DateTime? UpdatedAt { get; init; }
}

/// <summary>
/// Storage configuration DTO
/// </summary>
public record StorageConfigurationDto
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; init; } = "Default";

    [JsonPropertyName("isDefault")]
    public bool IsDefault { get; init; } = true;

    [JsonPropertyName("provider")]
    public string Provider { get; init; } = "MinIO";

    [JsonPropertyName("connectionString")]
    public string ConnectionString { get; init; } = string.Empty;

    [JsonPropertyName("bucketName")]
    public string BucketName { get; init; } = string.Empty;

    [JsonPropertyName("basePath")]
    public string BasePath { get; init; } = string.Empty;

    [JsonPropertyName("accessKey")]
    public string AccessKey { get; init; } = string.Empty;

    [JsonPropertyName("secretKey")]
    public string SecretKey { get; init; } = string.Empty; // Will be encrypted

    [JsonPropertyName("region")]
    public string Region { get; init; } = "us-east-1";

    [JsonPropertyName("enableEncryption")]
    public bool EnableEncryption { get; init; } = true;

    [JsonPropertyName("customMetadata")]
    public Dictionary<string, string>? CustomMetadata { get; init; }
}

/// <summary>
/// Request to update storage configuration
/// </summary>
public record UpdateStorageConfigurationRequest
{
    [JsonPropertyName("provider")]
    public string? Provider { get; init; }

    [JsonPropertyName("connectionString")]
    public string? ConnectionString { get; init; }

    [JsonPropertyName("bucketName")]
    public string? BucketName { get; init; }

    [JsonPropertyName("basePath")]
    public string? BasePath { get; init; }

    [JsonPropertyName("accessKey")]
    public string? AccessKey { get; init; }

    [JsonPropertyName("secretKey")]
    public string? SecretKey { get; init; }

    [JsonPropertyName("region")]
    public string? Region { get; init; }

    [JsonPropertyName("enableEncryption")]
    public bool? EnableEncryption { get; init; }

    [JsonPropertyName("customMetadata")]
    public Dictionary<string, string>? CustomMetadata { get; init; }
}

/// <summary>
/// Thumbnail configuration DTO
/// </summary>
public record ThumbnailConfigurationDto
{
    [JsonPropertyName("enabled")]
    public bool Enabled { get; init; } = true;

    [JsonPropertyName("specifications")]
    public List<ThumbnailSpecification> Specifications { get; init; } = new();

    [JsonPropertyName("enableCaching")]
    public bool EnableCaching { get; init; } = true;

    [JsonPropertyName("cacheTtlSeconds")]
    public int CacheTtlSeconds { get; init; } = 86400;

    [JsonPropertyName("generateOnUpload")]
    public bool GenerateOnUpload { get; init; } = true;
}

/// <summary>
/// Request to update thumbnail configuration
/// </summary>
public record UpdateThumbnailConfigurationRequest
{
    [JsonPropertyName("enabled")]
    public bool? Enabled { get; init; }

    [JsonPropertyName("specifications")]
    public List<ThumbnailSpecification>? Specifications { get; init; }

    [JsonPropertyName("enableCaching")]
    public bool? EnableCaching { get; init; }

    [JsonPropertyName("cacheTtlSeconds")]
    public int? CacheTtlSeconds { get; init; }

    [JsonPropertyName("generateOnUpload")]
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
    [JsonPropertyName("removedSpecificationNames")]
    public List<string> RemovedSpecificationNames { get; init; } = new();
    
    /// <summary>
    /// Process all images or only specific ones
    /// </summary>
    [JsonPropertyName("processAllImages")]
    public bool ProcessAllImages { get; init; } = true;
    
    /// <summary>
    /// Specific image IDs to process (if not processing all)
    /// </summary>
    [JsonPropertyName("imageIds")]
    public List<Guid>? ImageIds { get; init; }
}
