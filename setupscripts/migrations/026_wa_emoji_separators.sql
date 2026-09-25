-- Migration 026: WhatsApp Dynamic Emoji and Boundary Separators Registry
-- Allows operators to register arbitrary emoji sequences and text patterns as product boundary delimiters
-- and trigger automatic re-splitting across message groups.

CREATE TABLE IF NOT EXISTS wa.emoji_separators (
    id SERIAL PRIMARY KEY,
    pattern TEXT NOT NULL UNIQUE,
    match_type VARCHAR(32) NOT NULL DEFAULT 'exact',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    match_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emoji_separators_active ON wa.emoji_separators(is_active);

-- Seed baseline delimiters
INSERT INTO wa.emoji_separators (pattern, match_type, description, is_active)
VALUES 
    ('🔚', 'exact', 'End boundary mark (common)', true),
    ('🛑', 'exact', 'Red octagon stop sign', true),
    ('⛔', 'exact', 'No entry sign', true),
    ('🚫', 'exact', 'Prohibited sign', true),
    ('⏹️', 'exact', 'Stop square symbol', true),
    ('🔶🔶🔶🔶', 'exact', 'Orange diamond separator burst', true)
ON CONFLICT (pattern) DO NOTHING;
