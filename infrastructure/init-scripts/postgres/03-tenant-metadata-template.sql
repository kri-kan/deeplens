-- =====================================================
-- DeepLens Tenant Metadata Schema
-- =====================================================

\c tenant_metadata_template;

-- Enable extensions in the template database


-- Generic Metadata for Tenant Ingestion
CREATE TABLE IF NOT EXISTS ingestion_meta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master list of Sellers for this Tenant
CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100) UNIQUE, -- ID from WhatsApp/External source
    name VARCHAR(255) NOT NULL,
    contact_info TEXT,
    rating NUMERIC DEFAULT 0,
    is_trusted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Broad categories (e.g., Sarees, Lehangas)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    metadata_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Core SKU (The product concept) - Holds UNION of attributes
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    base_sku VARCHAR(100) UNIQUE, -- Master SKU code
    title VARCHAR(255),
    tags TEXT[], -- Unified tags from all variants/sellers
    unified_attributes JSONB, -- Consolidated attributes (Fabric, Style, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sub-SKU (Variants like Color/Pattern)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_sku VARCHAR(100), -- Sub SKU
    color VARCHAR(50),
    fabric VARCHAR(100), 
    stitch_type VARCHAR(50), 
    work_heaviness VARCHAR(50), 
    search_keywords TEXT[], 
    attributes_json JSONB, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_keywords ON product_variants USING GIN (search_keywords);
CREATE INDEX IF NOT EXISTS idx_product_variants_attributes ON product_variants USING GIN (attributes_json);

-- Media table (Images, Videos, etc.)
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    storage_path VARCHAR(500) NOT NULL, -- Bucket/Path in MinIO
    media_type SMALLINT DEFAULT 1, -- 1=Image, 2=Video
    original_filename VARCHAR(255),
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    status SMALLINT DEFAULT 0, -- 0=Uploaded, 1=Processed, 2=Indexed, 98=PendingDelete, 99=Failed
    vector_id UUID, -- Reference to Qdrant point
    phash VARCHAR(64), -- Perceptual hash for dedupe
    is_default BOOLEAN DEFAULT FALSE, 
    quality_score NUMERIC, 
    width INT,
    height INT,
    duration_seconds NUMERIC,
    thumbnail_path VARCHAR(500), -- Path to poster frame or static thumbnail
    preview_path VARCHAR(500), -- Path to preview (GIF/Short video)
    features_extracted BOOLEAN DEFAULT FALSE,
    indexed BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata_json JSONB
);

-- The "Offer" from a specific Seller
CREATE TABLE IF NOT EXISTS seller_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
    external_id VARCHAR(100), -- Seller's own ID for this product
    current_price DECIMAL(18, 2),
    currency VARCHAR(10) DEFAULT 'INR',
    shipping_info VARCHAR(50) DEFAULT 'plus shipping', -- 'free shipping' or 'plus shipping'
    is_favorite BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT, 
    url VARCHAR(500),
    last_priced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_data_json JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- History of prices for a seller listing
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES seller_listings(id) ON DELETE CASCADE,
    price DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Queue for reliable media deletion (source + thumbnails/previews)
CREATE TABLE IF NOT EXISTS media_deletion_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    deleted_from_disk BOOLEAN DEFAULT FALSE,
    deleted_from_vector BOOLEAN DEFAULT FALSE,
    retries INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(base_sku);
CREATE INDEX IF NOT EXISTS idx_seller_listings_variant ON seller_listings(variant_id);
CREATE INDEX IF NOT EXISTS idx_price_history_listing ON price_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_media_phash ON media(phash);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);

-- =====================================================
-- Vendors/Manufacturers Management
-- =====================================================

-- Stores vendor information for product association
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_code VARCHAR(50), -- Optional short code for easy reference
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vendor contact persons
CREATE TABLE IF NOT EXISTS vendor_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    contact_role VARCHAR(100), -- e.g., "Owner", "Sales Manager", "Production Head"
    phone_number VARCHAR(20),
    alternate_phone VARCHAR(20),
    email VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(tenant_id, vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_vendor ON vendor_contacts(vendor_id);

-- Comments for documentation
COMMENT ON TABLE vendors IS 'Stores vendor/manufacturer information for multi-tenant product catalog';
COMMENT ON TABLE vendor_contacts IS 'Contact persons associated with each vendor';
COMMENT ON COLUMN vendors.vendor_code IS 'Optional short code for easy reference (e.g., "VAY-001")';
COMMENT ON COLUMN vendor_contacts.is_primary IS 'Indicates the primary contact person for the vendor';
