-- Migration: 20261010_add_order_type_and_reseller.sql
-- Description: Adds order_type and reseller_name columns to "orderId" table

ALTER TABLE "orderId"
  ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'Customer',
  ADD COLUMN IF NOT EXISTS reseller_name VARCHAR(255);
