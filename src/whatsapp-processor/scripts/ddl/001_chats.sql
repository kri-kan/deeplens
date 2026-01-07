-- Enhanced Chat Schema for WhatsApp-like Interface
-- Support: unread counts, last message ordering, pinning, archiving

CREATE TABLE IF NOT EXISTS chats (
    -- Primary Key
    jid VARCHAR(255) PRIMARY KEY,
    
    -- Chat Information
    name VARCHAR(500) NOT NULL,
    is_group BOOLEAN DEFAULT FALSE,
    is_announcement BOOLEAN DEFAULT FALSE,
    
    -- WhatsApp-like UI Support
    unread_count INTEGER DEFAULT 0,
    last_message_text TEXT,
    last_message_timestamp BIGINT, -- Unix timestamp for sorting
    last_message_from_me BOOLEAN DEFAULT FALSE,
    
    -- Chat Status
    is_archived BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    pin_order INTEGER DEFAULT 0, -- Higher = more important
    is_muted BOOLEAN DEFAULT FALSE,
    mute_until_timestamp BIGINT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP, -- Converted from last_message_timestamp
    
    -- WhatsApp-specific flags
    is_contact BOOLEAN DEFAULT FALSE,
    canonical_jid VARCHAR(255),
    
    -- Message Grouping Control
    enable_message_grouping BOOLEAN DEFAULT FALSE,
    grouping_config JSONB DEFAULT '{}'::jsonb,
    
    -- Sync Control
    deep_sync_enabled BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for WhatsApp-like UI Performance
CREATE INDEX IF NOT EXISTS idx_chats_last_message_timestamp ON chats(last_message_timestamp DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_chats_unread_count ON chats(unread_count) WHERE unread_count > 0;
CREATE INDEX IF NOT EXISTS idx_chats_pinned ON chats(is_pinned, pin_order DESC) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_chats_archived ON chats(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_chats_is_group ON chats(is_group);
CREATE INDEX IF NOT EXISTS idx_chats_is_announcement ON chats(is_announcement);
CREATE INDEX IF NOT EXISTS idx_chats_enable_grouping ON chats(enable_message_grouping) WHERE enable_message_grouping = true;
CREATE INDEX IF NOT EXISTS idx_chats_name_search ON chats USING gin(to_tsvector('english', name));

-- Function to update last_message_at from timestamp
CREATE OR REPLACE FUNCTION update_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_message_timestamp IS NOT NULL THEN
        NEW.last_message_at = to_timestamp(NEW.last_message_timestamp);
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_message_at ON chats;
CREATE TRIGGER trigger_update_last_message_at
    BEFORE INSERT OR UPDATE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_last_message_at();

-- Function to get chats ordered like WhatsApp
CREATE OR REPLACE FUNCTION get_chats_whatsapp_style(
    p_include_archived BOOLEAN DEFAULT FALSE,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    jid VARCHAR,
    name VARCHAR,
    is_group BOOLEAN,
    is_announcement BOOLEAN,
    unread_count INTEGER,
    last_message_text TEXT,
    last_message_timestamp BIGINT,
    last_message_from_me BOOLEAN,
    is_pinned BOOLEAN,
    is_archived BOOLEAN,
    is_muted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.jid,
        c.name,
        c.is_group,
        c.is_announcement,
        c.unread_count,
        c.last_message_text,
        c.last_message_timestamp,
        c.last_message_from_me,
        c.is_pinned,
        c.is_archived,
        c.is_muted
    FROM chats c
    WHERE 
        (p_include_archived = TRUE OR c.is_archived = FALSE)
    ORDER BY
        -- Pinned chats first (by pin order)
        c.is_pinned DESC,
        c.pin_order DESC,
        -- Then by last message timestamp
        c.last_message_timestamp DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to increment unread count
CREATE OR REPLACE FUNCTION increment_unread_count(p_jid VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE chats
    SET unread_count = unread_count + 1,
        updated_at = NOW()
    WHERE jid = p_jid;
END;
$$ LANGUAGE plpgsql;

-- Function to reset unread count (when user opens chat)
CREATE OR REPLACE FUNCTION reset_unread_count(p_jid VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE chats
    SET unread_count = 0,
        updated_at = NOW()
    WHERE jid = p_jid;
END;
$$ LANGUAGE plpgsql;

-- Function to update last message
CREATE OR REPLACE FUNCTION update_last_message(
    p_jid VARCHAR,
    p_message_text TEXT,
    p_timestamp BIGINT,
    p_from_me BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE chats
    SET last_message_text = p_message_text,
        last_message_timestamp = p_timestamp,
        last_message_from_me = p_from_me,
        updated_at = NOW()
    WHERE jid = p_jid;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE chats IS 'Enhanced chat table for WhatsApp-like UI with unread counts and ordering';
COMMENT ON COLUMN chats.unread_count IS 'Number of unread messages in this chat';
COMMENT ON COLUMN chats.last_message_text IS 'Preview text of last message';
COMMENT ON COLUMN chats.last_message_timestamp IS 'Unix timestamp of last message for sorting';
COMMENT ON COLUMN chats.is_pinned IS 'Whether chat is pinned to top';
COMMENT ON COLUMN chats.pin_order IS 'Order of pinned chats (higher = more important)';
COMMENT ON COLUMN chats.is_archived IS 'Whether chat is archived';
COMMENT ON COLUMN chats.is_muted IS 'Whether notifications are muted';
COMMENT ON COLUMN chats.enable_message_grouping IS 'Whether messages from this chat should be grouped and processed';
COMMENT ON COLUMN chats.grouping_config IS 'Configuration rules for message grouping (strategy, thresholds, etc)';
COMMENT ON COLUMN chats.deep_sync_enabled IS 'Whether full history sync is requested for this chat';

-- Example Queries

-- Get all chats ordered like WhatsApp (pinned first, then by last message)
-- SELECT * FROM get_chats_whatsapp_style(false, 50, 0);

-- Get unread chats only
-- SELECT * FROM chats WHERE unread_count > 0 ORDER BY last_message_timestamp DESC;

-- Get pinned chats
-- SELECT * FROM chats WHERE is_pinned = true ORDER BY pin_order DESC, last_message_timestamp DESC;

-- Search chats by name
-- SELECT * FROM chats WHERE to_tsvector('english', name) @@ to_tsquery('english', 'john');
