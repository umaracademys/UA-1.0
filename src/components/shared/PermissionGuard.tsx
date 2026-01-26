"use client";

import type { ReactNode } from "react";

import type { UserRole } from "@/types";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGuardProps {
  permission?: string | string[];
  role?: UserRole | UserRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  permission,
  role,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, userRole } = usePermissions();

  // Super admin bypasses all permission checks
  if (userRole === "super_admin") {
    return <>{children}</>;
  }

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!userRole || !roles.includes(userRole)) {
      return <>{fallback}</>;
    }
  }

  if (permission) {
    const hasAccess = Array.isArray(permission)
      ? hasAnyPermission(permission)
      : hasPermission(permission);

    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
