using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using DeepLens.Contracts.Vendors;
using DeepLens.SearchApi.Services;

namespace DeepLens.SearchApi.Controllers;

/// <summary>
/// Manages Vendors/manufacturers for product catalog
/// </summary>
[ApiController]
[Route("api/v1/Vendors")]
[Authorize(Policy = "SearchPolicy")]
public class VendorsController : ControllerBase
{
    private readonly IVendorService _VendorService;
    private readonly ILogger<VendorsController> _logger;

    public VendorsController(IVendorService VendorService, ILogger<VendorsController> logger)
    {
        _VendorService = VendorService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new Vendor/manufacturer
    /// </summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<VendorResponse>> CreateVendor([FromBody] CreateVendorRequest request, [FromQuery] string? tenant = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value ?? tenant;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid or missing tenant_id" });
        }

        try
        {
            var Vendor = await _VendorService.CreateVendorAsync(tenantId, request);
            return CreatedAtAction(nameof(GetVendor), new { VendorId = Vendor.Id, tenant = tenantId }, Vendor);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create Vendor for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "Failed to create Vendor", error = ex.Message });
        }
    }

    /// <summary>
    /// Get a Vendor by ID
    /// </summary>
    [HttpGet("{VendorId}")]
    [AllowAnonymous]
    public async Task<ActionResult<VendorResponse>> GetVendor(Guid VendorId, [FromQuery] string? tenant = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value ?? tenant;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid or missing tenant_id" });
        }

        var Vendor = await _VendorService.GetVendorByIdAsync(tenantId, VendorId);
        if (Vendor == null)
            return NotFound(new { message = "Vendor not found" });

        return Ok(Vendor);
    }

    /// <summary>
    /// List all Vendors with pagination
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<VendorListResponse>> ListVendors(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] bool? activeOnly = null,
        [FromQuery] string? tenant = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value ?? tenant;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid or missing tenant_id" });
        }

        var result = await _VendorService.ListVendorsAsync(tenantId, page, pageSize, activeOnly);
        return Ok(result);
    }

    /// <summary>
    /// Update an existing Vendor
    /// </summary>
    [HttpPatch("{VendorId}")]
    [AllowAnonymous]
    public async Task<ActionResult<VendorResponse>> UpdateVendor(
        Guid VendorId,
        [FromBody] UpdateVendorRequest request,
        [FromQuery] string? tenant = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value ?? tenant;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid or missing tenant_id" });
        }

        try
        {
            var Vendor = await _VendorService.UpdateVendorAsync(tenantId, VendorId, request);
            return Ok(Vendor);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update Vendor {VendorId}", VendorId);
            return StatusCode(500, new { message = "Failed to update Vendor" });
        }
    }

    /// <summary>
    /// Delete a Vendor
    /// </summary>
    [HttpDelete("{VendorId}")]
    [AllowAnonymous]
    public async Task<IActionResult> DeleteVendor(Guid VendorId, [FromQuery] string? tenant = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value ?? tenant;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid or missing tenant_id" });
        }

        var deleted = await _VendorService.DeleteVendorAsync(tenantId, VendorId);
        if (!deleted)
            return NotFound(new { message = "Vendor not found" });

        return NoContent();
    }

    /// <summary>
    /// Add a contact person to a Vendor
    /// </summary>
    [HttpPost("{VendorId}/contacts")]
    [AllowAnonymous]
    public async Task<ActionResult<VendorContactResponse>> AddContact(
        Guid VendorId,
        [FromBody] VendorContactRequest request,
        [FromQuery] string? tenant = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value ?? tenant;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid or missing tenant_id" });
        }

        try
        {
            var contact = await _VendorService.AddContactAsync(tenantId, VendorId, request);
            return CreatedAtAction(nameof(GetVendor), new { VendorId, tenant = tenantId }, contact);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Remove a contact person from a Vendor
    /// </summary>
    [HttpDelete("contacts/{contactId}")]
    [AllowAnonymous]
    public async Task<IActionResult> RemoveContact(Guid contactId, [FromQuery] string? tenant = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value ?? tenant;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid or missing tenant_id" });
        }

        var removed = await _VendorService.RemoveContactAsync(tenantId, contactId);
        if (!removed)
            return NotFound(new { message = "Contact not found" });

        return NoContent();
    }
}
