-- Migration: Add section-level sync toggles to processing_state
-- Description: Adds columns to track whether to sync chats, groups, and announcements

ALTER TABLE processing_state 
ADD COLUMN IF NOT EXISTS track_chats BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS track_groups BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS track_announcements BOOLEAN DEFAULT TRUE;

-- Update comments
COMMENT ON COLUMN processing_state.track_chats IS 'Whether individual 1-on-1 chats should be synced';
COMMENT ON COLUMN processing_state.track_groups IS 'Whether group chats should be synced';
COMMENT ON COLUMN processing_state.track_announcements IS 'Whether community announcement channels should be synced';
