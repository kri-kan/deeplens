-- [NEW] Migration for Scraper Logging Table
-- Created: 2026-05-01

CREATE TABLE IF NOT EXISTS scraper_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES scraper_history(job_id) ON DELETE CASCADE,
    log_level VARCHAR(20) NOT NULL, -- INFO, WARNING, ERROR, DEBUG
    message TEXT NOT NULL,
    raw_payload JSONB, -- The raw JSON from Meta API or other source
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by job_id
CREATE INDEX IF NOT EXISTS idx_scraper_logs_job_id ON scraper_logs(job_id);

-- Optional: Add a column to scraper_queue if we want to link logs to pending jobs too
-- But usually, logs start when a job is picked up and assigned a job_id (which exists in history)
