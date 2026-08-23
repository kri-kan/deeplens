-- Migration: 014_instagram_competitor_tracking_day_n_metrics.sql
-- Description: Instagram Competitor Tracking, Day-N Post Daily Metrics Velocity, Baseline Curves, and Outlier Snapshots
-- Author: Naga (SQL / Data)

-- ============================================================================
-- 1. COMPETITOR CLASSIFICATION ON COMPETITOR_WATCHLIST
-- ============================================================================

ALTER TABLE public.competitor_watchlist 
ADD COLUMN IF NOT EXISTS is_competitor BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.competitor_watchlist 
ADD COLUMN IF NOT EXISTS tracking_tier VARCHAR(50) NOT NULL DEFAULT 'standard';

ALTER TABLE public.competitor_watchlist 
ADD COLUMN IF NOT EXISTS competitor_niche VARCHAR(100);

ALTER TABLE public.competitor_watchlist 
ADD COLUMN IF NOT EXISTS tracking_frequency_hours INTEGER NOT NULL DEFAULT 24;

-- Seed / Backfill is_competitor from existing profile_category classification
UPDATE public.competitor_watchlist 
SET is_competitor = true 
WHERE profile_category = 'Competitors' AND is_competitor = false;

-- Indexes for competitor lookup and tier-based scheduling
CREATE INDEX IF NOT EXISTS idx_watchlist_competitor_tier 
ON public.competitor_watchlist(is_competitor, tracking_tier) 
WHERE enabled = true AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_watchlist_competitor_niche 
ON public.competitor_watchlist(competitor_niche) 
WHERE is_competitor = true;

