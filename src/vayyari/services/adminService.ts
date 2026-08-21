import { ApiClient } from '../api/base';
import { identityService } from './identity.service';
import { API_ROUTES } from '../constants/api-routes';
import { getSearchApiUrl } from '@/utils/api-config';
import {
  UserCapabilities,
  StaffUser,
  Role,
  PermissionDefinition,
  ALL_PERMISSION_DEFINITIONS,
  PERMISSIONS,
} from '../types/authorization';

// Seed Roles
export const DEFAULT_SYSTEM_ROLES: Role[] = [
  {
    id: 'role-super-admin',
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Unrestricted access to all tenant functions, administration, and system controls.',
    isSystem: true,
    permissions: Object.values(PERMISSIONS),
  },
  {
    id: 'role-admin',
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full operational and management access across catalog, orders, marketing, and users.',
    isSystem: true,
    permissions: [
      PERMISSIONS.CATALOG_VIEW,
      PERMISSIONS.CATALOG_CREATE,
      PERMISSIONS.CATALOG_EDIT,
      PERMISSIONS.CATALOG_DELETE,
      PERMISSIONS.CATALOG_MERGE,
      PERMISSIONS.CATALOG_PUBLISH,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_CREATE,
      PERMISSIONS.ORDERS_PROCESS,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.WHATSAPP_VIEW,
      PERMISSIONS.WHATSAPP_BROADCAST,
      PERMISSIONS.WHATSAPP_ADMIN,
      PERMISSIONS.INSTAGRAM_VIEW,
      PERMISSIONS.INSTAGRAM_SCRAPE,
      PERMISSIONS.INSTAGRAM_MANAGE,
      PERMISSIONS.SYSTEM_DASHBOARD_VIEW,
      PERMISSIONS.SYSTEM_MEDIA_RULES_EDIT,
      PERMISSIONS.SYSTEM_MASTER_DATA_EDIT,
      PERMISSIONS.SYSTEM_JOBS_MANAGE,
      PERMISSIONS.SYSTEM_PLAYGROUND_VIEW,
      PERMISSIONS.VENDORS_VIEW,
      PERMISSIONS.VENDORS_MANAGE,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.ROLES_MANAGE,
      PERMISSIONS.AI_GENERATE,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
  {
    id: 'role-catalog-manager',
    name: 'catalog_manager',
    displayName: 'Catalog Manager',
    description: 'Create, edit, merge, publish, and manage product inventory and media assets.',
    isSystem: true,
    permissions: [
      PERMISSIONS.CATALOG_VIEW,
      PERMISSIONS.CATALOG_CREATE,
      PERMISSIONS.CATALOG_EDIT,
      PERMISSIONS.CATALOG_DELETE,
      PERMISSIONS.CATALOG_MERGE,
      PERMISSIONS.CATALOG_PUBLISH,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.AI_GENERATE,
      PERMISSIONS.SYSTEM_MASTER_DATA_EDIT,
    ],
  },
  {
    id: 'role-marketing',
    name: 'marketing',
    displayName: 'Marketing Specialist',
    description: 'Manage WhatsApp campaigns, Instagram explorer, social links, and broadcasts.',
    isSystem: true,
    permissions: [
      PERMISSIONS.CATALOG_VIEW,
      PERMISSIONS.WHATSAPP_VIEW,
      PERMISSIONS.WHATSAPP_BROADCAST,
      PERMISSIONS.INSTAGRAM_VIEW,
      PERMISSIONS.INSTAGRAM_SCRAPE,
      PERMISSIONS.INSTAGRAM_MANAGE,
      PERMISSIONS.CUSTOMERS_VIEW,
    ],
  },
  {
    id: 'role-order-operator',
    name: 'order_operator',
    displayName: 'Order Operator',
    description: 'Process customer orders, generate order IDs, and manage fulfillment details.',
    isSystem: true,
    permissions: [
      PERMISSIONS.CATALOG_VIEW,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_CREATE,
      PERMISSIONS.ORDERS_PROCESS,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.CUSTOMERS_MANAGE,
    ],
  },
  {
    id: 'role-staff-readonly',
    name: 'staff_readonly',
    displayName: 'Staff (Read-Only)',
    description: 'Read-only visibility into catalog products, customer profiles, and orders.',
    isSystem: true,
    permissions: [
      PERMISSIONS.CATALOG_VIEW,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.CUSTOMERS_VIEW,
    ],
  },
];

// Fallback in-memory seed data for offline / fallback
let inMemoryUsers: StaffUser[] = [
  {
    id: 'user-1',
    email: 'admin@deeplens.ai',
    firstName: 'Sai Krishna',
    lastName: 'Kanth',
    role: 'super_admin',
    roles: ['super_admin'],
    tenantId: 'tenant-primary',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    permissions: Object.values(PERMISSIONS),
  },
  {
    id: 'user-2',
    email: 'catalog@deeplens.ai',
    firstName: 'Priya',
    lastName: 'Sharma',
    role: 'catalog_manager',
    roles: ['catalog_manager'],
    tenantId: 'tenant-primary',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    permissions: [
      PERMISSIONS.CATALOG_VIEW,
      PERMISSIONS.CATALOG_CREATE,
      PERMISSIONS.CATALOG_EDIT,
      PERMISSIONS.CATALOG_DELETE,
      PERMISSIONS.CATALOG_MERGE,
      PERMISSIONS.CATALOG_PUBLISH,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.AI_GENERATE,
      PERMISSIONS.SYSTEM_MASTER_DATA_EDIT,
    ],
  },
  {
    id: 'user-3',
    email: 'marketing@deeplens.ai',
    firstName: 'Ananya',
    lastName: 'Reddy',
    role: 'marketing',
    roles: ['marketing'],
    tenantId: 'tenant-primary',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    permissions: [
      PERMISSIONS.CATALOG_VIEW,
      PERMISSIONS.WHATSAPP_VIEW,
      PERMISSIONS.WHATSAPP_BROADCAST,
      PERMISSIONS.INSTAGRAM_VIEW,
      PERMISSIONS.INSTAGRAM_SCRAPE,
      PERMISSIONS.INSTAGRAM_MANAGE,
      PERMISSIONS.CUSTOMERS_VIEW,
    ],
  },
  {
    id: 'user-4',
    email: 'orders@deeplens.ai',
    firstName: 'Rahul',
    lastName: 'Verma',
    role: 'order_operator',
    roles: ['order_operator'],
    tenantId: 'tenant-primary',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    permissions: [
      PERMISSIONS.CATALOG_VIEW,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_CREATE,
      PERMISSIONS.ORDERS_PROCESS,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.CUSTOMERS_MANAGE,
    ],
  },
  {
    id: 'user-5',
    email: 'intern@deeplens.ai',
    firstName: 'Vikram',
    lastName: 'Singh',
    role: 'staff_readonly',
    roles: ['staff_readonly'],
    tenantId: 'tenant-primary',
    isActive: false,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    permissions: [
      PERMISSIONS.CATALOG_VIEW,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.CUSTOMERS_VIEW,
    ],
  },
];

let inMemoryRoles: Role[] = [...DEFAULT_SYSTEM_ROLES];

class AdminService {
  private client: ApiClient;

  constructor() {
    this.client = new ApiClient(
      getSearchApiUrl(),
      () => identityService.getAccessTokenWithRefresh()
    );
  }

  /**
   * Retrieves the current user's computed capabilities (roles, permissions, version).
   */
  async getCapabilities(): Promise<UserCapabilities> {
    try {
      const response = await this.client.get<UserCapabilities>(API_ROUTES.AUTH.CAPABILITIES);
      if (response && response.permissions) {
        return response;
      }
    } catch (err) {
      console.warn('[AdminService] Backend capabilities API not responding, using local fallback:', err);
    }

    // Local fallback derived from current profile / default super admin
    return {
      userId: 'user-1',
      tenantId: 'tenant-primary',
      isSuperAdmin: true,
      roles: ['super_admin'],
      permissions: Object.values(PERMISSIONS),
      version: 1,
    };
  }

  /**
   * Retrieves all staff users for the tenant directory.
   */
  async getUsers(): Promise<StaffUser[]> {
    try {
      const response = await this.client.get<StaffUser[]>(API_ROUTES.ADMIN.USERS);
      if (Array.isArray(response) && response.length > 0) {
        return response;
      }
    } catch (err) {
      console.warn('[AdminService] Backend getUsers API failed, using fallback in-memory list:', err);
    }
    return inMemoryUsers;
  }

  /**
   * Retrieves single user details with assigned roles and permission overrides.
   */
  async getUser(id: string): Promise<StaffUser> {
    try {
      const response = await this.client.get<StaffUser>(API_ROUTES.ADMIN.USER_DETAIL(id));
      if (response && response.id) {
        return response;
      }
    } catch (err) {
      console.warn(`[AdminService] Backend getUser(${id}) failed, checking fallback list:`, err);
    }

    const found = inMemoryUsers.find(u => u.id === id);
    if (found) return found;

    throw new Error(`User with ID ${id} not found.`);
  }

  /**
   * Updates a user's active/inactive status.
   */
  async updateUserStatus(id: string, isActive: boolean): Promise<StaffUser> {
    try {
      const response = await this.client.put<StaffUser>(
        API_ROUTES.ADMIN.USER_STATUS(id),
        { isActive }
      );
      if (response && response.id) {
        return response;
      }
    } catch (err) {
      console.warn(`[AdminService] Backend updateUserStatus(${id}) failed, applying in-memory:`, err);
    }

    // Update in-memory
    const userIndex = inMemoryUsers.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      inMemoryUsers[userIndex] = {
        ...inMemoryUsers[userIndex],
        isActive,
      };
      return inMemoryUsers[userIndex];
    }
    throw new Error(`User with ID ${id} not found.`);
  }

  /**
   * Updates assigned roles for a staff user.
   */
  async updateUserRoles(id: string, roleIds: string[]): Promise<StaffUser> {
    try {
      const response = await this.client.put<StaffUser>(
        API_ROUTES.ADMIN.USER_ROLES(id),
        { roles: roleIds }
      );
      if (response && response.id) {
        return response;
      }
    } catch (err) {
      console.warn(`[AdminService] Backend updateUserRoles(${id}) failed, applying in-memory:`, err);
    }

    const userIndex = inMemoryUsers.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      // Calculate effective permissions from roles
      const effectivePermissions = new Set<string>();
      roleIds.forEach(roleNameOrId => {
        const r = inMemoryRoles.find(role => role.id === roleNameOrId || role.name === roleNameOrId);
        if (r) {
          r.permissions.forEach(p => effectivePermissions.add(p));
        }
      });

      inMemoryUsers[userIndex] = {
        ...inMemoryUsers[userIndex],
        role: roleIds[0] || 'staff_readonly',
        roles: roleIds,
        permissions: Array.from(effectivePermissions),
      };
      return inMemoryUsers[userIndex];
    }
    throw new Error(`User with ID ${id} not found.`);
  }

  /**
   * Updates custom permission overrides for a staff user.
   */
  async updateUserPermissions(id: string, permissions: string[]): Promise<StaffUser> {
    try {
      const response = await this.client.put<StaffUser>(
        API_ROUTES.ADMIN.USER_PERMISSIONS(id),
        { permissions }
      );
      if (response && response.id) {
        return response;
      }
    } catch (err) {
      console.warn(`[AdminService] Backend updateUserPermissions(${id}) failed, applying in-memory:`, err);
    }

    const userIndex = inMemoryUsers.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      inMemoryUsers[userIndex] = {
        ...inMemoryUsers[userIndex],
        permissions,
        customPermissions: permissions,
      };
      return inMemoryUsers[userIndex];
    }
    throw new Error(`User with ID ${id} not found.`);
  }

  /**
   * Retrieves all defined roles.
   */
  async getRoles(): Promise<Role[]> {
    try {
      const response = await this.client.get<Role[]>(API_ROUTES.ADMIN.ROLES);
      if (Array.isArray(response) && response.length > 0) {
        return response;
      }
    } catch (err) {
      console.warn('[AdminService] Backend getRoles API failed, using fallback roles:', err);
    }
    return inMemoryRoles;
  }

  /**
   * Retrieves all available domain permission definitions.
   */
  async getPermissions(): Promise<PermissionDefinition[]> {
    try {
      const response = await this.client.get<PermissionDefinition[]>(API_ROUTES.ADMIN.PERMISSIONS);
      if (Array.isArray(response) && response.length > 0) {
        return response;
      }
    } catch (err) {
      console.warn('[AdminService] Backend getPermissions API failed, using static definitions:', err);
    }
    return ALL_PERMISSION_DEFINITIONS;
  }

  /**
   * Updates permission set assigned to a specific role.
   */
  async updateRolePermissions(roleId: string, permissionCodes: string[]): Promise<Role> {
    try {
      const response = await this.client.put<Role>(
        API_ROUTES.ADMIN.ROLE_PERMISSIONS(roleId),
        { permissions: permissionCodes }
      );
      if (response && response.id) {
        return response;
      }
    } catch (err) {
      console.warn(`[AdminService] Backend updateRolePermissions(${roleId}) failed, applying in-memory:`, err);
    }

    const roleIndex = inMemoryRoles.findIndex(r => r.id === roleId || r.name === roleId);
    if (roleIndex !== -1) {
      inMemoryRoles[roleIndex] = {
        ...inMemoryRoles[roleIndex],
        permissions: permissionCodes,
      };
      return inMemoryRoles[roleIndex];
    }
    throw new Error(`Role with ID ${roleId} not found.`);
  }
}

export const adminService = new AdminService();
export default adminService;
