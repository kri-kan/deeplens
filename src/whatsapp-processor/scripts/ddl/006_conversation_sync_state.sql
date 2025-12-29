-- Table: conversation_sync_state
-- Description: Tracks the sync state of each conversation for sparse loading
-- Database: whatsapp_vayyari_data

CREATE TABLE IF NOT EXISTS conversation_sync_state (
    -- Primary Key
    jid VARCHAR(255) PRIMARY KEY REFERENCES chats(jid) ON DELETE CASCADE,
    
    -- Sync Status
    is_fully_synced BOOLEAN DEFAULT FALSE,
    sync_in_progress BOOLEAN DEFAULT FALSE,
    
    -- Sync Metadata
    last_synced_message_timestamp BIGINT, -- Unix timestamp of last synced message
    total_messages_synced INTEGER DEFAULT 0,
    estimated_total_messages INTEGER, -- Estimated from WhatsApp API
    
    -- Timestamps
    first_sync_at TIMESTAMP,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Metadata
    sync_metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conv_sync_fully_synced ON conversation_sync_state(is_fully_synced);
CREATE INDEX IF NOT EXISTS idx_conv_sync_in_progress ON conversation_sync_state(sync_in_progress);
CREATE INDEX IF NOT EXISTS idx_conv_sync_last_synced ON conversation_sync_state(last_sync_at DESC);

-- Comments
COMMENT ON TABLE conversation_sync_state IS 'Tracks sync state for sparse conversation loading';
COMMENT ON COLUMN conversation_sync_state.is_fully_synced IS 'Whether all historical messages have been synced';
COMMENT ON COLUMN conversation_sync_state.sync_in_progress IS 'Whether a sync operation is currently running';
COMMENT ON COLUMN conversation_sync_state.last_synced_message_timestamp IS 'Timestamp of the oldest synced message';
