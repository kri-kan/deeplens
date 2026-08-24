using Microsoft.AspNetCore.Mvc;
using DeepLens.SearchApi.Services;
using DeepLens.Infrastructure.Services;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Application.Abstractions.Data;
using Microsoft.Extensions.Logging;
using Dapper;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AttachmentController : ControllerBase
{
    private readonly IAttachmentService _attachmentService;
    private readonly IStorageService _storageService;
    private readonly IAppSettingsService _settings;
    private readonly IInstagramMediaService _instaMediaService;
    private readonly IDbConnectionFactory _db;
    private readonly ILogger<AttachmentController> _logger;

    public AttachmentController(
        IAttachmentService attachmentService, 
        IStorageService storageService, 
        IAppSettingsService settings,
        IInstagramMediaService instaMediaService,
        IDbConnectionFactory db,
        ILogger<AttachmentController> logger)
    {
        _attachmentService = attachmentService;
        _storageService = storageService;
        _settings = settings;
        _instaMediaService = instaMediaService;
        _db = db;
        _logger = logger;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromQuery] string? entityType = null, [FromQuery] string? entityId = null, [FromQuery] string? tag = null)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        try
        {
            using var stream = file.OpenReadStream();
            var attachmentId = await _attachmentService.UploadAttachmentAsync(stream, file.FileName, file.ContentType, entityType, entityId, tag);

            if (!string.IsNullOrEmpty(entityType) && !string.IsNullOrEmpty(entityId))
            {
                await _attachmentService.LinkAttachmentToEntityAsync(attachmentId, entityType, entityId, tag);
            }

            return Ok(new 
            { 
                id = attachmentId, 
                fileName = file.FileName,
                status = "uploaded" 
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Upload failed", detail = ex.Message });
        }
    }

    [HttpGet("download")]
    public async Task<IActionResult> Download([FromQuery] string path)
    {
        if (string.IsNullOrEmpty(path)) return BadRequest("Path is required");

        string contentType = path.EndsWith(".webp") ? "image/webp" : 
                            path.EndsWith(".png") ? "image/png" : 
                            path.EndsWith(".mp4") ? "video/mp4" :
                            path.EndsWith(".mov") ? "video/quicktime" : "image/jpeg";

        try
        {
            bool exists = await _storageService.FileExistsAsync(path);

            // On-demand fallback: If physical file missing in MinIO for an instagram path, fetch from Meta Graph API
            if (!exists && (path.StartsWith("instagram/") || path.Contains("/instagram/") || path.StartsWith("product/")))
            {
                _logger.LogInformation("File not found in storage for path {Path}. Triggering on-demand download fallback...", path);
                var ct = HttpContext.RequestAborted;

                using var conn = await _db.CreateConnectionAsync();
                
                // 1. Check competitor_videos by storage_path
                var postId = await conn.ExecuteScalarAsync<Guid?>(new CommandDefinition(@"
                    SELECT id FROM competitor_videos WHERE storage_path = @path LIMIT 1",
                    new { path }, cancellationToken: ct));

                // 2. Check media table by storage_path
                if (!postId.HasValue)
                {
                    postId = await conn.ExecuteScalarAsync<Guid?>(new CommandDefinition(@"
                        SELECT ml.entity_id 
                        FROM media m
                        JOIN media_links ml ON m.id = ml.media_id
                        WHERE m.storage_path = @path AND ml.entity_type = 'competitor_video'
                        LIMIT 1", new { path }, cancellationToken: ct));
                }

                // 3. Check by platform_video_id extracted from filename
                if (!postId.HasValue)
                {
                    string filename = Path.GetFileNameWithoutExtension(path);
                    string rawId = filename.Replace("_full", "").Replace("_child", "");
                    
                    postId = await conn.ExecuteScalarAsync<Guid?>(new CommandDefinition(@"
                        SELECT id FROM competitor_videos WHERE platform_video_id = @rawId LIMIT 1",
                        new { rawId }, cancellationToken: ct));
                }

                if (postId.HasValue)
                {
                    _logger.LogInformation("Found post {PostId} for path {Path}. Invoking EnsureMediaDownloadedAsync...", postId.Value, path);
                    bool downloaded = await _instaMediaService.EnsureMediaDownloadedAsync(postId.Value, ct);
                    if (downloaded)
                    {
                        exists = await _storageService.FileExistsAsync(path);
                    }
                }
            }

            if (!exists)
            {
                return NotFound("File not found in storage.");
            }

            Stream stream;
            if (contentType.StartsWith("video/"))
            {
                long length = await _storageService.GetFileLengthAsync(path);
                stream = new MinioSeekableStream(_storageService, path, length);
            }
            else
            {
                stream = await _storageService.GetFileAsync(path);
            }
            
            // Add Cache-Control header for browser/app caching
            var allSettings = await _settings.GetAllAsync();
            var expirySetting = allSettings.FirstOrDefault(s => s.Key == "Media:CacheExpiryHours")?.Value;
            int expiryHours = int.TryParse(expirySetting, out var h) ? h : 6;
            int maxAgeSeconds = expiryHours * 3600;

            Response.Headers.Append("Cache-Control", $"public,max-age={maxAgeSeconds}");
            
            return File(stream, contentType, enableRangeProcessing: true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to download media for path {Path}", path);
            return NotFound("File not found in storage.");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _attachmentService.DeleteAttachmentAsync(id);
        if (result) return Ok();
        return NotFound();
    }
}
