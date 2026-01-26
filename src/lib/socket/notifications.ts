import { getSocketIO } from "./server";

/**
 * Emit notification to a specific user via WebSocket
 */
export function emitNotification(userId: string, notification: any): void {
  const io = getSocketIO();
  if (!io) {
    console.warn("Socket.IO not initialized. Notification will not be sent in real-time.");
    return;
  }

  // Emit to user's personal room
  io.to(`user:${userId}`).emit("new-notification", {
    notification,
    timestamp: new Date().toISOString(),
  });

  // Also emit unread count update
  emitUnreadCountUpdate(userId);
}

/**
 * Emit unread count update to a user
 * This function can be called with or without fetching the count
 * If count is provided, it will be used; otherwise, it will be fetched
 */
export async function emitUnreadCountUpdate(userId: string, count?: number): Promise<void> {
  const io = getSocketIO();
  if (!io) {
    return;
  }

  let unreadCount = count;

  // If count not provided, fetch it
  if (unreadCount === undefined) {
    try {
      // Import here to avoid circular dependency
      const { connectToDatabase } = await import("@/lib/db/connection");
      const NotificationModel = (await import("@/lib/db/models/Notification")).default;

      await connectToDatabase();

      unreadCount = await NotificationModel.countDocuments({
        userId: new (await import("mongoose")).Types.ObjectId(userId),
        isRead: false,
      });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      return;
    }
  }

  io.to(`user:${userId}`).emit("unread-count-update", {
    userId,
    unreadCount,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit notification to multiple users
 */
export function emitNotificationToUsers(userIds: string[], notification: any): void {
  userIds.forEach((userId) => {
    emitNotification(userId, notification);
  });
}

/**
 * Emit notification sound trigger (client-side will handle playing sound)
 */
export function emitNotificationSound(userId: string, notificationType?: string): void {
  const io = getSocketIO();
  if (!io) {
    return;
  }

  io.to(`user:${userId}`).emit("notification-sound", {
    type: notificationType || "default",
    timestamp: new Date().toISOString(),
  });
}
