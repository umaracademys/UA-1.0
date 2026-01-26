"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";

type MistakeTimelineProps = {
  mistakes: PersonalMushafMistake[];
  onMistakeClick?: (mistake: PersonalMushafMistake) => void;
  onNavigateToPage?: (page: number) => void;
};

export function MistakeTimeline({
  mistakes,
  onMistakeClick,
  onNavigateToPage,
}: MistakeTimelineProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Group mistakes by date
  const groupedByDate = mistakes.reduce((acc, mistake) => {
    if (!mistake.timeline.lastMarkedAt) return acc;

    const date = new Date(mistake.timeline.lastMarkedAt).toISOString().split("T")[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(mistake);
    return acc;
  }, {} as Record<string, PersonalMushafMistake[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  if (sortedDates.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-neutral-500">
        No mistakes found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map((date) => {
        const dateMistakes = groupedByDate[date];
        const isExpanded = expandedDates.has(date);
        const resolvedCount = dateMistakes.filter((m) => m.timeline.resolved).length;
        const unresolvedCount = dateMistakes.length - resolvedCount;

        return (
          <div key={date} className="rounded-lg border border-neutral-200 bg-white">
            <button
              onClick={() => toggleDate(date)}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-neutral-50"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                )}
                <div>
                  <p className="font-medium text-neutral-900">
                    {format(new Date(date), "MMMM dd, yyyy")}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {dateMistakes.length} mistake{dateMistakes.length !== 1 ? "s" : ""} •{" "}
                    {resolvedCount} resolved • {unresolvedCount} unresolved
                  </p>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-neutral-200 p-4">
                <div className="space-y-2">
                  {dateMistakes.map((mistake) => (
                    <div
                      key={mistake.id}
                      className={`flex cursor-pointer items-center justify-between rounded-md border p-2 transition-colors hover:bg-neutral-50 ${
                        mistake.timeline.resolved
                          ? "border-green-200 bg-green-50"
                          : "border-neutral-200"
                      }`}
                      onClick={() => onMistakeClick?.(mistake)}
                    >
                      <div className="flex items-center gap-2">
                        {mistake.timeline.resolved ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-yellow-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{mistake.type}</p>
                          <p className="text-xs text-neutral-500">
                            {mistake.page && `Page ${mistake.page}`}
                            {mistake.surah && mistake.ayah && ` • S${mistake.surah}:${mistake.ayah}`}
                            {mistake.timeline.repeatCount > 1 && ` • Repeated ${mistake.timeline.repeatCount}x`}
                          </p>
                        </div>
                      </div>
                      {mistake.page && onNavigateToPage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToPage(mistake.page!);
                          }}
                          className="rounded-md px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
                        >
                          View
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
