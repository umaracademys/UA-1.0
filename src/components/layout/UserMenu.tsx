"use client";

import { useState, useRef, useEffect } from "react";
import { User, Settings, HelpCircle, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import Link from "next/link";

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { settings } = useSystemSettings();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (!user) return null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-100 text-purple-700";
      case "admin":
        return "bg-blue-100 text-blue-700";
      case "teacher":
        return "bg-green-100 text-green-700";
      case "student":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-100"
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: settings?.colorScheme?.primary || "#2E4D32" }}
        >
          {user.fullName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
        </div>
        <div className="hidden text-left md:block">
          <p className="text-sm font-medium text-neutral-900">{user.fullName || "User"}</p>
          <p className="text-xs text-neutral-500">{user.email}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-neutral-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-neutral-200 bg-white shadow-lg">
          {/* User Info */}
          <div className="border-b border-neutral-200 px-4 py-3">
            <p className="text-sm font-semibold text-neutral-900">{user.fullName || "User"}</p>
            <p className="text-xs text-neutral-500">{user.email}</p>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeColor(
                user.role,
              )}`}
            >
              {user.role.replace("_", " ").toUpperCase()}
            </span>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href={`/${user.role}/profile`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <User className="h-4 w-4" />
              View Profile
            </Link>
            <Link
              href={`/${user.role}/settings`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <Settings className="h-4 w-4" />
              Account Settings
            </Link>
            <Link
              href="/help"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <HelpCircle className="h-4 w-4" />
              Help & Support
            </Link>
            <div className="my-1 border-t border-neutral-200" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
