using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using DeepLens.Contracts.Catalog;
using DeepLens.Contracts.Media;
using DeepLens.Domain.Entities.Catalog;
using DeepLens.SearchApi.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/products")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet("ping")]
    public IActionResult Ping() => Ok(new { status = "Product Controller Active" });

    [HttpGet]
    public async Task<IActionResult> GetProducts([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        var result = await _productService.GetProductsAsync(skip, take);
        return Ok(result);
    }

    [HttpGet("catalog")]
    public async Task<IActionResult> GetCatalog([FromQuery] ProductCatalogFilter filter)
    {
        var result = await _productService.GetCatalogAsync(filter);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProductById(Guid id)
    {
        var result = await _productService.GetProductByIdAsync(id);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        var success = await _productService.DeleteProductAsync(id);
        return success ? Ok() : NotFound();
    }

    [HttpPost("{id}/star/{mediaId}")]
    public async Task<IActionResult> StarMedia(Guid id, Guid mediaId)
    {
        var success = await _productService.StarMediaAsync(id, mediaId);
        return success ? Ok() : BadRequest();
    }

    [HttpPost("{id}/reorder")]
    public async Task<IActionResult> ReorderMedia(Guid id, [FromBody] List<Guid> mediaIds)
    {
        var success = await _productService.ReorderMediaAsync(id, mediaIds);
        return success ? Ok() : BadRequest();
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> CreateProduct([FromForm] ProductRequest request)
    {
        var mediaFiles = new List<MediaFileDto>();
        if (request.Files != null)
        {
            foreach (var file in request.Files)
            {
                var stream = new MemoryStream();
                await file.CopyToAsync(stream);
                stream.Position = 0;
                
                mediaFiles.Add(new MediaFileDto
                {
                    Content = stream,
                    FileName = file.FileName,
                    ContentType = file.ContentType,
                    VendorMediaId = file.Name
                });
            }
        }

        var ingestionDto = new ProductIngestionDto
        {
            VendorPrice = request.VendorPrice,
            Description = request.Description,
            MasterTitle = request.Title,
            Retention = request.Retention,
            Tags = request.Tags,
            Fabric = request.Fabric,
            StitchType = request.StitchType,
            WorkHeaviness = request.WorkHeaviness,
            Color = request.Color,
            Category = Enum.TryParse<MediaCategory>(request.Category, true, out var cat) ? cat : MediaCategory.Product,
            SubCategory = request.SubCategory ?? "General"
        };

        var result = await _productService.CreateProductAsync(ingestionDto, mediaFiles);
        return Ok(result);
    }

    [HttpGet("merge/preview")]
    public async Task<IActionResult> GetMergePreview([FromQuery] Guid sourceId, [FromQuery] Guid targetId)
    {
        try
        {
            var result = await _productService.GetMergePreviewAsync(sourceId, targetId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("merge")]
    public async Task<IActionResult> MergeProducts([FromBody] MergeRequest request)
    {
        bool success;
        if (request.IsVendorProductIds)
        {
            success = await _productService.MergeByVendorProductIdsAsync(request.TargetMasterId, request.SourceProductIds);
        }
        else
        {
            success = await _productService.MergeVendorProductsAsync(request.TargetMasterId, request.SourceProductIds);
        }

        if (!success) return BadRequest("Merge failed.");
        return Ok();
    }

    [HttpPost("instagram/link")]
    public async Task<IActionResult> LinkInstagram([FromBody] InstaLinkRequest request)
    {
        var success = await _productService.LinkInstagramPostAsync(request.PostId, request.ProductId, request.LinkType);
        return success ? Ok() : BadRequest();
    }

    [HttpGet("instagram/{postId}/links")]
    public async Task<IActionResult> GetInstagramLinks(Guid postId)
    {
        var result = await _productService.GetInstagramLinksAsync(postId);
        return Ok(result);
    }

    [HttpPost("instagram/{postId}/create-product")]
    public async Task<IActionResult> CreateProductFromPost(Guid postId, [FromBody] ProductIngestionDto data)
    {
        var result = await _productService.CreateProductFromPostAsync(postId, data);
        return Ok(result);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var result = await _productService.GetCategoriesAsync();
        return Ok(result);
    }

}

public class InstaLinkRequest
{
    public Guid PostId { get; set; }
    public Guid ProductId { get; set; }
    public string LinkType { get; set; } = "is";
}
