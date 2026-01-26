import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export interface SocketClientOptions {
  token: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export function createSocketClient(options: SocketClientOptions): Socket {
  const {
    token,
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  // Disconnect existing socket if any
  if (socketInstance && socketInstance.connected) {
    socketInstance.disconnect();
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  socketInstance = io(socketUrl, {
    auth: {
      token,
    },
    autoConnect,
    reconnection,
    reconnectionAttempts,
    reconnectionDelay,
    transports: ["websocket", "polling"],
    path: "/socket.io",
  });

  // Connection event handlers
  socketInstance.on("connect", () => {
    console.log("Socket connected:", socketInstance?.id);
  });

  socketInstance.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socketInstance.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
  });

  socketInstance.on("reconnect", (attemptNumber) => {
    console.log("Socket reconnected after", attemptNumber, "attempts");
  });

  socketInstance.on("reconnect_attempt", (attemptNumber) => {
    console.log("Socket reconnection attempt:", attemptNumber);
  });

  socketInstance.on("reconnect_error", (error) => {
    console.error("Socket reconnection error:", error);
  });

  socketInstance.on("reconnect_failed", () => {
    console.error("Socket reconnection failed");
  });

  // Error handler
  socketInstance.on("error", (error) => {
    console.error("Socket error:", error);
  });

  return socketInstance;
}

export function getSocketClient(): Socket | null {
  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function isSocketConnected(): boolean {
  return socketInstance?.connected || false;
}
