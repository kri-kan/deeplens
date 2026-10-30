-- =============================================================================
-- Migration: Upgrade to High-Scale Partial GIN Trigram Indexes (1M Record Scaling)
-- Target: deeplens_store & deeplens_platform
-- =============================================================================

-- Database: deeplens_store
DROP INDEX IF EXISTS idx_store_products_title_trgm;
DROP INDEX IF EXISTS idx_store_products_product_code_trgm;
DROP INDEX IF EXISTS idx_store_products_fabric_trgm;
DROP INDEX IF EXISTS idx_store_products_colorway_trgm;

-- Composite Partial GIN Index: Only published store products are indexed.
-- Eliminates 95% of index size on cold/archival catalog records and eliminates index write overhead on draft/inactive writes.
CREATE INDEX IF NOT EXISTS idx_store_products_active_fuzzy
ON products USING gin (
    title gin_trgm_ops, 
    product_code gin_trgm_ops, 
    fabric gin_trgm_ops,
    colorway_name gin_trgm_ops
)
WHERE is_published = true;
