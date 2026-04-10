namespace NextGen.Identity.Core.Entities;

/// <summary>
/// JWT refresh token for maintaining user sessions
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; }
    public required Guid UserId { get; set; }
    public required string Token { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsRevoked { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedReason { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    
    // Navigation
    public User? User { get; set; }
    
    public bool IsActive => !IsRevoked && ExpiresAt > DateTime.UtcNow;
}
