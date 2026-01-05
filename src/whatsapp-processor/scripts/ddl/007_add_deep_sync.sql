-- Migration: Add deep_sync_enabled to chats
ALTER TABLE chats ADD COLUMN IF NOT EXISTS deep_sync_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN chats.deep_sync_enabled IS 'Whether full history sync is requested for this chat';
