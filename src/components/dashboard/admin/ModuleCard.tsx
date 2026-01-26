"use client";

import { LucideIcon, ArrowRight } from "lucide-react";
import Link from "next/link";

type ModuleCardProps = {
  name: string;
  icon: LucideIcon;
  description: string;
  count?: number | string;
  link: string;
  color?: "blue" | "green" | "purple" | "orange" | "indigo" | "red" | "yellow";
};

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    border: "border-blue-200",
    hover: "hover:border-blue-300 hover:bg-blue-100",
  },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600",
    border: "border-green-200",
    hover: "hover:border-green-300 hover:bg-green-100",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "text-purple-600",
    border: "border-purple-200",
    hover: "hover:border-purple-300 hover:bg-purple-100",
  },
  orange: {
    bg: "bg-orange-50",
    icon: "text-orange-600",
    border: "border-orange-200",
    hover: "hover:border-orange-300 hover:bg-orange-100",
  },
  indigo: {
    bg: "bg-indigo-50",
    icon: "text-indigo-600",
    border: "border-indigo-200",
    hover: "hover:border-indigo-300 hover:bg-indigo-100",
  },
  red: {
    bg: "bg-red-50",
    icon: "text-red-600",
    border: "border-red-200",
    hover: "hover:border-red-300 hover:bg-red-100",
  },
  yellow: {
    bg: "bg-yellow-50",
    icon: "text-yellow-600",
    border: "border-yellow-200",
    hover: "hover:border-yellow-300 hover:bg-yellow-100",
  },
};

export function ModuleCard({
  name,
  icon: Icon,
  description,
  count,
  link,
  color = "blue",
}: ModuleCardProps) {
  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <Link href={link}>
      <div
        className={`group relative overflow-hidden rounded-lg border ${colors.border} ${colors.bg} p-6 transition-all ${colors.hover}`}
      >
        {/* Icon */}
        <div className="mb-4">
          <div className={`inline-flex rounded-lg p-3 ${colors.icon} bg-white`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="mb-1 text-lg font-semibold text-neutral-900">{name}</h3>
          <p className="mb-3 text-sm text-neutral-600">{description}</p>
          {count !== undefined && (
            <p className="mb-3 text-2xl font-bold text-neutral-900">{count}</p>
          )}
        </div>

        {/* Action */}
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
          <span>Manage</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
