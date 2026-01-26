import type { UserRole } from "@/types";
import { MODULE_PERMISSIONS } from "@/constants/permissions";
import { ROLE_PERMISSIONS } from "@/constants/rolePermissions";

const getRolePermissions = (userRole: UserRole): string[] => {
  return [...(ROLE_PERMISSIONS[userRole] ?? [])];
};

/**
 * Check if a user role is super admin
 * Super admin has unrestricted access to all features
 */
export const isSuperAdmin = (userRole: UserRole): boolean => {
  return userRole === "super_admin";
};

export const hasPermission = (userRole: UserRole, permission: string): boolean => {
  // Super admin has access to everything
  if (userRole === "super_admin") {
    return true;
  }
  const permissions = getRolePermissions(userRole);
  if (permissions.includes("*")) {
    return true;
  }
  return permissions.includes(permission);
};

export const hasAnyPermission = (userRole: UserRole, permissions: string[]): boolean => {
  return permissions.some((permission) => hasPermission(userRole, permission));
};

export const hasAllPermissions = (userRole: UserRole, permissions: string[]): boolean => {
  return permissions.every((permission) => hasPermission(userRole, permission));
};

export const getModulePermissions = (userRole: UserRole, module: string): string[] => {
  // Super admin gets all permissions for any module
  if (userRole === "super_admin") {
    const modulePermissions = MODULE_PERMISSIONS[module as keyof typeof MODULE_PERMISSIONS];
    return modulePermissions ? Object.values(modulePermissions) : [];
  }
  const modulePermissions = MODULE_PERMISSIONS[module as keyof typeof MODULE_PERMISSIONS];
  if (!modulePermissions) {
    return [];
  }
  const rolePermissions = getRolePermissions(userRole);
  if (rolePermissions.includes("*")) {
    return Object.values(modulePermissions);
  }
  return Object.values(modulePermissions).filter((permission) =>
    rolePermissions.includes(permission),
  );
};

export const canAccessModule = (userRole: UserRole, module: string): boolean => {
  // Super admin has access to all modules
  if (userRole === "super_admin") {
    return true;
  }
  const modulePermissions = MODULE_PERMISSIONS[module as keyof typeof MODULE_PERMISSIONS];
  if (!modulePermissions) {
    return false;
  }
  return Object.values(modulePermissions).some((permission) =>
    hasPermission(userRole, permission),
  );
};

/**
 * Check permission for API routes - explicitly handles super_admin
 * This is a convenience function for API route permission checks
 */
export const checkAPIPermission = (
  role: UserRole,
  permission: string,
  tokenPermissions?: string[],
): boolean => {
  // Super admin always has access
  if (role === "super_admin") {
    return true;
  }
  // Check via hasPermission function
  if (hasPermission(role, permission)) {
    return true;
  }
  // Check via token permissions array (for backward compatibility)
  if (tokenPermissions?.includes(permission)) {
    return true;
  }
  return false;
};
