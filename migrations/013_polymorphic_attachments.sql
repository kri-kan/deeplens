-- =====================================================
-- Polymorphic Entity Attachments Registry
-- =====================================================

CREATE TABLE IF NOT EXISTS entity_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attachment_id UUID NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
    
    -- Polymorphic Pointer
    entity_type VARCHAR(50) NOT NULL, -- 'order', 'item', 'category', 'product', 'vendor', etc.
    entity_id TEXT NOT NULL,         -- Stored as text to accommodate both integer and UUID keys
    
    -- Metadata
    tag VARCHAR(50),                 -- 'primary', 'receipt', 'reference', 'design_sketch'
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by entity
CREATE INDEX idx_entity_attachments_lookup ON entity_attachments(entity_type, entity_id);

COMMENT ON TABLE entity_attachments IS 'Universal junction table linking any business entity to attachments stored in MinIO';
COMMENT ON COLUMN entity_attachments.entity_type IS 'The name of the table or business entity (e.g., order, category)';
COMMENT ON COLUMN entity_attachments.entity_id IS 'The primary key of the related entity (stored as string for flexibility)';