-- ============================================================================
-- 2. INSTAGRAM POST DAILY METRICS (DAY-N VELOCITY SNAPSHOTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instagram_post_daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.competitor_videos(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.competitor_watchlist(id) ON DELETE CASCADE,
    day_offset INTEGER NOT NULL, -- 0 (Day 0 / Post day), 1 (Day 1), 2 (Day 2), 3, 7, 14, 30, etc.
    snapshot_date DATE NOT NULL,
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    save_count BIGINT DEFAULT 0,
    repost_count BIGINT DEFAULT 0,
    daily_delta_views BIGINT DEFAULT 0,
    daily_delta_likes BIGINT DEFAULT 0,
    daily_delta_comments BIGINT DEFAULT 0,
    daily_delta_shares BIGINT DEFAULT 0,
    velocity_score NUMERIC(10, 2) DEFAULT 0,
    engagement_rate NUMERIC(8, 4) DEFAULT 0,
    raw_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_post_daily_metrics_post_day UNIQUE (post_id, day_offset)
);

-- Optimization & Composite Indexes
CREATE INDEX IF NOT EXISTS idx_post_daily_metrics_profile_post_day 
ON public.instagram_post_daily_metrics(profile_id, post_id, day_offset);

CREATE INDEX IF NOT EXISTS idx_post_daily_metrics_day_velocity 
ON public.instagram_post_daily_metrics(day_offset, velocity_score DESC);

CREATE INDEX IF NOT EXISTS idx_post_daily_metrics_snapshot_date 
ON public.instagram_post_daily_metrics(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_post_daily_metrics_profile_day 
ON public.instagram_post_daily_metrics(profile_id, day_offset, snapshot_date DESC);

-- Trigger function for automated delta, day offset, and velocity score computation
CREATE OR REPLACE FUNCTION public.fn_process_instagram_post_daily_metric()
RETURNS TRIGGER AS $$
DECLARE
    v_posted_at TIMESTAMPTZ;
    v_profile_id UUID;
    v_prev_views BIGINT := 0;
    v_prev_likes BIGINT := 0;
    v_prev_comments BIGINT := 0;
    v_prev_shares BIGINT := 0;
BEGIN
    -- Fetch post timestamp and watchlist_id if profile_id not set
    SELECT cv.posted_at, cv.watchlist_id 
    INTO v_posted_at, v_profile_id
    FROM public.competitor_videos cv
    WHERE cv.id = NEW.post_id;

    IF NEW.profile_id IS NULL THEN
        NEW.profile_id := v_profile_id;
    END IF;

    -- Calculate day_offset if not explicitly provided
    IF NEW.day_offset IS NULL OR NEW.day_offset = 0 THEN
        IF v_posted_at IS NOT NULL THEN
            NEW.day_offset := GREATEST(0, (NEW.snapshot_date - (v_posted_at AT TIME ZONE 'UTC')::DATE));
        ELSE
            NEW.day_offset := 0;
        END IF;
    END IF;

    -- Look up previous day offset metrics for delta computation
    SELECT 
        view_count, like_count, comment_count, share_count
    INTO 
        v_prev_views, v_prev_likes, v_prev_comments, v_prev_shares
    FROM public.instagram_post_daily_metrics
    WHERE post_id = NEW.post_id 
      AND day_offset < NEW.day_offset
    ORDER BY day_offset DESC
    LIMIT 1;

    IF FOUND THEN
        NEW.daily_delta_views := GREATEST(0, NEW.view_count - COALESCE(v_prev_views, 0));
        NEW.daily_delta_likes := GREATEST(0, NEW.like_count - COALESCE(v_prev_likes, 0));
        NEW.daily_delta_comments := GREATEST(0, NEW.comment_count - COALESCE(v_prev_comments, 0));
        NEW.daily_delta_shares := GREATEST(0, NEW.share_count - COALESCE(v_prev_shares, 0));
    ELSE
        -- First snapshot: deltas equal current total counts
        NEW.daily_delta_views := NEW.view_count;
        NEW.daily_delta_likes := NEW.like_count;
        NEW.daily_delta_comments := NEW.comment_count;
        NEW.daily_delta_shares := NEW.share_count;
    END IF;

    -- Compute velocity score (weighted engagement acceleration)
    -- Formula: 0.1 * views + 1.0 * likes + 3.0 * comments + 5.0 * shares
    NEW.velocity_score := ROUND(
        (COALESCE(NEW.daily_delta_views, 0) * 0.10) + 
        (COALESCE(NEW.daily_delta_likes, 0) * 1.00) + 
        (COALESCE(NEW.daily_delta_comments, 0) * 3.00) + 
        (COALESCE(NEW.daily_delta_shares, 0) * 5.00),
        2
    );

    -- Compute engagement rate (percentage of views converted to engagement)
    IF NEW.view_count > 0 THEN
        NEW.engagement_rate := ROUND(
            ((COALESCE(NEW.like_count, 0) + COALESCE(NEW.comment_count, 0) + COALESCE(NEW.share_count, 0))::NUMERIC / NEW.view_count) * 100, 
            4
        );
    ELSE
        NEW.engagement_rate := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_process_instagram_post_daily_metric ON public.instagram_post_daily_metrics;
CREATE TRIGGER trg_process_instagram_post_daily_metric
BEFORE INSERT OR UPDATE ON public.instagram_post_daily_metrics
FOR EACH ROW EXECUTE FUNCTION public.fn_process_instagram_post_daily_metric();

-- ============================================================================
-- 3. INSTAGRAM COMPETITOR OUTLIER SNAPSHOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instagram_competitor_outlier_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.competitor_videos(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.competitor_watchlist(id) ON DELETE CASCADE,
    day_offset INTEGER NOT NULL,
    evaluation_date DATE NOT NULL,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    velocity_score NUMERIC(10, 2) DEFAULT 0,
    profile_baseline_likes NUMERIC(12, 2) DEFAULT 0,
    profile_baseline_views NUMERIC(12, 2) DEFAULT 0,
    niche_baseline_likes NUMERIC(12, 2) DEFAULT 0,
    niche_baseline_views NUMERIC(12, 2) DEFAULT 0,
    outlier_score NUMERIC(8, 2) NOT NULL DEFAULT 1.0, -- Multiplier vs profile median baseline
    virality_multiplier NUMERIC(8, 2) NOT NULL DEFAULT 1.0,
    outlier_tier VARCHAR(30) NOT NULL DEFAULT 'standard', -- 'viral_breakout', 'strong_outlier', 'moderate_outlier', 'standard', 'underperforming'
    is_inspiration_candidate BOOLEAN NOT NULL DEFAULT false,
    audio_track_title TEXT,
    caption_hook TEXT,
    detected_keywords TEXT[],
    ai_analysis_summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_outlier_snapshot_post_day_date UNIQUE (post_id, day_offset, evaluation_date)
);

-- Optimization & Composite Indexes
CREATE INDEX IF NOT EXISTS idx_outlier_snapshots_day_score 
ON public.instagram_competitor_outlier_snapshots(day_offset, outlier_score DESC);

CREATE INDEX IF NOT EXISTS idx_outlier_snapshots_profile_day_score 
ON public.instagram_competitor_outlier_snapshots(profile_id, day_offset, outlier_score DESC);

CREATE INDEX IF NOT EXISTS idx_outlier_snapshots_inspiration 
ON public.instagram_competitor_outlier_snapshots(is_inspiration_candidate, evaluation_date DESC, outlier_score DESC) 
WHERE is_inspiration_candidate = true;

CREATE INDEX IF NOT EXISTS idx_outlier_snapshots_tier 
ON public.instagram_competitor_outlier_snapshots(outlier_tier, evaluation_date DESC);

CREATE INDEX IF NOT EXISTS idx_outlier_snapshots_post_day 
ON public.instagram_competitor_outlier_snapshots(post_id, day_offset);

-- ============================================================================
-- 4. ANALYTICAL SQL VIEWS FOR BASELINE CURVES & OUTLIER DETECTION
-- ============================================================================

-- A. Profile-level Day-N Statistical Baselines (90-day rolling window)
CREATE OR REPLACE VIEW public.view_instagram_profile_day_n_baselines AS
WITH ranked_metrics AS (
    SELECT 
        m.profile_id,
        w.username,
        w.competitor_niche,
        m.day_offset,
        m.view_count,
        m.like_count,
        m.comment_count,
        m.share_count,
        m.velocity_score,
        m.engagement_rate
    FROM public.instagram_post_daily_metrics m
    JOIN public.competitor_watchlist w ON w.id = m.profile_id
    WHERE w.is_competitor = true
      AND m.snapshot_date >= (CURRENT_DATE - INTERVAL '90 days')
)
SELECT 
    profile_id,
    username,
    competitor_niche,
    day_offset,
    COUNT(*)::INTEGER AS sample_size,
    ROUND(AVG(view_count), 2) AS avg_views,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY view_count)::NUMERIC(12, 2) AS p50_views,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY view_count)::NUMERIC(12, 2) AS p75_views,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY view_count)::NUMERIC(12, 2) AS p90_views,
    COALESCE(ROUND(STDDEV(view_count), 2), 0) AS stddev_views,
    
    ROUND(AVG(like_count), 2) AS avg_likes,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY like_count)::NUMERIC(12, 2) AS p50_likes,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY like_count)::NUMERIC(12, 2) AS p75_likes,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY like_count)::NUMERIC(12, 2) AS p90_likes,
    COALESCE(ROUND(STDDEV(like_count), 2), 0) AS stddev_likes,

    ROUND(AVG(comment_count), 2) AS avg_comments,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY comment_count)::NUMERIC(12, 2) AS p50_comments,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY comment_count)::NUMERIC(12, 2) AS p90_comments,
    
    ROUND(AVG(velocity_score), 2) AS avg_velocity_score,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY velocity_score)::NUMERIC(10, 2) AS p50_velocity_score,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY velocity_score)::NUMERIC(10, 2) AS p90_velocity_score
