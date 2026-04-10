namespace NextGen.Identity.Core.Entities;

/// <summary>
/// Represents a tenant/organization in the system
/// </summary>
public class Tenant
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required string Slug { get; set; } // URL-friendly identifier
    
    // Database configuration
    public required string DatabaseName { get; set; }
    public string? ConnectionString { get; set; }
    
    // Infrastructure configuration
    public required string QdrantContainerName { get; set; }
    public int QdrantHttpPort { get; set; }
    public int QdrantGrpcPort { get; set; }
    public required string MinioEndpoint { get; set; }
    public required string MinioBucketName { get; set; }
    
    // Status and limits
    public TenantStatus Status { get; set; } = TenantStatus.Active;
    public TenantTier Tier { get; set; } = TenantTier.Free;
    public long MaxStorageBytes { get; set; } = 10_737_418_240; // 10 GB
    public int MaxUsers { get; set; } = 10;
    public int MaxApiCallsPerDay { get; set; } = 10000;
    
    // Custom settings (JSON)
    public string? Settings { get; set; } 
    
    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? CreatedBy { get; set; } // System user ID who created this tenant
    
    // Navigation properties
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<TenantApiKey> ApiKeys { get; set; } = new List<TenantApiKey>();
}

public enum TenantStatus
{
    Active = 1,
    Suspended = 2,
    PendingSetup = 3,
    Deleted = 4
}

public enum TenantTier
{
    Free = 1,
    Professional = 2,
    Enterprise = 3
}
