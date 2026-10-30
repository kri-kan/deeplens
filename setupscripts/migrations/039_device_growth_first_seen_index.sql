-- Migration: 039_device_growth_first_seen_index.sql
-- Description: Indexes for rapid daily acquisition queries (first-seen devices & users)
-- Database: deeplens_store

BEGIN;

CREATE INDEX IF NOT EXISTS idx_store_devices_first_seen ON store_devices(first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_telemetry_signals_user_first_seen ON store_telemetry_signals(user_id, server_timestamp) WHERE user_id IS NOT NULL;

COMMIT;
