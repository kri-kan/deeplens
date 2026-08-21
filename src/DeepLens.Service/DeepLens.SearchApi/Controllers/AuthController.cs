using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Auth;
using DeepLens.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/auth")]
[Authorize]
public class AuthController : ControllerBase
{
    private readonly IPermissionCacheService _permissionCacheService;
    private readonly IDbConnectionFactory _dbConnectionFactory;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IPermissionCacheService permissionCacheService,
        IDbConnectionFactory dbConnectionFactory,
        ILogger<AuthController> logger)
    {
        _permissionCacheService = permissionCacheService;
        _dbConnectionFactory = dbConnectionFactory;
        _logger = logger;
    }

    [HttpGet("capabilities")]
    public async Task<IActionResult> GetCapabilities()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value
               ?? User.FindFirst("userId")?.Value;

        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
        {
            return Unauthorized(new { message = "Invalid or missing user identity in access token." });
        }

        var tenantClaim = User.FindFirst("tenant_id")?.Value
                       ?? User.FindFirst("tenantId")?.Value;

        Guid tenantId = Guid.Empty;
        if (!string.IsNullOrEmpty(tenantClaim))
        {
            Guid.TryParse(tenantClaim, out tenantId);
        }

        if (tenantId == Guid.Empty)
        {
            using var connection = await _dbConnectionFactory.CreateConnectionAsync();
            const string sql = "SELECT tenant_id FROM public.users WHERE id = @UserId LIMIT 1;";
            tenantId = await connection.QueryFirstOrDefaultAsync<Guid>(sql, new { UserId = userId });
        }

        if (tenantId == Guid.Empty)
        {
            return BadRequest(new { message = "Unable to resolve tenant context for current user." });
        }

        var auth = await _permissionCacheService.GetUserAuthorizationAsync(tenantId, userId);

        var response = new UserCapabilitiesResponse
        {
            UserId = auth.UserId,
            TenantId = auth.TenantId,
            IsSuperAdmin = auth.IsSuperAdmin,
            Roles = auth.Roles,
            Permissions = auth.Permissions,
            Version = auth.Version
        };

        return Ok(response);
    }
}
