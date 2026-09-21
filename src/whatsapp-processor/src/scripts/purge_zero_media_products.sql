BEGIN;

-- 1. Create temporary table of zero-media products for Fashion Planet
CREATE TEMP TABLE tmp_zero_media_products AS
SELECT p.id as product_id, vl.id as listing_id, mg.group_id
FROM public.vendor_listings vl
JOIN public.products p ON p.id = vl.product_id
LEFT JOIN public.media_links ml ON ml.entity_id = p.id AND ml.entity_type = 'product'
LEFT JOIN wa.message_groups mg ON mg.deeplens_product_id = p.id
WHERE vl.vendor_id = 'b8bc28a3-094b-4965-8bde-211d9fbd704b'
  AND ml.id IS NULL;

-- 2. Reset message groups referencing these zero-media products to 'media_missing'
UPDATE wa.message_groups mg
SET status = 'media_missing',
    deeplens_product_id = NULL,
    deeplens_listing_id = NULL,
    product_created_at = NULL,
    error_detail = 'Insufficient verified downloaded media files in storage (found 0, required >= 2)',
    updated_at = NOW()
FROM tmp_zero_media_products t
WHERE mg.group_id = t.group_id OR mg.deeplens_product_id = t.product_id;

-- 3. Delete from vendor_listings
DELETE FROM public.vendor_listings
WHERE id IN (SELECT listing_id FROM tmp_zero_media_products WHERE listing_id IS NOT NULL);

-- 4. Delete from products
DELETE FROM public.products
WHERE id IN (SELECT product_id FROM tmp_zero_media_products);

-- 5. For corrupted 'minio://' URLs in wa.messages, reset them to NULL and processing_status = 'ready'
UPDATE wa.messages
SET media_url = NULL,
    processing_status = 'ready',
    updated_at = NOW()
WHERE media_url = 'minio://';

COMMIT;
