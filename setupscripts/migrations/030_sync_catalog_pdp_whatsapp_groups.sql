-- Migration 030: Synchronize Catalog PDP WhatsApp source message groups and timestamps
-- Fixes desynchronization where wa.messages were repartitioned into staging groups
-- while wa.message_groups remained pointing to deeplens_product_id with artificial timestamps.

BEGIN;

-- 1. Create mapping from media filename matching (highest fidelity)
CREATE TEMP TABLE IF NOT EXISTS staging_to_prod_mapping AS
SELECT DISTINCT ON (m.group_id)
    m.group_id as staging_group_id,
    mg_prod.group_id as prod_group_id,
    mg_prod.deeplens_product_id as product_id
FROM wa.messages m 
JOIN media med ON split_part(m.media_url, '/', 5) = med.original_filename 
JOIN media_links ml ON ml.media_id = med.id 
JOIN wa.message_groups mg_prod ON mg_prod.deeplens_product_id = ml.entity_id 
WHERE m.group_id != mg_prod.group_id
  AND m.group_id IS NOT NULL;

-- 2. Add description matching for any groups not yet mapped
INSERT INTO staging_to_prod_mapping (staging_group_id, prod_group_id, product_id)
SELECT DISTINCT ON (mg_staging.group_id)
    mg_staging.group_id as staging_group_id,
    mg_prod.group_id as prod_group_id,
    mg_prod.deeplens_product_id as product_id
FROM wa.message_groups mg_staging
JOIN wa.message_groups mg_prod ON mg_staging.jid = mg_prod.jid 
  AND mg_prod.deeplens_product_id IS NOT NULL 
  AND mg_staging.group_id != mg_prod.group_id
  AND (
    REPLACE(mg_staging.description, '*', '') = REPLACE(mg_prod.description, '*', '')
    OR (
        LENGTH(REPLACE(COALESCE(mg_staging.description, ''), '*', '')) >= 20 
        AND SUBSTRING(REPLACE(mg_staging.description, '*', ''), 1, 35) = SUBSTRING(REPLACE(COALESCE(mg_prod.description, ''), '*', ''), 1, 35)
    )
  )
WHERE NOT EXISTS (SELECT 1 FROM staging_to_prod_mapping m WHERE m.staging_group_id = mg_staging.group_id)
ORDER BY mg_staging.group_id, mg_prod.created_at DESC;

CREATE INDEX IF NOT EXISTS idx_temp_mapping_030 ON staging_to_prod_mapping(staging_group_id);

-- 3. Update wa.messages to point to the created product group_id
UPDATE wa.messages m
SET group_id = map.prod_group_id
FROM staging_to_prod_mapping map
WHERE m.group_id = map.staging_group_id;

-- 4. Synchronize last_message_at on wa.message_groups with the true message timestamps
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

-- 5. Clean up duplicate staging message_groups that have no product and were remapped
DELETE FROM wa.message_groups mg
USING staging_to_prod_mapping map
WHERE mg.group_id = map.staging_group_id
  AND mg.deeplens_product_id IS NULL;

DROP TABLE IF EXISTS staging_to_prod_mapping;

COMMIT;
