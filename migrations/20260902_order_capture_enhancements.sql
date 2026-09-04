-- Migration: 20260902_order_capture_enhancements.sql
-- Description: Adds structured customer name, shipping address, financial totals, and dual item ingestion metadata

ALTER TABLE "orderId"
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS advance_paid NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_balance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_charges NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_street TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shipping_pincode VARCHAR(10),
  ADD COLUMN IF NOT EXISTS is_serviceable BOOLEAN DEFAULT true;

ALTER TABLE "orderItem"
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_id UUID,
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'catalog';
