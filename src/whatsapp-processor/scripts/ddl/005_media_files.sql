-- Table: media_files
-- Description: Stores metadata for all media files uploaded to MinIO
-- Database: whatsapp_vayyari_data

CREATE TABLE IF NOT EXISTS media_files (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- MinIO Information
    minio_bucket VARCHAR(255) NOT NULL,
    minio_object_name TEXT NOT NULL,
    minio_url TEXT NOT NULL UNIQUE,
    
    -- File Information
    original_filename VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    media_type VARCHAR(50) NOT NULL CHECK (media_type IN ('photo', 'video', 'audio', 'document')),
    
    -- Associated Message
    message_id VARCHAR(255),
    jid VARCHAR(255),
    
    -- Upload Information
    uploaded_at TIMESTAMP DEFAULT NOW(),
    upload_status VARCHAR(50) DEFAULT 'completed',
    
    -- DeepLens Migration
    deeplens_bucket VARCHAR(255),
    deeplens_object_name TEXT,
    deeplens_url TEXT,
    migrated_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Foreign Keys
    CONSTRAINT fk_media_message FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE SET NULL,
    CONSTRAINT fk_media_chat FOREIGN KEY (jid) REFERENCES chats(jid) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_message_id ON media_files(message_id);
CREATE INDEX IF NOT EXISTS idx_media_jid ON media_files(jid);
CREATE INDEX IF NOT EXISTS idx_media_type ON media_files(media_type);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media_files(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_migrated ON media_files(migrated_at) WHERE migrated_at IS NOT NULL;

-- Comments
COMMENT ON TABLE media_files IS 'Stores metadata for all media files uploaded to MinIO';
COMMENT ON COLUMN media_files.minio_url IS 'Current MinIO URL (minio://bucket/path)';
COMMENT ON COLUMN media_files.deeplens_url IS 'DeepLens bucket URL after migration';
COMMENT ON COLUMN media_files.media_type IS 'Type: photo, video, audio, document';
COMMENT ON COLUMN media_files.upload_status IS 'Status: pending, completed, failed';
