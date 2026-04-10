-- =====================================================
-- Migration: 003_CompetitorIntelligence
-- Description: Add Competitor Intelligence module tables
-- Date: 2026-01-20
-- Multi-Tenant: Yes (runs per tenant database)
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For similarity searches

-- =====================================================
-- 1. WATCHLIST MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS competitor_watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('instagram', 'youtube')),
    username VARCHAR(255) NOT NULL,
    platform_id VARCHAR(255),
    display_name VARCHAR(255),
    profile_pic_url TEXT,
    bio TEXT,
    tags TEXT[],
    enabled BOOLEAN DEFAULT true,
    
    -- Current metrics
    follower_count INTEGER,
    following_count INTEGER,
    post_count INTEGER,
    
    -- Scraping metadata
    last_scraped_at TIMESTAMPTZ,
    scrape_failures_count INT DEFAULT 0,
    last_follower_sync_at TIMESTAMPTZ,
    follower_count_at_last_sync INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(platform, username)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_platform ON competitor_watchlist(platform);
CREATE INDEX IF NOT EXISTS idx_watchlist_enabled ON competitor_watchlist(enabled, platform);
CREATE INDEX IF NOT EXISTS idx_watchlist_tags ON competitor_watchlist USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_watchlist_follower_count ON competitor_watchlist(follower_count DESC) WHERE enabled = true;

-- =====================================================
-- 2. SCRAPER ACCOUNT SESSIONS (Account Pool)
-- =====================================================

CREATE TABLE IF NOT EXISTS scraper_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('instagram', 'youtube')),
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    
    -- Session data (encrypted in production)
    session_cookies TEXT,
    session_metadata JSONB,
    api_token TEXT,
    
    -- Health monitoring
    last_used_at TIMESTAMPTZ,
    last_health_check_at TIMESTAMPTZ,
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (
        health_status IN ('healthy', 'degraded', 'down', 'banned', 'unknown')
    ),
    consecutive_failures INTEGER DEFAULT 0,
    total_requests_today INTEGER DEFAULT 0,
    
    -- Cooldown (anti-detection)
    on_cooldown BOOLEAN DEFAULT false,
    cooldown_until TIMESTAMPTZ,
    
    -- Rotation metadata
    rotation_strategy VARCHAR(20) DEFAULT 'round_robin' CHECK (
        rotation_strategy IN ('round_robin', 'random', 'least_used')
    ),
    usage_count INTEGER DEFAULT 0,
    
    -- Status
    enabled BOOLEAN DEFAULT true,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(platform, username)
);

CREATE INDEX IF NOT EXISTS idx_sessions_platform_enabled ON scraper_sessions(platform, enabled);
CREATE INDEX IF NOT EXISTS idx_sessions_health ON scraper_sessions(health_status, last_health_check_at);
CREATE INDEX IF NOT EXISTS idx_sessions_cooldown ON scraper_sessions(on_cooldown, cooldown_until) WHERE on_cooldown = true;

-- =====================================================
-- 3. VIDEOS/POSTS STORAGE
-- =====================================================

CREATE TABLE IF NOT EXISTS competitor_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES competitor_watchlist(id) ON DELETE CASCADE,
    
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('instagram', 'youtube')),
    platform_video_id VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    
    title TEXT,
    description TEXT,
    posted_at TIMESTAMPTZ NOT NULL,
    
    -- Latest engagement metrics
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    repost_count BIGINT DEFAULT 0,
    
    -- Media information
    media_type VARCHAR(20),
    thumbnail_url TEXT,
    media_url TEXT,
    media_urls TEXT[],
    duration_seconds INT,
    width INT,
    height INT,
    file_size_bytes BIGINT,
    
    -- Platform-specific data
    hashtags TEXT[],
    mentions TEXT[],
    location VARCHAR(255),
    is_reel BOOLEAN,
    is_short BOOLEAN,
    category VARCHAR(100),
    raw_metadata JSONB,
    
    -- SKU Tagging
    tagged_sku_ids UUID[],
    ai_suggested_sku_ids UUID[],
    tagging_confidence JSONB,
    tagging_notes TEXT,
    
    -- Download status
    download_status VARCHAR(20) DEFAULT 'pending' CHECK (
        download_status IN ('pending', 'downloading', 'downloaded', 'failed', 'skipped')
    ),
    download_error TEXT,
    downloaded_at TIMESTAMPTZ,
    
    -- Engagement tracking phase
    tracking_phase VARCHAR(20) DEFAULT 'early' CHECK (
        tracking_phase IN ('early', 'mature', 'archive', 'stopped')
    ),
    last_engagement_snapshot_at TIMESTAMPTZ,
    
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(platform, platform_video_id)
);

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

