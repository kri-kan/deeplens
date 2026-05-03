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
                DECLARE
                    r RECORD;
                    next_seq BIGINT;
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

                    -- Product Merges Audit
                    CREATE TABLE IF NOT EXISTS product_merges (
                        source_id UUID PRIMARY KEY,
                        target_id UUID NOT NULL,
                        metadata JSONB,
                        merged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );

                    -- Instagram to Product Semantic Mapping
                    CREATE TABLE IF NOT EXISTS instagram_product_links (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        post_id UUID NOT NULL,
                        product_id UUID NOT NULL,
                        link_type TEXT NOT NULL DEFAULT 'is',
                        metadata JSONB,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE UNIQUE INDEX IF NOT EXISTS idx_insta_post_link_is ON instagram_product_links (post_id) WHERE (link_type = 'is');

                    -- Migrate Legacy SKUs to VF hex convention
                    IF EXISTS (SELECT 1 FROM products WHERE base_sku NOT LIKE 'VF%' OR sequence_id = 0 OR sequence_id IS NULL) THEN
                        FOR r IN SELECT id FROM products WHERE base_sku NOT LIKE 'VF%' OR sequence_id = 0 OR sequence_id IS NULL LOOP
                            SELECT nextval('productid_id_seq') INTO next_seq;
                            UPDATE products 
                            SET sequence_id = next_seq, 
                                base_sku = 'VF' || UPPER(lpad(to_hex(next_seq), 3, '0'))
                            WHERE id = r.id;
                        END LOOP;
                    END IF;

                    -- Communication Broadcast Tables
                    CREATE TABLE IF NOT EXISTS comm_broadcast_channels (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        name TEXT NOT NULL,
                        description TEXT,
                        channel_type TEXT NOT NULL,
                        metadata JSONB,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS comm_broadcast_purposes (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        purpose_key TEXT NOT NULL,
                        channel_id UUID NOT NULL REFERENCES comm_broadcast_channels(id) ON DELETE CASCADE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_comm_broadcast_purposes_key ON comm_broadcast_purposes(purpose_key);

                    -- Universal Product Description
                    ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
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
