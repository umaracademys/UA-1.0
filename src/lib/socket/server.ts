import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyToken } from "@/lib/utils/jwt";

interface SocketData {
  userId: string;
  email: string;
  role: string;
}

interface OnlineUser {
  userId: string;
  socketId: string;
  email: string;
  role: string;
  connectedAt: Date;
}

// Store online users
const onlineUsers = new Map<string, OnlineUser>();

let io: SocketIOServer | null = null;

export function initializeSocket(server: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });

  // Authentication middleware
  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        if (typeof next === 'function') {
          return next(new Error("Authentication token required"));
        }
        return;
      }

      const decoded = await verifyToken(token);
      
      // Attach user data to socket
      socket.data = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      } as SocketData;

      if (typeof next === 'function') {
        next();
      }
    } catch (error) {
      console.error("Socket authentication error:", error);
      if (typeof next === 'function') {
        next(new Error("Authentication failed"));
      }
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;
    const email = socket.data.email;
    const role = socket.data.role;

    console.log(`User connected: ${userId} (${email})`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Track online user
    onlineUsers.set(userId, {
      userId,
      socketId: socket.id,
      email,
      role,
      connectedAt: new Date(),
    });

    // Notify user's contacts that they're online
    socket.broadcast.emit("user-online", { userId, email });

    // Join conversation room
    socket.on("join-conversation", (conversationId: string) => {
      if (!conversationId) {
        socket.emit("error", { message: "Conversation ID is required" });
        return;
      }

      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);

      // Notify others in conversation
      socket.to(`conversation:${conversationId}`).emit("user-joined-conversation", {
        conversationId,
        userId,
        email,
      });
    });

    // Leave conversation room
    socket.on("leave-conversation", (conversationId: string) => {
      if (!conversationId) return;

      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);

      socket.to(`conversation:${conversationId}`).emit("user-left-conversation", {
        conversationId,
        userId,
      });
    });

    // Send message (real-time)
    socket.on("send-message", async (data: { conversationId: string; message: any }) => {
      try {
        const { conversationId, message } = data;

        if (!conversationId || !message) {
          socket.emit("error", { message: "Conversation ID and message are required" });
          return;
        }

        // Emit to all participants in conversation (except sender)
        socket.to(`conversation:${conversationId}`).emit("new-message", {
          conversationId,
          message: {
            ...message,
            senderId: userId,
          },
        });

        // Also emit to sender for confirmation
        socket.emit("message-sent", {
          conversationId,
          messageId: message._id || message.id,
        });
      } catch (error) {
        console.error("Error handling send-message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicators
    socket.on("typing-start", (data: { conversationId: string }) => {
      const { conversationId } = data;
      if (!conversationId) return;

      socket.to(`conversation:${conversationId}`).emit("user-typing", {
        conversationId,
        userId,
        email,
        isTyping: true,
      });
    });

    socket.on("typing-stop", (data: { conversationId: string }) => {
      const { conversationId } = data;
      if (!conversationId) return;

      socket.to(`conversation:${conversationId}`).emit("user-typing", {
        conversationId,
        userId,
        email,
        isTyping: false,
      });
    });

    // Message read acknowledgment
    socket.on("message-read", (data: { messageId: string; conversationId: string }) => {
      const { messageId, conversationId } = data;
      if (!messageId || !conversationId) return;

      socket.to(`conversation:${conversationId}`).emit("message-read", {
        messageId,
        userId,
        conversationId,
      });
    });

    // Get online users
    socket.on("get-online-users", () => {
      const users = Array.from(onlineUsers.values()).map(({ socketId, ...user }) => user);
      socket.emit("online-users", users);
    });

    // Disconnect handling
    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${userId} (${reason})`);

      // Remove from online users
      onlineUsers.delete(userId);

      // Notify contacts that user is offline
      socket.broadcast.emit("user-offline", { userId });

      // Leave all conversation rooms
      socket.rooms.forEach((room) => {
        if (room.startsWith("conversation:")) {
          socket.to(room).emit("user-left-conversation", {
            conversationId: room.replace("conversation:", ""),
            userId,
          });
        }
      });
    });

    // Error handling
    socket.on("error", (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

export function emitNewMessage(conversationId: string, message: any) {
  if (io) {
    io.to(`conversation:${conversationId}`).emit("new-message", {
      conversationId,
      message,
    });
  }
}

export function emitMessageRead(messageId: string, userId: string, conversationId: string) {
  if (io) {
    io.to(`conversation:${conversationId}`).emit("message-read", {
      messageId,
      userId,
      conversationId,
    });
  }
}

export function emitConversationRead(conversationId: string, userId: string) {
  if (io) {
    io.to(`conversation:${conversationId}`).emit("conversation-read", {
      conversationId,
      userId,
    });
  }
}

export function emitTyping(conversationId: string, userId: string, email: string, isTyping: boolean) {
  if (io) {
    io.to(`conversation:${conversationId}`).emit("user-typing", {
      conversationId,
      userId,
      email,
      isTyping,
    });
  }
}

export function getOnlineUsers(): OnlineUser[] {
  return Array.from(onlineUsers.values());
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

// Assignment WebSocket events
export function emitAssignmentEvent(
  event: "assignment:created" | "assignment:updated",
  assignment: any,
  studentIds: string[],
) {
  if (!io) return;

  // Emit to specific students
  studentIds.forEach((studentId) => {
    io?.to(`user:${studentId}`).emit(event, {
      assignment,
      timestamp: new Date(),
    });
  });

  // Also emit to admins
  io?.to("admin").emit(event, {
    assignment,
    timestamp: new Date(),
  });
}
