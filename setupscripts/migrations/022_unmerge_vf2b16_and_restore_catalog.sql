-- Migration: 022_unmerge_vf2b16_and_restore_catalog.sql
-- ADO Task #612: [Database] Unmerge VF2B16 and restore catalog products and media links
-- Forensic unmerge of VF2B16 (d46a0b33-2fea-4f94-b3f6-55c8ee867319) and chained merges (VF2B1C, VF2B1F, VF2B39, VF2B36).

BEGIN;

-- 1. Create audit table to preserve merge records before removal
CREATE TABLE IF NOT EXISTS public.product_unmerges_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL,
    target_id UUID NOT NULL,
    merged_at TIMESTAMPTZ,
    metadata JSONB,
    unmerged_at TIMESTAMPTZ DEFAULT NOW(),
    unmerged_by TEXT DEFAULT 'ADO_TASK_612',
    notes TEXT
);

-- Archive the 4 chained merge records
INSERT INTO public.product_unmerges_audit (source_id, target_id, merged_at, metadata, notes)
SELECT source_id, target_id, merged_at, metadata, 'Reverted 2-vote domino bridge runaway merge chain for VF2B16'
FROM public.product_merges
WHERE (source_id = 'de441544-0ba9-4979-b7b9-7aa5c61fa8dc' AND target_id = '898ea5bf-e0fc-4e07-a140-1b77e6fa9952') -- VF2B36 -> VF2B39
   OR (source_id = '898ea5bf-e0fc-4e07-a140-1b77e6fa9952' AND target_id = '91b48cda-29df-409a-a170-c185b21a6aa6') -- VF2B39 -> VF2B1F
   OR (source_id = '91b48cda-29df-409a-a170-c185b21a6aa6' AND target_id = '46c450b4-614d-4f90-bdb3-4b4657a84aae') -- VF2B1F -> VF2B1C
   OR (source_id = '46c450b4-614d-4f90-bdb3-4b4657a84aae' AND target_id = 'd46a0b33-2fea-4f94-b3f6-55c8ee867319') -- VF2B1C -> VF2B16
ON CONFLICT DO NOTHING;

-- Delete the 4 merge records from public.product_merges
DELETE FROM public.product_merges
WHERE (source_id = 'de441544-0ba9-4979-b7b9-7aa5c61fa8dc' AND target_id = '898ea5bf-e0fc-4e07-a140-1b77e6fa9952')
   OR (source_id = '898ea5bf-e0fc-4e07-a140-1b77e6fa9952' AND target_id = '91b48cda-29df-409a-a170-c185b21a6aa6')
   OR (source_id = '91b48cda-29df-409a-a170-c185b21a6aa6' AND target_id = '46c450b4-614d-4f90-bdb3-4b4657a84aae')
   OR (source_id = '46c450b4-614d-4f90-bdb3-4b4657a84aae' AND target_id = 'd46a0b33-2fea-4f94-b3f6-55c8ee867319');

-- 2. Re-activate deleted products (is_deleted = false) and clean up contaminated tags
UPDATE public.products
SET is_deleted = false,
    tags = array_remove(tags, 'VF2B1F'),
    updated_at = NOW()
WHERE id = '46c450b4-614d-4f90-bdb3-4b4657a84aae'; -- VF2B1C

UPDATE public.products
SET is_deleted = false,
    tags = array_remove(tags, 'VF2B39'),
    updated_at = NOW()
WHERE id = '91b48cda-29df-409a-a170-c185b21a6aa6'; -- VF2B1F

UPDATE public.products
SET is_deleted = false,
    tags = array_remove(tags, 'VF2B36'),
    updated_at = NOW()
WHERE id = '898ea5bf-e0fc-4e07-a140-1b77e6fa9952'; -- VF2B39

UPDATE public.products
SET is_deleted = false,
    updated_at = NOW()
WHERE id = 'de441544-0ba9-4979-b7b9-7aa5c61fa8dc'; -- VF2B36

UPDATE public.products
SET tags = array_remove(tags, 'VF2B1C'),
    updated_at = NOW()
WHERE id = 'd46a0b33-2fea-4f94-b3f6-55c8ee867319'; -- VF2B16

-- 3. Reassign vendor_listings back to authentic products
UPDATE public.vendor_listings
SET product_id = '46c450b4-614d-4f90-bdb3-4b4657a84aae', updated_at = NOW()
WHERE id = '93cddfd5-02ac-44a9-bd97-0bebe5755097'; -- VF2B1C

UPDATE public.vendor_listings
SET product_id = '91b48cda-29df-409a-a170-c185b21a6aa6', updated_at = NOW()
WHERE id = '3b0234e0-b6ee-4942-a1ab-c05396a62f46'; -- VF2B1F

UPDATE public.vendor_listings
SET product_id = '898ea5bf-e0fc-4e07-a140-1b77e6fa9952', updated_at = NOW()
WHERE id = '9b342e71-f00d-44d2-8f91-bcf8a5fb28d5'; -- VF2B39

UPDATE public.vendor_listings
SET product_id = 'de441544-0ba9-4979-b7b9-7aa5c61fa8dc', updated_at = NOW()
WHERE id IN ('57cbb9ea-ff08-4879-a83e-ab8b4a3bd088', 'f036dab9-822b-419f-b8e7-1b3373d25c33'); -- VF2B36

UPDATE public.vendor_listings
SET product_id = 'd46a0b33-2fea-4f94-b3f6-55c8ee867319', updated_at = NOW()
WHERE id = 'cc14e100-bcd8-46f8-872f-a1a3cf342243'; -- VF2B16