FROM ranked_metrics
GROUP BY profile_id, username, competitor_niche, day_offset;

-- B. Niche-level Day-N Statistical Baselines (90-day rolling window)
CREATE OR REPLACE VIEW public.view_instagram_niche_day_n_baselines AS
WITH niche_metrics AS (
    SELECT 
        COALESCE(w.competitor_niche, 'General') AS competitor_niche,
        m.day_offset,
        m.view_count,
        m.like_count,
        m.comment_count,
        m.share_count,
        m.velocity_score
    FROM public.instagram_post_daily_metrics m
    JOIN public.competitor_watchlist w ON w.id = m.profile_id
    WHERE w.is_competitor = true
      AND m.snapshot_date >= (CURRENT_DATE - INTERVAL '90 days')
)
SELECT 
    competitor_niche,
    day_offset,
    COUNT(*)::INTEGER AS sample_size,
    ROUND(AVG(view_count), 2) AS avg_views,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY view_count)::NUMERIC(12, 2) AS p50_views,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY view_count)::NUMERIC(12, 2) AS p90_views,
    ROUND(AVG(like_count), 2) AS avg_likes,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY like_count)::NUMERIC(12, 2) AS p50_likes,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY like_count)::NUMERIC(12, 2) AS p90_likes,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY velocity_score)::NUMERIC(10, 2) AS p50_velocity_score,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY velocity_score)::NUMERIC(10, 2) AS p90_velocity_score
