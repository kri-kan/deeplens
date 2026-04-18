using Microsoft.AspNetCore.Mvc;
using DeepLens.Contracts.Ingestion;
using DeepLens.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/catalog")]
public class CatalogController : ControllerBase
{
    private readonly IMetadataService _metadataService;
    private readonly ILogger<CatalogController> _logger;

    public CatalogController(IMetadataService metadataService, ILogger<CatalogController> logger)
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
        try
        {
            _logger.LogInformation("Merging SKU {Source} into {Target}", 
                request.SourceSku, request.TargetSku);

            await _metadataService.MergeProductsAsync(request.TargetSku, request.SourceSku, request.DeleteSourceAfterMerge);
            
            return Ok(new { message = "Products merged successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Sets an image as default for its variant/SKU.
    /// </summary>
    [HttpPatch("images/{imageId}/default")]
    public async Task<IActionResult> SetDefaultImage(Guid imageId, [FromQuery] bool isDefault = true)
    {
        await _metadataService.SetDefaultMediaAsync(imageId, isDefault);
        return Ok(new { message = "Image default status updated" });
    }

    /// <summary>
    /// Set a listing as favorite (starred).
    /// </summary>
    [HttpPatch("listings/{listingId}/favorite")]
    public async Task<IActionResult> SetFavoriteListing(Guid listingId, [FromQuery] bool isFavorite = true)
    {
        await _metadataService.SetFavoriteListingAsync(listingId, isFavorite);
        return Ok(new { message = "Listing favorite status updated" });
    }
}
