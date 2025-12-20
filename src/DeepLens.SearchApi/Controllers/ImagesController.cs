using Microsoft.AspNetCore.Mvc;
using DeepLens.SearchApi.Services;
using DeepLens.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Distributed;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/catalog/images")]
[Authorize(Policy = "SearchPolicy")]
public class ImagesController : ControllerBase
{
    private readonly ITenantMetadataService _metadataService;
    private readonly IStorageService _storageService;
    private readonly IDistributedCache _cache;
    private readonly ILogger<ImagesController> _logger;

    public ImagesController(
        ITenantMetadataService metadataService, 
        IStorageService storageService,
        IDistributedCache cache,
        ILogger<ImagesController> logger)
    {
        _metadataService = metadataService;
        _storageService = storageService;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Lists images for the tenant with pagination.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ImageDto>>> ListImages([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] string? tenant = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value ?? tenant;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid tenant_id" });
        }

        var images = await _metadataService.ListImagesAsync(tenantId, page, pageSize);
        return Ok(images);
    }

    /// <summary>
    /// Serves a thumbnail for the given image.
    /// Implements caching and on-demand generation.
    /// </summary>
    [HttpGet("{imageId}/thumbnail")]
    [AllowAnonymous] // Allow access to thumbnails for display, or keep authorized if needed
    public async Task<IActionResult> GetThumbnail(Guid imageId, [FromQuery] string tenant)
    {
        if (!Guid.TryParse(tenant, out var tenantId))
            return BadRequest("Invalid tenant ID");

        string cacheKey = $"thumb:{tenantId}:{imageId}";
        byte[]? cachedThumb = await _cache.GetAsync(cacheKey);
        
        if (cachedThumb != null)
        {
            return File(cachedThumb, "image/webp");
        }

        try
        {
            // 1. Try to get from MinIO thumbnails folder
            var images = await _metadataService.ListImagesAsync(tenantId, 1, 1000); 
            var image = images.FirstOrDefault(i => i.Id == imageId);
            
            if (image == null) return NotFound();

            // We use .webp for all thumbnails now
            string thumbPath = image.StoragePath.Replace("raw/", "thumbnails/");
            var lastDot = thumbPath.LastIndexOf('.');
            if (lastDot > 0) thumbPath = thumbPath.Substring(0, lastDot);
            thumbPath += ".webp";

            try
            {
                using var thumbStream = await _storageService.GetFileAsync(tenantId, thumbPath);
                using var ms = new MemoryStream();
                await thumbStream.CopyToAsync(ms);
                byte[] data = ms.ToArray();
                
                await _cache.SetAsync(cacheKey, data, new DistributedCacheEntryOptions {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7)
                });

                return File(data, "image/webp");
            }
            catch
            {
                // Thumbnail not found in MinIO, create it on demand
                _logger.LogInformation("Thumbnail not found for {ImageId}, creating on-demand in WebP", imageId);
                
                using var rawStream = await _storageService.GetFileAsync(tenantId, image.StoragePath);
                using var imageObj = await Image.LoadAsync(rawStream);
                
                var tenantSettings = await _metadataService.GetThumbnailSettingsAsync(tenantId);
                int width = 512, height = 512;
                if (tenantSettings != null && tenantSettings.Specifications.Any())
                {
                    width = tenantSettings.Specifications.First().MaxWidth;
                    height = tenantSettings.Specifications.First().MaxHeight;
                }

                // Maintain aspect ratio: Resize to fit within specified dimensions
                imageObj.Mutate(x => x.Resize(new ResizeOptions {
                    Size = new Size(width, height),
                    Mode = ResizeMode.Max
                }));

                using var outMs = new MemoryStream();
                await imageObj.SaveAsWebpAsync(outMs);
                byte[] outData = outMs.ToArray();

                await _cache.SetAsync(cacheKey, outData, new DistributedCacheEntryOptions {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7)
                });

                return File(outData, "image/webp");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving thumbnail for {ImageId}", imageId);
            return StatusCode(500);
        }
    }
}
