using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Dapper;
using DeepLens.Application.Abstractions.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services;

public class VayyariClaimsTransformation : IClaimsTransformation
{
    private readonly IPermissionCacheService _permissionCacheService;
    private readonly IDbConnectionFactory _dbConnectionFactory;
    private readonly ILogger<VayyariClaimsTransformation> _logger;

    public VayyariClaimsTransformation(
        IPermissionCacheService permissionCacheService,
        IDbConnectionFactory dbConnectionFactory,
        ILogger<VayyariClaimsTransformation> logger)
    {
        _permissionCacheService = permissionCacheService;
        _dbConnectionFactory = dbConnectionFactory;
        _logger = logger;
    }

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity == null || !principal.Identity.IsAuthenticated)
        {
            return principal;
        }

        // Avoid re-transforming if already done in this request
        if (principal.HasClaim(c => c.Type == "vayyari_rbac_transformed"))
        {
            return principal;
        }

        // Extract user ID from sub or NameIdentifier
        var sub = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? principal.FindFirst("sub")?.Value
               ?? principal.FindFirst("userId")?.Value;

        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
        {
            return principal;
        }

        // Extract tenant ID
        var tenantClaim = principal.FindFirst("tenant_id")?.Value
                       ?? principal.FindFirst("tenantId")?.Value;

        Guid tenantId = Guid.Empty;
        if (!string.IsNullOrEmpty(tenantClaim))
        {
            Guid.TryParse(tenantClaim, out tenantId);
        }

        // If tenantId was not in JWT, query from users table in DB
        if (tenantId == Guid.Empty)
        {
            try
            {
                using var connection = await _dbConnectionFactory.CreateConnectionAsync();
                const string tenantSql = "SELECT tenant_id FROM public.users WHERE id = @UserId LIMIT 1;";
                tenantId = await connection.QueryFirstOrDefaultAsync<Guid>(tenantSql, new { UserId = userId });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to resolve tenant_id for user {UserId}", userId);
            }
        }

        if (tenantId == Guid.Empty)
        {
            _logger.LogWarning("No valid tenant ID found for user {UserId}", userId);
            return principal;
        }

        try
        {
            var auth = await _permissionCacheService.GetUserAuthorizationAsync(tenantId, userId);
            if (auth != null)
            {
                var claimsIdentity = new ClaimsIdentity();

                // Add transformed marker
                claimsIdentity.AddClaim(new Claim("vayyari_rbac_transformed", "true"));

                // Add Roles
                foreach (var role in auth.Roles)
                {
                    claimsIdentity.AddClaim(new Claim(ClaimTypes.Role, role));
                    claimsIdentity.AddClaim(new Claim("role", role));
                }

                // Add Permissions
                foreach (var perm in auth.Permissions)
                {
                    claimsIdentity.AddClaim(new Claim("permission", perm));
                }

                // Add SuperAdmin claim
                if (auth.IsSuperAdmin)
                {
                    claimsIdentity.AddClaim(new Claim("is_super_admin", "true"));
                }

                principal.AddIdentity(claimsIdentity);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error transforming RBAC claims for user {UserId} in tenant {TenantId}", userId, tenantId);
        }

        return principal;
    }
}
