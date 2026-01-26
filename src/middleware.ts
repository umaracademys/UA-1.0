import { NextRequest, NextResponse } from "next/server";

// Dashboard routes that require authentication (handled client-side)
// Middleware only applies security headers and rate limiting
// Authentication is handled by DashboardLayout and RoleGuard components
const protectedRoutes: string[] = [];
const roleProtectedRoutes: Record<string, string[]> = {};

const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 120;
const rateLimitStore = new Map<string, { count: number; expiresAt: number }>();

const securityHeaders = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

const isProtectedRoute = (pathname: string) =>
  protectedRoutes.some((route) => pathname.startsWith(route));

const getRequiredRoles = (pathname: string) =>
  Object.entries(roleProtectedRoutes).find(([route]) => pathname.startsWith(route))?.[1] ??
  [];

const applyRateLimit = (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.expiresAt <= now) {
    rateLimitStore.set(ip, { count: 1, expiresAt: now + rateLimitWindowMs });
    return { allowed: true };
  }

  if (entry.count >= rateLimitMaxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.expiresAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rateLimit = applyRateLimit(request);

  if (!rateLimit.allowed) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(rateLimit.retryAfter ?? 60) },
    });
  }

  const response = NextResponse.next();
  Object.entries(securityHeaders).forEach(([key, value]) => response.headers.set(key, value));

  // Authentication and authorization are handled client-side by:
  // - DashboardLayout component (checks authentication)
  // - RoleGuard and PermissionGuard components (checks roles/permissions)
  // Middleware only handles security headers and rate limiting
  
  // For API routes, authentication is handled in each route handler
  // For page routes, let them render and handle auth client-side
  
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
