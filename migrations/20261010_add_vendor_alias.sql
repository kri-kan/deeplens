-- Migration: Add alias column to Vendors table for daily casual vendor name
-- Date: 2026-10-10

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS alias character varying(255);
CREATE INDEX IF NOT EXISTS idx_vendors_alias ON vendors(alias);
