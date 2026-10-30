-- Migration: Add GIN Trigram indexes for fast typo-tolerant store product search
-- Database: deeplens_store

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_store_products_title_trgm ON products USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_store_products_product_code_trgm ON products USING gin (product_code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_store_products_fabric_trgm ON products USING gin (fabric gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_store_products_colorway_trgm ON products USING gin (colorway_name gin_trgm_ops);
