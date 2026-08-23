-- Migration: 015_instagram_within_profile_outliers_day1_vs_day_n.sql
-- Description: Within-Profile Outlier Detection Separating Day-1 Takeoffs vs Delayed Day-N Breakouts
-- Author: Naga (SQL / Data)

-- ============================================================================
-- 1. SCHEMA EXTENSIONS ON OUTLIER SNAPSHOTS
-- ============================================================================

ALTER TABLE public.instagram_competitor_outlier_snapshots 
ADD COLUMN IF NOT EXISTS is_day1_breakout BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.instagram_competitor_outlier_snapshots 
ADD COLUMN IF NOT EXISTS is_delayed_breakout BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.instagram_competitor_outlier_snapshots 
ADD COLUMN IF NOT EXISTS day1_view_multiplier NUMERIC(8, 2) DEFAULT 1.0;

ALTER TABLE public.instagram_competitor_outlier_snapshots 
ADD COLUMN IF NOT EXISTS delta_multiplier NUMERIC(8, 2) DEFAULT 1.0;

ALTER TABLE public.instagram_competitor_outlier_snapshots 
ADD COLUMN IF NOT EXISTS breakout_archetype VARCHAR(40) NOT NULL DEFAULT 'standard';

-- Composite & Partial Indexes for Archetype and Breakout Querying
CREATE INDEX IF NOT EXISTS idx_outlier_snapshots_archetype 
ON public.instagram_competitor_outlier_snapshots(breakout_archetype, evaluation_date DESC, outlier_score DESC);

CREATE INDEX IF NOT EXISTS idx_outlier_snapshots_day1_breakout 
ON public.instagram_competitor_outlier_snapshots(is_day1_breakout, evaluation_date DESC, outlier_score DESC) 
WHERE is_day1_breakout = true;

CREATE INDEX IF NOT EXISTS idx_outlier_snapshots_delayed_breakout 
ON public.instagram_competitor_outlier_snapshots(is_delayed_breakout, evaluation_date DESC, delta_multiplier DESC) 
WHERE is_delayed_breakout = true;

CREATE INDEX IF NOT EXISTS idx_post_daily_metrics_delayed_spikes 
ON public.instagram_post_daily_metrics(day_offset, daily_delta_views DESC, snapshot_date DESC) 
WHERE day_offset >= 2;

-- ============================================================================
-- 2. STATISTICAL DAY-N BASELINE VIEWS (90-DAY ROLLING WINDOW)
-- ============================================================================

DROP VIEW IF EXISTS public.view_instagram_competitor_outliers CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_instagram_competitor_day_n_curves CASCADE;
DROP VIEW IF EXISTS public.view_instagram_profile_day_n_baselines CASCADE;
DROP VIEW IF EXISTS public.view_instagram_niche_day_n_baselines CASCADE;

-- A. Profile-Level Day-N Baselines (P50/P75/P90 Views and Daily Delta Views)
CREATE VIEW public.view_instagram_profile_day_n_baselines AS
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
        m.daily_delta_views,
        m.daily_delta_likes,
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
    
    -- Cumulative Views Baselines
    ROUND(AVG(view_count), 2) AS avg_views,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY view_count)::NUMERIC(12, 2) AS p50_views,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY view_count)::NUMERIC(12, 2) AS p75_views,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY view_count)::NUMERIC(12, 2) AS p90_views,
    COALESCE(ROUND(STDDEV(view_count), 2), 0) AS stddev_views,
    
    -- Daily Delta Views Baselines (Daily Incremental Velocity)
    ROUND(AVG(daily_delta_views), 2) AS avg_delta_views,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY daily_delta_views)::NUMERIC(12, 2) AS p50_delta_views,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY daily_delta_views)::NUMERIC(12, 2) AS p75_delta_views,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY daily_delta_views)::NUMERIC(12, 2) AS p90_delta_views,
    COALESCE(ROUND(STDDEV(daily_delta_views), 2), 0) AS stddev_delta_views,

    -- Cumulative Likes Baselines
    ROUND(AVG(like_count), 2) AS avg_likes,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY like_count)::NUMERIC(12, 2) AS p50_likes,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY like_count)::NUMERIC(12, 2) AS p75_likes,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY like_count)::NUMERIC(12, 2) AS p90_likes,
    COALESCE(ROUND(STDDEV(like_count), 2), 0) AS stddev_likes,

    -- Engagement & Velocity Baselines
    ROUND(AVG(velocity_score), 2) AS avg_velocity_score,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY velocity_score)::NUMERIC(10, 2) AS p50_velocity_score,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY velocity_score)::NUMERIC(10, 2) AS p90_velocity_score
