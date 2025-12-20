-- =====================================================
-- DeepLens Tenant Metadata Schema
-- =====================================================

\c tenant_metadata_template;

-- Enable extensions in the template database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Generic Metadata for Tenant Ingestion
CREATE TABLE IF NOT EXISTS ingestion_meta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Broad categories (e.g., Sarees, Lehangas)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    metadata_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Core SKU (The product concept)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    base_sku VARCHAR(100) UNIQUE, -- Master SKU code
    title VARCHAR(255),
    tags TEXT[], -- e.g. ["unstitched", "silk", "bridal"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sub-SKU (Variants like Color/Pattern)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_sku VARCHAR(100), -- Sub SKU
    color VARCHAR(50),
    fabric VARCHAR(100), -- e.g. Silk, Georgette
    stitch_type VARCHAR(50), -- e.g. Stitched, Unstitched, Semi-Stitched
    work_heaviness VARCHAR(50), -- e.g. Heavy, Medium, Low, No
    search_keywords TEXT[], -- Flexible kwywords for search (occasion, patterns, etc.)
    attributes_json JSONB, -- Custom specs/extended attributes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_keywords ON product_variants USING GIN (search_keywords);
CREATE INDEX IF NOT EXISTS idx_product_variants_attributes ON product_variants USING GIN (attributes_json);

-- Images table (The core entity we process)
CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    storage_path VARCHAR(500) NOT NULL, -- Bucket/Path in MinIO
    original_filename VARCHAR(255),
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    status SMALLINT DEFAULT 0, -- 0=Uploaded, 1=Processed, 2=Indexed, 99=Failed
    vector_id UUID, -- Reference to Qdrant point
    phash VARCHAR(64), -- Perceptual hash for dedupe
    is_default BOOLEAN DEFAULT FALSE, -- Marked for quick sharing
    quality_score NUMERIC, -- AI or resolution based quality score
    features_extracted BOOLEAN DEFAULT FALSE,
    indexed BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata_json JSONB
);

-- The "Offer" from a specific Seller
CREATE TABLE IF NOT EXISTS seller_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    seller_id VARCHAR(100) NOT NULL, -- External Seller Identity
    external_id VARCHAR(100), -- Seller's own ID for this product
    price DECIMAL(18, 2),
    currency VARCHAR(10) DEFAULT 'INR',
    description TEXT, -- Original unstructured content
    url VARCHAR(500),
    raw_data_json JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(base_sku);
CREATE INDEX IF NOT EXISTS idx_seller_listings_seller ON seller_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