FROM niche_metrics
GROUP BY competitor_niche, day_offset;

-- C. Real-Time Dynamic Outlier Detection View
CREATE OR REPLACE VIEW public.view_instagram_competitor_outliers AS
SELECT 
    m.post_id,
    cv.platform_video_id,
    cv.url AS post_url,
    cv.thumbnail_url,
    cv.media_url,
    cv.media_type,
    cv.title,
    cv.description AS caption,
    cv.posted_at,
    m.profile_id,
    w.username AS profile_username,
    w.display_name AS profile_name,
    w.profile_pic_url,
    w.competitor_niche,
    w.tracking_tier,
    m.day_offset,
    m.snapshot_date,
    m.view_count,
    m.like_count,
    m.comment_count,
    m.share_count,
    m.daily_delta_likes,
    m.daily_delta_views,
    m.velocity_score,
    m.engagement_rate,
    
    -- Baselines
    COALESCE(pb.p50_likes, 0) AS profile_baseline_likes,
    COALESCE(pb.p50_views, 0) AS profile_baseline_views,
    COALESCE(nb.p50_likes, 0) AS niche_baseline_likes,
    COALESCE(nb.p50_views, 0) AS niche_baseline_views,
    
    -- Outlier Score relative to Profile Baseline (fallback to Niche baseline)
    ROUND(
        CASE 
            WHEN COALESCE(pb.p50_likes, 0) > 0 THEN (m.like_count::NUMERIC / pb.p50_likes)
            WHEN COALESCE(nb.p50_likes, 0) > 0 THEN (m.like_count::NUMERIC / nb.p50_likes)
            ELSE 1.0
        END, 
        2
    ) AS outlier_score,

    -- Outlier Tier
    CASE 
        WHEN (CASE WHEN COALESCE(pb.p50_likes, 0) > 0 THEN (m.like_count::NUMERIC / pb.p50_likes) ELSE 1.0 END) >= 3.0 THEN 'viral_breakout'
        WHEN (CASE WHEN COALESCE(pb.p50_likes, 0) > 0 THEN (m.like_count::NUMERIC / pb.p50_likes) ELSE 1.0 END) >= 2.0 THEN 'strong_outlier'
        WHEN (CASE WHEN COALESCE(pb.p50_likes, 0) > 0 THEN (m.like_count::NUMERIC / pb.p50_likes) ELSE 1.0 END) >= 1.5 THEN 'moderate_outlier'
        WHEN (CASE WHEN COALESCE(pb.p50_likes, 0) > 0 THEN (m.like_count::NUMERIC / pb.p50_likes) ELSE 1.0 END) < 0.6 THEN 'underperforming'
        ELSE 'standard'
    END AS outlier_tier,

    -- Inspiration Flag
    CASE 
        WHEN (CASE WHEN COALESCE(pb.p50_likes, 0) > 0 THEN (m.like_count::NUMERIC / pb.p50_likes) ELSE 1.0 END) >= 1.8 
          OR (m.day_offset <= 3 AND m.velocity_score > COALESCE(pb.p90_velocity_score, 100))
        THEN true 
        ELSE false 
    END AS is_inspiration_candidate,

    -- Extracted hook line (first line of caption)
    SPLIT_PART(cv.description, E'\n', 1) AS caption_hook