-- =====================================================
-- 4. ENGAGEMENT TRACKING (Time-Series)
-- =====================================================

CREATE TABLE IF NOT EXISTS engagement_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES competitor_videos(id) ON DELETE CASCADE,
    
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    repost_count INTEGER DEFAULT 0,
    
    video_age_hours INTEGER,
    tracking_phase VARCHAR(20) CHECK (tracking_phase IN ('early', 'mature', 'archive')),
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_video_snapshot UNIQUE(video_id, snapshot_at)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_video_time ON engagement_snapshots(video_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_time ON engagement_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_phase ON engagement_snapshots(tracking_phase, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_age ON engagement_snapshots(video_age_hours);

-- =====================================================
-- 5. FOLLOWER TRACKING (Counts-Only, Twice Daily)
-- =====================================================

CREATE TABLE IF NOT EXISTS follower_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES competitor_watchlist(id) ON DELETE CASCADE,
    
    follower_count INTEGER NOT NULL,
    following_count INTEGER NOT NULL,
    follower_following_ratio DECIMAL(10,2),
    engagement_rate DECIMAL(5,2),
    
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_watchlist_follower_snapshot UNIQUE(watchlist_id, snapshot_at)
);

CREATE INDEX IF NOT EXISTS idx_follower_snapshots_watchlist_time 
    ON follower_snapshots(watchlist_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_follower_snapshots_time 
    ON follower_snapshots(snapshot_at DESC);

-- =====================================================
-- 6. SCRAPER JOBS LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS scraper_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID UNIQUE NOT NULL,
    watchlist_id UUID REFERENCES competitor_watchlist(id) ON DELETE SET NULL,
    
    job_type VARCHAR(30) NOT NULL CHECK (job_type IN (
        'metadata_scrape', 'media_download', 'engagement_snapshot', 
        'follower_snapshot', 'account_health_check'
    )),
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'partial', 'timeout')
    ),
    
    items_found INTEGER DEFAULT 0,
    items_processed INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    worker_id VARCHAR(100),
    scraper_session_id UUID REFERENCES scraper_sessions(id) ON DELETE SET NULL,
    
    kafka_topic VARCHAR(100),
    kafka_partition INTEGER,
    kafka_offset BIGINT,
    
    triggered_by VARCHAR(50),
    config_snapshot JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_job_id ON scraper_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON scraper_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_watchlist ON scraper_jobs(watchlist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON scraper_jobs(job_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_worker ON scraper_jobs(worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON scraper_jobs(created_at DESC);

-- =====================================================
-- 7. INSIGHTS & ALERTS
-- =====================================================

CREATE TABLE IF NOT EXISTS video_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES competitor_videos(id) ON DELETE CASCADE,
    
    insight_type VARCHAR(50) NOT NULL CHECK (
        insight_type IN (
            'viral_spike', 'engagement_spike', 'trending', 'design_match',
            'price_detected', 'new_product_launch', 'seasonal_trend', 'follower_spike'
        )
    ),
    
    insight_score DECIMAL(5,2) NOT NULL,
    insight_data JSONB,
    
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    dismissed_by VARCHAR(255),
    
    UNIQUE(video_id, insight_type)
);

CREATE INDEX IF NOT EXISTS idx_insights_video ON video_insights(video_id);
CREATE INDEX IF NOT EXISTS idx_insights_type_score ON video_insights(insight_type, insight_score DESC);
CREATE INDEX IF NOT EXISTS idx_insights_not_dismissed ON video_insights(dismissed, detected_at DESC) WHERE NOT dismissed;

-- =====================================================
-- 8. CONFIGURATION
-- =====================================================

CREATE TABLE IF NOT EXISTS scraper_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    config_type VARCHAR(50),
    description TEXT,
    
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_key ON scraper_config(config_key);
CREATE INDEX IF NOT EXISTS idx_config_type ON scraper_config(config_type, is_active);

-- =====================================================
-- 9. VIEWS
-- =====================================================

-- View: Latest videos with engagement
CREATE OR REPLACE VIEW vw_latest_videos AS
SELECT 
    v.id, v.platform, v.platform_video_id, v.url, v.title, v.description,
    v.posted_at, v.view_count, v.like_count, v.comment_count, v.share_count,
    v.media_type, v.thumbnail_url, v.media_url, v.duration_seconds,
    v.hashtags, v.tagged_sku_ids, v.ai_suggested_sku_ids, v.tracking_phase,
    v.scraped_at,
    w.username AS competitor_username,
    w.display_name AS competitor_name,
    w.follower_count AS competitor_followers,
    w.tags AS competitor_tags,
    CASE 
        WHEN v.view_count > 0 THEN 
            ROUND(((v.like_count + v.comment_count)::numeric / v.view_count * 100), 2)
        ELSE 0
    END as engagement_rate
FROM competitor_videos v
JOIN competitor_watchlist w ON v.watchlist_id = w.id
ORDER BY v.posted_at DESC;

-- View: Scraper health
CREATE OR REPLACE VIEW vw_scraper_health AS
SELECT 
    w.id, w.platform, w.username, w.display_name, w.enabled,
    w.follower_count, w.last_scraped_at, w.scrape_failures_count,
    COUNT(v.id) AS total_videos,
    MAX(v.posted_at) AS latest_video_date,
    COUNT(CASE WHEN v.scraped_at > NOW() - INTERVAL '24 hours' THEN 1 END) AS videos_last_24h,
    COUNT(CASE WHEN v.scraped_at > NOW() - INTERVAL '7 days' THEN 1 END) AS videos_last_7d,
    (SELECT status FROM scraper_jobs WHERE watchlist_id = w.id ORDER BY created_at DESC LIMIT 1) AS last_job_status,
    (SELECT COUNT(*) FROM scraper_jobs WHERE watchlist_id = w.id AND status = 'failed' 
     AND created_at > NOW() - INTERVAL '24 hours') AS failures_last_24h
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

-- View: Engagement growth
CREATE OR REPLACE VIEW vw_engagement_growth AS
WITH snapshot_pairs AS (
    SELECT
        video_id, view_count, like_count, comment_count, snapshot_at, video_age_hours,
        LAG(view_count) OVER (PARTITION BY video_id ORDER BY snapshot_at) as prev_views,
        LAG(like_count) OVER (PARTITION BY video_id ORDER BY snapshot_at) as prev_likes,
        LAG(snapshot_at) OVER (PARTITION BY video_id ORDER BY snapshot_at) as prev_snapshot_at
    FROM engagement_snapshots
)
SELECT
    v.platform_video_id, v.title, s.video_id, s.snapshot_at,
    s.view_count, s.like_count,
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

-- View: Follower growth
CREATE OR REPLACE VIEW vw_follower_growth AS
WITH snapshot_pairs AS (
    SELECT
        watchlist_id, follower_count, following_count, snapshot_at,
        LAG(follower_count) OVER (PARTITION BY watchlist_id ORDER BY snapshot_at) as prev_followers,
        LAG(following_count) OVER (PARTITION BY watchlist_id ORDER BY snapshot_at) as prev_following,
        LAG(snapshot_at) OVER (PARTITION BY watchlist_id ORDER BY snapshot_at) as prev_snapshot_at
    FROM follower_snapshots
)
SELECT
    w.username, w.platform, s.watchlist_id, s.snapshot_at,
    s.follower_count, s.following_count,
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

-- =====================================================
-- 10. FUNCTIONS
-- =====================================================

-- Function: Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup old engagement snapshots
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

-- Function: Cleanup old follower snapshots
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
    IF p_view_count = 0 THEN RETURN 0; END IF;
    RETURN ROUND(
        ((p_like_count + p_comment_count)::DECIMAL / p_view_count::DECIMAL) * 100,
        2
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get next scraper session
CREATE OR REPLACE FUNCTION get_next_scraper_session(p_platform VARCHAR(20))
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    SELECT id INTO v_session_id
    FROM scraper_sessions
    WHERE platform = p_platform
      AND enabled = true
      AND health_status = 'healthy'
      AND on_cooldown = false
    ORDER BY usage_count ASC, last_used_at ASC NULLS FIRST
    LIMIT 1;
    
    IF v_session_id IS NOT NULL THEN
        UPDATE scraper_sessions
        SET usage_count = usage_count + 1, last_used_at = NOW()
        WHERE id = v_session_id;
    END IF;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_watchlist_updated_at ON competitor_watchlist;
CREATE TRIGGER trigger_watchlist_updated_at
    BEFORE UPDATE ON competitor_watchlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_videos_updated_at ON competitor_videos;
CREATE TRIGGER trigger_videos_updated_at
    BEFORE UPDATE ON competitor_videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_sessions_updated_at ON scraper_sessions;
CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON scraper_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_config_updated_at ON scraper_config;
CREATE TRIGGER trigger_config_updated_at
    BEFORE UPDATE ON scraper_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMPLETION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Competitor Intelligence schema created successfully (Multi-Tenant)';
    RAISE NOTICE 'Tables: 9 | Views: 5 | Functions: 5 | Triggers: 4';
END $$;
