-- =============================================================================
-- Migration: 037_store_product_skus.sql
-- Description: Add SKUs JSONB Column to Products for Item-Level Curation Controls
-- Database: deeplens_store
-- =============================================================================

BEGIN;

ALTER TABLE products ADD COLUMN IF NOT EXISTS skus JSONB DEFAULT '[]'::jsonb;

COMMIT;
