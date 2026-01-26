"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";
import axios from "axios";
import toast from "react-hot-toast";

type NotificationType =
  | "recitation_review"
  | "assignment_submission"
  | "evaluation_feedback"
  | "message"
  | "registration"
  | "attendance_issue"
  | "system";

interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
  isRead: boolean;
  readAt?: Date | string;
  createdAt: Date | string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { socket } = useSocket();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [user]);

  useEffect(() => {
    if (socket && user) {
      socket.on("new-notification", (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        
        // Show toast notification
        const message = notification.message 
          ? `${notification.title}: ${notification.message}`
          : notification.title;
        toast.success(message, {
          duration: 5000,
        });

        // Play notification sound (if enabled)
        if (typeof window !== "undefined") {
          try {
            const audio = new Audio("/sounds/notification.mp3");
            audio.volume = 0.5;
            audio.play().catch(() => {
              // Ignore audio play errors
            });
          } catch (error) {
            // Ignore audio errors
          }
        }
      });

      socket.on("notification-read", (data: { notificationId: string }) => {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif._id === data.notificationId ? { ...notif, isRead: true } : notif,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      });

      socket.on("unread-count-update", (count: number) => {
        setUnreadCount(count);
      });

      return () => {
        socket.off("new-notification");
        socket.off("notification-read");
        socket.off("unread-count-update");
      };
    }
  }, [socket, user]);

  const loadNotifications = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await axios.get("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50 },
      });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!token) return;

    try {
      const response = await axios.get("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
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
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, isRead: true, readAt: new Date() } : notif,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;

    try {
      await axios.post(
        "/api/notifications/mark-all-read",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true, readAt: new Date() })),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      throw error;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!token) return;

    try {
      await axios.delete(`/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const notification = notifications.find((n) => n._id === notificationId);
      setNotifications((prev) => prev.filter((notif) => notif._id !== notificationId));
      if (notification && !notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
      throw error;
    }
  };

  const refreshNotifications = async () => {
    await Promise.all([loadNotifications(), loadUnreadCount()]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
