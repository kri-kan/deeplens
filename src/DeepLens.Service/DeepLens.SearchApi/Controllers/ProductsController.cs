using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json.Serialization;
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
    private readonly Confluent.Kafka.IProducer<string, string>? _producer;
    private readonly Microsoft.Extensions.Logging.ILogger<ProductsController> _logger;

    public ProductsController(
        IProductService productService, 
        System.IServiceProvider serviceProvider,
        Microsoft.Extensions.Logging.ILogger<ProductsController> logger)
    {
        _productService = productService;
        _logger = logger;
        _producer = serviceProvider.GetService(typeof(Confluent.Kafka.IProducer<string, string>)) as Confluent.Kafka.IProducer<string, string>;
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

    [HttpGet("catalog/filter-options")]
    public async Task<IActionResult> GetFilterOptions()
    {
        var result = await _productService.GetFilterOptionsAsync();
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

    [HttpPost("archive")]
    public async Task<IActionResult> ArchiveProducts([FromBody] List<Guid> productIds)
    {
        var count = await _productService.ArchiveProductsAsync(productIds);
        return Ok(new { count });
    }

    [HttpPost("unarchive")]
    public async Task<IActionResult> UnarchiveProducts([FromBody] List<Guid> productIds)
    {
        var count = await _productService.UnarchiveProductsAsync(productIds);
        return Ok(new { count });
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
            Title = request.Title,
            Retention = request.Retention,
            Tags = request.Tags,
            Fabric = request.Fabric,
            StitchType = request.StitchType,
            WorkHeaviness = request.WorkHeaviness,
            Color = request.Color,
            Category = request.Category ?? MediaCategory.Product,
            SubCategory = request.SubCategory ?? "General",
            SourcePostId = request.SourcePostId
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

    [HttpDelete("instagram/{postId}/links/{productId}")]
    public async Task<IActionResult> UnlinkInstagramPost(Guid postId, Guid productId)
    {
        try
        {
            var success = await _productService.UnlinkInstagramPostAsync(postId, productId);
            return Ok(); // Idempotent: return success even if already deleted
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var result = await _productService.GetCategoriesAsync();
        return Ok(result);
    }

    public class ChangeCategoryRequest
    {
        [JsonPropertyName("categorySlug")]
        public string CategorySlug { get; set; } = string.Empty;
    }

    [HttpPost("{id}/category")]
    public async Task<IActionResult> ChangeCategory(Guid id, [FromBody] ChangeCategoryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CategorySlug))
        {
            return BadRequest("CategorySlug is required.");
        }

        try
        {
            var success = await _productService.ChangeCategoryAsync(id, request.CategorySlug);
            if (!success) return NotFound("Product not found or category invalid");

            if (_producer != null)
            {
                var evt = new DeepLens.Contracts.Events.ProductCategoryChangedEvent
                {
                    EventId = Guid.NewGuid(),
                    ProductId = id,
                    NewCategory = request.CategorySlug,
                    Timestamp = DateTime.UtcNow
                };

                await _producer.ProduceAsync(DeepLens.Contracts.Events.KafkaTopics.ProductCategoryChanged, new Confluent.Kafka.Message<string, string>
                {
                    Key = id.ToString(),
                    Value = System.Text.Json.JsonSerializer.Serialize(evt, new System.Text.Json.JsonSerializerOptions { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase })
                });

                _logger.LogInformation("Published ProductCategoryChanged event for Product {ProductId}", id);
            }

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to change category for product {ProductId}", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("{id}/shares")]
    [ProducesResponseType(typeof(ProductShareLogDto), 200)]
    public async Task<IActionResult> RecordShare(Guid id, [FromBody] RecordShareRequest request, CancellationToken ct)
    {
        var result = await _productService.RecordShareAsync(id, request.Platform, request.DescriptionUsed, ct);
        return Ok(result);
    }

    [HttpPost("{id}/generate-share-description")]
    [ProducesResponseType(typeof(GenerateShareDescriptionResponse), 200)]
    public async Task<IActionResult> GenerateShareDescription(Guid id, [FromBody] GenerateShareDescriptionRequest request, CancellationToken ct)
    {
        var description = await _productService.GenerateShareDescriptionAsync(id, request.TargetPlatform, ct);
        return Ok(new GenerateShareDescriptionResponse(description));
    }
}
