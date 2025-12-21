-- =====================================================
-- Migration: Rename Images to Media and support Videos
-- =====================================================

-- This script should be run in each tenant database.
-- For the template database:
-- \c tenant_metadata_template;

-- 1. Rename the table
ALTER TABLE images RENAME TO media;

-- 2. Add columns to support multiple media types
ALTER TABLE media ADD COLUMN IF NOT EXISTS media_type SMALLINT DEFAULT 1; -- 1=Image, 2=Video
ALTER TABLE media ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC;
ALTER TABLE media ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(500); -- Path to poster frame/thumbnail
ALTER TABLE media ADD COLUMN IF NOT EXISTS preview_path VARCHAR(500); -- Path to short GIF/preview
ALTER TABLE media ADD COLUMN IF NOT EXISTS bitrate INT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS codec VARCHAR(50);

-- 3. Rename ID column references (optional but good for consistency, 
-- though we'll keep the actual column name 'id' for the table itself)

-- 4. Update the image_deletion_queue to be media_deletion_queue
ALTER TABLE image_deletion_queue RENAME TO media_deletion_queue;
ALTER TABLE media_deletion_queue RENAME COLUMN image_id TO media_id;

-- 5. Update indexes
ALTER INDEX idx_images_phash RENAME TO idx_media_phash;
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);

COMMENT ON COLUMN media.media_type IS '1=Image, 2=Video';
COMMENT ON COLUMN media.status IS '0=Uploaded, 1=Processed, 2=Indexed, 98=PendingDelete, 99=Failed';
