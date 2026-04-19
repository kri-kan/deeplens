-- Instagram Profile Cache
-- =====================================================
-- Stores cached results for any Instagram profile scraped to avoid redundant scraper calls
-- Retention: Profiles are considered fresh if scraped within the last 3 months (90 days).
-- =====================================================

CREATE TABLE IF NOT EXISTS instagram_profile_cache (
    username VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    full_name TEXT,
    biography TEXT,
    followers_count INTEGER,
    following_count INTEGER,
    posts_count INTEGER,
    profile_pic_url TEXT,
    external_url TEXT,
    is_private BOOLEAN,
    is_verified BOOLEAN,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    raw_json JSONB -- Stores the full scraped data for future flexibility
);

CREATE INDEX IF NOT EXISTS idx_insta_cache_scraped_at ON instagram_profile_cache(scraped_at);

-- Optional: cleanup function for old cache entries
CREATE OR REPLACE FUNCTION public.cleanup_instagram_cache(p_days integer DEFAULT 7) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM instagram_profile_cache
    WHERE scraped_at < NOW() - (p_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;
