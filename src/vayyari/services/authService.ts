import { identityService } from './identity.service';
import { adminService } from './adminService';
import { UserCapabilities } from '../types/authorization';

/**
 * Authentication and authorization facade service.
 */
export const authService = {
  ...identityService,
  getCapabilities: (): Promise<UserCapabilities> => adminService.getCapabilities(),
  getUsers: () => adminService.getUsers(),
  getUser: (id: string) => adminService.getUser(id),
  updateUserStatus: (id: string, isActive: boolean) => adminService.updateUserStatus(id, isActive),
  updateUserRoles: (id: string, roleIds: string[]) => adminService.updateUserRoles(id, roleIds),
  updateUserPermissions: (id: string, permissions: string[]) => adminService.updateUserPermissions(id, permissions),
  getRoles: () => adminService.getRoles(),
  getPermissions: () => adminService.getPermissions(),
  updateRolePermissions: (roleId: string, permissionCodes: string[]) => adminService.updateRolePermissions(roleId, permissionCodes),
};

export default authService;
