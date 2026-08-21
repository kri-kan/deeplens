import React from 'react';
import { usePermissionsContext } from '../../context/PermissionsContext';

export interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Declarative component that conditionally renders its children
 * only if the user possesses the required permissions or roles.
 * Super Admins automatically bypass all checks.
 *
 * @example
 * <PermissionGate permission="catalog:create" fallback={<Text>Access Denied</Text>}>
 *   <CreateProductButton />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  permissions,
  role,
  roles,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { isSuperAdmin, hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = usePermissionsContext();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // 1. Single permission check
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // 2. Multiple permissions check
  if (permissions && permissions.length > 0) {
    const hasRequired = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequired) {
      return <>{fallback}</>;
    }
  }

  // 3. Single role check
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  // 4. Multiple roles check
  if (roles && roles.length > 0) {
    const hasAnyRole = roles.some(r => hasRole(r));
    if (!hasAnyRole) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default PermissionGate;
