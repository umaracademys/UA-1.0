"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, X, Filter, History, Zap } from "lucide-react";
import { format } from "date-fns";
import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";
import type { WorkflowStep } from "@/lib/db/models/PersonalMushaf";

type MistakesListProps = {
  currentSessionMistakes: PersonalMushafMistake[];
  historicalMistakes: PersonalMushafMistake[];
  mode: "marking" | "viewing";
  onMistakeClick?: (mistake: PersonalMushafMistake, isHistorical?: boolean) => void;
  onRemoveMistake?: (mistakeId: string) => void;
  onFilterChange?: (filter: { type?: string; workflowStep?: WorkflowStep }) => void;
};

export function MistakesList({
  currentSessionMistakes,
  historicalMistakes,
  mode,
  onMistakeClick,
  onRemoveMistake,
  onFilterChange,
}: MistakesListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["today", "recent"]));
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowStep | "all">("all");
  const [mistakeFilter, setMistakeFilter] = useState<"all" | "current" | "historical">("all");

  // Filter mistakes based on selected filter
  const filteredMistakes = useMemo(() => {
    let allMistakes: Array<{ mistake: PersonalMushafMistake; isHistorical: boolean }> = [];

    if (mistakeFilter === "current" || mistakeFilter === "all") {
      allMistakes.push(...currentSessionMistakes.map((m) => ({ mistake: m, isHistorical: false })));
    }
    if (mistakeFilter === "historical" || mistakeFilter === "all") {
      allMistakes.push(...historicalMistakes.map((m) => ({ mistake: m, isHistorical: true })));
    }

    return allMistakes;
  }, [mistakeFilter, currentSessionMistakes, historicalMistakes]);

  // Group filtered mistakes by recency
  const now = Date.now();
  const today = new Date().toDateString();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const grouped = filteredMistakes.reduce(
    (acc, { mistake, isHistorical }) => {
      const mistakeDate = mistake.timeline.lastMarkedAt
        ? new Date(mistake.timeline.lastMarkedAt).toDateString()
        : "";
      const mistakeTime = mistake.timeline.lastMarkedAt
        ? new Date(mistake.timeline.lastMarkedAt).getTime()
        : 0;

      const mistakeWithOrigin = { ...mistake, isHistorical };

      if (mistakeDate === today) {
        acc.today.push(mistakeWithOrigin);
      } else if (mistakeTime >= sevenDaysAgo) {
        acc.recent.push(mistakeWithOrigin);
      } else {
        acc.historical.push(mistakeWithOrigin);
      }
      return acc;
    },
    {
      today: [] as Array<PersonalMushafMistake & { isHistorical: boolean }>,
      recent: [] as Array<PersonalMushafMistake & { isHistorical: boolean }>,
      historical: [] as Array<PersonalMushafMistake & { isHistorical: boolean }>,
    },
  );

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const filterMistakes = (mistakesList: Array<PersonalMushafMistake & { isHistorical?: boolean }>) => {
    return mistakesList.filter((m) => {
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (workflowFilter !== "all" && m.workflowStep !== workflowFilter) return false;
      return true;
    });
  };

  const handleFilterChange = () => {
    onFilterChange?.({
      type: typeFilter !== "all" ? typeFilter : undefined,
      workflowStep: workflowFilter !== "all" ? workflowFilter : undefined,
    });
  };

  const groups = [
    { id: "today", label: "Today", mistakes: filterMistakes(grouped.today), count: grouped.today.length },
    {
      id: "recent",
      label: "Recent (Last 7 Days)",
      mistakes: filterMistakes(grouped.recent),
      count: grouped.recent.length,
    },
    {
      id: "historical",
      label: "Historical",
      mistakes: filterMistakes(grouped.historical),
      count: grouped.historical.length,
    },
  ];

  return (
    <div className="flex h-full flex-col border-l border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">Mistakes</h3>
          <button className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {/* Mistake Origin Filter */}
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setMistakeFilter("all")}
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
              mistakeFilter === "all"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            All ({currentSessionMistakes.length + historicalMistakes.length})
          </button>
          <button
            onClick={() => setMistakeFilter("current")}
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
              mistakeFilter === "current"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              <Zap className="h-3 w-3" />
              Current ({currentSessionMistakes.length})
            </span>
          </button>
          <button
            onClick={() => setMistakeFilter("historical")}
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
              mistakeFilter === "historical"
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              <History className="h-3 w-3" />
              Historical ({historicalMistakes.length})
            </span>
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              handleFilterChange();
            }}
            className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Types</option>
            {Array.from(
              new Set([...currentSessionMistakes, ...historicalMistakes].map((m) => m.type))
            ).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={workflowFilter}
            onChange={(e) => {
              setWorkflowFilter(e.target.value as WorkflowStep | "all");
              handleFilterChange();
            }}
            className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Workflow Steps</option>
            <option value="sabq">Sabq</option>
            <option value="sabqi">Sabqi</option>
            <option value="manzil">Manzil</option>
          </select>
        </div>
      </div>

      {/* Mistakes Groups */}
      <div className="flex-1 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.id} className="border-b border-neutral-200">
            <button
              onClick={() => toggleGroup(group.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50"
            >
              <div className="flex items-center gap-2">
                {expandedGroups.has(group.id) ? (
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                )}
                <span className="text-sm font-medium text-neutral-900">{group.label}</span>
              </div>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                {group.count}
              </span>
            </button>

            {expandedGroups.has(group.id) && (
              <div className="space-y-1 px-4 pb-3">
                {group.mistakes.length === 0 ? (
                  <p className="py-2 text-xs text-neutral-500">No mistakes in this group</p>
                ) : (
                  group.mistakes.map((mistake) => (
                    <div
                      key={mistake.id}
                      className="group flex items-start gap-2 rounded-md border border-neutral-200 bg-white p-2 hover:bg-neutral-50"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => onMistakeClick?.(mistake)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-900">{mistake.type}</span>
                          <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600 capitalize">
                            {mistake.category}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-600">
                          Page {mistake.page}
                          {mistake.surah && mistake.ayah && ` • Surah ${mistake.surah}, Ayah ${mistake.ayah}`}
                        </p>
                        {mistake.note && (
                          <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{mistake.note}</p>
                        )}
                        {mistake.timeline.lastMarkedAt && (
                          <p className="mt-1 text-xs text-neutral-400">
                            {format(new Date(mistake.timeline.lastMarkedAt), "MMM dd, yyyy")}
                          </p>
                        )}
                      </div>
                      {mode === "marking" && onRemoveMistake && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveMistake(mistake.id);
                          }}
                          className="rounded-md p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
