/**
 * Authorization and RBAC/PBAC Types for Vayyari.
 * Defines domain permissions, user capabilities, roles, and administrative data models.
 */

export const PERMISSIONS = {
  // Catalog Management
  CATALOG_VIEW: 'catalog:view',
  CATALOG_CREATE: 'catalog:create',
  CATALOG_EDIT: 'catalog:edit',
  CATALOG_DELETE: 'catalog:delete',
  CATALOG_MERGE: 'catalog:merge',
  CATALOG_PUBLISH: 'catalog:publish',

  // Order Management
  ORDERS_VIEW: 'orders:view',
  ORDERS_CREATE: 'orders:create',
  ORDERS_PROCESS: 'orders:process',

  // Customer Management
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_MANAGE: 'customers:manage',

  // WhatsApp Communication
  WHATSAPP_VIEW: 'whatsapp:view',
  WHATSAPP_BROADCAST: 'whatsapp:broadcast',
  WHATSAPP_ADMIN: 'whatsapp:admin',

  // Instagram Integration
  INSTAGRAM_VIEW: 'instagram:view',
  INSTAGRAM_SCRAPE: 'instagram:scrape',
  INSTAGRAM_MANAGE: 'instagram:manage',

  // System & Operations
  SYSTEM_DASHBOARD_VIEW: 'system:dashboard:view',
  SYSTEM_MEDIA_RULES_EDIT: 'system:media_rules:edit',
  SYSTEM_MASTER_DATA_EDIT: 'system:master_data:edit',
  SYSTEM_JOBS_MANAGE: 'system:jobs:manage',
  SYSTEM_PLAYGROUND_VIEW: 'system:playground:view',

  // Vendor Management
  VENDORS_VIEW: 'vendors:view',
  VENDORS_MANAGE: 'vendors:manage',

  // User & Access Administration
  USERS_VIEW: 'users:view',
  USERS_MANAGE: 'users:manage',
  ROLES_MANAGE: 'roles:manage',

  // AI & Reasoning
  AI_GENERATE: 'ai:generate',

  // Reports & Analytics
  REPORTS_VIEW: 'reports:view',
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export type PermissionCategory =
  | 'catalog'
  | 'orders'
  | 'customers'
  | 'whatsapp'
  | 'instagram'
  | 'system'
  | 'vendors'
  | 'users'
  | 'ai';

export interface PermissionDefinition {
  code: string;
  name: string;
  category: PermissionCategory;
  description: string;
}

export const ALL_PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Catalog
  { code: PERMISSIONS.CATALOG_VIEW, name: 'View Catalog', category: 'catalog', description: 'Browse and search product listings, media, and inventory' },
  { code: PERMISSIONS.CATALOG_CREATE, name: 'Create Product', category: 'catalog', description: 'Create and ingest new products and media files' },
  { code: PERMISSIONS.CATALOG_EDIT, name: 'Edit Product', category: 'catalog', description: 'Update product details, titles, prices, and tags' },
  { code: PERMISSIONS.CATALOG_DELETE, name: 'Delete Product', category: 'catalog', description: 'Soft-delete or permanently purge catalog items' },
  { code: PERMISSIONS.CATALOG_MERGE, name: 'Merge Products', category: 'catalog', description: 'Merge similar product listings and cluster duplicates' },
  { code: PERMISSIONS.CATALOG_PUBLISH, name: 'Publish Catalog', category: 'catalog', description: 'Publish catalog updates to online channels' },

  // Orders
  { code: PERMISSIONS.ORDERS_VIEW, name: 'View Orders', category: 'orders', description: 'View order history, status, and generated order IDs' },
  { code: PERMISSIONS.ORDERS_CREATE, name: 'Create Orders', category: 'orders', description: 'Generate new order IDs and create customer orders' },
  { code: PERMISSIONS.ORDERS_PROCESS, name: 'Process Orders', category: 'orders', description: 'Update order statuses, assign tracking, and fulfill items' },

  // Customers
  { code: PERMISSIONS.CUSTOMERS_VIEW, name: 'View Customers', category: 'customers', description: 'Search and view customer profiles and addresses' },
  { code: PERMISSIONS.CUSTOMERS_MANAGE, name: 'Manage Customers', category: 'customers', description: 'Create, update, or delete customer records and delivery addresses' },

  // WhatsApp
  { code: PERMISSIONS.WHATSAPP_VIEW, name: 'View WhatsApp', category: 'whatsapp', description: 'Inspect WhatsApp chats, incoming media, and accounts' },
  { code: PERMISSIONS.WHATSAPP_BROADCAST, name: 'WhatsApp Broadcast', category: 'whatsapp', description: 'Launch broadcast campaigns and distribute outbound messages' },
  { code: PERMISSIONS.WHATSAPP_ADMIN, name: 'WhatsApp Admin', category: 'whatsapp', description: 'Configure WhatsApp accounts, channels, and webhook integrations' },

  // Instagram
  { code: PERMISSIONS.INSTAGRAM_VIEW, name: 'View Instagram', category: 'instagram', description: 'Browse Instagram posts, media, and profile explorer' },
  { code: PERMISSIONS.INSTAGRAM_SCRAPE, name: 'Scrape Instagram', category: 'instagram', description: 'Trigger competitor or profile post scraping jobs' },
  { code: PERMISSIONS.INSTAGRAM_MANAGE, name: 'Manage Instagram', category: 'instagram', description: 'Link Instagram posts to products and manage Meta configs' },

  // System
  { code: PERMISSIONS.SYSTEM_DASHBOARD_VIEW, name: 'View System Dashboard', category: 'system', description: 'Access system health, telemetry, and background jobs' },
  { code: PERMISSIONS.SYSTEM_MEDIA_RULES_EDIT, name: 'Edit Media Rules', category: 'system', description: 'Configure retention policies, compression, and MinIO rules' },
  { code: PERMISSIONS.SYSTEM_MASTER_DATA_EDIT, name: 'Edit Master Data', category: 'system', description: 'Manage product categories, tags, and lookups' },
  { code: PERMISSIONS.SYSTEM_JOBS_MANAGE, name: 'Manage Background Jobs', category: 'system', description: 'Trigger cleanup, maintenance, and synchronization tasks' },
  { code: PERMISSIONS.SYSTEM_PLAYGROUND_VIEW, name: 'Access Playground', category: 'system', description: 'Test experimental features, APIs, and UI prototypes' },

  // Vendors
  { code: PERMISSIONS.VENDORS_VIEW, name: 'View Vendors', category: 'vendors', description: 'Browse vendor directory and contact records' },
  { code: PERMISSIONS.VENDORS_MANAGE, name: 'Manage Vendors', category: 'vendors', description: 'Add, update, or deactivate vendor records and addresses' },

  // Users & Access
  { code: PERMISSIONS.USERS_VIEW, name: 'View Users', category: 'users', description: 'View staff directory, active accounts, and user profiles' },
  { code: PERMISSIONS.USERS_MANAGE, name: 'Manage Users', category: 'users', description: 'Invite staff, activate/deactivate accounts, and edit profile details' },
  { code: PERMISSIONS.ROLES_MANAGE, name: 'Manage Roles & Access', category: 'users', description: 'Assign roles, override permissions, and configure role matrices' },

  // AI & Reasoning
  { code: PERMISSIONS.AI_GENERATE, name: 'AI Generation', category: 'ai', description: 'Generate AI descriptions, tags, and product reasoning' },

  // Reports
  { code: PERMISSIONS.REPORTS_VIEW, name: 'View Reports', category: 'system', description: 'Access business analytics and performance metrics' },
];

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem?: boolean;
  permissions: string[];
}

export interface UserCapabilities {
  userId: string;
  tenantId: string;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
  version: number;
}

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  roles: string[];
  tenantId: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  permissions?: string[];
  customPermissions?: string[];
}

export interface UpdateUserRolesRequest {
  roles: string[];
}

export interface UpdateUserStatusRequest {
  isActive: boolean;
}

export interface UpdateUserPermissionsRequest {
  permissions: string[];
}

export interface UpdateRolePermissionsRequest {
  roleId: string;
  permissions: string[];
}
