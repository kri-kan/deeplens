using Microsoft.AspNetCore.Mvc;
using DeepLens.SearchApi.Services;
using DeepLens.Infrastructure.Services;
using DeepLens.Application.Abstractions.Services;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AttachmentController : ControllerBase
{
    private readonly IAttachmentService _attachmentService;
    private readonly IStorageService _storageService;
    private readonly IAppSettingsService _settings;

    public AttachmentController(IAttachmentService attachmentService, IStorageService storageService, IAppSettingsService settings)
    {
        _attachmentService = attachmentService;
        _storageService = storageService;
        _settings = settings;
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

        try
        {
            string contentType = path.EndsWith(".webp") ? "image/webp" : 
                                path.EndsWith(".png") ? "image/png" : 
                                path.EndsWith(".mp4") ? "video/mp4" :
                                path.EndsWith(".mov") ? "video/quicktime" : "image/jpeg";

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
        catch (Exception)
        {
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
