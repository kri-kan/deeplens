-- Migration 046: Dismiss stale merge candidates involving soft-deleted or archived products
-- Ensures that products that are soft-deleted (e.g. from previous merges or manual deletion)
-- or archived are not presented to users as merge candidates in the similarity merge queue.

UPDATE public.product_merge_candidates pmc
SET status = 'dismissed',
    resolved_at = NOW(),
    resolved_by = 'migration_046_cleanup_soft_deleted_or_archived'
FROM public.products pa, public.products pb
WHERE pmc.product_a_id = pa.id 
  AND pmc.product_b_id = pb.id
  AND pmc.status = 'pending'
  AND (pa.is_deleted = true OR pa.is_archived = true OR pb.is_deleted = true OR pb.is_archived = true);
