-- =====================================================
-- Fix for orderId table schema mismatch
-- =====================================================
-- Adds missing columns expected by IdGeneratorService.cs
-- =====================================================

ALTER TABLE "orderId" ADD COLUMN IF NOT EXISTS source_handle character varying(255);
ALTER TABLE "orderId" ADD COLUMN IF NOT EXISTS instagram_user_id character varying(100);
ALTER TABLE "orderId" ADD COLUMN IF NOT EXISTS customer_address text;
ALTER TABLE "orderId" ADD COLUMN IF NOT EXISTS order_details text;

-- Data migration: populate source_handle from instagram_handle if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orderId' AND column_name='instagram_handle') THEN
        UPDATE "orderId" SET source_handle = instagram_handle WHERE source_handle IS NULL;
    END IF;
END $$;
