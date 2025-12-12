using DeepLens.Domain.ValueObjects;

namespace DeepLens.Domain.Entities;

/// <summary>
/// Represents a tenant in the multi-tenant system
/// </summary>
public class Tenant
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    
    // Storage Configuration
    public StorageConfiguration StorageConfig { get; set; } = new();
    
    // Additional storage configurations (tenant can have multiple storage backends)
    public List<StorageConfiguration> AdditionalStorageConfigs { get; set; } = new();
    
    // Thumbnail Configuration
    public ThumbnailConfiguration ThumbnailConfig { get; set; } = new();
    
    // Limits and Quotas
    public long MaxStorageSizeBytes { get; set; } = 107374182400; // 100GB default
    public long MaxFileSizeBytes { get; set; } = 104857600; // 100MB default
    public int MaxImagesPerUpload { get; set; } = 100;
    
    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

/// <summary>
/// Storage provider configuration per tenant
/// </summary>
public class StorageConfiguration
{
    /// <summary>
    /// Unique identifier for this storage configuration
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    /// <summary>
    /// Friendly name for this storage configuration (e.g., "Primary Storage", "Archive Storage")
    /// </summary>
    public string Name { get; set; } = "Default";
    
    /// <summary>
    /// Whether this is the default storage for new uploads
    /// </summary>
    public bool IsDefault { get; set; } = true;
    
    /// <summary>
    /// Storage provider type: MinIO, AzureBlob, AWSS3, GCS, NFS, LocalFileSystem
    /// </summary>
    public string Provider { get; set; } = "MinIO";
    
    /// <summary>
    /// Connection string or endpoint URL
    /// </summary>
    public string ConnectionString { get; set; } = string.Empty;
    
    /// <summary>
    /// Bucket/Container name
    /// </summary>
    public string BucketName { get; set; } = string.Empty;
    
    /// <summary>
    /// Base path within bucket (optional)
    /// </summary>
    public string BasePath { get; set; } = string.Empty;
    
    /// <summary>
    /// Access key or account name
    /// </summary>
    public string AccessKey { get; set; } = string.Empty;
    
    /// <summary>
    /// Secret key or account key (encrypted)
    /// </summary>
    public string SecretKey { get; set; } = string.Empty;
    
    /// <summary>
    /// Region (for cloud providers)
    /// </summary>
    public string Region { get; set; } = "us-east-1";
    
    /// <summary>
    /// Enable server-side encryption
    /// </summary>
    public bool EnableEncryption { get; set; } = true;
    
    /// <summary>
    /// Custom metadata to add to stored objects
    /// </summary>
    public Dictionary<string, string> CustomMetadata { get; set; } = new();
}

/// <summary>
/// Thumbnail generation configuration per tenant
/// </summary>
public class ThumbnailConfiguration
{
    /// <summary>
    /// Enable thumbnail generation
    /// </summary>
    public bool Enabled { get; set; } = true;
    
    /// <summary>
    /// List of thumbnail specifications to generate
    /// Each spec defines size, format, and quality parameters
    /// Stored as JSON in database for flexibility
    /// </summary>
    public List<ThumbnailSpecification> Specifications { get; set; } = new()
    {
        // Default specifications (Google Image Search style)
        new ThumbnailSpecification
        {
            Name = "small",
            MaxWidth = 150,
            MaxHeight = 150,
            Format = ThumbnailFormat.WebP,
            Options = new FormatOptions
            {
                WebP = new WebPOptions { Quality = 80, Lossless = false, Method = 4 }
            }
        },
        new ThumbnailSpecification
        {
            Name = "medium",
            MaxWidth = 300,
            MaxHeight = 300,
            Format = ThumbnailFormat.WebP,
            Options = new FormatOptions
            {
                WebP = new WebPOptions { Quality = 85, Lossless = false, Method = 4 }
            }
        },
        new ThumbnailSpecification
        {
            Name = "large",
            MaxWidth = 600,
            MaxHeight = 600,
            Format = ThumbnailFormat.WebP,
            Options = new FormatOptions
            {
                WebP = new WebPOptions { Quality = 90, Lossless = false, Method = 4 }
            }
        }
    };
    
    /// <summary>
    /// Enable Redis caching for thumbnails
    /// </summary>
    public bool EnableCaching { get; set; } = true;
    
    /// <summary>
    /// Cache TTL in seconds (default 24 hours)
    /// </summary>
    public int CacheTtlSeconds { get; set; } = 86400;
    
    /// <summary>
    /// Generate thumbnails on upload or on-demand
    /// </summary>
    public bool GenerateOnUpload { get; set; } = true;
}
