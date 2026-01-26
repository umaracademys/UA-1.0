"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSocket } from "./useSocket";
import { playNotificationSound, isNotificationSoundEnabled } from "@/lib/utils/notificationSound";

type Notification = {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
  isRead: boolean;
  readAt?: Date | string;
  createdAt: Date | string;
};

type UseNotificationsOptions = {
  autoFetch?: boolean;
  limit?: number;
};

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoFetch = true, limit = 50 } = options;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const { socket, isConnected } = useSocket(token);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (filters?: {
    type?: string;
    isRead?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const params: any = { limit };
      if (filters?.type) params.type = filters.type;
      if (filters?.isRead !== undefined) params.isRead = filters.isRead;
      if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters?.dateTo) params.dateTo = filters.dateTo;

      const response = await axios.get("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      setError((err as Error).message || "Failed to load notifications");
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [token, limit]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;

    try {
      const response = await axios.get("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  }, [token]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!token) return;

    try {
      await axios.patch(
        `/api/notifications/${notificationId}`,
        { isRead: true },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      toast.error("Failed to mark notification as read");
      console.error("Error marking notification as read:", err);
    }
  }, [token]);

  const markAsUnread = useCallback(async (notificationId: string) => {
    if (!token) return;

    try {
      await axios.patch(
        `/api/notifications/${notificationId}`,
        { isRead: false },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: false, readAt: undefined } : n,
        ),
      );
      setUnreadCount((prev) => prev + 1);
    } catch (err) {
      toast.error("Failed to mark notification as unread");
      console.error("Error marking notification as unread:", err);
    }
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    try {
      const response = await axios.post(
        "/api/notifications/mark-all-read",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() })),
      );
      setUnreadCount(0);
      toast.success(`Marked ${response.data.count} notification(s) as read`);
    } catch (err) {
      toast.error("Failed to mark all as read");
      console.error("Error marking all as read:", err);
    }
  }, [token]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!token) return;

    try {
      await axios.delete(`/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const deleted = notifications.find((n) => n._id === notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      if (deleted && !deleted.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast.success("Notification deleted");
    } catch (err) {
      toast.error("Failed to delete notification");
      console.error("Error deleting notification:", err);
    }
  }, [token, notifications]);

  // WebSocket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNotification = (data: { notification: Notification }) => {
      const { notification } = data;
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Play sound if enabled
      if (isNotificationSoundEnabled()) {
        playNotificationSound();
      }
      
      // Show toast
      toast((t) => (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold text-neutral-900">{notification.title}</p>
            <p className="text-sm text-neutral-600">{notification.message}</p>
          </div>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              markAsRead(notification._id);
            }}
            className="text-xs text-indigo-600 hover:text-indigo-700"
          >
            View
          </button>
        </div>
      ), {
        duration: 5000,
        icon: "🔔",
      });
    };

    const handleUnreadCountUpdate = (data: { userId: string; unreadCount: number }) => {
      setUnreadCount(data.unreadCount);
    };

    socket.on("new-notification", handleNewNotification);
    socket.on("unread-count-update", handleUnreadCountUpdate);

    return () => {
      socket.off("new-notification", handleNewNotification);
      socket.off("unread-count-update", handleUnreadCountUpdate);
    };
  }, [socket, isConnected, markAsRead]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [autoFetch, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    refresh: () => {
      fetchNotifications();
      fetchUnreadCount();
    },
  };
}
