"use client";

import { Menu } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Breadcrumbs } from "./Breadcrumbs";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "@/components/modules/notifications/NotificationBell";
import { UserMenu } from "./UserMenu";

export function Header() {
  const { sidebarOpen, toggleSidebar } = useStore();

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumbs */}
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-3">
        {/* Global Search */}
        <div className="hidden md:block">
          <GlobalSearch />
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
