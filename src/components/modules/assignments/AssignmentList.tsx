"use client";

import { useState, useMemo } from "react";
import { Search, SortAsc, SortDesc } from "lucide-react";
import { AssignmentCard, type AssignmentCardData } from "./AssignmentCard";

type FilterTab = "all" | "pending" | "completed" | "overdue" | "graded";
type SortOption = "createdAt" | "status" | "studentName";

type AssignmentListProps = {
  assignments: AssignmentCardData[];
  userRole: "student" | "teacher" | "admin";
  loading?: boolean;
  onAssignmentClick: (assignment: AssignmentCardData) => void;
};

export function AssignmentList({
  assignments,
  userRole,
  loading = false,
  onAssignmentClick,
}: AssignmentListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredAndSorted = useMemo(() => {
    let filtered = [...assignments];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.studentName.toLowerCase().includes(query) ||
          a.comment?.toLowerCase().includes(query) ||
          a.assignedByName.toLowerCase().includes(query),
      );
    }

    // Apply tab filter
    if (activeTab !== "all") {
      filtered = filtered.filter((a) => {
        if (activeTab === "pending") {
          return (
            a.status === "active" &&
            (!a.homework?.enabled || !a.homework?.submission?.submitted)
          );
        }
        if (activeTab === "completed") {
          return a.homework?.submission?.submitted && !a.homework?.submission?.grade;
        }
        if (activeTab === "overdue") {
          return a.status === "archived";
        }
        if (activeTab === "graded") {
          return a.homework?.submission?.grade !== undefined;
        }
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date | undefined;
      let bValue: string | number | Date | undefined;

      if (sortBy === "createdAt") {
        aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      } else if (sortBy === "status") {
        aValue = a.status;
        bValue = b.status;
      } else if (sortBy === "studentName") {
        aValue = a.studentName.toLowerCase();
        bValue = b.studentName.toLowerCase();
      }

      if (aValue === undefined || bValue === undefined) return 0;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      const numA = typeof aValue === "number" ? aValue : (aValue as Date).getTime();
      const numB = typeof bValue === "number" ? bValue : (bValue as Date).getTime();

      return sortOrder === "asc" ? numA - numB : numB - numA;
    });

    return filtered;
  }, [assignments, activeTab, searchQuery, sortBy, sortOrder]);

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: "all", label: "All", count: assignments.length },
    {
      id: "pending",
      label: "Pending",
      count: assignments.filter(
        (a) =>
          a.status === "active" &&
          (!a.homework?.enabled || !a.homework?.submission?.submitted),
      ).length,
    },
    {
      id: "completed",
      label: "Completed",
      count: assignments.filter(
        (a) => a.homework?.submission?.submitted && !a.homework?.submission?.grade,
      ).length,
    },
    {
      id: "overdue",
      label: "Overdue",
      count: assignments.filter((a) => a.status === "archived").length,
    },
    {
      id: "graded",
      label: "Graded",
      count: assignments.filter((a) => a.homework?.submission?.grade !== undefined).length,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Sort */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search assignments..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="createdAt">Created Date</option>
            <option value="status">Status</option>
            <option value="studentName">Student Name</option>
          </select>

          <button
            className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 hover:bg-neutral-50"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-neutral-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Assignment Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
          <p className="text-neutral-500">No assignments found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((assignment) => (
            <AssignmentCard
              key={assignment._id}
              assignment={assignment}
              userRole={userRole}
              onClick={() => onAssignmentClick(assignment)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
