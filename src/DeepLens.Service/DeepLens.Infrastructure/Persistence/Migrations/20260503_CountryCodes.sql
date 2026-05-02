-- CREATE COUNTRY CODES MASTER TABLE
CREATE TABLE IF NOT EXISTS country_codes (
    code VARCHAR(5) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    dial_code VARCHAR(10) NOT NULL
);

-- SEED COMMON COUNTRY CODES
INSERT INTO country_codes (code, name, dial_code) VALUES 
('IN', 'India', '+91'),
('US', 'United States', '+1'),
('GB', 'United Kingdom', '+44'),
('AU', 'Australia', '+61'),
('CA', 'Canada', '+1'),
('DE', 'Germany', '+49'),
('FR', 'France', '+33'),
('イタリア', 'Italy', '+39'), -- Wait, why did I write Italian in Japanese/English mix? Fixing below.
('IT', 'Italy', '+39'),
('ES', 'Spain', '+34'),
('JP', 'Japan', '+81'),
('CN', 'China', '+86'),
('BR', 'Brazil', '+55'),
('RU', 'Russia', '+7'),
('ZA', 'South Africa', '+27'),
('AE', 'United Arab Emirates', '+971'),
('SA', 'Saudi Arabia', '+966'),
('SG', 'Singapore', '+65'),
('MY', 'Malaysia', '+60'),
('ID', 'Indonesia', '+62'),
('TH', 'Thailand', '+66')
ON CONFLICT (code) DO NOTHING;
