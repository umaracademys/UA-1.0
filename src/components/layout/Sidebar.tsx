"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FileText,
  Ticket,
  Star,
  Calendar,
  MessageSquare,
  BookOpen,
  Settings,
  Key,
  Shield,
  Database,
  BarChart3,
  GraduationCap,
  UserCircle,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/store/useStore";
import { NavItem } from "@/components/ui/NavItem";
import { useNotifications } from "@/contexts/NotificationContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

type MenuItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
};

const studentMenu: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/student" },
  { icon: FileText, label: "Assignments", href: "/student/assignments" },
  { icon: BookOpen, label: "Personal Mushaf", href: "/student/personal-mushaf" },
  { icon: Star, label: "Evaluations", href: "/student/evaluations" },
  { icon: GraduationCap, label: "Qaidah", href: "/student/qaidah" },
  { icon: Calendar, label: "Attendance", href: "/student/attendance" },
  { icon: MessageSquare, label: "Messages", href: "/messages" },
  { icon: UserCircle, label: "Profile", href: "/student/profile" },
];

const teacherMenu: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/teacher" },
  { icon: Users, label: "Students", href: "/teacher/students" },
  { icon: Ticket, label: "Tickets", href: "/teacher/tickets" },
  { icon: FileText, label: "Assignments", href: "/teacher/assignments" },
  { icon: Star, label: "Evaluations", href: "/teacher/evaluations" },
  { icon: Calendar, label: "Attendance", href: "/teacher/attendance" },
  { icon: GraduationCap, label: "Qaidah", href: "/teacher/qaidah" },
  { icon: MessageSquare, label: "Messages", href: "/messages" },
  { icon: UserCircle, label: "Profile", href: "/teacher/profile" },
];

const adminMenu: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: Users, label: "Students", href: "/admin/students" },
  { icon: Users, label: "Teachers", href: "/admin/teachers" },
  { icon: FileText, label: "Assignments", href: "/admin/assignments" },
  { icon: Ticket, label: "Tickets", href: "/admin/tickets" },
  { icon: Star, label: "Evaluations", href: "/admin/evaluations" },
  { icon: Calendar, label: "Attendance", href: "/admin/attendance" },
  { icon: BookOpen, label: "PDFs", href: "/pdfs" },
  { icon: MessageSquare, label: "Messages", href: "/messages" },
  { icon: BarChart3, label: "Reports", href: "/admin/reports" },
];

const superAdminMenu: MenuItem[] = [
  ...adminMenu,
  { icon: Settings, label: "Settings", href: "/super-admin/settings" },
  { icon: Key, label: "Permissions", href: "/super-admin/permissions" },
  { icon: Shield, label: "Security", href: "/super-admin/security" },
  { icon: Database, label: "Database", href: "/super-admin/database" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useStore();
  const { unreadCount } = useNotifications();
  const { settings } = useSystemSettings();
  const pathname = usePathname();

  // Debug: Log settings to see if logo is loaded
  useEffect(() => {
    if (settings) {
      console.log("Sidebar settings:", { 
        logo: settings.logo, 
        systemName: settings.systemName,
        hasLogo: !!(settings.logo && settings.logo !== null && settings.logo !== "")
      });
    }
  }, [settings]);

  if (!user) return null;

  const getMenuItems = (): MenuItem[] => {
    switch (user.role) {
      case "student":
        return studentMenu;
      case "teacher":
        return teacherMenu;
      case "admin":
        return adminMenu;
      case "super_admin":
        return superAdminMenu;
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  // Add badge to messages if there are unread notifications
  const menuItemsWithBadges = menuItems.map((item) => {
    if (item.href === "/messages" && unreadCount > 0) {
      return { ...item, badge: unreadCount };
    }
    return item;
  });

  return (
    <aside
      className={`fixed left-0 top-0 z-50 h-screen w-64 transform border-r border-neutral-200 bg-white transition-transform duration-300 lg:relative lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
            <Link href={`/${user.role}`} className="flex items-center justify-center w-full">
              <div className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-lg">
                <img
                  src={settings?.logo || "/uploads/logo/logo-1769252899089.png"}
                  alt={settings?.systemName || "Umar Academy"}
                  className="h-full w-auto object-contain"
                  style={{ maxHeight: "48px" }}
                />
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5 text-neutral-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-1">
              {menuItemsWithBadges.map((item) => (
                <NavItem
                  key={item.href}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  badge={item.badge}
                />
              ))}
            </div>
          </nav>

          {/* User Section */}
          <div className="border-t border-neutral-200 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: settings?.colorScheme?.primary || "#2E4D32" }}
              >
                {user.fullName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {user.fullName || "User"}
                </p>
                <p className="truncate text-xs text-neutral-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>
  );
}
