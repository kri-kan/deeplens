-- =============================================================================
-- Migration: 020_store_beta_carts_and_wishlists.sql
-- Description: Anonymous device-synced cart (30-day TTL) and wishlist (100-day TTL)
--              with unique public share tokens for 1-click WhatsApp order handoffs.
-- =============================================================================

-- 1. Anonymous Store Carts
CREATE TABLE IF NOT EXISTS store_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(128) NOT NULL UNIQUE,
    share_token VARCHAR(32) NOT NULL UNIQUE,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_mrp NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    item_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_store_carts_device_id ON store_carts(device_id);
CREATE INDEX IF NOT EXISTS idx_store_carts_share_token ON store_carts(share_token);
CREATE INDEX IF NOT EXISTS idx_store_carts_expires_at ON store_carts(expires_at);

-- 2. Store Cart Items
CREATE TABLE IF NOT EXISTS store_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES store_carts(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL,
    product_code VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    original_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 1,
    selected_color VARCHAR(64),
    selected_size VARCHAR(32),
    primary_image_uri TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_cart_items_cart_id ON store_cart_items(cart_id);

-- 3. Anonymous Store Wishlists (100-day retention)
CREATE TABLE IF NOT EXISTS store_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(128) NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    product_code VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    primary_image_uri TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '100 days'),
    CONSTRAINT uq_store_wishlists_device_product UNIQUE (device_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_store_wishlists_device_id ON store_wishlists(device_id);
CREATE INDEX IF NOT EXISTS idx_store_wishlists_expires_at ON store_wishlists(expires_at);
