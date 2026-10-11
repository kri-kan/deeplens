-- Migration: Add alias column to warehouses
-- Date: 2026-10-10

ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS alias VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_warehouses_alias ON public.warehouses(alias);
