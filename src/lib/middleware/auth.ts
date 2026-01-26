import type { NextApiRequest, NextApiResponse } from "next";

import type { UserRole } from "@/types";
import { verifyToken } from "@/lib/utils/jwt";

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    permissions: string[];
  };
}

export type NextHandler = (error?: Error) => void;

export const authenticateRequest = async (
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: NextHandler,
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    if (!token) {
      res.status(401).json({ message: "Missing authentication token." });
      return;
    }

    const decoded = await verifyToken(token);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions ?? [],
    };
    next();
  } catch (error) {
    res.status(401).json({ message: (error as Error).message || "Invalid token." });
  }
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: AuthenticatedRequest, res: NextApiResponse, next: NextHandler) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }

    next();
  };

const permissionMatches = (permissions: string[], required: string) => {
  if (permissions.includes("*")) {
    return true;
  }

  const [moduleName, action] = required.split(":");
  return permissions.some((permission) => {
    if (permission === required) {
      return true;
    }
    const [permModule, permAction] = permission.split(":");
    return permModule === moduleName && permAction === "manage" && action !== "manage";
  });
};

export const requirePermission =
  (permission: string) =>
  (req: AuthenticatedRequest, res: NextApiResponse, next: NextHandler) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!permissionMatches(req.user.permissions ?? [], permission)) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }

    next();
  };
