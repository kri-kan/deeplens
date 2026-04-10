namespace NextGen.Identity.Core.Entities;

/// <summary>
/// API key for tenant programmatic access
/// </summary>
public class TenantApiKey
{
    public Guid Id { get; set; }
    public required Guid TenantId { get; set; }
    public required string Name { get; set; }
    public required string KeyHash { get; set; }
    public required string KeyPrefix { get; set; } // First 8 chars for display
    public string? Scopes { get; set; } // Space-separated list of scopes (e.g., "deeplens.search")
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid CreatedBy { get; set; }
    
    // Navigation
    public Tenant? Tenant { get; set; }
}
