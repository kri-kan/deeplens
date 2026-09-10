-- =============================================================================
-- Migration 021: Store Products, Curation Workbench & Audit History
-- Decoupled Store Domain with Role-Based Curation and Margin Engine
-- =============================================================================

CREATE TABLE IF NOT EXISTS store_color_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vayyari_product_id UUID NOT NULL,
    product_code VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_name VARCHAR(100) NOT NULL DEFAULT 'Sarees',
    fabric VARCHAR(100),
    base_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    mrp DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    sale_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'available', -- 'available', 'few_left', 'sold_out', 'out_of_stock'
    stock_quantity INT NOT NULL DEFAULT 10,
    color_group_id UUID REFERENCES store_color_groups(id) ON DELETE SET NULL,
    colorway_name VARCHAR(64) NOT NULL DEFAULT 'Standard',
    color_hex VARCHAR(16) NOT NULL DEFAULT '#1B4D3E',
    media_order JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, url, mediaType, order, dwellSeconds, isCover }
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_store_products_vayyari_id UNIQUE (vayyari_product_id)
);

CREATE TABLE IF NOT EXISTS store_product_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
    action_type VARCHAR(64) NOT NULL, -- 'created', 'price_updated', 'lifecycle_changed', 'media_reordered', 'tags_modified'
    field_name VARCHAR(64),
    old_value TEXT,
    new_value TEXT,
    author_email VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast queries and filtering
CREATE INDEX IF NOT EXISTS idx_store_products_vayyari_id ON store_products(vayyari_product_id);
CREATE INDEX IF NOT EXISTS idx_store_products_category ON store_products(category_name);
CREATE INDEX IF NOT EXISTS idx_store_products_lifecycle ON store_products(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_store_products_published_at ON store_products(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_products_color_group ON store_products(color_group_id);
CREATE INDEX IF NOT EXISTS idx_store_product_audit_product ON store_product_audit(store_product_id, created_at DESC);
