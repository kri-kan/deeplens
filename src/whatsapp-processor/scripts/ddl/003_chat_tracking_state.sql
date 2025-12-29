-- Table: chat_tracking_state
-- Description: Stores tracking state for each chat (exclusion, resume mode, etc.)
-- Database: whatsapp_vayyari_data

CREATE TABLE IF NOT EXISTS chat_tracking_state (
    -- Primary Key
    jid VARCHAR(255) PRIMARY KEY,
    
    -- Tracking State
    is_excluded BOOLEAN DEFAULT FALSE,
    
    -- Last Processed Message
    last_processed_message_id VARCHAR(255),
    last_processed_timestamp BIGINT,
    
    -- Exclusion Information
    excluded_at TIMESTAMP,
    excluded_by VARCHAR(255),
    
    -- Resume Mode
    resume_mode VARCHAR(20) CHECK (resume_mode IN ('from_last', 'from_now')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign Key
    CONSTRAINT fk_tracking_state_chat FOREIGN KEY (jid) REFERENCES chats(jid) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tracking_state_is_excluded ON chat_tracking_state(is_excluded);
CREATE INDEX IF NOT EXISTS idx_tracking_state_excluded_at ON chat_tracking_state(excluded_at);

-- Comments
COMMENT ON TABLE chat_tracking_state IS 'Stores tracking state for each chat';
COMMENT ON COLUMN chat_tracking_state.jid IS 'Chat JID (foreign key to chats)';
COMMENT ON COLUMN chat_tracking_state.is_excluded IS 'Whether chat is excluded from tracking';
COMMENT ON COLUMN chat_tracking_state.last_processed_message_id IS 'Last message ID that was processed';
COMMENT ON COLUMN chat_tracking_state.last_processed_timestamp IS 'Timestamp of last processed message';
COMMENT ON COLUMN chat_tracking_state.resume_mode IS 'Resume mode when re-including: from_last or from_now';