FROM ranked_metrics
GROUP BY profile_id, username, competitor_niche, day_offset;

-- B. Niche-Level Day-N Baselines (Fallback for Cold-Start / Sparse Creators)
CREATE VIEW public.view_instagram_niche_day_n_baselines AS
WITH niche_metrics AS (
    SELECT 
        COALESCE(w.competitor_niche, 'General') AS competitor_niche,
        m.day_offset,
        m.view_count,
        m.like_count,
        m.comment_count,
        m.share_count,
        m.daily_delta_views,
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
    ROUND(AVG(daily_delta_views), 2) AS avg_delta_views,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY daily_delta_views)::NUMERIC(12, 2) AS p50_delta_views,
    ROUND(AVG(like_count), 2) AS avg_likes,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY like_count)::NUMERIC(12, 2) AS p50_likes,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY like_count)::NUMERIC(12, 2) AS p90_likes,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY velocity_score)::NUMERIC(10, 2) AS p50_velocity_score,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY velocity_score)::NUMERIC(10, 2) AS p90_velocity_score
FROM niche_metrics
GROUP BY competitor_niche, day_offset;

-- C. Materialized View for Zero-Latency Curve Retrieval
CREATE MATERIALIZED VIEW public.mv_instagram_competitor_day_n_curves AS
SELECT * FROM public.view_instagram_profile_day_n_baselines
WITH NO DATA;

CREATE UNIQUE INDEX uq_idx_mv_day_n_curves_profile_day 
ON public.mv_instagram_competitor_day_n_curves(profile_id, day_offset);

-- ============================================================================
-- 3. REAL-TIME ANALYTICAL VIEW FOR DAY-1 TAKEOFFS VS DELAYED BREAKOUTS
-- ============================================================================

