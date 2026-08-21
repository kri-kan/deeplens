-- Migration: 011_vayyari_rbac_schema.sql
-- Description: RBAC and Fine-Grained Permissions (PBAC) Schema, Indexes, and Default Seeds

-- 1. Roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT uq_role_tenant_code UNIQUE (tenant_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_system_role_code ON public.roles(code) WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON public.roles(tenant_id);

-- 2. Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);

-- 3. Role Permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. User Roles junction table
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant ON public.user_roles(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

-- 5. User Custom Permissions override table
CREATE TABLE IF NOT EXISTS public.user_permissions (
    user_id UUID NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    granted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID,
    PRIMARY KEY (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_tenant ON public.user_permissions(user_id, tenant_id);

-- ============================================================================
-- SEED DATA: Standard System Roles
-- ============================================================================

INSERT INTO public.roles (id, tenant_id, code, name, description, is_system, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', NULL, 'super_admin', 'Super Administrator', 'Full system access and tenant administration', true, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000002', NULL, 'catalog_manager', 'Catalog Manager', 'Catalog, product, and media asset management', true, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000003', NULL, 'marketing', 'Marketing Specialist', 'WhatsApp campaigns, broadcasts, and Instagram publishing', true, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000004', NULL, 'order_operator', 'Order Operator', 'Order fulfillment, customer support, and exports', true, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000005', NULL, 'staff_readonly', 'Staff Read-Only', 'Read-only visibility across catalog, orders, and customer modules', true, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system;

-- ============================================================================
-- SEED DATA: Master Permissions Catalog (26 Permissions)
-- ============================================================================

INSERT INTO public.permissions (code, name, category, description)
VALUES
    -- Catalog
    ('catalog:view', 'View Catalog & Products', 'Catalog', 'View products, categories, variants, and inventory'),
    ('catalog:edit', 'Edit Products', 'Catalog', 'Create, update, and manage products and variants'),
    ('catalog:delete', 'Delete Products', 'Catalog', 'Delete or archive products and variants'),
    ('catalog:merge', 'Merge Products', 'Catalog', 'Merge duplicate products and resolve candidates'),
    ('catalog:publish', 'Publish Catalog', 'Catalog', 'Publish catalog updates to storefront and channels'),

    -- Orders
    ('orders:view', 'View Orders', 'Orders', 'View customer orders and fulfillment status'),
    ('orders:edit', 'Manage Orders', 'Orders', 'Update order status, line items, and tracking'),
    ('orders:delete', 'Delete Orders', 'Orders', 'Cancel and delete order records'),
    ('orders:export', 'Export Orders', 'Orders', 'Export order data and reports'),

    -- Customers
    ('customers:view', 'View Customers', 'Customers', 'View customer profiles, history, and notes'),
    ('customers:edit', 'Manage Customers', 'Customers', 'Create and update customer details'),
    ('customers:delete', 'Delete Customers', 'Customers', 'Delete or anonymize customer records'),

    -- WhatsApp
    ('whatsapp:view', 'View WhatsApp Data', 'WhatsApp', 'View WhatsApp messages, channels, and logs'),
    ('whatsapp:broadcast', 'Send WhatsApp Broadcast', 'WhatsApp', 'Send broadcast campaigns and pipeline messages'),
    ('whatsapp:manage', 'Manage WhatsApp Channels', 'WhatsApp', 'Configure channels, phone numbers, and webhooks'),

    -- Instagram
    ('instagram:view', 'View Instagram Feed', 'Instagram', 'View Instagram accounts, media, and comments'),
    ('instagram:scrape', 'Run Instagram Scraper', 'Instagram', 'Trigger scraper jobs and video ingestion'),
    ('instagram:publish', 'Publish to Instagram', 'Instagram', 'Post stories, reels, and product links'),

    -- System
    ('system:settings', 'System Settings', 'System', 'Configure platform and tenant settings'),
    ('system:logs', 'View System Logs', 'System', 'View system logs, ingestion logs, and audit trails'),
    ('system:metrics', 'System Metrics', 'System', 'View performance metrics and resource usage'),

    -- Users
    ('users:view', 'View Users', 'Users', 'View tenant user list and profiles'),
    ('users:manage', 'Manage Users', 'Users', 'Create, update status, and manage users'),
    ('users:delete', 'Delete Users', 'Users', 'Delete tenant users'),

    -- Roles
    ('roles:view', 'View Roles', 'Roles', 'View roles and assigned permissions'),
    ('roles:manage', 'Manage Roles', 'Roles', 'Create, update, and assign roles and permissions')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- ============================================================================
-- SEED DATA: Role Permissions Mapping
-- ============================================================================

-- 1. super_admin gets all permissions
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT '00000000-0000-0000-0000-000000000001', p.id, CURRENT_TIMESTAMP
FROM public.permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2. catalog_manager permissions
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT '00000000-0000-0000-0000-000000000002', p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.code IN ('catalog:view', 'catalog:edit', 'catalog:delete', 'catalog:merge', 'catalog:publish', 'instagram:view', 'system:logs')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. marketing permissions
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT '00000000-0000-0000-0000-000000000003', p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.code IN ('catalog:view', 'customers:view', 'whatsapp:view', 'whatsapp:broadcast', 'whatsapp:manage', 'instagram:view', 'instagram:publish', 'instagram:scrape')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. order_operator permissions
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT '00000000-0000-0000-0000-000000000004', p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.code IN ('catalog:view', 'orders:view', 'orders:edit', 'orders:export', 'customers:view', 'customers:edit', 'whatsapp:view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. staff_readonly permissions
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT '00000000-0000-0000-0000-000000000005', p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.code IN ('catalog:view', 'orders:view', 'customers:view', 'whatsapp:view', 'instagram:view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- SEED DATA: User Roles for Existing Users (assign super_admin)
-- ============================================================================

INSERT INTO public.user_roles (user_id, role_id, tenant_id, assigned_at)
SELECT u.id, '00000000-0000-0000-0000-000000000001', u.tenant_id, CURRENT_TIMESTAMP
FROM public.users u
ON CONFLICT (user_id, role_id) DO NOTHING;
