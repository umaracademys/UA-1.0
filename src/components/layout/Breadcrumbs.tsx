"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();

  if (!pathname) return null;

  const pathSegments = pathname.split("/").filter(Boolean);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    ...pathSegments.map((segment, index) => {
      const href = "/" + pathSegments.slice(0, index + 1).join("/");
      const label = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return { label, href, isLast: index === pathSegments.length - 1 };
    }),
  ];

  // Don't show breadcrumbs on home page
  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={crumb.href} className="flex items-center gap-2">
            {index === 0 ? (
              <Link
                href={crumb.href}
                className="text-neutral-500 hover:text-neutral-700"
                aria-label="Home"
              >
                <Home className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <ChevronRight className="h-4 w-4 text-neutral-400" />
                {isLast ? (
                  <span className="font-medium text-neutral-900">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-neutral-500 hover:text-neutral-700 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}
