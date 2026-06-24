using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using DeepLens.Contracts.Media;
using DeepLens.Infrastructure.Services;
using DeepLens.Contracts.Events;
using DeepLens.Shared.Common;
using Confluent.Kafka;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using System.Text.Json;
using DeepLens.Application.Abstractions.Services;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/catalog/media")]
public class MediaController : ControllerBase
{
    private readonly IMetadataService _metadataService;
    private readonly IStorageService _storageService;
    private readonly IDistributedCache _cache;
    private readonly ILogger<MediaController> _logger;
    private readonly IAppSettingsService _settings;

    public MediaController(
        IMetadataService metadataService, 
        IStorageService storageService,
        IDistributedCache cache,
        ILogger<MediaController> logger,
        IAppSettingsService settings)
    {
        _metadataService = metadataService;
        _storageService = storageService;
        _cache = cache;
        _logger = logger;
        _settings = settings;
    }

    /// <summary>
    /// Serves a thumbnail for a media item. If the thumbnail doesn't exist, it is generated on-demand.
    /// </summary>
    [HttpGet("{mediaId:guid}/thumbnail")]
    public async Task<IActionResult> GetThumbnail(Guid mediaId, [FromQuery] string spec = "medium")
    {
        try {
            var item = await _metadataService.GetMediaByIdAsync(mediaId);
            if (item == null) {
                _logger.LogWarning("Media item {MediaId} not found in database.", mediaId);
                return NotFound();
            }

            return await ServeThumbnail(item, spec);
        } catch (Exception ex) {
            _logger.LogError(ex, "Error fetching thumbnail for {MediaId}", mediaId);
            return StatusCode(500, "Error processing thumbnail request.");
        }
    }

    /// <summary>
    /// Serves a thumbnail for a media item by its direct storage path.
    /// Useful when database records are missing or when relying explicitly on physical paths.
    /// </summary>
    [HttpGet("thumbnail-by-path")]
    public async Task<IActionResult> GetThumbnailByPath([FromQuery] string path, [FromQuery] string spec = "medium")
    {
        if (string.IsNullOrEmpty(path)) return BadRequest("Path is required.");

        try {
            // Try to find the item in metadata service if it exists (for ID benefit)
            // But don't fail if not found, just use the path
            var item = new MediaDto { 
                Id = Guid.Empty, 
                StoragePath = path, 
                MediaType = path.Contains(".mp4", StringComparison.OrdinalIgnoreCase) ? 2 : 1,
                MimeType = path.Contains(".mp4", StringComparison.OrdinalIgnoreCase) ? "video/mp4" : "image/jpeg"
            };

            return await ServeThumbnail(item, spec);
        } catch (Exception ex) {
            _logger.LogError(ex, "Error fetching thumbnail by path: {Path}", path);
            return StatusCode(500, "Error processing path-based thumbnail request.");
        }
    }

