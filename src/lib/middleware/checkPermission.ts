import type { NextApiResponse } from "next";

import type { AuthenticatedRequest, NextHandler } from "@/lib/middleware/auth";
import {
  hasAllPermissions as roleHasAllPermissions,
  hasPermission as roleHasPermission,
} from "@/lib/utils/permissions";

export function checkPermission(permission: string | string[]) {
  return async (req: AuthenticatedRequest, res: NextApiResponse, next: NextHandler) => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const allowed = Array.isArray(permission)
        ? roleHasAllPermissions(user.role, permission)
        : roleHasPermission(user.role, permission);

      if (!allowed) {
        res.status(403).json({
          error: "Forbidden",
          message: "You do not have permission to perform this action",
        });
        return;
      }

      next();
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  };
}
