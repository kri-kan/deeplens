using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NextGen.Identity.Core.DTOs;
using NextGen.Identity.Core.Interfaces;

namespace NextGen.Identity.Api.Controllers;

/// <summary>
/// API Key management for tenants
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ApiKeyController : ControllerBase
{
    private readonly IApiKeyService _apiKeyService;
    private readonly ILogger<ApiKeyController> _logger;

    public ApiKeyController(IApiKeyService apiKeyService, ILogger<ApiKeyController> logger)
    {
        _apiKeyService = apiKeyService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new API key for the current tenant
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<CreateApiKeyResponse>> CreateKey([FromBody] CreateApiKeyRequest request)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var response = await _apiKeyService.CreateApiKeyAsync(tenantId, userId, request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating API key");
            return StatusCode(500, new { message = "An error occurred while creating the API key" });
        }
    }

    /// <summary>
    /// List all API keys for the current tenant
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<ApiKeyResponse>>> ListKeys()
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized();
        }

        var keys = await _apiKeyService.GetTenantApiKeysAsync(tenantId);
        return Ok(keys);
    }

    /// <summary>
    /// Revoke an API key
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> RevokeKey(Guid id)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized();
        }

        var result = await _apiKeyService.RevokeApiKeyAsync(tenantId, id);
        if (!result)
        {
            return NotFound(new { message = "API key not found or access denied" });
        }

        return Ok(new { message = "API key revoked successfully" });
    }
}