    private async Task<IActionResult> ServeThumbnail(MediaDto item, string spec)
    {
        // Validate spec
        if (!MediaConstants.ThumbnailSpecs.Presets.ContainsKey(spec)) spec = MediaConstants.ThumbnailSpecs.Medium;

        string fileName = Path.GetFileNameWithoutExtension(item.StoragePath);
        string thumbPath = StoragePathRegistry.GetThumbnailPath(fileName, spec);

        _logger.LogInformation("Serving thumbnail for {Path}. Derived thumb path: {ThumbPath}", item.StoragePath, thumbPath);

        try
        {
            var thumbStream = await _storageService.GetFileAsync(thumbPath);
            using var ms = new MemoryStream();
            await thumbStream.CopyToAsync(ms);
            byte[] data = ms.ToArray();

            var allSettings = await _settings.GetAllAsync();
            var expirySetting = allSettings.FirstOrDefault(s => s.Key == "Media:CacheExpiryHours")?.Value;
            int expiryHours = int.TryParse(expirySetting, out var h) ? h : 6;
            int maxAgeSeconds = expiryHours * 3600;

            Response.Headers.Append("Cache-Control", $"public,max-age={maxAgeSeconds}"); // Dynamic for thumbnails
            return File(data, MediaConstants.Formats.WebP);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Thumbnail file {ThumbPath} not found or inaccessible. Attempting on-demand generation from {OriginalPath}. Error: {Msg}", thumbPath, item.StoragePath, ex.Message);

            // Always try to find a source image to generate the thumbnail from.
            // If it's a video, the scraper downloaded the thumbnail with a .jpg extension instead of .mp4.
            string sourcePath = item.StoragePath;
            if (item.MediaType == 2 || sourcePath.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase) || sourcePath.EndsWith(".mov", StringComparison.OrdinalIgnoreCase))
            {
                sourcePath = sourcePath.Replace("_full.mp4", ".jpg", StringComparison.OrdinalIgnoreCase)
                                       .Replace("_full.mov", ".jpg", StringComparison.OrdinalIgnoreCase)
                                       .Replace("_child.mp4", ".jpg", StringComparison.OrdinalIgnoreCase)
                                       .Replace("_child.mov", ".jpg", StringComparison.OrdinalIgnoreCase)
                                       .Replace(".mp4", ".jpg", StringComparison.OrdinalIgnoreCase)
                                       .Replace(".mov", ".jpg", StringComparison.OrdinalIgnoreCase);
            }

            Stream rawStream;
            try
            {
                rawStream = await _storageService.GetFileAsync(sourcePath);
            }
            catch (Exception primaryEx)
            {
                if (sourcePath.StartsWith("instagram/", StringComparison.OrdinalIgnoreCase))
                {
                    string fallbackPath = "product/" + sourcePath.Substring("instagram/".Length);
                    _logger.LogInformation("Source path {SourcePath} failed: {Msg}. Retrying legacy fallback: {FallbackPath}", sourcePath, primaryEx.Message, fallbackPath);
                    try
                    {
                        rawStream = await _storageService.GetFileAsync(fallbackPath);
                        sourcePath = fallbackPath;
                    }
                    catch (Exception fallbackEx)
                    {
                        _logger.LogError(fallbackEx, "Fallback path also failed: {FallbackPath}", fallbackPath);
                        throw primaryEx;
                    }
                }
                else
                {
                    throw;
                }
            }

            try {
                using (rawStream)
                using (var imageObj = await Image.LoadAsync(rawStream))
                {
                    var (width, height) = MediaConstants.ThumbnailSpecs.Presets[spec];

                    imageObj.Mutate(x => x.Resize(new ResizeOptions {
                        Size = new Size(width, height),
                        Mode = ResizeMode.Max
                    }));

                    using var outMs = new MemoryStream();
                    await imageObj.SaveAsWebpAsync(outMs);
                    byte[] outData = outMs.ToArray();

                    // Proactively upload to MinIO
                    try {
                        outMs.Position = 0;
                        await _storageService.UploadThumbnailAsync(thumbPath, outMs, MediaConstants.Formats.WebP);
                    } catch (Exception uploadEx) { 
                        _logger.LogWarning("Failed to proactively upload generated thumbnail for {Path}: {Msg}", sourcePath, uploadEx.Message);
                    }

                    return File(outData, MediaConstants.Formats.WebP);
                }
            } catch (Exception genEx) {
                _logger.LogError(genEx, "Failed to generate thumbnail on-demand for {Path} from source {SourcePath}", item.StoragePath, sourcePath);
                
                // Final fallback: serve the original content if generation failed but file exists
                try {
                    Stream originalStream;
                    try
                    {
                        originalStream = await _storageService.GetFileAsync(sourcePath);
                    }
                    catch (Exception finalFallbackEx) when (sourcePath.StartsWith("instagram/", StringComparison.OrdinalIgnoreCase))
                    {
                        string legacyPath = "product/" + sourcePath.Substring("instagram/".Length);
                        originalStream = await _storageService.GetFileAsync(legacyPath);
                    }
                    return File(originalStream, "image/jpeg");
                } catch (Exception originalEx) {
                    _logger.LogError(originalEx, "Final fallback failed for {Path}", sourcePath);
                    return NotFound($"Thumbnail for spec '{spec}' missing and cannot be generated on-demand.");
                }
            }
        }
    }

    /// <summary>
    /// Serves a short GIF preview for video media.
    /// </summary>
    [HttpGet("{mediaId:guid}/preview")]
    public async Task<IActionResult> GetPreview(Guid mediaId)
    {
        try
        {
            var item = await _metadataService.GetMediaByIdAsync(mediaId);
            
            if (item == null || item.MediaType != 2) return NotFound("Video media not found.");
            if (string.IsNullOrEmpty(item.PreviewPath)) return NotFound("Preview GIF not yet generated.");

            Stream previewStream;
            try
            {
                previewStream = await _storageService.GetFileAsync(item.PreviewPath);
            }
            catch (Exception ex) when (item.PreviewPath.StartsWith("instagram/", StringComparison.OrdinalIgnoreCase))
            {
                string legacyPath = "product/" + item.PreviewPath.Substring("instagram/".Length);
                _logger.LogWarning("Failed to fetch preview from {OriginalPath}. Retrying with legacy 'product/' bucket suffix. Error: {Msg}", item.PreviewPath, ex.Message);
                try
                {
                    previewStream = await _storageService.GetFileAsync(legacyPath);
                }
                catch
                {
                    throw;
                }
            }

            using var streamToDispose = previewStream;
            using var ms = new MemoryStream();
            await previewStream.CopyToAsync(ms);
            byte[] data = ms.ToArray();

            var allSettings = await _settings.GetAllAsync();
            var expirySetting = allSettings.FirstOrDefault(s => s.Key == "Media:CacheExpiryHours")?.Value;
            int expiryHours = int.TryParse(expirySetting, out var h) ? h : 6;
            int maxAgeSeconds = expiryHours * 3600;

            Response.Headers.Append("Cache-Control", $"public,max-age={maxAgeSeconds}"); // Dynamic for previews
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
    [HttpGet("{mediaId:guid}/raw")]
    public async Task<IActionResult> GetRawMedia(Guid mediaId, CancellationToken ct)
    {
        try
        {
            var item = await _metadataService.GetMediaByIdAsync(mediaId);
            if (item == null) return NotFound();

            string contentType = item.MimeType ?? (item.MediaType == 1 ? "image/jpeg" : "video/mp4");
            bool isVideo = contentType.StartsWith("video", StringComparison.OrdinalIgnoreCase) || item.MediaType == 2;

            Stream stream;
            try
            {
                if (isVideo)
                {
                    long length = await _storageService.GetFileLengthAsync(item.StoragePath);
                    stream = new MinioSeekableStream(_storageService, item.StoragePath, length);
                }
                else
                {
                    stream = await _storageService.GetFileAsync(item.StoragePath);
                }
            }
            catch (Exception ex) when (item.StoragePath.StartsWith("instagram/", StringComparison.OrdinalIgnoreCase))
            {
                string legacyPath = "product/" + item.StoragePath.Substring("instagram/".Length);
                _logger.LogWarning("Failed to fetch raw media from {OriginalPath}. Retrying with legacy 'product/' bucket suffix. Error: {Msg}", item.StoragePath, ex.Message);
                try
                {
                    if (isVideo)
                    {
                        long length = await _storageService.GetFileLengthAsync(legacyPath);
                        stream = new MinioSeekableStream(_storageService, legacyPath, length);
                    }
                    else
                    {
                        stream = await _storageService.GetFileAsync(legacyPath);
                    }
                }
                catch
                {
                    throw;
                }
            }
            
            var allSettings = await _settings.GetAllAsync();
            var expirySetting = allSettings.FirstOrDefault(s => s.Key == "Media:CacheExpiryHours")?.Value;
            int expiryHours = int.TryParse(expirySetting, out var h) ? h : 6;
            int maxAgeSeconds = expiryHours * 3600;

            Response.Headers.Append("Cache-Control", $"public,max-age={maxAgeSeconds}"); // Dynamic for raw media
            return File(stream, contentType, enableRangeProcessing: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving raw media for {MediaId}", mediaId);
            return StatusCode(500);
        }
    }

    /// <summary>
    /// Deletes a media item and all its associated thumbnails.
    /// </summary>
    [HttpDelete("{mediaId:guid}")]
    public async Task<IActionResult> DeleteMedia(Guid mediaId, CancellationToken ct)
    {
        try
        {
            var item = await _metadataService.GetMediaByIdAsync(mediaId);
            if (item == null) return NotFound();

            var evt = new ImageDeletionRequestedEvent
            {
                EventId = Guid.NewGuid(),
                EventType = EventTypes.ImageDeletionRequested,
                EventVersion = "1.0",
                Timestamp = DateTime.UtcNow,
                TenantId = "SINGLE_TENANT",
                Data = new ImageDeletionData {
                    ImageId = mediaId,
                    StoragePath = item.StoragePath,
                    DeleteThumbnails = true,
                    Reason = "user_requested_deletion"
                }
            };

            var producer = HttpContext.RequestServices.GetService<IProducer<string, string>>();
            if (producer != null)
            {
                await producer.ProduceAsync(KafkaTopics.ImageMaintenance, new Message<string, string> {
                    Key = mediaId.ToString(),
                    Value = JsonSerializer.Serialize(evt)
                });
            }

            return Accepted(new { message = "Deletion request queued." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting media {MediaId}", mediaId);
            return StatusCode(500);
        }
    }
}
