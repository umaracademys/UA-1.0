import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

import type { UserRole } from "@/types";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface DecodedToken extends JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

const getRolePermissions = (role: UserRole): string[] => {
  const permissionsByRole: Record<UserRole, string[]> = {
    super_admin: ["*"],
    admin: [
      "users:manage",
      "students:manage",
      "teachers:manage",
      "assignments:manage",
      "reports:read",
      "settings:update",
    ],
    teacher: [
      "students:read",
      "assignments:create",
      "assignments:update",
      "messages:manage",
      "attendance:manage",
      "evaluations:manage",
    ],
    student: ["assignments:read", "messages:read", "attendance:read", "evaluations:read"],
  };

  return permissionsByRole[role] ?? [];
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return secret;
};

const getJwtExpiresIn = () => process.env.JWT_EXPIRE ?? "7d";

export const generateToken = (payload: TokenPayload): string => {
  const permissions = getRolePermissions(payload.role);
  const secret = getJwtSecret();
  const expiresIn = getJwtExpiresIn();

  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions,
    },
    secret,
    { expiresIn } as SignOptions,
  );
};

export const verifyToken = async (token: string): Promise<DecodedToken> => {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;
    return decoded;
  } catch (error) {
    const message =
      error instanceof jwt.TokenExpiredError
        ? "Token expired."
        : error instanceof jwt.JsonWebTokenError
          ? "Invalid token."
          : "Token verification failed.";

    throw new Error(message);
  }
};

export const refreshToken = async (oldToken: string): Promise<string> => {
  const decoded = await verifyToken(oldToken);
  return generateToken({
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  });
};
