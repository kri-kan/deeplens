\c tenant_metadata_template;

-- =====================================================
-- DeepLens Tenant Metadata Schema (Template)
-- =====================================================

-- Core Metadata & Ingestion
CREATE TABLE IF NOT EXISTS ingestion_meta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Catalog: Vendors, Categories, Products
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name VARCHAR(255) NOT NULL,
    vendor_code VARCHAR(50),
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

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    metadata_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    base_sku VARCHAR(100) UNIQUE,
    title VARCHAR(255),
    tags TEXT[],
    unified_attributes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_sku VARCHAR(100),
    color VARCHAR(50),
    fabric VARCHAR(100), 
    stitch_type VARCHAR(50), 
    work_heaviness VARCHAR(50), 
    search_keywords TEXT[], 
    attributes_json JSONB, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Catalog: Sellers & Media
CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    contact_info TEXT,
    rating NUMERIC DEFAULT 0,
    is_trusted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    storage_path VARCHAR(500) NOT NULL,
    media_type SMALLINT DEFAULT 1,
    original_filename VARCHAR(255),
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    status SMALLINT DEFAULT 0,
    vector_id UUID,
    phash VARCHAR(64),
    is_default BOOLEAN DEFAULT FALSE, 
    quality_score NUMERIC, 
    width INT,
    height INT,
    duration_seconds NUMERIC,
    thumbnail_path VARCHAR(500),
    preview_path VARCHAR(500),
    features_extracted BOOLEAN DEFAULT FALSE,
    indexed BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata_json JSONB
);

CREATE TABLE IF NOT EXISTS seller_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
    external_id VARCHAR(100),
    current_price DECIMAL(18, 2),
    currency VARCHAR(10) DEFAULT 'INR',
    shipping_info VARCHAR(50) DEFAULT 'plus shipping',
    is_favorite BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT, 
    url VARCHAR(500),
    last_priced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_data_json JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Operations: Collections, Searches, Preferences
CREATE TABLE IF NOT EXISTS image_collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT FALSE,
    total_images INTEGER DEFAULT 0,
    metadata JSONB,
    UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS search_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    total_searches INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS search_queries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES search_sessions(id),
    query_type VARCHAR(50) NOT NULL,
    query_vector_id VARCHAR(255),
    query_text TEXT,
    collection_id UUID REFERENCES image_collections(id),
    results_count INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    similarity_threshold FLOAT DEFAULT 0.8,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    preference_key VARCHAR(255) NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

-- Maintenance & Utilities
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(base_sku);
CREATE INDEX IF NOT EXISTS idx_media_phash ON media(phash);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_search_queries_timestamp ON search_queries(timestamp);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(vendor_name);
