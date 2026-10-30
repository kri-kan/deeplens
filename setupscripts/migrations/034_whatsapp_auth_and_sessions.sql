-- Migration: 034_whatsapp_auth_and_sessions.sql
-- Description: WhatsApp-First Identity, Cryptographic OTP Requests, Customer Profiles, and 365-Day Long-Lived Sessions
-- Database: deeplens_store

BEGIN;

-- 1. Store Customers (Persistent Customer Identity)
CREATE TABLE IF NOT EXISTS store_customers (
    id VARCHAR(64) PRIMARY KEY, -- e.g. usr_wa_919876543210
    phone VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(128) NULL,
    email VARCHAR(128) NULL,
    default_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_customers_phone ON store_customers(phone);

-- 2. Store OTP Requests (Rate limiting, cryptographic verification, attempt counting)
CREATE TABLE IF NOT EXISTS store_otp_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    otp_hash VARCHAR(128) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    attempts_count INT NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_otp_phone_created ON store_otp_requests(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_otp_device_created ON store_otp_requests(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_otp_expires ON store_otp_requests(expires_at);

-- 3. Store Customer Sessions (Long-lived 365-day sessions)
CREATE TABLE IF NOT EXISTS store_customer_sessions (
    session_token VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_user ON store_customer_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_device ON store_customer_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_phone ON store_customer_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_expires ON store_customer_sessions(expires_at);

COMMIT;
