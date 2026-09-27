-- Migration 029: Remap wa.messages group_id to product_created message_groups
-- Resolves discrepancy where WhatsAppGroupWorker created a new group_id for products
-- while wa.messages remained tagged with the staging group_id.

BEGIN;

-- 1. Create a temporary mapping table of staging group_id -> created product group_id
CREATE TEMP TABLE staging_to_prod_mapping AS
SELECT DISTINCT ON (mg_staging.group_id)
    mg_staging.group_id as staging_group_id,
    mg_prod.group_id as prod_group_id,
    mg_prod.deeplens_product_id as product_id
FROM wa.message_groups mg_staging
JOIN wa.message_groups mg_prod ON mg_staging.jid = mg_prod.jid 
  AND mg_prod.deeplens_product_id IS NOT NULL 
  AND mg_staging.group_id != mg_prod.group_id
  AND (
    mg_staging.description = mg_prod.description 
    OR (LENGTH(mg_staging.description) > 30 AND SUBSTRING(mg_staging.description, 1, 50) = SUBSTRING(mg_prod.description, 1, 50))
  )
ORDER BY mg_staging.group_id, mg_prod.created_at DESC;

CREATE INDEX idx_temp_mapping_staging ON staging_to_prod_mapping(staging_group_id);

-- 2. Update wa.messages to point to the created product group_id
UPDATE wa.messages m
SET group_id = map.prod_group_id
FROM staging_to_prod_mapping map
WHERE m.group_id = map.staging_group_id;

-- 3. Synchronize last_message_at on wa.message_groups with the true message timestamps
UPDATE wa.message_groups mg
SET last_message_at = TO_TIMESTAMP(sub.max_ts)
FROM (
    SELECT group_id, MAX(timestamp) as max_ts
    FROM wa.messages
    WHERE group_id IS NOT NULL
    GROUP BY group_id
) sub
WHERE mg.group_id = sub.group_id
  AND (mg.last_message_at IS NULL OR mg.last_message_at != TO_TIMESTAMP(sub.max_ts));

-- 4. Mark or clean up the duplicate staging message_groups
DELETE FROM wa.message_groups mg
USING staging_to_prod_mapping map
WHERE mg.group_id = map.staging_group_id
  AND mg.deeplens_product_id IS NULL;

DROP TABLE staging_to_prod_mapping;

COMMIT;
