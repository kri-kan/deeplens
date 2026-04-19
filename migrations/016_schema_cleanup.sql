-- =====================================================
-- SCHEMA CLEANUP: Removing redundant attachment columns
-- and restoring desired identity fields.
-- =====================================================

-- 1. Restore instagram_handle (User requested to keep this alongside source_handle)
ALTER TABLE "orderId" ADD COLUMN IF NOT EXISTS instagram_handle character varying(255);

-- Populate it from source_handle if source is instagram
UPDATE "orderId" 
SET instagram_handle = source_handle 
WHERE instagram_handle IS NULL 
AND source_id = (SELECT id FROM order_sources WHERE name = 'instagram');

-- 2. Cleanup deprecated OrderId columns
-- Note: transaction_screenshot_url was already dropped in 014, 
-- but we'll ensure any other legacies are gone.
ALTER TABLE "orderId" DROP COLUMN IF EXISTS order_details; -- Replaced by polymorphic comments table

-- 3. Cleanup orderItem columns
-- product_id was varchar(20), product_id_text was text. 
-- We'll unify into a single product_id column of type text.
DO $$
BEGIN
    -- If product_id_text exists, we migrate data and rename
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orderItem' AND column_name='product_id_text') THEN
        -- Drop the old short product_id
        ALTER TABLE "orderItem" DROP COLUMN IF EXISTS product_id;
        -- Rename text version to product_id
        ALTER TABLE "orderItem" RENAME COLUMN product_id_text TO product_id;
    END IF;
END $$;

-- photo_url was dropped in 014, but we'll double check
ALTER TABLE "orderItem" DROP COLUMN IF EXISTS photo_url;

COMMENT ON COLUMN "orderId".instagram_handle IS 'Fallback/Original instagram handle for the order.';
COMMENT ON COLUMN "orderItem".product_id IS 'Unified text field for product identification (handles both generated and manual IDs).';
