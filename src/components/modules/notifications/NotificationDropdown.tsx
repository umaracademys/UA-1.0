"use client";

import { useRouter } from "next/navigation";
import { CheckCheck, BellOff } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationItem } from "./NotificationItem";

type NotificationDropdownProps = {
  onClose?: () => void;
};

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();

  const recentNotifications = notifications.slice(0, 10);
  const hasUnread = unreadCount > 0;

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleViewAll = () => {
    router.push("/notifications");
    onClose?.();
  };

  return (
    <div className="w-80 rounded-lg border border-neutral-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Notifications</h3>
        {hasUnread && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {recentNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <BellOff className="h-12 w-12 text-neutral-300" />
            <p className="mt-2 text-sm font-medium text-neutral-900">No notifications</p>
            <p className="mt-1 text-xs text-neutral-500">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {recentNotifications.map((notification) => (
              <div key={notification._id} className="px-2 py-1">
                <NotificationItem
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {recentNotifications.length > 0 && (
        <div className="border-t border-neutral-200 px-4 py-2">
          <button
            onClick={handleViewAll}
            className="w-full text-center text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
