-- Migration: 20261009_order_grouping_and_unconfirmed_status.sql
-- Description: Adds unconfirmed/confirmed order status, need_label toggle, order_groups table, and item_id tracking

ALTER TABLE "orderId"
  ADD COLUMN IF NOT EXISTS status INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS need_label BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS order_groups (
  id BIGSERIAL PRIMARY KEY,
  order_grp_id VARCHAR(100) UNIQUE NOT NULL,
  order_id_ref BIGINT REFERENCES "orderId"(id) ON DELETE CASCADE,
  order_id VARCHAR(100) NOT NULL,
  vendor_id UUID,
  vendor_name VARCHAR(255),
  need_label BOOLEAN DEFAULT false,
  awb_number VARCHAR(100),
  label_url TEXT,
  status VARCHAR(50) DEFAULT 'unconfirmed',
  tracking_sub_status VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE "orderItem"
  ADD COLUMN IF NOT EXISTS item_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS order_grp_id_ref VARCHAR(100),
  ADD COLUMN IF NOT EXISTS label_url TEXT;

CREATE INDEX IF NOT EXISTS idx_order_groups_order_id ON order_groups(order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_grp_id_ref ON "orderItem"(order_grp_id_ref);
