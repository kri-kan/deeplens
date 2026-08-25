-- Migration: 017_prune_legacy_snapshots_and_limit_day15.sql
-- Description: Prune legacy snapshot records where day_offset > 15 or age > 15 days, refresh materialized views (ADO Bug #310, Task #312)

-- ============================================================================
-- 1. PRUNE LEGACY SNAPSHOT RECORDS FROM INSTAGRAM_POST_DAILY_METRICS
-- ============================================================================

DELETE FROM public.instagram_post_daily_metrics
WHERE day_offset > 15;

DELETE FROM public.instagram_post_daily_metrics m
USING public.competitor_videos cv
WHERE m.post_id = cv.id
  AND (m.snapshot_date - (cv.posted_at AT TIME ZONE 'UTC')::DATE) > 15;

-- ============================================================================
-- 2. PRUNE LEGACY OUTLIER SNAPSHOTS
-- ============================================================================

DELETE FROM public.instagram_competitor_outlier_snapshots
WHERE day_offset > 15;

-- ============================================================================
-- 3. REFRESH MATERIALIZED BASELINE CURVES AND EVALUATE OUTLIERS
-- ============================================================================

REFRESH MATERIALIZED VIEW public.mv_instagram_competitor_day_n_curves;

CALL public.sp_populate_competitor_outlier_snapshots(CURRENT_DATE);
