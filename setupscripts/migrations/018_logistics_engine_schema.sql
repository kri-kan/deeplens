-- 018_logistics_engine_schema.sql
-- Migration: Logistics Engine Tables (warehouses, vendor_logistics_configs, shipments, shipment_items, ndr_tasks, shipping_escalations)

-- 1. Warehouses table
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    phone TEXT,
    contact_person TEXT,
    is_central BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouses_code ON public.warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_central ON public.warehouses(is_central);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON public.warehouses(is_active);

-- 2. Vendor Logistics Configs table
CREATE TABLE IF NOT EXISTS public.vendor_logistics_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    vendor_name TEXT,
    fulfillment_mode TEXT NOT NULL DEFAULT 'direct_dispatch', -- 'direct_dispatch', 'cross_dock', 'central_hub'
    return_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    default_pickup_pincode TEXT,
    auto_manifest BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_logistics_configs_vendor_id ON public.vendor_logistics_configs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_logistics_configs_return_warehouse_id ON public.vendor_logistics_configs(return_warehouse_id);

-- 3. Shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    order_number TEXT,
    shipment_number TEXT UNIQUE,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    courier_partner TEXT,
    awb_number TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'manifested', 'in_transit', 'out_for_delivery', 'delivered', 'rto_initiated', 'rto_delivered', 'cancelled', 'ndr'
    shipping_mode TEXT DEFAULT 'Surface', -- 'Surface', 'Express'
    fulfillment_type TEXT DEFAULT 'direct_dispatch', -- 'direct_dispatch', 'cross_dock', 'central_hub'
    cod_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    label_url TEXT,
    minio_label_key TEXT,
    pickup_scheduled_at TIMESTAMPTZ,
    pickup_token TEXT,
    estimated_delivery_date TIMESTAMPTZ,
    vendor_name TEXT,
    vendor_tracking_url TEXT,
    customer_notified_at TIMESTAMPTZ,
    procure_status TEXT DEFAULT 'not_applicable', -- 'pending', 'procured', 'received_at_hub', 'qc_passed', 'qc_failed', 'not_applicable'
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order_number ON public.shipments(order_number);
CREATE INDEX IF NOT EXISTS idx_shipments_awb_number ON public.shipments(awb_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_warehouse_id ON public.shipments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_shipments_courier_partner ON public.shipments(courier_partner);

-- 4. Shipment Items table
CREATE TABLE IF NOT EXISTS public.shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    order_item_id UUID,
    product_id UUID,
    product_name TEXT,
    sku TEXT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment_id ON public.shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_product_id ON public.shipment_items(product_id);

-- 5. NDR Tasks table
CREATE TABLE IF NOT EXISTS public.ndr_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    awb_number TEXT,
    ndr_reason TEXT,
    ndr_code TEXT,
    customer_phone TEXT,
    customer_feedback TEXT,
    action_status TEXT NOT NULL DEFAULT 'open', -- 'open', 'contacted', 'resolved', 'escalated', 'closed'
    chosen_action TEXT, -- 'reattempt', 'return_to_origin', 'change_address', 'change_phone'
    reattempt_date TIMESTAMPTZ,
    remarks TEXT,
    dispatched_to_delhivery BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ndr_tasks_shipment_id ON public.ndr_tasks(shipment_id);
CREATE INDEX IF NOT EXISTS idx_ndr_tasks_awb_number ON public.ndr_tasks(awb_number);
CREATE INDEX IF NOT EXISTS idx_ndr_tasks_action_status ON public.ndr_tasks(action_status);

-- 6. Shipping Escalations table
CREATE TABLE IF NOT EXISTS public.shipping_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    awb_number TEXT,
    issue_type TEXT NOT NULL, -- 'delay', 'lost_in_transit', 'damaged', 'fake_attempt', 'rto_dispute', 'other'
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    external_ticket_id TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shipping_escalations_shipment_id ON public.shipping_escalations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipping_escalations_awb_number ON public.shipping_escalations(awb_number);
CREATE INDEX IF NOT EXISTS idx_shipping_escalations_status ON public.shipping_escalations(status);

-- 7. Seed Initial 'Vayyari Central Hub' Warehouse
INSERT INTO public.warehouses (id, name, code, address_line1, address_line2, city, state, pincode, phone, contact_person, is_central, is_active, created_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Vayyari Central Hub',
    'VAY-CENTRAL-01',
    'Plot 42, Vayyari Logistics Park, Industrial Area Phase 2',
    'Bhatar Road',
    'Surat',
    'Gujarat',
    '395002',
    '+91-9876543210',
    'Operations Lead',
    true,
    true,
    NOW()
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    address_line1 = EXCLUDED.address_line1,
    address_line2 = EXCLUDED.address_line2,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    phone = EXCLUDED.phone,
    contact_person = EXCLUDED.contact_person,
    is_central = EXCLUDED.is_central,
    is_active = EXCLUDED.is_active;

-- 8. Seed Vendor Logistics Configs for existing vendors
INSERT INTO public.vendor_logistics_configs (vendor_id, vendor_name, fulfillment_mode, return_warehouse_id, default_pickup_pincode, auto_manifest, created_at)
SELECT 
    v.id,
    v.vendor_name,
    'direct_dispatch' AS fulfillment_mode,
    'a0000000-0000-0000-0000-000000000001'::uuid AS return_warehouse_id,
    COALESCE(va.pincode, '395002') AS default_pickup_pincode,
    false AS auto_manifest,
    NOW() AS created_at
FROM public.vendors v
LEFT JOIN LATERAL (
    SELECT pincode FROM public.vendor_addresses WHERE vendor_id = v.id LIMIT 1
) va ON true
WHERE NOT EXISTS (
    SELECT 1 FROM public.vendor_logistics_configs vlc WHERE vlc.vendor_id = v.id
);
