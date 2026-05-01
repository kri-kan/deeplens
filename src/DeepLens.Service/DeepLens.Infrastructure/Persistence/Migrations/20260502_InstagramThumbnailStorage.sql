-- Migration: Add Instagram Thumbnail Storage support
-- Created: 2026-05-02

-- 1. Add storage_path to competitor_videos for MinIO reference
ALTER TABLE competitor_videos ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 2. Add is_data_deleted to competitor_watchlist to track data state
ALTER TABLE competitor_watchlist ADD COLUMN IF NOT EXISTS is_data_deleted BOOLEAN DEFAULT FALSE;

-- 3. Add index on storage_path for future lookups
CREATE INDEX IF NOT EXISTS idx_competitor_videos_storage_path ON competitor_videos(storage_path);
