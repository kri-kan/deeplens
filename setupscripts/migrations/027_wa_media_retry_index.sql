-- Migration: 027_wa_media_retry_index.sql
-- Optimizes background media retry queue queries for wa.messages

CREATE INDEX IF NOT EXISTS idx_messages_missing_media_retry
ON wa.messages (processing_retry_count, processing_last_attempt, "timestamp")
WHERE media_type IS NOT NULL AND media_url IS NULL AND is_deleted = false;
