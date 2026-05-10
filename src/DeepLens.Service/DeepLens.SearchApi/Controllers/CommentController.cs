using Microsoft.AspNetCore.Mvc;
using DeepLens.SearchApi.Services;
using DeepLens.SearchApi.DTOs;
using DeepLens.Domain.Enums;

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
        if (!Enum.TryParse<CommentEntityType>(entityType, true, out var type))
            return BadRequest(new { message = "Invalid entity type" });

        var comments = await _commentService.GetCommentsAsync(type, entityId);
        return Ok(comments);
    }

    [HttpPost]
    public async Task<IActionResult> AddComment([FromBody] CommentCreateDto dto)
    {
        if (string.IsNullOrEmpty(dto.Content) && (dto.AttachmentIds == null || dto.AttachmentIds.Length == 0))
            return BadRequest(new { message = "A comment must have content or at least one attachment." });

        var guids = dto.AttachmentIds ?? new Guid[0];

        var commentId = await _commentService.AddCommentAsync(dto.EntityType, dto.EntityId, dto.Content, guids.ToArray());
        return Ok(new { id = commentId, status = "created" });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateComment(Guid id, [FromBody] CommentUpdateDto dto)
    {
        if (string.IsNullOrEmpty(dto.Content) && (dto.AttachmentIds == null || dto.AttachmentIds.Length == 0))
            return BadRequest(new { message = "Content or attachments cannot be empty." });

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
