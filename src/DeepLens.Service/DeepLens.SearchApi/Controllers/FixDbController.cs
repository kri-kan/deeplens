using Microsoft.AspNetCore.Mvc;
using Dapper;
using Npgsql;

namespace DeepLens.SearchApi.Controllers;

/// <summary>
/// Utility to fix database schema. Single-tenant version.
/// </summary>
[ApiController]
[Route("api/test/fix-db")]
public class FixDbController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public FixDbController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> Fix()
    {
        var connString = _configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrEmpty(connString)) return BadRequest("DefaultConnection not found");
        
        var results = new List<string>();

        try 
        {
            using var conn = new NpgsqlConnection(connString);
            await conn.OpenAsync();
            
            await conn.ExecuteAsync("ALTER TABLE vendor_listings ADD COLUMN IF NOT EXISTS shipping_info VARCHAR(50) DEFAULT 'plus shipping'");
            
            // Migrate images to media
            await conn.ExecuteAsync(@"
                DO $$ 
                BEGIN
                    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'images') THEN
                        ALTER TABLE images RENAME TO media;
                        ALTER INDEX IF EXISTS idx_images_phash RENAME TO idx_media_phash;
                    END IF;
                    
                    -- Add video columns
                    ALTER TABLE media ADD COLUMN IF NOT EXISTS media_type SMALLINT DEFAULT 1;
                    ALTER TABLE media ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC;
                    ALTER TABLE media ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(500);
                    ALTER TABLE media ADD COLUMN IF NOT EXISTS preview_path VARCHAR(500);
                    
                    -- Deletion queue
                    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'image_deletion_queue') THEN
                        ALTER TABLE image_deletion_queue RENAME TO media_deletion_queue;
                        ALTER TABLE media_deletion_queue RENAME COLUMN image_id TO media_id;
                    END IF;
                END $$;");

            results.Add($"Success for database");
        }
        catch (Exception ex)
        {
            results.Add($"Failed: {ex.Message}");
        }

        return Ok(results);
    }
}
