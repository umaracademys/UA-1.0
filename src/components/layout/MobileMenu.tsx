"use client";

import { X } from "lucide-react";
import { useStore } from "@/store/useStore";

export function MobileMenu() {
  const { sidebarOpen, setSidebarOpen } = useStore();

  if (!sidebarOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 lg:hidden"
      onClick={() => setSidebarOpen(false)}
      aria-hidden="true"
    />
  );
}
