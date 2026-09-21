-- Migration 025: Add Collab Curation Status and Target Collab Accounts Schema to competitor_videos
-- Supports Collab Planner curation lifecycle and AVD Maestro automation queue

ALTER TABLE competitor_videos 
ADD COLUMN IF NOT EXISTS collab_curation_status varchar(30) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS target_collab_accounts jsonb DEFAULT '[]'::jsonb;

-- Create index on collab_curation_status for efficient queue filtering and curation querying
CREATE INDEX IF NOT EXISTS idx_competitor_videos_collab_curation_status 
ON competitor_videos (collab_curation_status);

-- Create index on target_collab_accounts for GIN JSON queries
CREATE INDEX IF NOT EXISTS idx_competitor_videos_target_collab_accounts 
ON competitor_videos USING gin (target_collab_accounts);
