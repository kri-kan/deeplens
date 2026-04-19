-- =====================================================
-- Centralized Attachments Registry for MinIO
-- =====================================================

CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_name VARCHAR(63) NOT NULL,
    object_key TEXT NOT NULL,
    content_type VARCHAR(100),
    file_size_bytes BIGINT,
    original_filename VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for searching by original filename or metadata
CREATE INDEX idx_attachments_original_filename ON attachments(original_filename);
CREATE INDEX idx_attachments_metadata ON attachments USING GIN (metadata);

COMMENT ON TABLE attachments IS 'Centralized registry for all files uploaded to MinIO across the DeepLens platform';
COMMENT ON COLUMN attachments.id IS 'The unique ID used to reference this file in other tables';
COMMENT ON COLUMN attachments.object_key IS 'The full path/key inside the MinIO bucket';
