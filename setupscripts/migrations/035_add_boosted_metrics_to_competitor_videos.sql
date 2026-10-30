-- Migration 035: Add is_boosted and boosted_metrics to competitor_videos
-- Flags boosted/promoted Instagram posts and stores Instagram ad insights graph metrics

ALTER TABLE competitor_videos
ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS boosted_metrics JSONB NULL;

CREATE INDEX IF NOT EXISTS idx_competitor_videos_is_boosted 
ON competitor_videos (is_boosted) 
WHERE is_boosted IS TRUE;
