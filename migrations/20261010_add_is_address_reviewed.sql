-- Migration: 20261010_add_is_address_reviewed.sql
-- Description: Adds is_address_reviewed column to "orderId" table

ALTER TABLE "orderId"
  ADD COLUMN IF NOT EXISTS is_address_reviewed BOOLEAN DEFAULT true;
