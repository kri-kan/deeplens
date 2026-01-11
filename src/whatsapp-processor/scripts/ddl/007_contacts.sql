-- Contacts table
-- Stores synced contact information from WhatsApp

CREATE TABLE IF NOT EXISTS contacts (
    jid VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255),
    push_name VARCHAR(255),
    number VARCHAR(50),
    is_business BOOLEAN DEFAULT FALSE,
    is_my_contact BOOLEAN DEFAULT FALSE,
    profile_pic_url TEXT,
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_number ON contacts(number);

COMMENT ON TABLE contacts IS 'Stores synced WhatsApp contacts';
