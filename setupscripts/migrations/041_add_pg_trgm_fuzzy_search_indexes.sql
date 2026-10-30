-- Migration: Add GIN Trigram indexes for fast typo-tolerant fuzzy search
-- Database: deeplens_platform & deeplens_store

-- Ensure pg_trgm extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- deeplens_platform indexes:
CREATE INDEX IF NOT EXISTS idx_products_title_trgm ON products USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm ON products USING gin (base_sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_desc_trgm ON products USING gin (description gin_trgm_ops);

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'competitor_videos') THEN
        CREATE INDEX IF NOT EXISTS idx_competitor_videos_desc_trgm ON competitor_videos USING gin (description gin_trgm_ops);
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'competitor_watchlist') THEN
        CREATE INDEX IF NOT EXISTS idx_competitor_watchlist_username_trgm ON competitor_watchlist USING gin (username gin_trgm_ops);
        CREATE INDEX IF NOT EXISTS idx_competitor_watchlist_display_name_trgm ON competitor_watchlist USING gin (display_name gin_trgm_ops);
    END IF;
END $$;