FROM public.instagram_post_daily_metrics m
JOIN public.competitor_videos cv ON cv.id = m.post_id
JOIN public.competitor_watchlist w ON w.id = m.profile_id
LEFT JOIN public.view_instagram_profile_day_n_baselines pb 
    ON pb.profile_id = m.profile_id AND pb.day_offset = m.day_offset
LEFT JOIN public.view_instagram_niche_day_n_baselines nb 
    ON nb.competitor_niche = COALESCE(w.competitor_niche, 'General') AND nb.day_offset = m.day_offset
WHERE w.is_competitor = true;

-- ============================================================================
-- 5. MATERIALIZED VIEW FOR HIGH-SPEED DASHBOARD CURVES
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_instagram_competitor_day_n_curves AS
SELECT * FROM public.view_instagram_profile_day_n_baselines
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_mv_day_n_curves_profile_day 
ON public.mv_instagram_competitor_day_n_curves(profile_id, day_offset);

-- ============================================================================
-- 6. AUTOMATED OUTLIER EVALUATION STORED PROCEDURE
-- ============================================================================

CREATE OR REPLACE PROCEDURE public.sp_populate_competitor_outlier_snapshots(
    p_evaluation_date DATE DEFAULT CURRENT_DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh baseline curve cache
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_instagram_competitor_day_n_curves;

    -- Upsert evaluated outliers
    INSERT INTO public.instagram_competitor_outlier_snapshots (
        post_id,
        profile_id,
        day_offset,
        evaluation_date,
        view_count,
        like_count,
        comment_count,
        share_count,
        velocity_score,
        profile_baseline_likes,
        profile_baseline_views,
        niche_baseline_likes,
        niche_baseline_views,
        outlier_score,
        virality_multiplier,
        outlier_tier,
        is_inspiration_candidate,
        caption_hook,
        created_at
    )
    SELECT 
        o.post_id,
        o.profile_id,
        o.day_offset,
        p_evaluation_date,
        o.view_count,
        o.like_count,
        o.comment_count,
        o.share_count,
        o.velocity_score,
        o.profile_baseline_likes,
        o.profile_baseline_views,
        o.niche_baseline_likes,
        o.niche_baseline_views,
        o.outlier_score,
        o.outlier_score AS virality_multiplier,
        o.outlier_tier,
        o.is_inspiration_candidate,
        o.caption_hook,
        NOW()
    FROM public.view_instagram_competitor_outliers o
    WHERE o.snapshot_date = p_evaluation_date
    ON CONFLICT (post_id, day_offset, evaluation_date) 
    DO UPDATE SET
        view_count = EXCLUDED.view_count,
        like_count = EXCLUDED.like_count,
        comment_count = EXCLUDED.comment_count,
        share_count = EXCLUDED.share_count,
        velocity_score = EXCLUDED.velocity_score,
        profile_baseline_likes = EXCLUDED.profile_baseline_likes,
        profile_baseline_views = EXCLUDED.profile_baseline_views,
        niche_baseline_likes = EXCLUDED.niche_baseline_likes,
        niche_baseline_views = EXCLUDED.niche_baseline_views,
        outlier_score = EXCLUDED.outlier_score,
        virality_multiplier = EXCLUDED.virality_multiplier,
        outlier_tier = EXCLUDED.outlier_tier,
        is_inspiration_candidate = EXCLUDED.is_inspiration_candidate,
        caption_hook = EXCLUDED.caption_hook;
END;
$$;
