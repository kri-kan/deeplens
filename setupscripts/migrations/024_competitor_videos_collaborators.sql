-- Migration 024: Add collaborators jsonb column to competitor_videos
-- Allows retaining multi-author co-author producers and tagged collaborators during Instagram scraping without Graph API

ALTER TABLE competitor_videos 
ADD COLUMN IF NOT EXISTS collaborators jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_competitor_videos_collaborators 
ON competitor_videos USING gin (collaborators);
