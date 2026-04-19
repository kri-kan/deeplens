using Microsoft.AspNetCore.Mvc;
using DeepLens.SearchApi.Services;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class CommentController : ControllerBase
{
    private readonly ICommentService _commentService;

    public CommentController(ICommentService commentService)
    {
        _commentService = commentService;
    }

    [HttpGet("{entityType}/{entityId}")]
    public async Task<IActionResult> GetComments(string entityType, string entityId)
    {
        var comments = await _commentService.GetCommentsAsync(entityType, entityId);
        return Ok(comments);
    }

    [HttpPost]
    public async Task<IActionResult> AddComment([FromBody] System.Text.Json.JsonElement json)
    {
        var raw = json.GetRawText();
        Console.WriteLine($"[CommentController] RAW JSON: {raw}");
        
        try
        {
            var dto = System.Text.Json.JsonSerializer.Deserialize<CommentCreateDto>(raw, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            if (dto == null || (string.IsNullOrEmpty(dto.Content) && (dto.AttachmentIds == null || dto.AttachmentIds.Length == 0)))
            {
                 return BadRequest(new { message = $"Missing content/attachments. Raw: {raw}" });
            }

            var guids = new List<Guid>();
            if (dto.AttachmentIds != null)
            {
                foreach (var idStr in dto.AttachmentIds)
                {
                    if (Guid.TryParse(idStr, out var g)) guids.Add(g);
                }
            }

            var commentId = await _commentService.AddCommentAsync(dto.EntityType, dto.EntityId, dto.Content, guids.ToArray());
            return Ok(new { id = commentId, status = "created" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CommentController] DESERIALIZATION FAILED: {ex.Message}");
            return BadRequest(new { message = $"Payload error: {ex.Message}", raw = raw });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateComment(Guid id, [FromBody] CommentUpdateDto dto)
    {
        if (string.IsNullOrEmpty(dto.Content) && (dto.AttachmentIds == null || dto.AttachmentIds.Length == 0))
            return BadRequest("Content or attachments cannot be empty");

        var success = await _commentService.UpdateCommentAsync(id, dto.Content, dto.AttachmentIds);
        if (!success) return NotFound();
        return Ok(new { status = "updated" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteComment(Guid id)
    {
        var success = await _commentService.DeleteCommentAsync(id);
        if (!success) return NotFound();
        return Ok(new { status = "deleted" });
    }
}

public class CommentCreateDto
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string[]? AttachmentIds { get; set; }
}

public class CommentUpdateDto
{
    public string Content { get; set; } = string.Empty;
    public Guid[]? AttachmentIds { get; set; }
}
