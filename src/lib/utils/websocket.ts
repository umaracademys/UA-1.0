import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

export function initializeSocketIO(server: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join user's room for private messaging
    socket.on("join-user-room", (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Join conversation room
    socket.on("join-conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    // Leave conversation room
    socket.on("leave-conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} left conversation ${conversationId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
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

    // Also notify users in their personal rooms
    if (message.senderId) {
      // Emit to all participants except sender
      // This would need conversation participants from DB
    }
  }
}

export function emitMessageRead(messageId: string, userId: string) {
  if (io) {
    io.emit("message-read", {
      messageId,
      userId,
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

export function emitTyping(conversationId: string, userId: string, isTyping: boolean) {
  if (io) {
    io.to(`conversation:${conversationId}`).emit("typing", {
      conversationId,
      userId,
      isTyping,
    });
  }
}
