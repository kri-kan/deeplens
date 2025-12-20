using Microsoft.AspNetCore.Mvc;
using DeepLens.Contracts.Ingestion;
using DeepLens.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/catalog")]
[Authorize(Policy = "SearchPolicy")]
public class CatalogController : ControllerBase
{
    private readonly ITenantMetadataService _metadataService;
    private readonly ILogger<CatalogController> _logger;

    public CatalogController(ITenantMetadataService metadataService, ILogger<CatalogController> logger)
    {
        _metadataService = metadataService;
        _logger = logger;
    }

    /// <summary>
    /// Merges two products into a single SKU.
    /// Handles image deduplication based on quality and perceptual hashing.
    /// </summary>
    [HttpPost("merge")]
    public async Task<IActionResult> MergeProducts([FromBody] ProductMergeRequest request)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid tenant_id" });
        }

        try
        {
            _logger.LogInformation("Merging SKU {Source} into {Target} for tenant {TenantId}", 
                request.SourceSku, request.TargetSku, tenantId);

            await _metadataService.MergeProductsAsync(tenantId, request.TargetSku, request.SourceSku, request.DeleteSourceAfterMerge);
            
            return Ok(new { message = "Products merged successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Sets an image as default for its variant/SKU.
    /// Used for quick sharing and gallery thumbnails.
    /// </summary>
    [HttpPatch("images/{imageId}/default")]
    public async Task<IActionResult> SetDefaultImage(Guid imageId, [FromQuery] bool isDefault = true)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid tenant_id" });
        }

        await _metadataService.SetDefaultImageAsync(tenantId, imageId, isDefault);
        return Ok(new { message = "Image default status updated" });
    }

    /// <summary>
    /// Set a listing as favorite (starred).
    /// </summary>
    [HttpPatch("listings/{listingId}/favorite")]
    public async Task<IActionResult> SetFavoriteListing(Guid listingId, [FromQuery] bool isFavorite = true)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid tenant_id" });
        }

        await _metadataService.SetFavoriteListingAsync(tenantId, listingId, isFavorite);
        return Ok(new { message = "Listing favorite status updated" });
    }
}
