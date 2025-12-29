-- Table: chats
-- Description: Stores all WhatsApp chats (individual and group)
-- Database: whatsapp_vayyari_data

CREATE TABLE IF NOT EXISTS chats (
    -- Primary Key
    jid VARCHAR(255) PRIMARY KEY,
    
    -- Chat Information
    name VARCHAR(500) NOT NULL,
    is_group BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chats_is_group ON chats(is_group);
CREATE INDEX IF NOT EXISTS idx_chats_last_message_at ON chats(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_name ON chats(name);

-- Comments
COMMENT ON TABLE chats IS 'Stores all WhatsApp chats (individual and group)';
COMMENT ON COLUMN chats.jid IS 'WhatsApp JID (unique identifier)';
COMMENT ON COLUMN chats.name IS 'Chat or group name';
COMMENT ON COLUMN chats.is_group IS 'Whether this is a group chat';
COMMENT ON COLUMN chats.metadata IS 'Additional metadata (group info, participants, etc.)';
