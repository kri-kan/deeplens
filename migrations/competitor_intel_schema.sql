-- =====================================================
-- Competitor Intelligence Module - Complete Database Schema
-- =====================================================
-- Version: 2.0 (Event-Driven Architecture)
-- Date: 2026-01-19
-- Architecture: C# Orchestrator + Python Workers + Kafka
-- =====================================================
-- Features:
-- - Watchlist management (Instagram/YouTube competitors)
-- - Video/post storage with media download
-- - Time-series engagement tracking (early/mature/archive phases)
-- - Follower count tracking (twice daily, counts-only)
-- - Account session management (pool rotation)
-- - SKU linking (manual + AI suggestions)
-- - Job tracking and monitoring
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For similarity searches

-- =====================================================
-- 1. WATCHLIST MANAGEMENT
-- =====================================================

-- Table: competitor_watchlist
-- Stores the list of competitor accounts/channels to monitor
CREATE TABLE IF NOT EXISTS competitor_watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('instagram', 'youtube')),
    username VARCHAR(255) NOT NULL,  -- Instagram username or YouTube handle (@channel)
    platform_id VARCHAR(255),  -- Instagram numeric user_id or YouTube channel UCxxxx
    display_name VARCHAR(255),  -- Full name or channel title
    profile_pic_url TEXT,
    bio TEXT,
    tags TEXT[],  -- Categories: [sarees, premium, tutorials, etc.]
    enabled BOOLEAN DEFAULT true,
    
    -- Current metrics (updated from follower snapshots)
    follower_count INTEGER,
    following_count INTEGER,
    post_count INTEGER,
    
    -- Scraping metadata
    last_scraped_at TIMESTAMPTZ,
    scrape_failures_count INT DEFAULT 0,  -- Consecutive failures
    
    -- Follower tracking metadata
    last_follower_sync_at TIMESTAMPTZ,
    follower_count_at_last_sync INTEGER,  -- For growth-based triggers
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(platform, username)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_platform ON competitor_watchlist(platform);
CREATE INDEX IF NOT EXISTS idx_watchlist_enabled ON competitor_watchlist(enabled, platform);
CREATE INDEX IF NOT EXISTS idx_watchlist_tags ON competitor_watchlist USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_watchlist_follower_count ON competitor_watchlist(follower_count DESC) WHERE enabled = true;

COMMENT ON TABLE competitor_watchlist IS 'Competitor Instagram accounts and YouTube channels to monitor';
COMMENT ON COLUMN competitor_watchlist.follower_count IS 'Latest follower count (updated from follower_snapshots)';

-- =====================================================
-- 2. SCRAPER ACCOUNT SESSIONS (Account Pool)
-- =====================================================

-- Table: scraper_sessions
-- Stores Instagram/YouTube account credentials and session data
CREATE TABLE IF NOT EXISTS scraper_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('instagram', 'youtube')),
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    
    -- Session data (encrypted in production)
    session_cookies TEXT,  -- Base64 encoded session cookies
    session_metadata JSONB,  -- Browser fingerprint, etc.
    api_token TEXT,  -- For platforms with API access
    
    -- Health monitoring
    last_used_at TIMESTAMPTZ,
    last_health_check_at TIMESTAMPTZ,
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (
        health_status IN ('healthy', 'degraded', 'down', 'banned', 'unknown')
    ),
    consecutive_failures INTEGER DEFAULT 0,
    total_requests_today INTEGER DEFAULT 0,  -- Rate limiting
    
    -- Cooldown (anti-detection)
    on_cooldown BOOLEAN DEFAULT false,
    cooldown_until TIMESTAMPTZ,
    
    -- Rotation metadata
    rotation_strategy VARCHAR(20) DEFAULT 'round_robin' CHECK (
        rotation_strategy IN ('round_robin', 'random', 'least_used')
    ),
    usage_count INTEGER DEFAULT 0,  -- For round-robin
    
    -- Status
    enabled BOOLEAN DEFAULT true,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(platform, username)
);

CREATE INDEX IF NOT EXISTS idx_sessions_platform_enabled ON scraper_sessions(platform, enabled);
CREATE INDEX IF NOT EXISTS idx_sessions_health ON scraper_sessions(health_status, last_health_check_at);
CREATE INDEX IF NOT EXISTS idx_sessions_cooldown ON scraper_sessions(on_cooldown, cooldown_until) WHERE on_cooldown = true;

