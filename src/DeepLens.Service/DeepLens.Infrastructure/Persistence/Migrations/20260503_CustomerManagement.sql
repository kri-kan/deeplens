-- 1. CREATE CUSTOMERS TABLE AND SEQUENCE
CREATE SEQUENCE IF NOT EXISTS customer_dummy_id_seq;

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    instagram_id VARCHAR(100),
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CREATE CUSTOMER ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    line1 TEXT NOT NULL,
    line2 TEXT,
    pincode VARCHAR(10) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ADD INDICES FOR LOOKUP
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_instagram ON customers(instagram_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- 4. UNIQUE CONSTRAINTS (Optional but recommended for the minimum criteria)
-- Since we need either phone or instagram_id, we can't make them both NOT NULL.
-- But we can add a check constraint.
ALTER TABLE customers ADD CONSTRAINT check_customer_contact_info 
CHECK (phone_number IS NOT NULL OR instagram_id IS NOT NULL);