CREATE VIEW public.view_instagram_competitor_outliers AS
WITH day1_history AS (
    SELECT 
        m1.post_id,
        m1.view_count AS day1_views,
        m1.daily_delta_views AS day1_delta_views,
        COALESCE(pb1.p50_views, nb1.p50_views, 0) AS day1_baseline_p50_views,
        ROUND(
            CASE 
                WHEN COALESCE(pb1.p50_views, nb1.p50_views, 0) > 0 
                THEN (m1.view_count::NUMERIC / COALESCE(pb1.p50_views, nb1.p50_views))
                ELSE 1.0
            END, 
            2
        ) AS day1_view_multiplier
    FROM public.instagram_post_daily_metrics m1
    JOIN public.competitor_watchlist w1 ON w1.id = m1.profile_id
    LEFT JOIN public.view_instagram_profile_day_n_baselines pb1 
        ON pb1.profile_id = m1.profile_id AND pb1.day_offset = 1
    LEFT JOIN public.view_instagram_niche_day_n_baselines nb1 
        ON nb1.competitor_niche = COALESCE(w1.competitor_niche, 'General') AND nb1.day_offset = 1
    WHERE m1.day_offset = 1
)
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
    
    -- Within-Profile Day-N Baselines (with Niche fallback)
    COALESCE(pb.p50_views, nb.p50_views, 0) AS profile_baseline_views,
    COALESCE(pb.avg_delta_views, nb.avg_delta_views, 0) AS profile_baseline_delta_views,
    COALESCE(pb.p50_likes, nb.p50_likes, 0) AS profile_baseline_likes,
    COALESCE(nb.p50_views, 0) AS niche_baseline_views,
    COALESCE(nb.p50_likes, 0) AS niche_baseline_likes,
    
    -- Performance Multipliers vs Within-Profile Baseline
    ROUND(
        CASE 
            WHEN COALESCE(pb.p50_views, nb.p50_views, 0) > 0 
            THEN (m.view_count::NUMERIC / COALESCE(pb.p50_views, nb.p50_views))
            ELSE 1.0
        END, 
        2
    ) AS outlier_score,

    ROUND(
        CASE 
            WHEN COALESCE(pb.p50_views, nb.p50_views, 0) > 0 
            THEN (m.view_count::NUMERIC / COALESCE(pb.p50_views, nb.p50_views))
            ELSE 1.0
        END, 
        2
    ) AS virality_multiplier,

    ROUND(
        CASE 
            WHEN COALESCE(pb.avg_delta_views, nb.avg_delta_views, 0) > 0 
            THEN (m.daily_delta_views::NUMERIC / COALESCE(pb.avg_delta_views, nb.avg_delta_views))
            ELSE 1.0
        END, 
        2
    ) AS delta_multiplier,

    COALESCE(d1.day1_view_multiplier, 1.0) AS day1_view_multiplier,

    -- Outlier Magnitude Tier
    CASE 
        WHEN (CASE WHEN COALESCE(pb.p50_views, nb.p50_views, 0) > 0 THEN (m.view_count::NUMERIC / COALESCE(pb.p50_views, nb.p50_views)) ELSE 1.0 END) >= 3.0 THEN 'viral_breakout'
        WHEN (CASE WHEN COALESCE(pb.p50_views, nb.p50_views, 0) > 0 THEN (m.view_count::NUMERIC / COALESCE(pb.p50_views, nb.p50_views)) ELSE 1.0 END) >= 2.0 THEN 'strong_outlier'
        WHEN (CASE WHEN COALESCE(pb.p50_views, nb.p50_views, 0) > 0 THEN (m.view_count::NUMERIC / COALESCE(pb.p50_views, nb.p50_views)) ELSE 1.0 END) >= 1.5 THEN 'moderate_outlier'
        WHEN (CASE WHEN COALESCE(pb.p50_views, nb.p50_views, 0) > 0 THEN (m.view_count::NUMERIC / COALESCE(pb.p50_views, nb.p50_views)) ELSE 1.0 END) < 0.6 THEN 'underperforming'
        ELSE 'standard'
    END AS outlier_tier,

    -- Classification Flag 1: Immediate Day-1 Takeoff
    CASE 
        WHEN m.day_offset = 1 
         AND COALESCE(pb.p50_views, nb.p50_views, 0) > 0 
         AND (m.view_count::NUMERIC / COALESCE(pb.p50_views, nb.p50_views)) >= 2.0 
        THEN true
        ELSE false
    END AS is_day1_breakout,

    -- Classification Flag 2: Delayed Day-N Breakout (Spiking on Day N >= 2 with Delta Views >= 2x Baseline)
    CASE 
        WHEN m.day_offset >= 2 
         AND COALESCE(pb.avg_delta_views, nb.avg_delta_views, 0) > 0 
         AND (m.daily_delta_views::NUMERIC / COALESCE(pb.avg_delta_views, nb.avg_delta_views)) >= 2.0
         AND m.daily_delta_views >= 500
        THEN true
        ELSE false
    END AS is_delayed_breakout,

    -- Trajectory Archetype Classification
    CASE 
        -- Day 1 Immediate Viral Distribution
        WHEN m.day_offset = 1 
         AND COALESCE(pb.p50_views, nb.p50_views, 0) > 0 
         AND (m.view_count::NUMERIC / COALESCE(pb.p50_views, nb.p50_views)) >= 2.0 
        THEN 'day1_takeoff'

        -- Sustained Virality: Took off Day 1 AND continues surging Day N >= 2
        WHEN m.day_offset >= 2 
         AND COALESCE(pb.avg_delta_views, nb.avg_delta_views, 0) > 0 
         AND (m.daily_delta_views::NUMERIC / COALESCE(pb.avg_delta_views, nb.avg_delta_views)) >= 2.0
         AND COALESCE(d1.day1_view_multiplier, 1.0) >= 2.0
        THEN 'sustained_viral'

        -- Delayed Breakout: Picked up by algorithm on Day N >= 2 after modest start
        WHEN m.day_offset >= 2 
         AND COALESCE(pb.avg_delta_views, nb.avg_delta_views, 0) > 0 
         AND (m.daily_delta_views::NUMERIC / COALESCE(pb.avg_delta_views, nb.avg_delta_views)) >= 2.0
        THEN 'delayed_breakout'

        WHEN COALESCE(pb.p50_views, nb.p50_views, 0) > 0 
         AND (m.view_count::NUMERIC / COALESCE(pb.p50_views, nb.p50_views)) >= 1.5 
        THEN 'moderate_outlier'

        WHEN COALESCE(pb.p50_views, nb.p50_views, 0) > 0 
         AND (m.view_count::NUMERIC / COALESCE(pb.p50_views, nb.p50_views)) < 0.6 
        THEN 'underperforming'

        ELSE 'standard'
    END AS breakout_archetype,

    -- Inspiration Candidate Flag (High-performing hook / structure for synthesis)
    CASE 
        WHEN (CASE WHEN COALESCE(pb.p50_views, nb.p50_views, 0) > 0 THEN (m.view_count::NUMERIC / COALESCE(pb.p50_views, nb.p50_views)) ELSE 1.0 END) >= 1.8 
          OR (m.day_offset >= 2 AND COALESCE(pb.avg_delta_views, nb.avg_delta_views, 0) > 0 AND (m.daily_delta_views::NUMERIC / COALESCE(pb.avg_delta_views, nb.avg_delta_views)) >= 2.0)
          OR (m.day_offset <= 3 AND m.velocity_score > COALESCE(pb.p90_velocity_score, 100))
        THEN true 
        ELSE false 
    END AS is_inspiration_candidate,

    -- Extracted First-Line Caption Hook
    SPLIT_PART(cv.description, E'\n', 1) AS caption_hook