COMMENT ON TABLE scraper_sessions IS 'Account pool for Instagram/YouTube scraping sessions';
COMMENT ON COLUMN scraper_sessions.session_cookies IS 'Encrypted session data for maintaining authenticated sessions';

-- =====================================================
-- 3. VIDEOS/POSTS STORAGE
-- =====================================================

-- Table: competitor_videos
-- Stores all scraped Instagram posts and YouTube videos
CREATE TABLE IF NOT EXISTS competitor_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES competitor_watchlist(id) ON DELETE CASCADE,
    
    -- Platform identifiers
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('instagram', 'youtube')),
    platform_video_id VARCHAR(255) NOT NULL,  -- Instagram shortcode or YouTube video ID
    url TEXT NOT NULL,  -- Direct URL to the post/video
    
    -- Basic metadata
    title TEXT,
    description TEXT,
    posted_at TIMESTAMPTZ NOT NULL,
    
    -- Latest engagement metrics (updated from engagement_snapshots)
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    repost_count BIGINT DEFAULT 0,  -- For platforms that support reposts
    
    -- Media information
    media_type VARCHAR(20),  -- 'video', 'image', 'carousel', 'short', 'reel'
    thumbnail_url TEXT,  -- MinIO path: competitor-intel/thumbnails/{id}.jpg
    media_url TEXT,  -- MinIO path: competitor-intel/media/{id}.{ext}
    media_urls TEXT[],  -- For carousels: multiple media files
    duration_seconds INT,  -- For videos
    width INT,
    height INT,
    file_size_bytes BIGINT,
    
    -- Platform-specific data (Instagram: hashtags, YouTube: tags, etc.)
    hashtags TEXT[],
    mentions TEXT[],
    location VARCHAR(255),
    is_reel BOOLEAN,  -- Instagram
    is_short BOOLEAN,  -- YouTube
    category VARCHAR(100),  -- YouTube
    raw_metadata JSONB,  -- Full JSON dump from platform
    
    -- SKU Tagging (Integration with DeepLens SKU system)
    tagged_sku_ids UUID[],  -- Manually tagged SKUs
    ai_suggested_sku_ids UUID[],  -- AI-generated suggestions
    tagging_confidence JSONB,  -- {"sku_uuid": 0.85, ...}
    tagging_notes TEXT,  -- User notes
    
    -- Download status
    download_status VARCHAR(20) DEFAULT 'pending' CHECK (
        download_status IN ('pending', 'downloading', 'downloaded', 'failed', 'skipped')
    ),
    download_error TEXT,
    downloaded_at TIMESTAMPTZ,
    
    -- Engagement tracking phase (for time-series)
    tracking_phase VARCHAR(20) DEFAULT 'early' CHECK (
        tracking_phase IN ('early', 'mature', 'archive', 'stopped')
    ),
    last_engagement_snapshot_at TIMESTAMPTZ,
    
    -- Timestamps
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(platform, platform_video_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_videos_watchlist ON competitor_videos(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_videos_posted_at ON competitor_videos(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_platform_posted ON competitor_videos(platform, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_platform_id ON competitor_videos(platform, platform_video_id);
CREATE INDEX IF NOT EXISTS idx_videos_media_type ON competitor_videos(media_type);
CREATE INDEX IF NOT EXISTS idx_videos_tracking_phase ON competitor_videos(tracking_phase, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_hashtags ON competitor_videos USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_videos_tagged_skus ON competitor_videos USING GIN(tagged_sku_ids);
CREATE INDEX IF NOT EXISTS idx_videos_ai_skus ON competitor_videos USING GIN(ai_suggested_sku_ids);
CREATE INDEX IF NOT EXISTS idx_videos_metadata ON competitor_videos USING GIN(raw_metadata);

COMMENT ON TABLE competitor_videos IS 'All scraped Instagram posts and YouTube videos from competitors';
COMMENT ON COLUMN competitor_videos.tracking_phase IS 'Engagement tracking phase: early (0-3d), mature (4-30d), archive (30d+)';

-- =====================================================
-- 4. ENGAGEMENT TRACKING (Time-Series)
-- =====================================================

-- Table: engagement_snapshots
-- Stores time-series engagement metrics for performance graphs
CREATE TABLE IF NOT EXISTS engagement_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES competitor_videos(id) ON DELETE CASCADE,
    
    -- Metrics at snapshot time (counts only, no individual data)
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    repost_count INTEGER DEFAULT 0,
    
    -- Video age when snapshot taken
    video_age_hours INTEGER,  -- Hours since posted_at
    
    -- Tracking metadata
    tracking_phase VARCHAR(20) CHECK (tracking_phase IN ('early', 'mature', 'archive')),
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_video_snapshot UNIQUE(video_id, snapshot_at)
);

-- Indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_snapshots_video_time ON engagement_snapshots(video_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_time ON engagement_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_phase ON engagement_snapshots(tracking_phase, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_age ON engagement_snapshots(video_age_hours);

-- View: Engagement growth rate
CREATE OR REPLACE VIEW vw_engagement_growth AS
WITH snapshot_pairs AS (
    SELECT
        video_id,
        view_count,
        like_count,
        comment_count,
        snapshot_at,
        LAG(view_count) OVER (PARTITION BY video_id ORDER BY snapshot_at) as prev_views,
        LAG(like_count) OVER (PARTITION BY video_id ORDER BY snapshot_at) as prev_likes,
        LAG(snapshot_at) OVER (PARTITION BY video_id ORDER BY snapshot_at) as prev_snapshot_at,
        video_age_hours
    FROM engagement_snapshots
)
SELECT
    v.platform_video_id,
    v.title,
    s.video_id,
    s.snapshot_at,
    s.view_count,
    s.like_count,
    s.view_count - COALESCE(s.prev_views, 0) as views_gained,
    s.like_count - COALESCE(s.prev_likes, 0) as likes_gained,
    EXTRACT(EPOCH FROM (s.snapshot_at - s.prev_snapshot_at)) / 3600 as hours_since_last,
    CASE
        WHEN s.prev_views > 0 THEN 
            ROUND(((s.view_count - s.prev_views)::numeric / s.prev_views * 100), 2)
        ELSE NULL
    END as view_growth_percent,
    s.video_age_hours
FROM snapshot_pairs s
JOIN competitor_videos v ON v.id = s.video_id
WHERE s.prev_snapshot_at IS NOT NULL;

COMMENT ON TABLE engagement_snapshots IS 'Time-series engagement data for performance graphs and viral spike detection';
COMMENT ON VIEW vw_engagement_growth IS 'Calculates engagement growth between snapshots';

-- =====================================================
-- 5. FOLLOWER TRACKING (Counts-Only, Twice Daily)
-- =====================================================

-- Table: follower_snapshots
-- Stores follower/following counts (no individual follower lists)
CREATE TABLE IF NOT EXISTS follower_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES competitor_watchlist(id) ON DELETE CASCADE,
    
    -- Counts only (privacy-friendly, storage-efficient)
    follower_count INTEGER NOT NULL,
    following_count INTEGER NOT NULL,
    follower_following_ratio DECIMAL(10,2),  -- follower_count / following_count
    
    -- Calculated metrics (requires engagement data)
    engagement_rate DECIMAL(5,2),  -- (avg_likes + avg_comments) / follower_count * 100
    
    -- Metadata
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_watchlist_follower_snapshot UNIQUE(watchlist_id, snapshot_at)
);

CREATE INDEX IF NOT EXISTS idx_follower_snapshots_watchlist_time 
    ON follower_snapshots(watchlist_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_follower_snapshots_time 
    ON follower_snapshots(snapshot_at DESC);

-- View: Follower growth rate
CREATE OR REPLACE VIEW vw_follower_growth AS
WITH snapshot_pairs AS (
    SELECT
        watchlist_id,
        follower_count,
        following_count,
        snapshot_at,
        LAG(follower_count) OVER (PARTITION BY watchlist_id ORDER BY snapshot_at) as prev_followers,
        LAG(following_count) OVER (PARTITION BY watchlist_id ORDER BY snapshot_at) as prev_following,
        LAG(snapshot_at) OVER (PARTITION BY watchlist_id ORDER BY snapshot_at) as prev_snapshot_at
    FROM follower_snapshots
)
SELECT
    w.username,
    w.platform,
    s.watchlist_id,
    s.snapshot_at,
    s.follower_count,
    s.following_count,
    s.follower_count - COALESCE(s.prev_followers, 0) as followers_gained,
    ROUND(
        CASE
            WHEN s.prev_followers > 0 THEN
                ((s.follower_count - s.prev_followers)::numeric / s.prev_followers * 100)
            ELSE 0
        END, 2
    ) as follower_growth_percent,
    EXTRACT(EPOCH FROM (s.snapshot_at - s.prev_snapshot_at)) / 3600 as hours_since_last,
    ROUND(
        (s.follower_count - COALESCE(s.prev_followers, 0))::numeric / 
        NULLIF(EXTRACT(EPOCH FROM (s.snapshot_at - s.prev_snapshot_at)) / 86400, 0),
        0
    ) as followers_per_day
FROM snapshot_pairs s
JOIN competitor_watchlist w ON w.id = s.watchlist_id
WHERE s.prev_snapshot_at IS NOT NULL;

COMMENT ON TABLE follower_snapshots IS 'Follower/following count snapshots (twice daily, counts-only for safety)';
COMMENT ON VIEW vw_follower_growth IS 'Calculates follower growth velocity and trends';

-- =====================================================
-- 6. SCRAPER JOBS LOG (Event-Driven Tracking)
-- =====================================================

-- Table: scraper_jobs
-- Tracks Kafka-based scraping job execution
CREATE TABLE IF NOT EXISTS scraper_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID UNIQUE NOT NULL,  -- Kafka correlation ID
    watchlist_id UUID REFERENCES competitor_watchlist(id) ON DELETE SET NULL,
    
    -- Job classification
    job_type VARCHAR(30) NOT NULL CHECK (job_type IN (
        'metadata_scrape',      -- Scrape post/video metadata
        'media_download',       -- Download media files
        'engagement_snapshot',  -- Update engagement metrics
        'follower_snapshot',    -- Update follower counts
        'account_health_check'  -- Check scraper account health
    )),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'partial', 'timeout')
    ),
    
    -- Results
    items_found INTEGER DEFAULT 0,
    items_processed INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    
    -- Error tracking
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Performance
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,  -- Milliseconds
    
    -- Worker info
    worker_id VARCHAR(100),  -- Which Python worker processed this
    scraper_session_id UUID REFERENCES scraper_sessions(id) ON DELETE SET NULL,
    
    -- Kafka metadata
    kafka_topic VARCHAR(100),
    kafka_partition INTEGER,
    kafka_offset BIGINT,
    
    -- Metadata
    triggered_by VARCHAR(50),  -- 'scheduler', 'manual', 'api', 'growth_trigger'
    config_snapshot JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_job_id ON scraper_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON scraper_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_watchlist ON scraper_jobs(watchlist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON scraper_jobs(job_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_worker ON scraper_jobs(worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON scraper_jobs(created_at DESC);

COMMENT ON TABLE scraper_jobs IS 'Event-driven job tracking for Kafka-based scraping workflow';

-- =====================================================
-- 7. INSIGHTS & ALERTS
-- =====================================================

-- Table: video_insights
-- AI-generated and rule-based insights
CREATE TABLE IF NOT EXISTS video_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES competitor_videos(id) ON DELETE CASCADE,
    
    -- Insight classification
    insight_type VARCHAR(50) NOT NULL CHECK (
        insight_type IN (
            'viral_spike',           -- Viral growth detected
            'engagement_spike',      -- Unusually high engagement
            'trending',              -- Currently trending
            'design_match',          -- Matches our SKU design
            'price_detected',        -- Price information found
            'new_product_launch',    -- Appears to be new product
            'seasonal_trend',        -- Seasonal pattern
            'follower_spike'         -- Competitor gained many followers
        )
    ),
    
    -- Scoring
    insight_score DECIMAL(5,2) NOT NULL,  -- 0-100 confidence
    
    -- Type-specific data
    insight_data JSONB,
    
    -- Metadata
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    dismissed_by VARCHAR(255),
    
    UNIQUE(video_id, insight_type)
);

CREATE INDEX IF NOT EXISTS idx_insights_video ON video_insights(video_id);
CREATE INDEX IF NOT EXISTS idx_insights_type_score ON video_insights(insight_type, insight_score DESC);
CREATE INDEX IF NOT EXISTS idx_insights_not_dismissed ON video_insights(dismissed, detected_at DESC) WHERE NOT dismissed;

COMMENT ON TABLE video_insights IS 'AI-generated and rule-based insights about competitor performance';

-- =====================================================
-- 8. CONFIGURATION & SETTINGS
-- =====================================================

-- Table: scraper_config
-- Stores scraper configuration (alternative to config.yaml)
CREATE TABLE IF NOT EXISTS scraper_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    config_type VARCHAR(50),  -- 'engagement_tracking', 'follower_tracking', etc.
    description TEXT,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_key ON scraper_config(config_key);
CREATE INDEX IF NOT EXISTS idx_config_type ON scraper_config(config_type, is_active);

COMMENT ON TABLE scraper_config IS 'Dynamic scraper configuration (alternative to YAML files)';

-- =====================================================
-- 9. VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Latest videos with all metadata
CREATE OR REPLACE VIEW vw_latest_videos AS
SELECT 
    v.id,
    v.platform,
    v.platform_video_id,
    v.url,
    v.title,
    v.description,
    v.posted_at,
    v.view_count,
    v.like_count,
    v.comment_count,
    v.share_count,
    v.media_type,
    v.thumbnail_url,
    v.media_url,
    v.duration_seconds,
    v.hashtags,
    v.tagged_sku_ids,
    v.ai_suggested_sku_ids,
    v.tracking_phase,
    v.scraped_at,
    -- Watchlist data
    w.username AS competitor_username,
    w.display_name AS competitor_name,
    w.follower_count AS competitor_followers,
    w.tags AS competitor_tags,
    -- Calculate engagement rate
    CASE 
        WHEN v.view_count > 0 THEN 
            ROUND(((v.like_count + v.comment_count)::numeric / v.view_count * 100), 2)
        ELSE 0
    END as engagement_rate
FROM competitor_videos v
JOIN competitor_watchlist w ON v.watchlist_id = w.id
ORDER BY v.posted_at DESC;

-- View: Scraper health dashboard
CREATE OR REPLACE VIEW vw_scraper_health AS
SELECT 
    w.id,
    w.platform,
    w.username,
    w.display_name,
    w.enabled,
    w.follower_count,
    w.last_scraped_at,
    w.scrape_failures_count,
    COUNT(v.id) AS total_videos,
    MAX(v.posted_at) AS latest_video_date,
    COUNT(CASE WHEN v.scraped_at > NOW() - INTERVAL '24 hours' THEN 1 END) AS videos_last_24h,
    COUNT(CASE WHEN v.scraped_at > NOW() - INTERVAL '7 days' THEN 1 END) AS videos_last_7d,
    (
        SELECT status 
        FROM scraper_jobs 
        WHERE watchlist_id = w.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) AS last_job_status,
    (
        SELECT COUNT(*) 
        FROM scraper_jobs 
        WHERE watchlist_id = w.id 
          AND status = 'failed'
          AND created_at > NOW() - INTERVAL '24 hours'
    ) AS failures_last_24h
FROM competitor_watchlist w
LEFT JOIN competitor_videos v ON v.watchlist_id = w.id
GROUP BY w.id;

-- View: Account pool health
CREATE OR REPLACE VIEW vw_account_pool_health AS
SELECT
    platform,
    COUNT(*) as total_accounts,
    COUNT(*) FILTER (WHERE enabled = true) as enabled_accounts,
    COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy_accounts,
    COUNT(*) FILTER (WHERE health_status = 'banned') as banned_accounts,
    COUNT(*) FILTER (WHERE on_cooldown = true) as on_cooldown_accounts,
    AVG(consecutive_failures) as avg_failures,
    MAX(last_used_at) as most_recent_use
FROM scraper_sessions
GROUP BY platform;

COMMENT ON VIEW vw_latest_videos IS 'Latest videos with competitor info and calculated engagement rate';
COMMENT ON VIEW vw_scraper_health IS 'Health status dashboard for all watchlist items';
COMMENT ON VIEW vw_account_pool_health IS 'Account pool status for anti-detection monitoring';

-- =====================================================
-- 10. TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE TRIGGER trigger_watchlist_updated_at
    BEFORE UPDATE ON competitor_watchlist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_videos_updated_at
    BEFORE UPDATE ON competitor_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON scraper_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_config_updated_at
    BEFORE UPDATE ON scraper_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. FUNCTIONS & PROCEDURES
-- =====================================================

-- Function: Update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup old engagement snapshots (retention: 365 days)
CREATE OR REPLACE FUNCTION cleanup_old_engagement_snapshots(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM engagement_snapshots
    WHERE snapshot_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup old follower snapshots (retention: 365 days)
CREATE OR REPLACE FUNCTION cleanup_old_follower_snapshots(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM follower_snapshots
    WHERE snapshot_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
    p_like_count BIGINT,
    p_comment_count BIGINT,
    p_view_count BIGINT
)
RETURNS DECIMAL AS $$
BEGIN
    IF p_view_count = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND(
        ((p_like_count + p_comment_count)::DECIMAL / p_view_count::DECIMAL) * 100,
        2
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get next available scraper session (round-robin)
CREATE OR REPLACE FUNCTION get_next_scraper_session(p_platform VARCHAR(20))
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Get least-used healthy session not on cooldown
    SELECT id INTO v_session_id
    FROM scraper_sessions
    WHERE platform = p_platform
      AND enabled = true
      AND health_status = 'healthy'
      AND on_cooldown = false
    ORDER BY usage_count ASC, last_used_at ASC NULLS FIRST
    LIMIT 1;
    
    -- Update usage counter
    IF v_session_id IS NOT NULL THEN
        UPDATE scraper_sessions
        SET usage_count = usage_count + 1,
            last_used_at = NOW()
        WHERE id = v_session_id;
    END IF;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. SAMPLE DATA (for testing)
-- =====================================================

-- Insert sample watchlist entries
INSERT INTO competitor_watchlist (platform, username, display_name, tags, enabled)
VALUES 
    ('instagram', 'competitor_sarees', 'Competitor Sarees Co', ARRAY['sarees', 'premium', 'wedding'], true),
    ('instagram', 'budget_sarees_daily', 'Budget Saree Outlet', ARRAY['sarees', 'budget', 'daily_wear'], true),
    ('youtube', '@sareedraping101', 'Saree Draping Tutorials', ARRAY['tutorials', 'styling', 'howto'], true),
    ('youtube', '@weddingsareecollection', 'Wedding Saree Collection', ARRAY['sarees', 'wedding', 'premium'], true)
ON CONFLICT (platform, username) DO NOTHING;

-- Insert sample scraper session
INSERT INTO scraper_sessions (platform, username, display_name, health_status, enabled)
VALUES
    ('instagram', 'scraper_account_1', 'Scraper Account 1', 'healthy', true),
    ('youtube', 'scraper_yt_1', 'YouTube Scraper 1', 'healthy', true)
ON CONFLICT (platform, username) DO NOTHING;

-- =====================================================
-- 13. GRANTS (adjust for your setup)
-- =====================================================

-- Example grants for application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO deeplens_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO deeplens_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO deeplens_user;

-- =====================================================
-- COMPLETION SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Competitor Intelligence Schema v2.0';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Core Tables (9):';
    RAISE NOTICE '  1. competitor_watchlist - Competitors to monitor';
    RAISE NOTICE '  2. scraper_sessions - Account pool for anti-detection';
    RAISE NOTICE '  3. competitor_videos - Scraped posts/videos';
    RAISE NOTICE '  4. engagement_snapshots - Time-series engagement data';
    RAISE NOTICE '  5. follower_snapshots - Follower count tracking (twice daily)';
    RAISE NOTICE '  6. scraper_jobs - Event-driven job tracking';
    RAISE NOTICE '  7. video_insights - AI insights & alerts';
    RAISE NOTICE '  8. scraper_config - Dynamic configuration';
    RAISE NOTICE '';
    RAISE NOTICE 'Views (4):';
    RAISE NOTICE '  - vw_latest_videos';
    RAISE NOTICE '  - vw_scraper_health';
    RAISE NOTICE '  - vw_account_pool_health';
    RAISE NOTICE '  - vw_engagement_growth';
    RAISE NOTICE '  - vw_follower_growth';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions (5):';
    RAISE NOTICE '  - cleanup_old_engagement_snapshots()';
    RAISE NOTICE '  - cleanup_old_follower_snapshots()';
    RAISE NOTICE '  - calculate_engagement_rate()';
    RAISE NOTICE '  - get_next_scraper_session()';
    RAISE NOTICE '  - update_updated_at_column()';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  ✅ Event-driven architecture (Kafka)';
    RAISE NOTICE '  ✅ Account pool rotation (anti-detection)';
    RAISE NOTICE '  ✅ Time-series engagement tracking';
    RAISE NOTICE '  ✅ Follower count tracking (counts-only)';
    RAISE NOTICE '  ✅ SKU linking support';
    RAISE NOTICE '  ✅ Comprehensive monitoring & health checks';
    RAISE NOTICE '========================================';
END $$;
