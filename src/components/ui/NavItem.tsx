"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

type NavItemProps = {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number | string;
  active?: boolean;
  onClick?: () => void;
};

export function NavItem({ icon: Icon, label, href, badge, active, onClick }: NavItemProps) {
  const pathname = usePathname();
  const { settings } = useSystemSettings();
  const isActive = active !== undefined ? active : pathname === href || pathname?.startsWith(href + "/");
  const primaryColor = settings?.colorScheme?.primary || "#2E4D32";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "text-white"
          : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
      )}
      style={
        isActive
          ? {
              backgroundColor: primaryColor,
            }
          : undefined
      }
    >
      <Icon
        className={clsx("h-5 w-5 flex-shrink-0", isActive ? "text-white" : "text-neutral-500")}
      />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge !== null && (
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            isActive
              ? "bg-white/20 text-white"
              : "bg-neutral-200 text-neutral-700 group-hover:bg-neutral-300",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
