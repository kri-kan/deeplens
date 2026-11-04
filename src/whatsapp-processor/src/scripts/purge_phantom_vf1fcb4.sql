-- Remediation Script: Purge Phantom Product VF1FCB4 and associated duplicate split artifacts
-- Database: deeplens_platform (krikanpg)
-- Applied: 2026-11-04
-- Context: Product VF1FCB4 (id: aba50c69-dbd6-4da1-ad72-65ea8814fc92) was created from an accidental
-- bulk split of 336 historical WhatsApp messages spanning September 1-17, 2026. The 16 individual
-- September products legitimately own the shared media.

BEGIN;

-- 1. Delete media links for the phantom product and listing
DELETE FROM public.media_links 
WHERE entity_id IN ('aba50c69-dbd6-4da1-ad72-65ea8814fc92', '871ee93e-967b-4f3f-86c1-383c136f344c');

-- 2. Delete vendor listing
DELETE FROM public.vendor_listings 
WHERE product_id = 'aba50c69-dbd6-4da1-ad72-65ea8814fc92';

-- 3. Delete product (foreign keys in product_merge_candidates cascade delete)
DELETE FROM public.products 
WHERE id = 'aba50c69-dbd6-4da1-ad72-65ea8814fc92';

-- 4. Delete unshared media records in public.media, preserving any media shared with September products
DELETE FROM public.media m
WHERE m.storage_path LIKE 'general/product_67cf3b33-1063-475d-9619-2048a0d0037a/%'
  AND NOT EXISTS (SELECT 1 FROM public.media_links ml WHERE ml.media_id = m.id);

-- 5. Mark wa.message_groups as ignored and detach product references
UPDATE wa.message_groups 
SET status = 'ignored',
    deeplens_product_id = NULL,
    deeplens_listing_id = NULL,
    error_detail = 'Archived duplicate split of September historical items (VF1FCB4 purged)',
    updated_at = NOW()
WHERE group_id = 'product_67cf3b33-1063-475d-9619-2048a0d0037a';

COMMIT;
