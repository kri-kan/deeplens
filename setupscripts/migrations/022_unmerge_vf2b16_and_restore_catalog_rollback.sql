-- Rollback Migration: 022_unmerge_vf2b16_and_restore_catalog_rollback.sql
-- ADO Task #612: Revert unmerge and restore merge state if ever needed.

BEGIN;

-- 1. Restore product_merges from audit table
INSERT INTO public.product_merges (source_id, target_id, merged_at, metadata)
SELECT source_id, target_id, merged_at, metadata
FROM public.product_unmerges_audit
WHERE unmerged_by = 'ADO_TASK_612';

-- 2. Mark products as deleted again
UPDATE public.products
SET is_deleted = true,
    tags = array_append(COALESCE(tags, ARRAY[]::text[]), 'VF2B1F'),
    updated_at = NOW()
WHERE id = '46c450b4-614d-4f90-bdb3-4b4657a84aae';

UPDATE public.products
SET is_deleted = true,
    tags = array_append(COALESCE(tags, ARRAY[]::text[]), 'VF2B39'),
    updated_at = NOW()
WHERE id = '91b48cda-29df-409a-a170-c185b21a6aa6';

UPDATE public.products
SET is_deleted = true,
    tags = array_append(COALESCE(tags, ARRAY[]::text[]), 'VF2B36'),
    updated_at = NOW()
WHERE id = '898ea5bf-e0fc-4e07-a140-1b77e6fa9952';

UPDATE public.products
SET is_deleted = true,
    updated_at = NOW()
WHERE id = 'de441544-0ba9-4979-b7b9-7aa5c61fa8dc';

UPDATE public.products
SET tags = array_append(COALESCE(tags, ARRAY[]::text[]), 'VF2B1C'),
    updated_at = NOW()
WHERE id = 'd46a0b33-2fea-4f94-b3f6-55c8ee867319';

-- 3. Reassign vendor_listings back to target product
UPDATE public.vendor_listings
SET product_id = 'd46a0b33-2fea-4f94-b3f6-55c8ee867319', updated_at = NOW()
WHERE id IN (
    '93cddfd5-02ac-44a9-bd97-0bebe5755097',
    '3b0234e0-b6ee-4942-a1ab-c05396a62f46',
    '9b342e71-f00d-44d2-8f91-bcf8a5fb28d5',
    '57cbb9ea-ff08-4879-a83e-ab8b4a3bd088',
    'f036dab9-822b-419f-b8e7-1b3373d25c33'
);

-- 4. Reassign product media_links back to target product
UPDATE public.media_links
SET entity_id = 'd46a0b33-2fea-4f94-b3f6-55c8ee867319'
WHERE entity_type = 'product'
  AND entity_id IN (
    '46c450b4-614d-4f90-bdb3-4b4657a84aae',
    '91b48cda-29df-409a-a170-c185b21a6aa6',
    '898ea5bf-e0fc-4e07-a140-1b77e6fa9952',
    'de441544-0ba9-4979-b7b9-7aa5c61fa8dc'
  );

-- 5. Reassign vendor_listing media_links back
UPDATE public.media_links
SET entity_id = 'cc14e100-bcd8-46f8-872f-a1a3cf342243'
WHERE entity_type = 'vendor_listing'
  AND entity_id IN (
    '93cddfd5-02ac-44a9-bd97-0bebe5755097',
    '3b0234e0-b6ee-4942-a1ab-c05396a62f46'
  );

UPDATE public.media_links ml
SET entity_id = '9b342e71-f00d-44d2-8f91-bcf8a5fb28d5'
FROM public.media m
WHERE ml.media_id = m.id
  AND ml.entity_type = 'vendor_listing'
  AND ml.entity_id = '57cbb9ea-ff08-4879-a83e-ab8b4a3bd088'
  AND m.storage_path LIKE 'general/product_916ed709-5d79-47f5-962b-5f265d258814/%';

-- 6. Reassign wa.message_groups back to target product
UPDATE wa.message_groups
SET deeplens_product_id = 'd46a0b33-2fea-4f94-b3f6-55c8ee867319', updated_at = NOW()
WHERE group_id IN (
    'product_82f3db68-c6e8-4f40-8188-2a15668ccc44',
    'product_ddc07dbc-f2e7-423c-8adb-36d0cc4d890b',
    'product_ce3a6bd2-7072-41f3-bbb2-c7d47cb8cad7',
    'product_916ed709-5d79-47f5-962b-5f265d258814'
);

-- 7. Reset candidate statuses
UPDATE public.product_merge_candidates
SET status = 'dismissed', resolved_by = 'system', resolved_at = NOW()
WHERE id IN (
    '56a70cd5-c45c-4d5b-bf00-c54fb471a813',
    'd1565447-72e7-4fd3-836b-306944b12d86',
    'f5beaba6-89fb-4d36-b470-c578d6b6c901',
    'f489380b-63ea-4caa-9995-91e0b84dfccd'
);

COMMIT;
