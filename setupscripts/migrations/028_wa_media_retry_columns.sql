-- Migration: 028_wa_media_retry_columns.sql
-- Dedicated columns for WhatsApp media download retry tracking with exponential backoff

ALTER TABLE wa.messages 
ADD COLUMN IF NOT EXISTS media_retry_count INT DEFAULT 0;

ALTER TABLE wa.messages 
ADD COLUMN IF NOT EXISTS media_last_attempt TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_messages_media_retry_backoff
ON wa.messages (media_retry_count, media_last_attempt, "timestamp")
WHERE media_type IS NOT NULL AND media_url IS NULL AND is_deleted = false;
