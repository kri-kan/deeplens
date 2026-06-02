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
    /// Get addresses for a vendor
    /// </summary>
    [HttpGet("{vendorId}/addresses")]
    public async Task<ActionResult<List<VendorAddressResponse>>> GetVendorAddresses(Guid vendorId)
    {
        var addresses = await _vendorService.GetVendorAddressesAsync(vendorId);
        return Ok(addresses);
    }

    /// <summary>
    /// Add an address for a vendor
    /// </summary>
    [HttpPost("{vendorId}/addresses")]
    public async Task<ActionResult<VendorAddressResponse>> AddVendorAddress(
        Guid vendorId,
        [FromBody] VendorAddressRequest request)
    {
        try
        {
            var address = await _vendorService.AddVendorAddressAsync(vendorId, request);
            return CreatedAtAction(nameof(GetVendorAddresses), new { vendorId }, address);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add vendor address");
            return StatusCode(500, new { message = "Failed to add address", error = ex.Message });
        }
    }

    /// <summary>
    /// Update a vendor address
    /// </summary>
    [HttpPut("addresses/{addressId}")]
    public async Task<ActionResult<VendorAddressResponse>> UpdateVendorAddress(
        Guid addressId,
        [FromBody] VendorAddressRequest request)
    {
        try
        {
            var address = await _vendorService.UpdateVendorAddressAsync(addressId, request);
            return Ok(address);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update vendor address");
            return StatusCode(500, new { message = "Failed to update address", error = ex.Message });
        }
    }

    /// <summary>
    /// Delete a vendor address
    /// </summary>
    [HttpDelete("addresses/{addressId}")]
    public async Task<IActionResult> DeleteVendorAddress(Guid addressId)
    {
        var deleted = await _vendorService.DeleteVendorAddressAsync(addressId);
        if (!deleted)
            return NotFound(new { message = "Address not found" });

        return NoContent();
    }

    /// <summary>
    /// Set a default vendor address
    /// </summary>
    [HttpPost("{vendorId}/addresses/{addressId}/default")]
    public async Task<IActionResult> SetDefaultVendorAddress(Guid vendorId, Guid addressId)
    {
        var success = await _vendorService.SetDefaultAddressAsync(vendorId, addressId);
        if (!success)
            return NotFound(new { message = "Address not found or could not be updated" });

        return Ok();
    }
}
