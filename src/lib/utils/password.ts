import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const WEAK_PASSWORDS = new Set([
  "password",
  "password123",
  "12345678",
  "qwerty123",
  "letmein",
  "welcome",
  "admin123",
]);

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const validatePassword = (
  password: string,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must include at least one lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must include at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must include at least one special character.");
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    errors.push("Password is too common. Choose a stronger password.");
  }

  return { valid: errors.length === 0, errors };
};

export const generateRandomPassword = (): string => {
  const length = 16;
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i += 1) {
    password += charset[bytes[i] % charset.length];
  }

  return password;
};
