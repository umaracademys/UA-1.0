"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "yellow" | "purple" | "red" | "indigo" | "orange";
  link?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
};

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    border: "border-blue-200",
    hover: "hover:border-blue-300",
  },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600",
    border: "border-green-200",
    hover: "hover:border-green-300",
  },
  yellow: {
    bg: "bg-yellow-50",
    icon: "text-yellow-600",
    border: "border-yellow-200",
    hover: "hover:border-yellow-300",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "text-purple-600",
    border: "border-purple-200",
    hover: "hover:border-purple-300",
  },
  red: {
    bg: "bg-red-50",
    icon: "text-red-600",
    border: "border-red-200",
    hover: "hover:border-red-300",
  },
  indigo: {
    bg: "bg-indigo-50",
    icon: "text-indigo-600",
    border: "border-indigo-200",
    hover: "hover:border-indigo-300",
  },
  orange: {
    bg: "bg-orange-50",
    icon: "text-orange-600",
    border: "border-orange-200",
    hover: "hover:border-orange-300",
  },
};

export function StatCard({ title, value, icon: Icon, color = "blue", link, trend }: StatCardProps) {
  // Ensure color is valid, fallback to blue if invalid
  const validColor = color && colorClasses[color] ? color : "blue";
  const colors = colorClasses[validColor];
  const cardContent = (
    <div
      className={`relative overflow-hidden rounded-lg border ${colors.border} ${colors.bg} p-6 transition-all ${
        link ? `cursor-pointer ${colors.hover}` : ""
      }`}
    >
      {/* Background Icon */}
      <div className={`absolute right-4 top-4 opacity-10 ${colors.icon}`}>
        <Icon className="h-16 w-16" />
      </div>

      {/* Content */}
      <div className="relative">
        <p className="text-sm font-medium text-neutral-600">{title}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-3xl font-bold text-neutral-900">{value}</p>
          {trend && (
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                trend.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Link indicator */}
      {link && (
        <div className="mt-4 text-xs font-medium text-neutral-500">
          View details →
        </div>
      )}
    </div>
  );

  if (link) {
    return <Link href={link}>{cardContent}</Link>;
  }

  return cardContent;
}
