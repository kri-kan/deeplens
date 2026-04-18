using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using DeepLens.Contracts.Vendors;
using DeepLens.SearchApi.Services;

namespace DeepLens.SearchApi.Controllers;

/// <summary>
/// Manages Vendors/manufacturers for product catalog.
/// Single-tenant version.
/// </summary>
[ApiController]
[Route("api/v1/Vendors")]
public class VendorsController : ControllerBase
{
    private readonly IVendorService _vendorService;
    private readonly ILogger<VendorsController> _logger;

    public VendorsController(IVendorService vendorService, ILogger<VendorsController> logger)
    {
        _vendorService = vendorService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new Vendor/manufacturer
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<VendorResponse>> CreateVendor([FromBody] CreateVendorRequest request)
    {
        try
        {
            var vendor = await _vendorService.CreateVendorAsync(request);
            return CreatedAtAction(nameof(GetVendor), new { vendorId = vendor.Id }, vendor);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create Vendor");
            return StatusCode(500, new { message = "Failed to create Vendor", error = ex.Message });
        }
    }

    /// <summary>
    /// Get a Vendor by ID
    /// </summary>
    [HttpGet("{vendorId}")]
    public async Task<ActionResult<VendorResponse>> GetVendor(Guid vendorId)
    {
        var vendor = await _vendorService.GetVendorByIdAsync(vendorId);
        if (vendor == null)
            return NotFound(new { message = "Vendor not found" });

        return Ok(vendor);
    }

    /// <summary>
    /// List all Vendors with pagination
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<VendorListResponse>> ListVendors(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] bool? activeOnly = null)
    {
        var result = await _vendorService.ListVendorsAsync(page, pageSize, activeOnly);
        return Ok(result);
    }

    /// <summary>
    /// Update an existing Vendor
    /// </summary>
    [HttpPatch("{vendorId}")]
    public async Task<ActionResult<VendorResponse>> UpdateVendor(
        Guid vendorId,
        [FromBody] UpdateVendorRequest request)
    {
        try
        {
            var vendor = await _vendorService.UpdateVendorAsync(vendorId, request);
            return Ok(vendor);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update Vendor {VendorId}", vendorId);
            return StatusCode(500, new { message = "Failed to update Vendor" });
        }
    }

    /// <summary>
    /// Delete a Vendor
    /// </summary>
    [HttpDelete("{vendorId}")]
    public async Task<IActionResult> DeleteVendor(Guid vendorId)
    {
        var deleted = await _vendorService.DeleteVendorAsync(vendorId);
        if (!deleted)
            return NotFound(new { message = "Vendor not found" });

        return NoContent();
    }

    /// <summary>
    /// Add a contact person to a Vendor
    /// </summary>
    [HttpPost("{vendorId}/contacts")]
    public async Task<ActionResult<VendorContactResponse>> AddContact(
        Guid vendorId,
        [FromBody] VendorContactRequest request)
    {
        try
        {
            var contact = await _vendorService.AddContactAsync(vendorId, request);
            return CreatedAtAction(nameof(GetVendor), new { vendorId }, contact);
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
    public async Task<IActionResult> RemoveContact(Guid contactId)
    {
        var removed = await _vendorService.RemoveContactAsync(contactId);
        if (!removed)
            return NotFound(new { message = "Contact not found" });

        return NoContent();
    }
}
