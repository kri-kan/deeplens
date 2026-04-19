-- =====================================================
-- FIX: Many-to-Many Mappings for Order Attachments
-- =====================================================

-- 1. Ensure columns from previous partial migration are removed
ALTER TABLE "orderId" DROP COLUMN IF EXISTS transaction_screenshot_id;
ALTER TABLE "orderItem" DROP COLUMN IF EXISTS photo_attachment_id;

-- 2. Create Order level attachments mapping
-- Using INTEGER for order_id_ref to match "orderId".id
CREATE TABLE IF NOT EXISTS order_attachments (
    order_id_ref INTEGER NOT NULL REFERENCES "orderId"(id) ON DELETE CASCADE,
    attachment_id UUID NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
    attachment_type VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (order_id_ref, attachment_id)
);

-- 3. Create Order Item level attachments mapping
-- FIX: Using INTEGER for order_item_ref_id to match LIVE "orderItem".id
CREATE TABLE IF NOT EXISTS order_item_attachments (
    order_item_ref_id INTEGER NOT NULL REFERENCES "orderItem"(id) ON DELETE CASCADE,
    attachment_id UUID NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (order_item_ref_id, attachment_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_attachments_order_id ON order_attachments(order_id_ref);
CREATE INDEX IF NOT EXISTS idx_order_item_attachments_item_id ON order_item_attachments(order_item_ref_id);

COMMENT ON TABLE order_attachments IS 'Supports multiple attachments for a single order (e.g., multiple payment screenshots)';
COMMENT ON TABLE order_item_attachments IS 'Supports multiple attachments for an individual item in an order';
