"use client";

import { format } from "date-fns";
import { AlertTriangle, ExternalLink } from "lucide-react";
import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";

type RepeatMistakesPanelProps = {
  mistakes: PersonalMushafMistake[];
  onMistakeClick?: (mistake: PersonalMushafMistake) => void;
  onNavigateToPage?: (page: number) => void;
};

export function RepeatMistakesPanel({
  mistakes,
  onMistakeClick,
  onNavigateToPage,
}: RepeatMistakesPanelProps) {
  // Filter and sort repeat offenders
  const repeatOffenders = mistakes
    .filter((m) => m.timeline.repeatCount >= 3)
    .sort((a, b) => b.timeline.repeatCount - a.timeline.repeatCount);

  if (repeatOffenders.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-neutral-500">
        No repeat offenders found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
        <AlertTriangle className="h-5 w-5 text-yellow-700" />
        <div>
          <p className="text-sm font-semibold text-yellow-900">Repeat Offenders</p>
          <p className="text-xs text-yellow-700">
            {repeatOffenders.length} mistake{repeatOffenders.length !== 1 ? "s" : ""} made 3+ times
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {repeatOffenders.map((mistake) => (
          <div
            key={mistake.id}
            className="flex cursor-pointer items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 transition-colors hover:bg-red-100"
            onClick={() => onMistakeClick?.(mistake)}
          >
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                  {mistake.timeline.repeatCount}x
                </span>
                <span className="text-sm font-semibold text-neutral-900">{mistake.type}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 capitalize">
                  {mistake.category}
                </span>
              </div>
              <p className="text-xs text-neutral-600">
                {mistake.page && `Page ${mistake.page}`}
                {mistake.surah && mistake.ayah && ` • Surah ${mistake.surah}, Ayah ${mistake.ayah}`}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                First: {format(new Date(mistake.timeline.firstMarkedAt), "MMM dd, yyyy")} • Last:{" "}
                {format(new Date(mistake.timeline.lastMarkedAt), "MMM dd, yyyy")}
              </p>
            </div>
            {mistake.page && onNavigateToPage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToPage(mistake.page!);
                }}
                className="ml-2 rounded-md p-2 text-red-600 hover:bg-red-200"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
