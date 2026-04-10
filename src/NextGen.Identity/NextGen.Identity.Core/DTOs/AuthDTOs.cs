namespace NextGen.Identity.Core.DTOs;

// ===== Authentication DTOs =====

public record LoginRequest
{
    public required string Email { get; init; }
    public required string Password { get; init; }
}

public record LoginRequestDto
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

public record LoginResponseDto
{
    public Guid Id { get; init; }
    public required string Email { get; init; }
    public required string FirstName { get; init; }
    public required string LastName { get; init; }
    public required string Role { get; init; }
    public Guid TenantId { get; init; }
    public string? Message { get; init; }
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

public record UserProfileDto
{
    public Guid Id { get; init; }
    public required string Email { get; init; }
    public required string FirstName { get; init; }
    public required string LastName { get; init; }
    public required string Role { get; init; }
    public Guid TenantId { get; init; }
    public bool EmailConfirmed { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? LastLoginAt { get; init; }
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

// ===== Provisioning DTOs =====

public record ProvisionTenantRequest
{
    public required string TenantName { get; init; }
    public required string DatabaseName { get; init; }
    public required string AdminEmail { get; init; }
    public required string AdminPassword { get; init; }
    public required string AdminFirstName { get; init; }
    public required string AdminLastName { get; init; }
    public int QdrantHttpPort { get; init; }
    public int QdrantGrpcPort { get; init; }
    public string? MinioEndpoint { get; init; }
    public string? MinioBucket { get; init; }
}

public record ProvisionTenantResponse
{
    public required Guid TenantId { get; init; }
    public required Guid AdminUserId { get; init; }
    public required string TenantSlug { get; init; }
    public required string AdminEmail { get; init; }
    public required string Message { get; init; }
}

public record TenantSetupResponse
{
    public required TenantResponse Tenant { get; init; }
    public required UserInfo AdminUser { get; init; }
    public required string AccessToken { get; init; }
    public required string RefreshToken { get; init; }
}
