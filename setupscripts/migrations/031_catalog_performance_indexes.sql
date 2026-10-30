-- Migration 031: Catalog Performance Indexes
-- Eliminates sequential scans during catalog pagination and filtering

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendor_listings_product_id 
    ON public.vendor_listings (product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendor_listings_product_active 
    ON public.vendor_listings (product_id, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendor_listings_product_price 
    ON public.vendor_listings (product_id, current_price);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_message_groups_product_id 
    ON wa.message_groups (deeplens_product_id) 
    WHERE deeplens_product_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_catalog_sort 
    ON public.products (is_deleted, is_archived, created_at DESC, sequence_id DESC, id DESC);
