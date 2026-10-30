-- Migration: 032_device_profiles_identity_sessions.sql
-- Description: Device Profiles, Identity Graph Links, and Session Summaries (Epic 2 & Epic 3)
-- Database: deeplens_store

BEGIN;

-- 1. Enhance store_devices with persistent profiling, identity, and taste vectors
ALTER TABLE store_devices
    ADD COLUMN IF NOT EXISTS primary_user_id VARCHAR(64) NULL,
    ADD COLUMN IF NOT EXISTS is_identified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS household_cluster_id VARCHAR(64) NULL,
    ADD COLUMN IF NOT EXISTS total_sessions INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS total_orders INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS taste_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_store_devices_primary_user ON store_devices(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_store_devices_household ON store_devices(household_cluster_id);

-- 2. Identity Graph: Map anonymous devices to authenticated customer accounts (WhatsApp / Phone)
CREATE TABLE IF NOT EXISTS store_identity_links (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL REFERENCES store_devices(device_id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
    link_source VARCHAR(32) NOT NULL, -- 'otp_login', 'shared_cart', 'whatsapp_link', 'ip_household'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_device_user_link UNIQUE(device_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_identity_links_user ON store_identity_links(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_links_device ON store_identity_links(device_id);

-- 3. Session Summaries (Aggregated from Raw Telemetry Signals)
CREATE TABLE IF NOT EXISTS store_session_summaries (
    session_id VARCHAR(64) PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL REFERENCES store_devices(device_id) ON DELETE CASCADE,
    user_id VARCHAR(64) NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    landing_page VARCHAR(255) NULL,
    exit_page VARCHAR(255) NULL,
    utm_source VARCHAR(64) NULL,
    utm_campaign VARCHAR(64) NULL,
    total_page_views INT NOT NULL DEFAULT 1,
    products_viewed INT NOT NULL DEFAULT 0,
    swatches_explored INT NOT NULL DEFAULT 0,
    bag_additions INT NOT NULL DEFAULT 0,
    reached_checkout BOOLEAN NOT NULL DEFAULT FALSE,
    converted BOOLEAN NOT NULL DEFAULT FALSE,
    order_id VARCHAR(64) NULL,
    session_journey JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_summaries_device ON store_session_summaries(device_id);
CREATE INDEX IF NOT EXISTS idx_session_summaries_user ON store_session_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_session_summaries_start_time ON store_session_summaries(start_time DESC);

COMMIT;
