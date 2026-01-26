import type { NextApiRequest, NextApiResponse } from "next";
import helmet from "helmet";

export type NextHandler = (error?: Error) => void;

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  frameguard: { action: "sameorigin" },
  hsts: {
    maxAge: 60 * 60 * 24 * 365,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
  hidePoweredBy: true,
});

export const applySecurityHeaders = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: NextHandler,
) => {
  helmetMiddleware(req, res, (error: unknown) => {
    if (error instanceof Error) {
      next(error);
      return;
    }
    next();
  });
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const sanitizeInput = (data: unknown): unknown => {
  if (typeof data === "string") {
    const stripped = data.replace(/<[^>]*>/g, "");
    const escaped = stripped.replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return char;
      }
    });
    return escapeRegExp(escaped);
  }

  if (Array.isArray(data)) {
    return data.map((value) => sanitizeInput(value));
  }

  if (data && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, sanitizeInput(value)]),
    );
  }

  return data;
};

export const isValidEmail = (email: string): boolean =>
  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
