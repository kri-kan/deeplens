namespace NextGen.Identity.Core.DTOs;

// ===== Authentication DTOs =====

public record LoginRequest
{
    public required string Email { get; init; }
    public required string Password { get; init; }
}

public record LoginResponse
{
    public required string AccessToken { get; init; }
    public required string RefreshToken { get; init; }
    public required UserInfo User { get; init; }
}

public record RegisterRequest
{
    public required string Email { get; init; }
    public required string Password { get; init; }
    public required string FirstName { get; init; }
    public required string LastName { get; init; }
    public required Guid TenantId { get; init; }
}

public record RefreshTokenRequest
{
    public required string RefreshToken { get; init; }
}

public record UserInfo
{
    public required Guid Id { get; init; }
    public required Guid TenantId { get; init; }
    public required string Email { get; init; }
    public required string FirstName { get; init; }
    public required string LastName { get; init; }
    public required string Role { get; init; }
}

// ===== Tenant DTOs =====

public record CreateTenantRequest
{
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required string AdminEmail { get; init; }
    public required string AdminPassword { get; init; }
    public required string AdminFirstName { get; init; }
    public required string AdminLastName { get; init; }
    public string? Tier { get; init; } = "Free";
}

public record TenantResponse
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required string Slug { get; init; }
    public required string Status { get; init; }
    public required string Tier { get; init; }
    public required TenantInfrastructure Infrastructure { get; init; }
    public required DateTime CreatedAt { get; init; }
}

public record TenantInfrastructure
{
    public required string DatabaseName { get; init; }
    public required string QdrantEndpoint { get; init; }
    public required string MinioEndpoint { get; init; }
    public required string MinioBucket { get; init; }
}

public record TenantSetupResponse
{
    public required TenantResponse Tenant { get; init; }
    public required UserInfo AdminUser { get; init; }
    public required string AccessToken { get; init; }
    public required string RefreshToken { get; init; }
}
