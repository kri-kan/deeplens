using Microsoft.AspNetCore.Mvc;
using DeepLens.SearchApi.Services;
using DeepLens.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Distributed;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace DeepLens.SearchApi.Controllers;

/// <summary>
/// Controller for serving media content (images, thumbnails, video previews).
/// Single-tenant version.
/// </summary>
[ApiController]
[Route("api/v1/catalog/media")]
public class MediaController : ControllerBase
{
    private readonly IMetadataService _metadataService;
    private readonly IStorageService _storageService;
    private readonly IDistributedCache _cache;
    private readonly ILogger<MediaController> _logger;

    public MediaController(
        IMetadataService metadataService, 
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
    /// Lists media with pagination and filtering.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MediaDto>>> ListMedia([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] int? type = null)
    {
        var media = await _metadataService.ListMediaAsync(page, pageSize, type);
        return Ok(media);
    }

    /// <summary>
    /// Serves a thumbnail for the given media.
    /// </summary>
    [HttpGet("{mediaId}/thumbnail")]
    public async Task<IActionResult> GetThumbnail(Guid mediaId)
    {
        string cacheKey = $"thumb:{mediaId}";
        byte[]? cachedThumb = await _cache.GetAsync(cacheKey);
        
        if (cachedThumb != null)
        {
            return File(cachedThumb, "image/webp");
        }

        try
        {
            var items = await _metadataService.ListMediaAsync(1, 1000); 
            var item = items.FirstOrDefault(i => i.Id == mediaId);
            
            if (item == null) return NotFound();

            string? thumbPath = item.ThumbnailPath;
            
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
                using var thumbStream = await _storageService.GetFileAsync(thumbPath);
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
                if (item.MediaType == 1)
                {
                    _logger.LogInformation("Thumbnail not found for Image {ImageId}, creating on-demand", mediaId);
                    
                    using var rawStream = await _storageService.GetFileAsync(item.StoragePath);
                    using var imageObj = await Image.LoadAsync(rawStream);
                    
                    int width = 512, height = 512;

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
    public async Task<IActionResult> GetPreview(Guid mediaId)
    {
        string cacheKey = $"preview:{mediaId}";
        byte[]? cachedPreview = await _cache.GetAsync(cacheKey);
        
        if (cachedPreview != null)
        {
            return File(cachedPreview, "image/gif");
        }

        try
        {
            var items = await _metadataService.ListMediaAsync(1, 1000); 
            var item = items.FirstOrDefault(i => i.Id == mediaId);
            
            if (item == null || item.MediaType != 2) return NotFound("Video media not found.");
            if (string.IsNullOrEmpty(item.PreviewPath)) return NotFound("Preview GIF not yet generated.");

            using var previewStream = await _storageService.GetFileAsync(item.PreviewPath);
            using var ms = new MemoryStream();
            await previewStream.CopyToAsync(ms);
            byte[] data = ms.ToArray();
            
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
    /// </summary>
    [HttpGet("{mediaId}/raw")]
    public async Task<IActionResult> GetRawMedia(Guid mediaId)
    {
        try
        {
            var items = await _metadataService.ListMediaAsync(1, 1000); 
            var item = items.FirstOrDefault(i => i.Id == mediaId);
            
            if (item == null) return NotFound();

            var stream = await _storageService.GetFileAsync(item.StoragePath);
            string contentType = item.MimeType ?? (item.MediaType == 1 ? "image/jpeg" : "video/mp4");
            
            return File(stream, contentType, enableRangeProcessing: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving raw media for {MediaId}", mediaId);
            return StatusCode(500);
        }
    }
}
