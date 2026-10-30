-- Migration: 20261029_add_is_media_review_required.sql
-- Description: Adds is_media_review_required flag to products and product tables

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_media_review_required BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.product 
ADD COLUMN IF NOT EXISTS is_media_review_required BOOLEAN NOT NULL DEFAULT FALSE;

-- Enqueue existing products with high media count (>30) or needs-zoning-review tag
UPDATE public.products p 
SET is_media_review_required = TRUE 
WHERE (SELECT COUNT(*) FROM public.media_links WHERE entity_id = p.id AND entity_type = 'product') > 30 
   OR 'needs-zoning-review' = ANY(COALESCE(p.tags, ARRAY[]::text[]));
