"use client";

import { useState, useEffect } from "react";
import { BellOff, Filter } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";

type NotificationListProps = {
  showActions?: boolean;
};

export function NotificationList({ showActions = true }: NotificationListProps) {
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAsUnread,
    deleteNotification,
    fetchNotifications,
  } = useNotifications({ autoFetch: true });

  useEffect(() => {
    const filters: any = {};
    if (activeTab === "unread") {
      filters.isRead = false;
    }
    if (typeFilter) {
      filters.type = typeFilter;
    }
    if (dateFrom) {
      filters.dateFrom = dateFrom;
    }
    if (dateTo) {
      filters.dateTo = dateTo;
    }

    fetchNotifications(filters);
  }, [activeTab, typeFilter, dateFrom, dateTo, fetchNotifications]);

  const filteredNotifications = [...notifications].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "recent" ? dateB - dateA : dateA - dateB;
  });

  const unreadNotifications = filteredNotifications.filter((n) => !n.isRead);

  const displayNotifications = activeTab === "unread" ? unreadNotifications : filteredNotifications;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-500">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("all")}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "all"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "unread"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-500" />
          <span className="text-sm font-medium text-neutral-700">Filters</span>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {/* Type Filter */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Types</option>
              <option value="recitation_review">Recitation Review</option>
              <option value="assignment_submission">Assignment Submission</option>
              <option value="evaluation_feedback">Evaluation Feedback</option>
              <option value="message">Message</option>
              <option value="registration">Registration</option>
              <option value="attendance_issue">Attendance Issue</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Sort */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">Sort</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "recent" | "oldest")}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(typeFilter || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setTypeFilter("");
              setDateFrom("");
              setDateTo("");
            }}
            className="mt-3 text-xs text-indigo-600 hover:text-indigo-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Notifications */}
      {displayNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center">
          <BellOff className="h-12 w-12 text-neutral-300" />
          <p className="mt-2 text-sm font-medium text-neutral-900">
            {activeTab === "unread" ? "No unread notifications" : "No notifications"}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {activeTab === "unread"
              ? "You're all caught up!"
              : "You don't have any notifications yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayNotifications.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onMarkAsUnread={markAsUnread}
              onDelete={deleteNotification}
              showActions={showActions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
