-- Vendors/Manufacturers Management
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
