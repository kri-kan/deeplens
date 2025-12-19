using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NextGen.Identity.Core.DTOs;
using NextGen.Identity.Core.Interfaces;

namespace NextGen.Identity.Api.Controllers;

/// <summary>
/// Tenant management endpoints
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class TenantController : ControllerBase
{
    private readonly ITenantService _tenantService;
    private readonly ILogger<TenantController> _logger;

    public TenantController(
        ITenantService tenantService,
        ILogger<TenantController> logger)
    {
        _tenantService = tenantService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new tenant with admin user (for provisioning scripts)
    /// </summary>
    /// <remarks>
    /// Creates a tenant entry in the identity database along with the tenant's admin user.
    /// This endpoint is designed to be called from infrastructure provisioning scripts.
    /// Infrastructure details (Qdrant ports, MinIO, etc.) are provided by the caller.
    /// </remarks>
    [HttpPost("provision")]
    [AllowAnonymous] // Allow provisioning scripts to call this without authentication
    public async Task<ActionResult<ProvisionTenantResponse>> ProvisionTenant([FromBody] ProvisionTenantRequest request)
    {
        try
        {
            _logger.LogInformation("Provisioning tenant '{TenantName}' with admin user '{AdminEmail}'", 
                request.TenantName, request.AdminEmail);

            var result = await _tenantService.CreateTenantRecordWithAdminAsync(request);

            _logger.LogInformation("Tenant '{TenantName}' provisioned successfully with ID {TenantId}", 
                request.TenantName, result.TenantId);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to provision tenant '{TenantName}': {Message}", 
                request.TenantName, ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error provisioning tenant '{TenantName}'", request.TenantName);
            return StatusCode(500, new { message = "An error occurred while provisioning the tenant" });
        }
    }

    /// <summary>
    /// Get tenant by slug
    /// </summary>
    [HttpGet("{slug}")]
    [AllowAnonymous] // Allow public access for now, can be restricted later
    public async Task<ActionResult<TenantResponse>> GetTenant(string slug)
    {
        try
        {
            var tenant = await _tenantService.GetTenantBySlugAsync(slug);
            
            if (tenant == null)
            {
                return NotFound(new { message = $"Tenant with slug '{slug}' not found" });
            }

            return Ok(tenant);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenant '{Slug}'", slug);
            return StatusCode(500, new { message = "An error occurred while retrieving the tenant" });
        }
    }

    /// <summary>
    /// Health check for tenant controller
    /// </summary>
    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy", controller = "tenant", timestamp = DateTime.UtcNow });
    }
}
