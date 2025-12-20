using System.Security.Claims;
using Duende.IdentityServer.Extensions;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Services;
using NextGen.Identity.Core.Entities;
using NextGen.Identity.Core.Interfaces;

namespace NextGen.Identity.Api.Services;

/// <summary>
/// Custom profile service for Duende IdentityServer
/// Populates ID token and access token with user claims
/// </summary>
public class DeepLensProfileService : IProfileService
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<DeepLensProfileService> _logger;

    public DeepLensProfileService(
        IUserRepository userRepository,
        ILogger<DeepLensProfileService> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }

    /// <summary>
    /// Gets user profile data
    /// </summary>
    public async Task GetProfileDataAsync(ProfileDataRequestContext context)
    {
        var sub = context.Subject.GetSubjectId();
        
        if (string.IsNullOrEmpty(sub))
        {
            _logger.LogWarning("No subject ID found in context");
            return;
        }

        if (!Guid.TryParse(sub, out var userId))
        {
            _logger.LogWarning("Invalid subject ID format: {SubjectId}", sub);
            return;
        }

        var user = await _userRepository.GetByIdAsync(userId);
        
        if (user == null)
        {
            _logger.LogWarning("User not found: {UserId}", userId);
            return;
        }

        // Add custom claims
        var claims = new List<Claim>
        {
            new Claim("sub", user.Id.ToString()),
            new Claim("email", user.Email),
            new Claim("email_verified", user.EmailConfirmed.ToString().ToLower()),
            new Claim("name", $"{user.FirstName} {user.LastName}"),
            new Claim("given_name", user.FirstName),
            new Claim("family_name", user.LastName),
            new Claim("role", user.Role.ToString()),
            new Claim("tenant_id", user.TenantId.ToString()),
            new Claim("is_active", user.IsActive.ToString().ToLower())
        };

        // Add tenant slug if available
        if (user.Tenant != null)
        {
            claims.Add(new Claim("tenant_slug", user.Tenant.Slug));
            claims.Add(new Claim("tenant_name", user.Tenant.Name));
            claims.Add(new Claim("tenant_tier", user.Tenant.Tier.ToString()));
        }

        // Handle Administrative Impersonation claims if present in the Subject principal
        var impersonatorId = context.Subject.FindFirst("act_as")?.Value;
        if (!string.IsNullOrEmpty(impersonatorId))
        {
            claims.Add(new Claim("act_as", impersonatorId));
            claims.Add(new Claim("is_impersonated", "true"));
            _logger.LogInformation("Issuing impersonated token for user {UserId} by admin {AdminId}", user.Id, impersonatorId);
        }

        context.IssuedClaims.AddRange(claims);
        
        _logger.LogDebug("Profile data retrieved for user: {UserId}", userId);
    }

    /// <summary>
    /// Determines if user is active
    /// </summary>
    public async Task IsActiveAsync(IsActiveContext context)
    {
        var sub = context.Subject.GetSubjectId();
        
        if (string.IsNullOrEmpty(sub))
        {
            context.IsActive = false;
            return;
        }

        if (!Guid.TryParse(sub, out var userId))
        {
            context.IsActive = false;
            return;
        }

        var user = await _userRepository.GetByIdAsync(userId);
        
        context.IsActive = user != null && user.IsActive && user.DeletedAt == null;
        
        _logger.LogDebug("User active check for {UserId}: {IsActive}", userId, context.IsActive);
    }
}
