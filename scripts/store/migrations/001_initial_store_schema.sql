-- =============================================================================
-- Migration: 001_initial_store_schema.sql
-- Database:  deeplens_store
-- Purpose:   Clean, unprefixed tables for Products, Swatches, Carts, Orders,
--            and Central MinIO Media Asset Registry with Zero-Orphan cascading.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── 1. Ethnic Swatch Color Groups ──
CREATE TABLE IF NOT EXISTS color_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Store Products (Customer Read Model) ──
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vayyari_product_id UUID NOT NULL UNIQUE,
    product_code VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_name VARCHAR(100) NOT NULL DEFAULT 'Sarees',
    fabric VARCHAR(100),
    base_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    mrp DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    sale_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'available',
    stock_quantity INT NOT NULL DEFAULT 10,
    color_group_id UUID REFERENCES color_groups(id) ON DELETE SET NULL,
    colorway_name VARCHAR(64) NOT NULL DEFAULT 'Standard',
    color_hex VARCHAR(16) NOT NULL DEFAULT '#1B4D3E',
    swatch_template VARCHAR(32) NOT NULL DEFAULT 'solid',
    media_order JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_name);
CREATE INDEX IF NOT EXISTS idx_products_lifecycle ON products(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_products_published_at ON products(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_tags_gin ON products USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_products_title_trgm ON products USING gin (title gin_trgm_ops);

-- ── 3. Central MinIO Media Asset Registry (Tracks 100% of MinIO Files) ──
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_name VARCHAR(64) NOT NULL DEFAULT 'store-assets',
    storage_key VARCHAR(512) NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    byte_size BIGINT NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    media_type VARCHAR(32) NOT NULL,             -- 'image' | 'video' | 'document'
    width INT,
    height INT,
    duration_seconds NUMERIC(8, 2),
    aspect_ratio NUMERIC(5, 4),
    owner_type VARCHAR(64) NOT NULL,              -- 'product' | 'category' | 'campaign' | 'weaver'
    owner_id UUID NOT NULL,
    derivative_type VARCHAR(32) NOT NULL,         -- 'original' | 'zoom' | 'pdp' | 'card' | 'thumb'
    parent_asset_id UUID REFERENCES media_assets(id) ON DELETE CASCADE,
    processing_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_owner ON media_assets(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_parent ON media_assets(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets(processing_status);
CREATE INDEX IF NOT EXISTS idx_media_assets_storage_key ON media_assets(storage_key);

-- ── Real-Time Storage Audit View ──
CREATE OR REPLACE VIEW v_media_storage_summary AS
SELECT 
    owner_type,
    derivative_type,
    COUNT(*) AS asset_count,
    SUM(byte_size) AS total_bytes,
    ROUND(SUM(byte_size) / (1024.0 * 1024.0), 2) AS total_mb
FROM media_assets
WHERE is_deleted = false
GROUP BY owner_type, derivative_type;

-- ── 4. Product Audits ──
CREATE TABLE IF NOT EXISTS product_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    action_type VARCHAR(64) NOT NULL,
    field_name VARCHAR(64),
    old_value TEXT,
    new_value TEXT,
    author_email VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_audits_product ON product_audits(product_id, created_at DESC);

-- ── 5. Anonymous & Customer Carts (30-Day TTL) ──
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(128) NOT NULL UNIQUE,
    share_token VARCHAR(32) NOT NULL UNIQUE,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_mrp NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    item_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_carts_device ON carts(device_id);
CREATE INDEX IF NOT EXISTS idx_carts_share ON carts(share_token);

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL,
    product_code VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    original_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 1,
    selected_color VARCHAR(64),
    selected_size VARCHAR(32),
    primary_image_uri TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

-- ── 6. Customer Wishlists (100-Day Retention) ──
CREATE TABLE IF NOT EXISTS wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(128) NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    product_code VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    primary_image_uri TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '100 days'),
    CONSTRAINT uq_wishlists_device_product UNIQUE (device_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_device ON wishlists(device_id);

-- ── 7. Customer Orders & Payment State Machine ──
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(64) NOT NULL UNIQUE,
    device_id VARCHAR(128),
    customer_name VARCHAR(128),
    customer_phone VARCHAR(32),
    customer_email VARCHAR(128),
    shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    order_status VARCHAR(32) NOT NULL DEFAULT 'created',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_device ON orders(device_id);
