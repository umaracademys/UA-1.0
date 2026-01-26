"use client";

import { ReactNode } from "react";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

type AuthLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { settings } = useSystemSettings();
  const primaryColor = settings?.colorScheme?.primary || "#2E4D32";
  const secondaryColor = settings?.colorScheme?.secondary || "#C49636";
  const accentColor = settings?.colorScheme?.accent || "#C49636";
  
  // Create gradient from primary to a darker shade
  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${primaryColor}, ${accentColor})`,
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Column - Branding (Desktop) */}
      <div
        className="hidden w-1/2 flex-col items-center justify-center p-12 text-white lg:flex"
        style={gradientStyle}
      >
        <div className="max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-white/20 backdrop-blur-sm">
              <img
                src={settings?.logo || "/uploads/logo/logo-1769252899089.png"}
                alt={settings?.systemName || "Umar Academy"}
                className="h-full w-full object-contain p-2"
              />
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold">
            {settings?.systemName || "Umar Academy"}
          </h1>
          <p className="mb-8 text-lg opacity-90">
            Comprehensive Learning Management System
          </p>
          <div className="space-y-4 text-left opacity-90">
            <div className="flex items-center gap-3">
              <div className="h-1 w-1 rounded-full bg-white" />
              <p>Track student progress and recitation</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1 w-1 rounded-full bg-white" />
              <p>Manage assignments and evaluations</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1 w-1 rounded-full bg-white" />
              <p>Interactive Mushaf and Qaidah learning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Form (Desktop & Mobile) */}
      <div className="flex w-full flex-col items-center justify-center bg-neutral-50 p-4 lg:w-1/2 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                <img
                  src={settings?.logo || "/uploads/logo/logo-1769252899089.png"}
                  alt={settings?.systemName || "Umar Academy"}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">
                  {settings?.systemName || "Umar Academy"}
                </h1>
                <p className="text-xs text-neutral-500">Portal</p>
              </div>
            </Link>
          </div>

          {/* Title & Subtitle */}
          {(title || subtitle) && (
            <div className="mb-8 text-center">
              {title && <h2 className="mb-2 text-2xl font-bold text-neutral-900">{title}</h2>}
              {subtitle && <p className="text-neutral-600">{subtitle}</p>}
            </div>
          )}

          {/* Form Content */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
