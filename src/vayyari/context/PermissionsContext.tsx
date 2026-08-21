import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { adminService } from '../services/adminService';
import { UserCapabilities, PERMISSIONS } from '../types/authorization';
import { wrapInSpan } from '../utils/telemetry';

export const PERMISSIONS_STORAGE_KEY = 'auth_permissions';
export const ROLES_STORAGE_KEY = 'auth_roles';
export const CAPABILITIES_VERSION_STORAGE_KEY = 'auth_capabilities_version';
export const CAPABILITIES_STORAGE_KEY = 'auth_capabilities';

export interface PermissionsContextType {
  capabilities: UserCapabilities | null;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  refreshCapabilities: () => Promise<void>;
  resetPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [capabilities, setCapabilities] = useState<UserCapabilities | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Load cached capabilities from AsyncStorage immediately for zero-latency startup
  const loadCachedCapabilities = useCallback(async () => {
    try {
      const [cachedCapsStr, cachedPermsStr, cachedRolesStr] = await AsyncStorage.multiGet([
        CAPABILITIES_STORAGE_KEY,
        PERMISSIONS_STORAGE_KEY,
        ROLES_STORAGE_KEY,
      ]);

      const cachedCaps = cachedCapsStr[1] ? JSON.parse(cachedCapsStr[1]) : null;
      const cachedPerms = cachedPermsStr[1] ? JSON.parse(cachedPermsStr[1]) : [];
      const cachedRoles = cachedRolesStr[1] ? JSON.parse(cachedRolesStr[1]) : [];

      if (cachedCaps) {
        setCapabilities(cachedCaps);
        setRoles(cachedCaps.roles || cachedRoles);
        setPermissions(cachedCaps.permissions || cachedPerms);
        setIsSuperAdmin(Boolean(cachedCaps.isSuperAdmin || (cachedCaps.roles && cachedCaps.roles.includes('super_admin'))));
      } else if (cachedPerms.length > 0 || cachedRoles.length > 0) {
        setRoles(cachedRoles);
        setPermissions(cachedPerms);
        setIsSuperAdmin(cachedRoles.includes('super_admin') || cachedRoles.includes('Admin'));
      }
    } catch (err) {
      console.warn('[PermissionsContext] Error loading cached capabilities:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Fetch fresh capabilities from API and persist in cache
  const refreshCapabilities = useCallback(async () => {
    return wrapInSpan('PermissionsContext: refreshCapabilities', async () => {
      try {
        if (!token) {
          // If unauthenticated, clear or fallback
          setCapabilities(null);
          setRoles([]);
          setPermissions([]);
          setIsSuperAdmin(false);
          await AsyncStorage.multiRemove([
            CAPABILITIES_STORAGE_KEY,
            PERMISSIONS_STORAGE_KEY,
            ROLES_STORAGE_KEY,
            CAPABILITIES_VERSION_STORAGE_KEY,
          ]);
          return;
        }

        const freshCaps = await adminService.getCapabilities();
        const effectiveRoles = freshCaps.roles || (user?.role ? [user.role] : ['super_admin']);
        const isSuper = Boolean(
          freshCaps.isSuperAdmin ||
          effectiveRoles.includes('super_admin') ||
          effectiveRoles.includes('Admin') ||
          user?.role?.toLowerCase() === 'admin' ||
          user?.role?.toLowerCase() === 'super_admin'
        );

        // If super admin, ensure all domain permissions are available
        const effectivePerms = isSuper
          ? Array.from(new Set([...freshCaps.permissions, ...Object.values(PERMISSIONS)]))
          : freshCaps.permissions;

        const normalizedCaps: UserCapabilities = {
          userId: freshCaps.userId || user?.id || 'current-user',
          tenantId: freshCaps.tenantId || user?.tenantId || 'primary-tenant',
          isSuperAdmin: isSuper,
          roles: effectiveRoles,
          permissions: effectivePerms,
          version: freshCaps.version || 1,
        };

        setCapabilities(normalizedCaps);
        setRoles(normalizedCaps.roles);
        setPermissions(normalizedCaps.permissions);
        setIsSuperAdmin(normalizedCaps.isSuperAdmin);

        await AsyncStorage.multiSet([
          [CAPABILITIES_STORAGE_KEY, JSON.stringify(normalizedCaps)],
          [PERMISSIONS_STORAGE_KEY, JSON.stringify(normalizedCaps.permissions)],
          [ROLES_STORAGE_KEY, JSON.stringify(normalizedCaps.roles)],
          [CAPABILITIES_VERSION_STORAGE_KEY, String(normalizedCaps.version)],
        ]);
      } catch (err) {
        console.warn('[PermissionsContext] Failed to refresh capabilities:', err);
      }
    });
  }, [token, user]);

  // Initial load
  useEffect(() => {
    loadCachedCapabilities();
  }, [loadCachedCapabilities]);

  // Refetch when token or user identity changes
  useEffect(() => {
    if (token) {
      refreshCapabilities();
    } else {
      setCapabilities(null);
      setRoles([]);
      setPermissions([]);
      setIsSuperAdmin(false);
    }
  }, [token, user, refreshCapabilities]);

  // Helper evaluators
  const hasPermission = useCallback((permission: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.includes(permission);
  }, [isSuperAdmin, permissions]);

  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    if (!perms || perms.length === 0) return true;
    return perms.some(p => permissions.includes(p));
  }, [isSuperAdmin, permissions]);

  const hasAllPermissions = useCallback((perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    if (!perms || perms.length === 0) return true;
    return perms.every(p => permissions.includes(p));
  }, [isSuperAdmin, permissions]);

  const hasRole = useCallback((role: string): boolean => {
    if (isSuperAdmin && (role === 'super_admin' || role === 'admin')) return true;
    return roles.some(r => r.toLowerCase() === role.toLowerCase());
  }, [isSuperAdmin, roles]);

  const resetPermissions = useCallback(async () => {
    setCapabilities(null);
    setRoles([]);
    setPermissions([]);
    setIsSuperAdmin(false);
    await AsyncStorage.multiRemove([
      CAPABILITIES_STORAGE_KEY,
      PERMISSIONS_STORAGE_KEY,
      ROLES_STORAGE_KEY,
      CAPABILITIES_VERSION_STORAGE_KEY,
    ]);
  }, []);

  return (
    <PermissionsContext.Provider
      value={{
        capabilities,
        roles,
        permissions,
        isSuperAdmin,
        isLoading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        refreshCapabilities,
        resetPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissionsContext = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissionsContext must be used within a PermissionsProvider');
  }
  return context;
};
