-- =====================================================
-- Polymorphic Comments System with Multi-Attachment Support
-- =====================================================

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Polymorphic Reference
    entity_type VARCHAR(50) NOT NULL, -- 'order', 'item', 'product', etc.
    entity_id TEXT NOT NULL,
    
    -- Content
    author_id UUID,                  -- Optional link to auth user
    content TEXT NOT NULL,
    
    -- Attachment Registry Links 
    -- We store the UUIDs from the centralized attachments table
    attachment_ids UUID[] DEFAULT '{}', 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for timeline lookups
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id, created_at DESC);

-- GIN index for searching through attachment references
CREATE INDEX idx_comments_attachments ON comments USING GIN (attachment_ids);

COMMENT ON TABLE comments IS 'Structured messages/notes for any entity in the system, supporting multiple file attachments per comment';
COMMENT ON COLUMN comments.attachment_ids IS 'Array of UUIDs referring to the centralized attachments table';
