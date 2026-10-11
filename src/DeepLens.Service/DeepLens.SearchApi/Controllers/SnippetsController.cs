using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Snippets;
using Microsoft.AspNetCore.Mvc;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/snippets")]
public class SnippetsController : ControllerBase
{
    private readonly IDbConnectionFactory _dbConnectionFactory;
    private readonly ILogger<SnippetsController> _logger;

    public SnippetsController(IDbConnectionFactory dbConnectionFactory, ILogger<SnippetsController> logger)
    {
        _dbConnectionFactory = dbConnectionFactory;
        _logger = logger;
    }

    /// <summary>
    /// List all active snippets ordered by sort_order
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<SnippetDto>>> GetAll()
    {
        try
        {
            using var conn = await _dbConnectionFactory.CreateConnectionAsync();
            var sql = @"
                SELECT 
                    id, 
                    label, 
                    emoji, 
                    color, 
                    content, 
                    sort_order AS SortOrder, 
                    is_active AS IsActive,
                    EXTRACT(EPOCH FROM created_at) * 1000 AS CreatedAtEpoch,
                    EXTRACT(EPOCH FROM updated_at) * 1000 AS UpdatedAtEpoch
                FROM public.copy_snippets
                WHERE is_active = TRUE
                ORDER BY sort_order ASC, created_at ASC";

            var rows = await conn.QueryAsync<dynamic>(sql);
            var result = rows.Select(r => new SnippetDto
            {
                Id = (string)r.id,
                Label = (string)r.label,
                Emoji = (string)r.emoji,
                Color = (string)r.color,
                Content = (string)r.content,
                SortOrder = (int)r.sortorder,
                IsActive = (bool)r.isactive,
                CreatedAt = r.createdatepoch != null ? (long)Convert.ToDouble(r.createdatepoch) : DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                UpdatedAt = r.updatedatepoch != null ? (long?)Convert.ToDouble(r.updatedatepoch) : null
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve copy snippets");
            return StatusCode(500, new { message = "Failed to retrieve snippets", error = ex.Message });
        }
    }

    /// <summary>
    /// Create or update a snippet
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SnippetDto>> Upsert([FromBody] UpsertSnippetRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Label))
        {
            return BadRequest(new { message = "Snippet label is required" });
        }

        try
        {
            using var conn = await _dbConnectionFactory.CreateConnectionAsync();

            var snippetId = !string.IsNullOrWhiteSpace(request.Id)
                ? request.Id.Trim()
                : Guid.NewGuid().ToString("N");

            // Calculate next sort_order if not provided
            var sortOrder = request.SortOrder;
            if (!sortOrder.HasValue)
            {
                var maxSort = await conn.ExecuteScalarAsync<int?>(
                    "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM public.copy_snippets WHERE is_active = TRUE");
                sortOrder = maxSort ?? 0;
            }

            var upsertSql = @"
                INSERT INTO public.copy_snippets (
                    id, label, emoji, color, content, sort_order, is_active, created_at, updated_at
                )
                VALUES (
                    @Id, @Label, @Emoji, @Color, @Content, @SortOrder, TRUE, NOW(), NOW()
                )
                ON CONFLICT (id) DO UPDATE
                SET 
                    label = EXCLUDED.label,
                    emoji = EXCLUDED.emoji,
                    color = EXCLUDED.color,
                    content = EXCLUDED.content,
                    sort_order = COALESCE(@SortOrder, public.copy_snippets.sort_order),
                    is_active = TRUE,
                    updated_at = NOW()
                RETURNING 
                    id, 
                    label, 
                    emoji, 
                    color, 
                    content, 
                    sort_order AS SortOrder, 
                    is_active AS IsActive,
                    EXTRACT(EPOCH FROM created_at) * 1000 AS CreatedAtEpoch,
                    EXTRACT(EPOCH FROM updated_at) * 1000 AS UpdatedAtEpoch";

            var row = await conn.QuerySingleAsync<dynamic>(upsertSql, new
            {
                Id = snippetId,
                Label = request.Label.Trim(),
                Emoji = string.IsNullOrWhiteSpace(request.Emoji) ? "📝" : request.Emoji.Trim(),
                Color = string.IsNullOrWhiteSpace(request.Color) ? "#10B981" : request.Color.Trim(),
                Content = request.Content ?? string.Empty,
                SortOrder = sortOrder.Value
            });

            var result = new SnippetDto
            {
                Id = (string)row.id,
                Label = (string)row.label,
                Emoji = (string)row.emoji,
                Color = (string)row.color,
                Content = (string)row.content,
                SortOrder = (int)row.sortorder,
                IsActive = (bool)row.isactive,
                CreatedAt = row.createdatepoch != null ? (long)Convert.ToDouble(row.createdatepoch) : DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                UpdatedAt = row.updatedatepoch != null ? (long?)Convert.ToDouble(row.updatedatepoch) : null
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upsert copy snippet {SnippetId}", request.Id);
            return StatusCode(500, new { message = "Failed to upsert snippet", error = ex.Message });
        }
    }

    /// <summary>
    /// Soft delete or remove a snippet by ID
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return BadRequest(new { message = "Snippet ID is required" });

        try
        {
            using var conn = await _dbConnectionFactory.CreateConnectionAsync();
            var rows = await conn.ExecuteAsync(
                "UPDATE public.copy_snippets SET is_active = FALSE, updated_at = NOW() WHERE id = @Id",
                new { Id = id.Trim() });

            if (rows == 0)
                return NotFound(new { message = "Snippet not found" });

            return Ok(new { success = true, id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete snippet {SnippetId}", id);
            return StatusCode(500, new { message = "Failed to delete snippet", error = ex.Message });
        }
    }

    /// <summary>
    /// Reorder snippets according to the given array of IDs
    /// </summary>
    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder([FromBody] ReorderSnippetsRequest request)
    {
        if (request?.OrderedIds == null || request.OrderedIds.Count == 0)
            return BadRequest(new { message = "OrderedIds array is required" });

        try
        {
            using var conn = await _dbConnectionFactory.CreateConnectionAsync();
            using var trans = conn.BeginTransaction();

            for (int i = 0; i < request.OrderedIds.Count; i++)
            {
                await conn.ExecuteAsync(
                    "UPDATE public.copy_snippets SET sort_order = @SortOrder, updated_at = NOW() WHERE id = @Id",
                    new { SortOrder = i, Id = request.OrderedIds[i].Trim() },
                    transaction: trans);
            }

            trans.Commit();
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reorder snippets");
            return StatusCode(500, new { message = "Failed to reorder snippets", error = ex.Message });
        }
    }
}
