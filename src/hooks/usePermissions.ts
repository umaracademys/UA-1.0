import { useCallback } from "react";

import type { UserRole } from "@/types";
import {
  canAccessModule as checkModuleAccess,
  hasAllPermissions as checkAllPermissions,
  hasAnyPermission as checkAnyPermission,
  hasPermission as checkUserPermission,
} from "@/lib/utils/permissions";
import { useAuth } from "@/contexts/AuthContext";

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      return checkUserPermission(user.role as UserRole, permission);
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]) => {
      if (!user) return false;
      return checkAnyPermission(user.role as UserRole, permissions);
    },
    [user],
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]) => {
      if (!user) return false;
      return checkAllPermissions(user.role as UserRole, permissions);
    },
    [user],
  );

  const canAccessModule = useCallback(
    (module: string) => {
      if (!user) return false;
      return checkModuleAccess(user.role as UserRole, module);
    },
    [user],
  );

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessModule,
    userRole: user?.role,
  };
}
