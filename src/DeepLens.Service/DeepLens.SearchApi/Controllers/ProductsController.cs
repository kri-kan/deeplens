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
[Route("api/products")]
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
            Category = Enum.TryParse<MediaCategory>(request.Category, true, out var cat) ? cat : MediaCategory.Product
        };

        var result = await _productService.CreateProductAsync(ingestionDto, mediaFiles);
        return Ok(result);
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

}
