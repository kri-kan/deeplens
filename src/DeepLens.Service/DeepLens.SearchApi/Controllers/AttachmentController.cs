using Microsoft.AspNetCore.Mvc;
using DeepLens.SearchApi.Services;
using DeepLens.Infrastructure.Services;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AttachmentController : ControllerBase
{
    private readonly IAttachmentService _attachmentService;
    private readonly IStorageService _storageService;

    public AttachmentController(IAttachmentService attachmentService, IStorageService storageService)
    {
        _attachmentService = attachmentService;
        _storageService = storageService;
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
            var stream = await _storageService.GetFileAsync(path);
            // Rough mapping of content type based on extension
            string contentType = path.EndsWith(".webp") ? "image/webp" : 
                                path.EndsWith(".png") ? "image/png" : "image/jpeg";
            
            return File(stream, contentType);
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
