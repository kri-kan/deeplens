-- Table: processing_state
-- Description: Stores global processing state (pause/resume)
-- Database: whatsapp_vayyari_data

CREATE TABLE IF NOT EXISTS processing_state (
    -- Singleton table - only one row
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    
    -- Processing State
    is_paused BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    paused_at TIMESTAMP,
    resumed_at TIMESTAMP,
    
    -- Metadata
    paused_by VARCHAR(255),
    pause_reason TEXT,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default row
INSERT INTO processing_state (id, is_paused) 
VALUES (1, FALSE) 
ON CONFLICT (id) DO NOTHING;

-- Comments
COMMENT ON TABLE processing_state IS 'Stores global processing state (pause/resume) - singleton table';
COMMENT ON COLUMN processing_state.id IS 'Always 1 - ensures only one row exists';
COMMENT ON COLUMN processing_state.is_paused IS 'Whether message processing is paused';
COMMENT ON COLUMN processing_state.paused_at IS 'When processing was paused';
COMMENT ON COLUMN processing_state.resumed_at IS 'When processing was resumed';
