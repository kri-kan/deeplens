-- Migration: Add label to wa.accounts for display name
-- Run this against the deeplens_platform database

ALTER TABLE wa.accounts
    ADD COLUMN IF NOT EXISTS label VARCHAR(100);

-- Back-fill existing rows
UPDATE wa.accounts
SET label = COALESCE(account_name, session_id)
WHERE label IS NULL;
