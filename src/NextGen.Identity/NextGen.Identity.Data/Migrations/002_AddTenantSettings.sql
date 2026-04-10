-- Migration: Add Settings column to Tenants table
-- Version: 1.1.0

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS settings TEXT;

COMMENT ON COLUMN tenants.settings IS 'Tenant-specific configurations stored as JSON (e.g. thumbnails, custom limits)';
