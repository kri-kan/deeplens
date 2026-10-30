-- Migration: 033_telemetry_hourly_metrics.sql
-- Description: Persistent Hourly Active Users & Device Metrics for >30-day Long-Term Analytics
-- Database: deeplens_store

BEGIN;

CREATE TABLE IF NOT EXISTS store_telemetry_hourly_metrics (
    bucket_hour TIMESTAMPTZ PRIMARY KEY, -- Truncated to UTC hour
    hour_of_day_ist INT NOT NULL,       -- 0 to 23 in IST (Asia/Kolkata)
    day_of_week_ist INT NOT NULL,       -- 0 (Sun) to 6 (Sat)
    active_devices INT NOT NULL DEFAULT 0,
    active_users INT NOT NULL DEFAULT 0,
    total_events INT NOT NULL DEFAULT 0,
    total_sessions INT NOT NULL DEFAULT 0,
    platform_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hourly_metrics_ist_hour ON store_telemetry_hourly_metrics(hour_of_day_ist);
CREATE INDEX IF NOT EXISTS idx_hourly_metrics_bucket_hour ON store_telemetry_hourly_metrics(bucket_hour DESC);

COMMIT;
