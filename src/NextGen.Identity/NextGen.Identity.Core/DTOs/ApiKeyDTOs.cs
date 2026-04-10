namespace NextGen.Identity.Core.DTOs;

/// <summary>
/// Request to create a new API key
/// </summary>
public record CreateApiKeyRequest
{
    public required string Name { get; init; }
    public int? ExpiresInDays { get; init; } // null means no expiry
    public List<string>? Scopes { get; init; }
}

/// <summary>
/// Response listing an API key (without secret)
/// </summary>
public record ApiKeyResponse
{
    public Guid Id { get; init; }
    public required string Name { get; init; }
    public required string Prefix { get; init; }
    public List<string>? Scopes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? ExpiresAt { get; init; }
    public DateTime? LastUsedAt { get; init; }
    public bool IsActive { get; init; }
}

/// <summary>
/// Response after creating an API key, including the plain text key
/// </summary>
public record CreateApiKeyResponse : ApiKeyResponse
{
    public required string PlainTextKey { get; init; } // ONLY returned on creation
}
