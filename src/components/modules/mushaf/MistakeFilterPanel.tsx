"use client";

import { useState } from "react";
import { X, Filter } from "lucide-react";
import type { WorkflowStep } from "@/lib/db/models/PersonalMushaf";

type FilterState = {
  workflowStep: WorkflowStep[] | "all";
  recency: "today" | "recent" | "historical" | "all";
  categories: string[];
  types: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
};

type MistakeFilterPanelProps = {
  onFilterChange: (filters: FilterState) => void;
  availableCategories?: string[];
  availableTypes?: string[];
  initialFilters?: Partial<FilterState>;
};

export function MistakeFilterPanel({
  onFilterChange,
  availableCategories = [],
  availableTypes = [],
  initialFilters = {},
}: MistakeFilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    workflowStep: "all",
    recency: "all",
    categories: [],
    types: [],
    ...initialFilters,
  });

  const handleWorkflowStepChange = (step: WorkflowStep) => {
    setFilters((prev) => {
      if (prev.workflowStep === "all") {
        return { ...prev, workflowStep: [step] };
      }
      const steps = prev.workflowStep as WorkflowStep[];
      if (steps.includes(step)) {
        const newSteps = steps.filter((s) => s !== step);
        return { ...prev, workflowStep: newSteps.length === 0 ? "all" : newSteps };
      }
      return { ...prev, workflowStep: [...steps, step] };
    });
  };

  const handleCategoryToggle = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleTypeToggle = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  };

  const handleClearAll = () => {
    const clearedFilters: FilterState = {
      workflowStep: "all",
      recency: "all",
      categories: [],
      types: [],
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const handleApply = () => {
    onFilterChange(filters);
  };

  return (
    <div className="h-full space-y-4 border-r border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Filters</h3>
        <button
          onClick={handleClearAll}
          className="text-xs text-neutral-500 hover:text-neutral-700"
        >
          Clear All
        </button>
      </div>

      {/* Workflow Step */}
      <div>
        <label className="mb-2 block text-xs font-medium text-neutral-700">Workflow Step</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.workflowStep === "all" || (Array.isArray(filters.workflowStep) && filters.workflowStep.length === 0)}
              onChange={() => setFilters((prev) => ({ ...prev, workflowStep: "all" }))}
              className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-neutral-600">All</span>
          </label>
          {(["sabq", "sabqi", "manzil"] as WorkflowStep[]).map((step) => (
            <label key={step} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Array.isArray(filters.workflowStep) && filters.workflowStep.includes(step)}
                onChange={() => handleWorkflowStepChange(step)}
                className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-neutral-600 capitalize">{step}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Recency */}
      <div>
        <label className="mb-2 block text-xs font-medium text-neutral-700">Recency</label>
        <div className="space-y-2">
          {(["all", "today", "recent", "historical"] as const).map((recency) => (
            <label key={recency} className="flex items-center gap-2">
              <input
                type="radio"
                name="recency"
                checked={filters.recency === recency}
                onChange={() => setFilters((prev) => ({ ...prev, recency }))}
                className="border-neutral-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-neutral-600 capitalize">{recency}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Category */}
      {availableCategories.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-medium text-neutral-700">Category</label>
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {availableCategories.map((category) => (
              <label key={category} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category)}
                  onChange={() => handleCategoryToggle(category)}
                  className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-neutral-600 capitalize">{category}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Type */}
      {availableTypes.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-medium text-neutral-700">Type</label>
          <select
            multiple
            value={filters.types}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (option) => option.value);
              setFilters((prev) => ({ ...prev, types: selected }));
            }}
            className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            size={5}
          >
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date Range */}
      <div>
        <label className="mb-2 block text-xs font-medium text-neutral-700">Date Range</label>
        <div className="space-y-2">
          <input
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <input
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Page Number */}
      <div>
        <label className="mb-2 block text-xs font-medium text-neutral-700">Page Number</label>
        <input
          type="number"
          min="1"
          max="604"
          value={filters.page || ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              page: e.target.value ? parseInt(e.target.value, 10) : undefined,
            }))
          }
          placeholder="All pages"
          className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Apply Button */}
      <button
        onClick={handleApply}
        className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
      >
        Apply Filters
      </button>
    </div>
  );
}
