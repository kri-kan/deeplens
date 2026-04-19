-- =====================================================
-- Add Transaction tracking to orderId table
-- =====================================================

ALTER TABLE "orderId" ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100);
ALTER TABLE "orderId" ADD COLUMN IF NOT EXISTS transaction_screenshot_url TEXT;

COMMENT ON COLUMN "orderId".transaction_id IS 'UPI or bank transaction ID for the order payment';
COMMENT ON COLUMN "orderId".transaction_screenshot_url IS 'URL to the MinIO/storage path for the payment confirmation screenshot';
