-- Migration: Add processing queue columns to messages table
-- Date: 2026-01-08
-- Description: Adds columns needed for Kafka-based message processing queue

-- Add processing_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'processing_status'
    ) THEN
        ALTER TABLE messages ADD COLUMN processing_status VARCHAR(20) DEFAULT 'pending';
        CREATE INDEX idx_messages_processing_status ON messages(processing_status, timestamp) WHERE processing_status IN ('pending', 'ready', 'queued');
        COMMENT ON COLUMN messages.processing_status IS 'Processing queue status: pending, ready, queued, processing, processed, failed';
    END IF;
END $$;

-- Add processing_retry_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'processing_retry_count'
    ) THEN
        ALTER TABLE messages ADD COLUMN processing_retry_count INTEGER DEFAULT 0;
        COMMENT ON COLUMN messages.processing_retry_count IS 'Number of processing attempts';
    END IF;
END $$;

-- Add processing_last_attempt column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'processing_last_attempt'
    ) THEN
        ALTER TABLE messages ADD COLUMN processing_last_attempt TIMESTAMP;
        CREATE INDEX idx_messages_processing_retry ON messages(processing_retry_count, processing_last_attempt) WHERE processing_status = 'failed';
        COMMENT ON COLUMN messages.processing_last_attempt IS 'Last time processing was attempted';
    END IF;
END $$;

-- Add processing_completed_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'processing_completed_at'
    ) THEN
        ALTER TABLE messages ADD COLUMN processing_completed_at TIMESTAMP;
        COMMENT ON COLUMN messages.processing_completed_at IS 'When processing completed successfully';
    END IF;
END $$;

-- Add processing_error column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'processing_error'
    ) THEN
        ALTER TABLE messages ADD COLUMN processing_error TEXT;
        COMMENT ON COLUMN messages.processing_error IS 'Error message if processing failed';
    END IF;
END $$;

-- Update existing messages to 'ready' status (they're already in the DB, so ready to process)
UPDATE messages 
SET processing_status = 'ready' 
WHERE processing_status = 'pending' OR processing_status IS NULL;

-- Log completion
DO $$ 
BEGIN
    RAISE NOTICE 'Migration completed: Processing queue columns added to messages table';
END $$;
