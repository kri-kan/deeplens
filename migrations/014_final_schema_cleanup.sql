-- =====================================================
-- FINAL CLEANUP: Unified Polymorphic Attachments
-- =====================================================

-- 1. Migrate any existing data from specific mapping tables to the polymorphic one (safety first)
INSERT INTO entity_attachments (attachment_id, entity_type, entity_id, created_at)
SELECT attachment_id, 'order', order_id_ref::text, created_at FROM order_attachments
ON CONFLICT DO NOTHING;

INSERT INTO entity_attachments (attachment_id, entity_type, entity_id, created_at)
SELECT attachment_id, 'order_item', order_item_ref_id::text, created_at FROM order_item_attachments
ON CONFLICT DO NOTHING;

-- 2. Drop the specific mapping tables as they are now redundant
DROP TABLE IF EXISTS order_attachments;
DROP TABLE IF EXISTS order_item_attachments;

-- 3. Drop deprecated columns from order tables
-- These were replaced by the centralized attachments system
ALTER TABLE "orderId" DROP COLUMN IF EXISTS transaction_screenshot_url;
ALTER TABLE "orderId" DROP COLUMN IF EXISTS instagram_handle; -- Replaced by source_handle
ALTER TABLE "orderItem" DROP COLUMN IF EXISTS photo_url;

-- 4. Final sanity check for orderId columns
-- ensure they match what IdGeneratorService expects
COMMENT ON TABLE "orderId" IS 'Stores generated order IDs and associated metadata. Source handle can be whatsapp number or instagram handle.';
