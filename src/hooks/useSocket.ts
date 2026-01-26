"use client";

import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { createSocketClient, disconnectSocket, getSocketClient } from "@/lib/socket/client";

export function useSocket(token: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      // Disconnect if no token
      if (socketRef.current) {
        disconnectSocket();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Check if socket already exists and is connected
    const existingSocket = getSocketClient();
    if (existingSocket && existingSocket.connected) {
      setSocket(existingSocket);
      setIsConnected(true);
      socketRef.current = existingSocket;
      return;
    }

    // Create new socket connection
    const newSocket = createSocketClient({
      token,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection handlers
    newSocket.on("connect", () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log("Socket connected");
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Socket disconnected");
    });

    newSocket.on("connect_error", (error) => {
      setIsConnected(false);
      setConnectionError(error.message || "Connection failed");
      console.error("Socket connection error:", error);
    });

    newSocket.on("reconnect", () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log("Socket reconnected");
    });

    newSocket.on("reconnect_failed", () => {
      setIsConnected(false);
      setConnectionError("Reconnection failed. Please refresh the page.");
    });

    // Cleanup on unmount
    return () => {
      // Don't disconnect on cleanup - let it stay connected for the app lifetime
      // The effect will re-run if token changes, creating a new socket
    };
  }, [token]);

  return {
    socket,
    isConnected,
    connectionError,
  };
}
