"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return;

      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 3, // Reduced to prevent excessive retries
        timeout: 5000,
      });

      newSocket.on("connect", () => {
        setIsConnected(true);
        console.log("Socket connected");
      });

      newSocket.on("disconnect", () => {
        setIsConnected(false);
        console.log("Socket disconnected");
      });

      newSocket.on("connect_error", (error) => {
        // Only log in development, suppress in production
        if (process.env.NODE_ENV === "development") {
          console.warn("Socket connection error (expected if WebSocket server is not running):", error.message);
        }
        setIsConnected(false);
      });

      newSocket.on("reconnect", (attemptNumber) => {
        console.log("Socket reconnected after", attemptNumber, "attempts");
        setIsConnected(true);
      });

      newSocket.on("reconnect_error", (error) => {
        // Suppress reconnection errors - they're expected if server isn't running
        if (process.env.NODE_ENV === "development") {
          console.warn("Socket reconnection error (expected if WebSocket server is not running)");
        }
      });

      newSocket.on("reconnect_failed", () => {
        // Suppress reconnection failed - expected if server isn't running
        if (process.env.NODE_ENV === "development") {
          console.warn("Socket reconnection failed (WebSocket server may not be running)");
        }
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // User logged out, close socket
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
}
