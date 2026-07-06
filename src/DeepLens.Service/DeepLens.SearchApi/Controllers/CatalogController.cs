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
    private readonly DeepLens.Contracts.Catalog.IProductService _productService;
    private readonly ILogger<CatalogController> _logger;

    public CatalogController(IMetadataService metadataService, DeepLens.Contracts.Catalog.IProductService productService, ILogger<CatalogController> logger)
    {
        _metadataService = metadataService;
        _productService = productService;
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

    /// <summary>
    /// Toggles the starred status of a product.
    /// </summary>
    [HttpPatch("products/{id}/star")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> StarProduct(Guid id, [FromBody] DeepLens.Contracts.Catalog.StarProductRequest request, CancellationToken ct)
    {
        var success = await _productService.StarProductAsync(id, request.IsStarred, ct);
        if (!success) return NotFound();
        return Ok();
    }

    /// <summary>
    /// Sets a specific media item as the default (thumbnail cover) for the product.
    /// </summary>
    [HttpPatch("products/{id}/media/{mediaId}/set-default")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SetDefaultMedia(Guid id, Guid mediaId, CancellationToken ct)
    {
        var success = await _productService.SetDefaultMediaAsync(id, mediaId, ct);
        if (!success) return NotFound();
        return Ok();
    }
}
