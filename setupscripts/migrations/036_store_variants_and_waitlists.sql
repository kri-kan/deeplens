-- =============================================================================
-- Migration: 036_store_variants_and_waitlists.sql
-- Description: Variant-First Products Schema & Waitlists (ADO #1339)
-- Database: deeplens_store
-- =============================================================================

BEGIN;

-- 1. Add variant and lifecycle columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_catalog_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_color_group_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_product_code VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS previous_lifecycle_status VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS take_down_expires_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_re_evaluation_pending BOOLEAN DEFAULT FALSE;

-- 2. Data migration for legacy rows:
-- Suffix single rows with '01' if un-suffixed (e.g. length <= 8),
-- set parent_catalog_id = vayyari_product_id and parent_product_code = product_code
UPDATE products 
SET product_code = product_code || '01',
    parent_catalog_id = vayyari_product_id,
    parent_product_code = product_code
WHERE parent_catalog_id IS NULL AND length(product_code) <= 8;

-- Fallback for any legacy rows that already had length > 8
UPDATE products 
SET parent_catalog_id = vayyari_product_id,
    parent_product_code = product_code
WHERE parent_catalog_id IS NULL;

-- 3. Update constraints and indexes
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_vayyari_product_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_parent_color 
    ON products(parent_catalog_id, catalog_color_group_id) 
    WHERE catalog_color_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_parent_catalog_id 
    ON products(parent_catalog_id);

-- 4. Customer Waitlist Table
CREATE TABLE IF NOT EXISTS product_waitlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_waitlist_customer UNIQUE (product_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_product_waitlists_product_id ON product_waitlists(product_id);
CREATE INDEX IF NOT EXISTS idx_product_waitlists_customer_id ON product_waitlists(customer_id);

COMMIT;
