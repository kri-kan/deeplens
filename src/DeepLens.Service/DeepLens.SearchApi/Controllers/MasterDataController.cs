using DeepLens.Application.Abstractions.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dapper;
using System;
using System.Threading.Tasks;
using System.Linq;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class MasterDataController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public MasterDataController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet("icons")]
    public IActionResult GetAvailableIcons()
    {
        var icons = new[]
        {
            new { id = "saree.svg", name = "Saree" },
            new { id = "dress.svg", name = "Dress" },
            new { id = "lehanga.svg", name = "Lehanga" },
            new { id = "kids.svg", name = "Kids" },
            new { id = "others.svg", name = "Others" }
        };
        return Ok(icons);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        using var conn = await _db.CreateConnectionAsync();
        var categories = await conn.QueryAsync(@"
            SELECT id, name, slug, icon_name AS ""iconName"", classification_keywords AS ""classificationKeywords""
            FROM categories 
            ORDER BY 
                CASE slug
                    WHEN 'saree' THEN 1
                    WHEN 'dress' THEN 2
                    WHEN 'lehanga' THEN 3
                    WHEN 'kids' THEN 4
                    WHEN 'general' THEN 5
                    ELSE 6
                END ASC");
        return Ok(categories);
    }

    [HttpPost("categories")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<IActionResult> UpsertCategory([FromBody] CategoryUpdateDto dto)
    {
        using var conn = await _db.CreateConnectionAsync();
        
        if (dto.Id.HasValue)
        {
            await conn.ExecuteAsync(@"
                UPDATE categories 
                SET name = @Name, slug = @Slug, icon_name = @IconName, classification_keywords = @ClassificationKeywords, updated_at = NOW() 
                WHERE id = @Id", 
                new { dto.Name, Slug = dto.Name.ToLower().Replace(" ", "-"), dto.IconName, dto.ClassificationKeywords, dto.Id });
        }
        else
        {
            await conn.ExecuteAsync(@"
                INSERT INTO categories (name, slug, icon_name, classification_keywords) 
                VALUES (@Name, @Slug, @IconName, @ClassificationKeywords)", 
                new { dto.Name, Slug = dto.Name.ToLower().Replace(" ", "-"), dto.IconName, dto.ClassificationKeywords });
        }
        
        return Ok();
    }

    [HttpDelete("categories/{id}")]
    [Authorize(Policy = "IngestPolicy")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        using var conn = await _db.CreateConnectionAsync();
        await conn.ExecuteAsync("DELETE FROM categories WHERE id = @id", new { id });
        return Ok();
    }

    public class CategoryUpdateDto
    {
        public Guid? Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? IconName { get; set; }
        public string[]? ClassificationKeywords { get; set; }
    }
}
