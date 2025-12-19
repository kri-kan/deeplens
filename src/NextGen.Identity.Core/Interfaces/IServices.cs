using NextGen.Identity.Core.DTOs;
using NextGen.Identity.Core.Entities;

namespace NextGen.Identity.Core.Interfaces;

public interface IAuthenticationService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, string ipAddress, string userAgent);
    Task<LoginResponse> RefreshTokenAsync(string refreshToken, string ipAddress, string userAgent);
    Task<UserInfo> RegisterUserAsync(RegisterRequest request);
    Task RevokeRefreshTokenAsync(string refreshToken);
    Task<bool> ValidateTokenAsync(string token);
}

public interface IJwtTokenService
{
    string GenerateAccessToken(User user);
    bool ValidateToken(string token);
    Guid? GetUserIdFromToken(string token);
}

public interface ITenantService
{
    Task<TenantSetupResponse> CreateTenantWithAdminAsync(CreateTenantRequest request, string ipAddress, string userAgent);
    Task<ProvisionTenantResponse> CreateTenantRecordWithAdminAsync(ProvisionTenantRequest request);
    Task<TenantResponse?> GetTenantByIdAsync(Guid tenantId);
    Task<TenantResponse?> GetTenantBySlugAsync(string slug);
    Task<List<TenantResponse>> GetAllTenantsAsync();
    Task<bool> UpdateTenantAsync(Guid tenantId, UpdateTenantRequest request);
}

public interface ITenantProvisioningService
{
    Task<TenantInfrastructure> ProvisionInfrastructureAsync(Guid tenantId, string tenantSlug);
    Task<bool> DeprovisionInfrastructureAsync(Guid tenantId);
}

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task<List<User>> GetByTenantIdAsync(Guid tenantId);
    Task<User> CreateAsync(User user);
    Task UpdateAsync(User user);
    Task DeleteAsync(Guid id);
}

public interface ITenantRepository
{
    Task<Tenant?> GetByIdAsync(Guid id);
    Task<Tenant?> GetBySlugAsync(string slug);
    Task<List<Tenant>> GetAllAsync();
    Task<Tenant> CreateAsync(Tenant tenant);
    Task UpdateAsync(Tenant tenant);
    Task DeleteAsync(Guid id);
}

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenAsync(string token);
    Task<List<RefreshToken>> GetByUserIdAsync(Guid userId);
    Task<RefreshToken> CreateAsync(RefreshToken refreshToken);
    Task UpdateAsync(RefreshToken refreshToken);
    Task RevokeAllForUserAsync(Guid userId);
    Task DeleteAsync(Guid id);
}

public record UpdateTenantRequest
{
    public string? Description { get; init; }
    public string? Status { get; init; }
    public string? Tier { get; init; }
}
