"use client";

import { useState, useMemo } from "react";
import { Search, Download, Filter } from "lucide-react";
import { format } from "date-fns";

type Activity = {
  _id: string;
  user: {
    fullName: string;
    role: string;
  };
  action: string;
  module: string;
  details?: string;
  createdAt: Date | string;
  relatedEntity?: {
    type: string;
    id: string;
  };
};

type SystemActivityProps = {
  activities: Activity[];
  loading?: boolean;
  onExport?: () => void;
};

export function SystemActivity({ activities, loading, onExport }: SystemActivityProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          activity.user.fullName.toLowerCase().includes(query) ||
          activity.action.toLowerCase().includes(query) ||
          activity.module.toLowerCase().includes(query) ||
          activity.details?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Module filter
      if (moduleFilter && activity.module !== moduleFilter) {
        return false;
      }

      // User type filter
      if (userTypeFilter && activity.user.role !== userTypeFilter) {
        return false;
      }

      // Date filter
      if (dateFrom || dateTo) {
        const activityDate = new Date(activity.createdAt);
        if (dateFrom && activityDate < new Date(dateFrom)) {
          return false;
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          if (activityDate > endDate) {
            return false;
          }
        }
      }

      return true;
    });
  }, [activities, searchQuery, moduleFilter, userTypeFilter, dateFrom, dateTo]);

  const modules = Array.from(new Set(activities.map((a) => a.module)));
  const userTypes = Array.from(new Set(activities.map((a) => a.user.role)));

  if (loading) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">System Activity</h3>
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-500" />
          <span className="text-sm font-medium text-neutral-700">Filters</span>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Modules</option>
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>

          {/* User Type Filter */}
          <div>
            <select
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Users</option>
              {userTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery("");
                setModuleFilter("");
                setUserTypeFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-2">
        {filteredActivities.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">No activities found</div>
        ) : (
          filteredActivities.map((activity) => (
            <div
              key={activity._id}
              className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3"
            >
              <div className="flex-shrink-0 rounded-full bg-indigo-100 p-2">
                <div className="h-2 w-2 rounded-full bg-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900">{activity.user.fullName}</p>
                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
                    {activity.user.role}
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {activity.module}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-700">{activity.action}</p>
                {activity.details && (
                  <p className="mt-1 text-xs text-neutral-500">{activity.details}</p>
                )}
                <p className="mt-1 text-xs text-neutral-400">
                  {format(new Date(activity.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
