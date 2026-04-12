-- =====================================================
-- Competitor Intelligence Module - Complete Database Schema
-- =====================================================
-- Version: 2.0 (Event-Driven Architecture)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For similarity searches

-- Use the standard updated_at function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. WATCHLIST MANAGEMENT
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
    follower_count INTEGER,
    following_count INTEGER,
    post_count INTEGER,
    last_scraped_at TIMESTAMPTZ,
    scrape_failures_count INT DEFAULT 0,
    last_follower_sync_at TIMESTAMPTZ,
    follower_count_at_last_sync INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, username)
);

-- 2. SCRAPER ACCOUNT SESSIONS
CREATE TABLE IF NOT EXISTS scraper_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('instagram', 'youtube')),
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    session_cookies TEXT,
    session_metadata JSONB,
    api_token TEXT,
    last_used_at TIMESTAMPTZ,
    last_health_check_at TIMESTAMPTZ,
    health_status VARCHAR(20) DEFAULT 'unknown',
    consecutive_failures INTEGER DEFAULT 0,
    total_requests_today INTEGER DEFAULT 0,
    on_cooldown BOOLEAN DEFAULT false,
    cooldown_until TIMESTAMPTZ,
    rotation_strategy VARCHAR(20) DEFAULT 'round_robin',
    usage_count INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, username)
);

-- 3. VIDEOS/POSTS STORAGE
CREATE TABLE IF NOT EXISTS competitor_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES competitor_watchlist(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('instagram', 'youtube')),
    platform_video_id VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    posted_at TIMESTAMPTZ NOT NULL,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    repost_count BIGINT DEFAULT 0,
    media_type VARCHAR(20),
    thumbnail_url TEXT,
    media_url TEXT,
    media_urls TEXT[],
    duration_seconds INT,
    width INT,
    height INT,
    file_size_bytes BIGINT,
    hashtags TEXT[],
    mentions TEXT[],
    location VARCHAR(255),
    is_reel BOOLEAN,
    is_short BOOLEAN,
    category VARCHAR(100),
    raw_metadata JSONB,
    tagged_sku_ids UUID[],
    ai_suggested_sku_ids UUID[],
    tagging_confidence JSONB,
    tagging_notes TEXT,
    download_status VARCHAR(20) DEFAULT 'pending',
    download_error TEXT,
    downloaded_at TIMESTAMPTZ,
    tracking_phase VARCHAR(20) DEFAULT 'early',
    last_engagement_snapshot_at TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, platform_video_id)
);

-- 4. ENGAGEMENT TRACKING
CREATE TABLE IF NOT EXISTS engagement_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES competitor_videos(id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    repost_count INTEGER DEFAULT 0,
    video_age_hours INTEGER,
    tracking_phase VARCHAR(20),
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(video_id, snapshot_at)
);

-- 5. FOLLOWER TRACKING
CREATE TABLE IF NOT EXISTS follower_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES competitor_watchlist(id) ON DELETE CASCADE,
    follower_count INTEGER NOT NULL,
    following_count INTEGER NOT NULL,
    follower_following_ratio DECIMAL(10,2),
    engagement_rate DECIMAL(5,2),
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(watchlist_id, snapshot_at)
);

-- 6. SCRAPER JOBS
CREATE TABLE IF NOT EXISTS scraper_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID UNIQUE NOT NULL,
    watchlist_id UUID REFERENCES competitor_watchlist(id) ON DELETE SET NULL,
    job_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
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

-- 7. INSIGHTS & ALERTS
CREATE TABLE IF NOT EXISTS video_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES competitor_videos(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    insight_score DECIMAL(5,2) NOT NULL,
    insight_data JSONB,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    dismissed_by VARCHAR(255),
    UNIQUE(video_id, insight_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_platform ON competitor_watchlist(platform);
CREATE INDEX IF NOT EXISTS idx_videos_posted_at ON competitor_videos(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_video_time ON engagement_snapshots(video_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_follower_snapshots_watchlist_time ON follower_snapshots(watchlist_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON scraper_jobs(status, created_at DESC);

-- Triggers
CREATE TRIGGER trigger_watchlist_updated_at BEFORE UPDATE ON competitor_watchlist FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_videos_updated_at BEFORE UPDATE ON competitor_videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_sessions_updated_at BEFORE UPDATE ON scraper_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
