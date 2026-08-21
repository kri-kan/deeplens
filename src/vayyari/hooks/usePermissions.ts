import { usePermissionsContext } from '../context/PermissionsContext';

/**
 * Access the full permissions and capabilities context.
 */
export const usePermissions = () => {
  return usePermissionsContext();
};

/**
 * Hook to check if the current user has a specific permission.
 * If passed an array, checks if user has ANY of the specified permissions.
 */
export const useCan = (permission: string | string[]): boolean => {
  const { hasPermission, hasAnyPermission } = usePermissionsContext();
  if (Array.isArray(permission)) {
    return hasAnyPermission(permission);
  }
  return hasPermission(permission);
};

/**
 * Hook to check if the current user has ANY of the specified permissions.
 */
export const useCanAny = (permissions: string[]): boolean => {
  const { hasAnyPermission } = usePermissionsContext();
  return hasAnyPermission(permissions);
};

/**
 * Hook to check if the current user has ALL of the specified permissions.
 */
export const useCanAll = (permissions: string[]): boolean => {
  const { hasAllPermissions } = usePermissionsContext();
  return hasAllPermissions(permissions);
};

/**
 * Hook to check if the current user has a specific role (or any of the listed roles).
 */
export const useRole = (role: string | string[]): boolean => {
  const { hasRole, roles, isSuperAdmin } = usePermissionsContext();
  if (isSuperAdmin) return true;
  if (Array.isArray(role)) {
    return role.some(r => hasRole(r));
  }
  return hasRole(role);
};
