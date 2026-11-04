-- Migration: 20261105_create_publish_jobs_table.sql
-- Target Database: deeplens_store
-- Purpose: Schema for tracking asynchronous product publishing and delta update sync jobs

CREATE TABLE IF NOT EXISTS publish_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(32) NOT NULL,            -- 'initial_publish' | 'sync_updates'
    status VARCHAR(32) NOT NULL,            -- 'queued' | 'in_progress' | 'completed' | 'failed' | 'partial'
    total_count INT NOT NULL DEFAULT 0,
    processed_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    error_details JSONB DEFAULT '[]'::jsonb,
    requested_by VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publish_jobs_status ON publish_jobs (status);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_created_at ON publish_jobs (created_at DESC);