-- 4. Partition and restore product media_links (entity_type = 'product')
-- VF2B1C: 3 media items
UPDATE public.media_links ml
SET entity_id = '46c450b4-614d-4f90-bdb3-4b4657a84aae'
FROM public.media m
WHERE ml.media_id = m.id
  AND ml.entity_type = 'product'
  AND ml.entity_id = 'd46a0b33-2fea-4f94-b3f6-55c8ee867319'
  AND m.storage_path LIKE 'general/product_82f3db68-c6e8-4f40-8188-2a15668ccc44/%';

-- VF2B1F: 10 media items
UPDATE public.media_links ml
SET entity_id = '91b48cda-29df-409a-a170-c185b21a6aa6'
FROM public.media m
WHERE ml.media_id = m.id
  AND ml.entity_type = 'product'
  AND ml.entity_id = 'd46a0b33-2fea-4f94-b3f6-55c8ee867319'
  AND m.storage_path LIKE 'general/product_ddc07dbc-f2e7-423c-8adb-36d0cc4d890b/%';

-- VF2B39: 5 media items
UPDATE public.media_links ml
SET entity_id = '898ea5bf-e0fc-4e07-a140-1b77e6fa9952'
FROM public.media m
WHERE ml.media_id = m.id
  AND ml.entity_type = 'product'
  AND ml.entity_id = 'd46a0b33-2fea-4f94-b3f6-55c8ee867319'
  AND m.storage_path LIKE 'general/product_ce3a6bd2-7072-41f3-bbb2-c7d47cb8cad7/%';

-- VF2B36: 70 media items (7 from morning drop + 63 from afternoon vendor batch)
UPDATE public.media_links ml
SET entity_id = 'de441544-0ba9-4979-b7b9-7aa5c61fa8dc'
FROM public.media m
WHERE ml.media_id = m.id
  AND ml.entity_type = 'product'
  AND ml.entity_id = 'd46a0b33-2fea-4f94-b3f6-55c8ee867319'
  AND (
    m.storage_path LIKE 'general/product_916ed709-5d79-47f5-962b-5f265d258814/%'
    OR m.storage_path LIKE 'general/product_82875765-e1c4-4a1b-80bd-c41ed7a9f083/%'
  );

-- VF2B16: retains its 6 media items (general/product_e80521ca-caad-4404-8899-73648f4b246a/%)

-- 5. Restore vendor_listing media_links (entity_type = 'vendor_listing')
-- Move 3 items for VF2B1C from cc14e100 to 93cddfd5
UPDATE public.media_links ml
SET entity_id = '93cddfd5-02ac-44a9-bd97-0bebe5755097'
FROM public.media m
WHERE ml.media_id = m.id
  AND ml.entity_type = 'vendor_listing'
  AND ml.entity_id = 'cc14e100-bcd8-46f8-872f-a1a3cf342243'
  AND m.storage_path LIKE 'general/product_82f3db68-c6e8-4f40-8188-2a15668ccc44/%';

-- Move 10 items for VF2B1F from cc14e100 to 3b0234e0
UPDATE public.media_links ml
SET entity_id = '3b0234e0-b6ee-4942-a1ab-c05396a62f46'
FROM public.media m
WHERE ml.media_id = m.id
  AND ml.entity_type = 'vendor_listing'
  AND ml.entity_id = 'cc14e100-bcd8-46f8-872f-a1a3cf342243'
  AND m.storage_path LIKE 'general/product_ddc07dbc-f2e7-423c-8adb-36d0cc4d890b/%';

-- Move 7 items for VF2B36 listing 1 (created 09:15:50) from 9b342e71 to 57cbb9ea
UPDATE public.media_links ml
SET entity_id = '57cbb9ea-ff08-4879-a83e-ab8b4a3bd088'
FROM public.media m
WHERE ml.media_id = m.id
  AND ml.entity_type = 'vendor_listing'
  AND ml.entity_id = '9b342e71-f00d-44d2-8f91-bcf8a5fb28d5'
  AND m.storage_path LIKE 'general/product_916ed709-5d79-47f5-962b-5f265d258814/%';

-- 6. Restore wa.message_groups deeplens_product_id
UPDATE wa.message_groups
SET deeplens_product_id = '46c450b4-614d-4f90-bdb3-4b4657a84aae', updated_at = NOW()
WHERE group_id = 'product_82f3db68-c6e8-4f40-8188-2a15668ccc44';

UPDATE wa.message_groups
SET deeplens_product_id = '91b48cda-29df-409a-a170-c185b21a6aa6', updated_at = NOW()
WHERE group_id = 'product_ddc07dbc-f2e7-423c-8adb-36d0cc4d890b';

UPDATE wa.message_groups
SET deeplens_product_id = '898ea5bf-e0fc-4e07-a140-1b77e6fa9952', updated_at = NOW()
WHERE group_id = 'product_ce3a6bd2-7072-41f3-bbb2-c7d47cb8cad7';

UPDATE wa.message_groups
SET deeplens_product_id = 'de441544-0ba9-4979-b7b9-7aa5c61fa8dc', updated_at = NOW()
WHERE group_id = 'product_916ed709-5d79-47f5-962b-5f265d258814';

-- 7. Reject false positive merge candidates so delayed auto merge will not re-trigger
UPDATE public.product_merge_candidates
SET status = 'rejected',
    resolved_by = 'admin_unmerge',
    resolved_at = NOW()
WHERE id IN (
    '56a70cd5-c45c-4d5b-bf00-c54fb471a813',
    'd1565447-72e7-4fd3-836b-306944b12d86',
    'f5beaba6-89fb-4d36-b470-c578d6b6c901',
    'f489380b-63ea-4caa-9995-91e0b84dfccd'
);

COMMIT;
