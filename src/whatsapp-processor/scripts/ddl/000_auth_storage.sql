-- Auth Storage for Baileys Sessions
-- Replaces the auth_info_baileys folder

CREATE TABLE IF NOT EXISTS wa_auth_sessions (
    session_id VARCHAR(128) NOT NULL,
    key_id VARCHAR(128) NOT NULL,
    data TEXT NOT NULL, -- JSON payload of the key
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    PRIMARY KEY (session_id, key_id)
);

COMMENT ON TABLE wa_auth_sessions IS 'Stores WhatsApp session credentials (keys, pre-keys)';
