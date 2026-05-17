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

                    CREATE TABLE IF NOT EXISTS comm_purpose_steps (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        purpose_key TEXT NOT NULL REFERENCES comm_purposes(purpose_key) ON DELETE CASCADE,
                        step_number INT NOT NULL,
                        description TEXT NOT NULL,
                        action TEXT NOT NULL,
                        message_templates JSONB NOT NULL DEFAULT '[]'::jsonb,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE (purpose_key, step_number)
                    );

                    CREATE TABLE IF NOT EXISTS comm_purpose_customer_steps (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        purpose_key TEXT NOT NULL REFERENCES comm_purposes(purpose_key) ON DELETE CASCADE,
                        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                        step_id UUID NOT NULL REFERENCES comm_purpose_steps(id) ON DELETE CASCADE,
                        status TEXT NOT NULL DEFAULT 'new',
                        completed_at TIMESTAMP WITH TIME ZONE,
                        sent_message TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE (customer_id, step_id)
                    );

                    -- Universal Product Description
                    ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;

                    -- 1. Add customer mapping columns to instagram_accounts
                    ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
                    ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false NOT NULL;

                    -- 2. Drop NOT NULL constraint on platform_account_id to keep it blank (NULL) for manual entries
                    ALTER TABLE instagram_accounts ALTER COLUMN platform_account_id DROP NOT NULL;

                    -- 3. Create index for fast customer mapping retrieval
                    CREATE INDEX IF NOT EXISTS idx_instagram_accounts_customer_id ON instagram_accounts(customer_id);

                    -- 4. Constraint: At most one primary instagram account per customer
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_primary_ig ON instagram_accounts (customer_id) WHERE (is_primary = true AND customer_id IS NOT NULL);

                    -- 5. Create language master table
                    CREATE TABLE IF NOT EXISTS customer_languages_master (
                        code character varying(10) PRIMARY KEY,
                        name character varying(100) NOT NULL,
                        is_default boolean DEFAULT false NOT NULL
                    );

                    -- Prepopulate languages with exact locale codes and hybrid options
                    INSERT INTO customer_languages_master (code, name, is_default) VALUES
                    ('en-in', 'English', true),
                    ('te-in', 'Telugu', false),
                    ('hi-in', 'Hindi', false),
                    ('ta-in', 'Tamil', false),
                    ('ml-in', 'Malayalam', false),
                    ('kn-in', 'Kannada', false),
                    ('en-te', 'English & Telugu', false)
                    ON CONFLICT (code) DO NOTHING;

                    -- 6. Create customer language junction table
                    CREATE TABLE IF NOT EXISTS customer_languages (
                        customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                        language_code character varying(10) NOT NULL REFERENCES customer_languages_master(code) ON DELETE CASCADE,
                        CONSTRAINT customer_languages_pkey PRIMARY KEY (customer_id, language_code)
                    );

                    -- 7. Backfill existing customers' instagram handles to instagram_accounts
                    BEGIN
                        DECLARE
                            cust RECORD;
                            existing_acc_id UUID;
                        BEGIN
                            FOR cust IN SELECT id, instagram_id FROM customers WHERE instagram_id IS NOT NULL AND instagram_id <> '' LOOP
                                SELECT id INTO existing_acc_id FROM instagram_accounts WHERE LOWER(username) = LOWER(cust.instagram_id) LIMIT 1;
                                IF existing_acc_id IS NOT NULL THEN
                                    UPDATE instagram_accounts SET customer_id = cust.id, is_primary = true WHERE id = existing_acc_id;
                                ELSE
                                    INSERT INTO instagram_accounts (id, platform, platform_account_id, username, customer_id, is_primary)
                                    VALUES (gen_random_uuid(), 'INSTAGRAM', NULL, cust.instagram_id, cust.id, true);
                                END IF;
                            END LOOP;
                        END;
                    END;

                    -- 8. Referral code setup and backfill
                    CREATE SEQUENCE IF NOT EXISTS public.customer_referral_code_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
                    
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'referral_code') THEN
                        ALTER TABLE public.customers ADD COLUMN referral_code character varying(5);
                        
                        BEGIN
                            DECLARE
                                rcust RECORD;
                                new_code VARCHAR(5);
                            BEGIN
                                FOR rcust IN SELECT id FROM public.customers WHERE referral_code IS NULL ORDER BY customer_id ASC LOOP
                                    new_code := lpad(upper(to_hex(nextval('public.customer_referral_code_seq'))), 5, '0');
                                    UPDATE public.customers SET referral_code = new_code WHERE id = rcust.id;
                                END LOOP;
                            END;
                        END;
                        
                        ALTER TABLE public.customers ALTER COLUMN referral_code SET DEFAULT lpad(upper(to_hex(nextval('public.customer_referral_code_seq'))), 5, '0');
                        ALTER TABLE public.customers ALTER COLUMN referral_code SET NOT NULL;
                        ALTER TABLE public.customers ADD CONSTRAINT unique_customer_referral_code UNIQUE (referral_code);
                    END IF;

                    -- 9. Campaign variables table
                    CREATE TABLE IF NOT EXISTS comm_campaign_variables (
                        purpose_key TEXT NOT NULL REFERENCES comm_purposes(purpose_key) ON DELETE CASCADE,
                        variable_key TEXT NOT NULL,
                        variable_value TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (purpose_key, variable_key)
                    );
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
