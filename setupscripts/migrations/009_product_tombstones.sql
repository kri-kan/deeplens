CREATE SCHEMA IF NOT EXISTS wa;

CREATE TABLE IF NOT EXISTS wa.product_tombstones (
    source_group_id VARCHAR(255) PRIMARY KEY,
    jid VARCHAR(255),
    original_product_id UUID,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_product_tombstones_product_id ON wa.product_tombstones(original_product_id);
