"use client";

import { AlertCircle, FileText, Music } from "lucide-react";
import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";

type MistakeCounterProps = {
  mistakes: PersonalMushafMistake[];
  onFilterChange?: (filter: "all" | "mistakes" | "atkees" | "tajweed") => void;
  activeFilter?: "all" | "mistakes" | "atkees" | "tajweed";
};

export function MistakeCounter({ mistakes, onFilterChange, activeFilter = "all" }: MistakeCounterProps) {
  const mistakesCount = mistakes.filter((m) => {
    const category = m.category as string;
    return category !== "atkees" && category !== "tajweed";
  }).length;
  const atkeesCount = mistakes.filter((m) => (m.category as string) === "atkees").length;
  const tajweedCount = mistakes.filter((m) => (m.category as string) === "tajweed").length;
  const total = mistakes.length;

  const filters = [
    { id: "all" as const, label: "All", count: total, icon: AlertCircle, color: "bg-neutral-100 text-neutral-700" },
    {
      id: "mistakes" as const,
      label: "Mistakes",
      count: mistakesCount,
      icon: AlertCircle,
      color: "bg-red-100 text-red-700",
    },
    {
      id: "atkees" as const,
      label: "Atkees",
      count: atkeesCount,
      icon: Music,
      color: "bg-yellow-100 text-yellow-700",
    },
    {
      id: "tajweed" as const,
      label: "Tajweed",
      count: tajweedCount,
      icon: FileText,
      color: "bg-gray-100 text-gray-700",
    },
  ];

  return (
    <div className="space-y-3 border-b border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Mistakes on This Page</h3>
      <div className="space-y-2">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange?.(filter.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? filter.color : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="font-medium">{filter.label}</span>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold">{filter.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