FROM public.instagram_post_daily_metrics m
JOIN public.competitor_videos cv ON cv.id = m.post_id
JOIN public.competitor_watchlist w ON w.id = m.profile_id
LEFT JOIN public.view_instagram_profile_day_n_baselines pb 
    ON pb.profile_id = m.profile_id AND pb.day_offset = m.day_offset
LEFT JOIN public.view_instagram_niche_day_n_baselines nb 
    ON nb.competitor_niche = COALESCE(w.competitor_niche, 'General') AND nb.day_offset = m.day_offset
LEFT JOIN day1_history d1 
    ON d1.post_id = m.post_id
WHERE w.is_competitor = true;

-- ============================================================================
-- 4. AUTOMATED OUTLIER EVALUATION STORED PROCEDURE
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
        delta_multiplier,
        day1_view_multiplier,
        is_day1_breakout,
        is_delayed_breakout,
        breakout_archetype,
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
        o.virality_multiplier,
        o.delta_multiplier,
        o.day1_view_multiplier,
        o.is_day1_breakout,
        o.is_delayed_breakout,
        o.breakout_archetype,
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
        delta_multiplier = EXCLUDED.delta_multiplier,
        day1_view_multiplier = EXCLUDED.day1_view_multiplier,
        is_day1_breakout = EXCLUDED.is_day1_breakout,
        is_delayed_breakout = EXCLUDED.is_delayed_breakout,
        breakout_archetype = EXCLUDED.breakout_archetype,
        outlier_tier = EXCLUDED.outlier_tier,
        is_inspiration_candidate = EXCLUDED.is_inspiration_candidate,
        caption_hook = EXCLUDED.caption_hook;
END;
$$;
