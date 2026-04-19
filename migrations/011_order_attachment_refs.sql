-- =====================================================
-- Refactor Order tables to use Centralized Attachments
-- =====================================================

-- Add attachment ID references
ALTER TABLE "orderId" ADD COLUMN IF NOT EXISTS transaction_screenshot_id UUID REFERENCES attachments(id) ON DELETE SET NULL;
ALTER TABLE "orderItem" ADD COLUMN IF NOT EXISTS photo_attachment_id UUID REFERENCES attachments(id) ON DELETE SET NULL;

-- Keep old columns for now to avoid breaking existing data, but mark as deprecated in comments
COMMENT ON COLUMN "orderId".transaction_screenshot_url IS 'DEPRECATED: Use transaction_screenshot_id instead';
COMMENT ON COLUMN "orderItem".photo_url IS 'DEPRECATED: Use photo_attachment_id instead';
