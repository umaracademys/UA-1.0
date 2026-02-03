"use client";

import { useState } from "react";
import { FileText, MapPin, Volume2 } from "lucide-react";
import type { TicketMistake } from "@/lib/db/models/Ticket";

type MistakeListProps = {
  mistakes: TicketMistake[];
  onMistakeClick?: (mistake: TicketMistake) => void;
};

export function MistakeList({ mistakes, onMistakeClick }: MistakeListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!mistakes || mistakes.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-neutral-500">
        No mistakes recorded
      </div>
    );
  }

  // Group mistakes by category
  const mistakesByCategory = mistakes.reduce((acc, mistake) => {
    const category = mistake.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(mistake);
    return acc;
  }, {} as Record<string, TicketMistake[]>);

  const categories = Object.keys(mistakesByCategory);
  const filteredMistakes = selectedCategory
    ? mistakesByCategory[selectedCategory] || []
    : mistakes;

  // Count by category
  const categoryCounts = categories.reduce((acc, category) => {
    acc[category] = mistakesByCategory[category].length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-indigo-100 text-indigo-700"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            All ({mistakes.length})
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)} ({categoryCounts[category]})
            </button>
          ))}
        </div>
      )}

      {/* Mistakes List */}
      <div className="space-y-2">
        {filteredMistakes.map((mistake, index) => (
          <div
            key={index}
            className={`rounded-lg border border-neutral-200 bg-white p-4 ${
              onMistakeClick ? "cursor-pointer hover:bg-neutral-50" : ""
            }`}
            onClick={() => onMistakeClick?.(mistake)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    {mistake.type}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                    {mistake.category}
                  </span>
                  {mistake.wordText && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      <span className="text-amber-600">Word:</span>
                      <span className="font-me-quran" dir="rtl">{mistake.wordText}</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm text-neutral-600">
                  {mistake.page && (
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Page {mistake.page}</span>
                    </div>
                  )}
                  {mistake.surah && mistake.ayah && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>
                        Surah {mistake.surah}, Ayah {mistake.ayah}
                      </span>
                    </div>
                  )}
                  {mistake.wordIndex !== undefined && (
                    <span>Word {mistake.wordIndex + 1}</span>
                  )}
                </div>

                {mistake.note && (
                  <p className="mt-2 text-sm text-neutral-700">{mistake.note}</p>
                )}

                {mistake.tajweedData && typeof mistake.tajweedData === "object" && (
                  <div className="mt-2 rounded bg-blue-50 p-2 text-xs text-blue-700">
                    <p className="font-medium">Tajweed Rule: {(mistake.tajweedData as any).tajweedRule || "N/A"}</p>
                    {(mistake.tajweedData as any).teacherNote && (
                      <p className="mt-1">{(mistake.tajweedData as any).teacherNote}</p>
                    )}
                  </div>
                )}
              </div>

              {mistake.audioUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(mistake.audioUrl, "_blank");
                  }}
                  className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
