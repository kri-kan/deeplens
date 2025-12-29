-- Table: messages
-- Description: Stores all WhatsApp messages
-- Database: whatsapp_vayyari_data

CREATE TABLE IF NOT EXISTS messages (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- Message Identification
    message_id VARCHAR(255) UNIQUE NOT NULL,
    jid VARCHAR(255) NOT NULL,
    
    -- Message Content
    content TEXT,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text',
    
    -- Media Information
    media_type VARCHAR(50),
    media_url TEXT,
    media_size BIGINT,
    media_mime_type VARCHAR(100),
    
    -- Sender Information
    sender VARCHAR(255),
    sender_name VARCHAR(500),
    
    -- Timestamps
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Message Status
    is_from_me BOOLEAN DEFAULT FALSE,
    is_forwarded BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Additional Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Foreign Key
    CONSTRAINT fk_messages_chat FOREIGN KEY (jid) REFERENCES chats(jid) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_jid ON messages(jid);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_media_type ON messages(media_type) WHERE media_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Full-text search index for message content
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(to_tsvector('english', content)) WHERE content IS NOT NULL;

-- Comments
COMMENT ON TABLE messages IS 'Stores all WhatsApp messages';
COMMENT ON COLUMN messages.message_id IS 'WhatsApp message ID (unique)';
COMMENT ON COLUMN messages.jid IS 'Chat JID (foreign key to chats)';
COMMENT ON COLUMN messages.content IS 'Message text content';
COMMENT ON COLUMN messages.message_type IS 'Type: text, image, video, audio, document, etc.';
COMMENT ON COLUMN messages.media_url IS 'MinIO URL for media files';
COMMENT ON COLUMN messages.timestamp IS 'Unix timestamp from WhatsApp';
COMMENT ON COLUMN messages.metadata IS 'Additional metadata (reactions, mentions, etc.)';
