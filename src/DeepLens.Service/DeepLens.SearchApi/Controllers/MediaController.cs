using Microsoft.AspNetCore.Mvc;
using DeepLens.SearchApi.Services;
using DeepLens.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Distributed;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/catalog/media")]
[Authorize(Policy = "SearchPolicy")]
public class MediaController : ControllerBase
{
    private readonly ITenantMetadataService _metadataService;
    private readonly IStorageService _storageService;
    private readonly IDistributedCache _cache;
    private readonly ILogger<MediaController> _logger;

    public MediaController(
        ITenantMetadataService metadataService, 
        IStorageService storageService,
        IDistributedCache cache,
        ILogger<MediaController> logger)
    {
        _metadataService = metadataService;
        _storageService = storageService;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Lists media for the tenant with pagination and filtering.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<MediaDto>>> ListMedia([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] string? tenant = null, [FromQuery] int? type = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value ?? tenant;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid tenant_id" });
        }

        var media = await _metadataService.ListMediaAsync(tenantId, page, pageSize, type);
        return Ok(media);
    }

    /// <summary>
    /// Serves a thumbnail for the given media (Image poster or Video poster frame).
    /// </summary>
    [HttpGet("{mediaId}/thumbnail")]
    [AllowAnonymous]
    public async Task<IActionResult> GetThumbnail(Guid mediaId, [FromQuery] string tenant)
    {
        if (!Guid.TryParse(tenant, out var tenantId))
            return BadRequest("Invalid tenant ID");

        string cacheKey = $"thumb:{tenantId}:{mediaId}";
        byte[]? cachedThumb = await _cache.GetAsync(cacheKey);
        
        if (cachedThumb != null)
        {
            return File(cachedThumb, "image/webp");
        }

        try
        {
            // Try to find the media record
            var items = await _metadataService.ListMediaAsync(tenantId, 1, 1000); 
            var item = items.FirstOrDefault(i => i.Id == mediaId);
            
            if (item == null) return NotFound();

            string? thumbPath = item.ThumbnailPath;
            
            // Fallback for images if ThumbnailPath is not set (legacy or auto-generation logic)
            if (string.IsNullOrEmpty(thumbPath) && item.MediaType == 1)
            {
                thumbPath = item.StoragePath.Replace("raw/", "thumbnails/");
                var lastDot = thumbPath.LastIndexOf('.');
                if (lastDot > 0) thumbPath = thumbPath.Substring(0, lastDot);
                thumbPath += ".webp";
            }

            if (string.IsNullOrEmpty(thumbPath))
            {
                return NotFound("No thumbnail available yet for this media.");
            }

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
                // If it's an image and thumbnail missing, create on demand
                if (item.MediaType == 1)
                {
                    _logger.LogInformation("Thumbnail not found for Image {ImageId}, creating on-demand", mediaId);
                    
                    using var rawStream = await _storageService.GetFileAsync(tenantId, item.StoragePath);
                    using var imageObj = await Image.LoadAsync(rawStream);
                    
                    var tenantSettings = await _metadataService.GetThumbnailSettingsAsync(tenantId);
                    int width = 512, height = 512;
                    if (tenantSettings != null && tenantSettings.Specifications.Any())
                    {
                        width = tenantSettings.Specifications.First().MaxWidth;
                        height = tenantSettings.Specifications.First().MaxHeight;
                    }

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
                
                return NotFound("Thumbnail file missing.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving thumbnail for {MediaId}", mediaId);
            return StatusCode(500);
        }
    }

    /// <summary>
    /// Serves a short GIF preview for video media.
    /// </summary>
    [HttpGet("{mediaId}/preview")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPreview(Guid mediaId, [FromQuery] string tenant)
    {
        if (!Guid.TryParse(tenant, out var tenantId))
            return BadRequest("Invalid tenant ID");

        string cacheKey = $"preview:{tenantId}:{mediaId}";
        byte[]? cachedPreview = await _cache.GetAsync(cacheKey);
        
        if (cachedPreview != null)
        {
            return File(cachedPreview, "image/gif");
        }

        try
        {
            var items = await _metadataService.ListMediaAsync(tenantId, 1, 1000); 
            var item = items.FirstOrDefault(i => i.Id == mediaId);
            
            if (item == null || item.MediaType != 2) return NotFound("Video media not found.");
            if (string.IsNullOrEmpty(item.PreviewPath)) return NotFound("Preview GIF not yet generated.");

            using var previewStream = await _storageService.GetFileAsync(tenantId, item.PreviewPath);
            using var ms = new MemoryStream();
            await previewStream.CopyToAsync(ms);
            byte[] data = ms.ToArray();
            
            // Cache in Redis for quick access
            await _cache.SetAsync(cacheKey, data, new DistributedCacheEntryOptions {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
            });

            return File(data, "image/gif");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving preview for {MediaId}", mediaId);
            return StatusCode(500);
        }
    }

    /// <summary>
    /// Serves the original high-quality media file.
    /// Supports range requests for video streaming.
    /// </summary>
    [HttpGet("{mediaId}/raw")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRawMedia(Guid mediaId, [FromQuery] string tenant)
    {
        if (!Guid.TryParse(tenant, out var tenantId))
            return BadRequest("Invalid tenant ID");

        try
        {
            // We use ListMediaAsync to find the record (it's fast enough with 1000 items, 
            // but ideally we'd have a GetMediaById method)
            var items = await _metadataService.ListMediaAsync(tenantId, 1, 1000); 
            var item = items.FirstOrDefault(i => i.Id == mediaId);
            
            if (item == null) return NotFound();

            var stream = await _storageService.GetFileAsync(tenantId, item.StoragePath);
            
            string contentType = item.MimeType ?? (item.MediaType == 1 ? "image/jpeg" : "video/mp4");
            
            // enableRangeProcessing: true is CRITICAL for video seeking/streaming
            return File(stream, contentType, enableRangeProcessing: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving raw media for {MediaId}", mediaId);
            return StatusCode(500);
        }
    }
}
