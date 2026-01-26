"use client";

export const dynamic = "force-dynamic";

import { CheckCheck } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationList } from "@/components/modules/notifications/NotificationList";

export default function NotificationsPage() {
  const { markAllAsRead, unreadCount } = useNotifications({ autoFetch: true });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-neutral-500">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification List */}
      <NotificationList showActions />
    </div>
  );
}
