"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Socket } from "socket.io-client";
import { useSocket } from "./useSocket";
import toast from "react-hot-toast";

export interface Message {
  _id: string;
  conversationId: string;
  senderId: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  content: string;
  attachments?: Array<{
    filename: string;
    url: string;
    type?: string;
    size?: number;
  }>;
  priority: "normal" | "high" | "urgent";
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface TypingUser {
  userId: string;
  email: string;
  isTyping: boolean;
}

export function useConversation(conversationId: string | null, token: string | null) {
  const { socket, isConnected } = useSocket(token);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Join conversation room
  useEffect(() => {
    if (socket && isConnected && conversationId) {
      socket.emit("join-conversation", conversationId);

      // Listen for new messages
      const handleNewMessage = (data: { conversationId: string; message: Message }) => {
        if (data.conversationId === conversationId) {
          setMessages((prev) => {
            // Check if message already exists (including optimistic messages)
            const exists = prev.some((msg) => msg._id === data.message._id);
            if (exists) {
              // Replace optimistic message with real one if it exists
              return prev.map((msg) => 
                (msg._id.startsWith('temp-') && msg.content === data.message.content && 
                 Math.abs(new Date(msg.createdAt).getTime() - new Date(data.message.createdAt).getTime()) < 5000)
                  ? data.message 
                  : msg
              ).filter((msg, index, self) => 
                // Remove duplicates
                index === self.findIndex((m) => m._id === msg._id)
              );
            }
            return [...prev, data.message];
          });
        }
      };

      // Listen for typing indicators
      const handleTyping = (data: { conversationId: string; userId: string; email: string; isTyping: boolean }) => {
        if (data.conversationId === conversationId) {
          setTypingUsers((prev) => {
            if (data.isTyping) {
              // Add or update typing user
              const existing = prev.find((u) => u.userId === data.userId);
              if (existing) {
                return prev.map((u) =>
                  u.userId === data.userId ? { ...u, isTyping: true } : u,
                );
              }
              return [...prev, { userId: data.userId, email: data.email, isTyping: true }];
            } else {
              // Remove typing user
              return prev.filter((u) => u.userId !== data.userId);
            }
          });

          // Clear typing indicator after 3 seconds
          if (data.isTyping) {
            const timeoutId = setTimeout(() => {
              setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
            }, 3000);

            // Clear existing timeout for this user
            const existingTimeout = typingTimeoutRef.current.get(data.userId);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }
            typingTimeoutRef.current.set(data.userId, timeoutId);
          }
        }
      };

      // Listen for message read acknowledgments
      const handleMessageRead = (data: { messageId: string; userId: string; conversationId: string }) => {
        if (data.conversationId === conversationId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === data.messageId ? { ...msg, isRead: true, readAt: new Date() } : msg,
            ),
          );
        }
      };

      socket.on("new-message", handleNewMessage);
      socket.on("user-typing", handleTyping);
      socket.on("message-read", handleMessageRead);

      return () => {
        if (conversationId) {
          socket.emit("leave-conversation", conversationId);
        }
        socket.off("new-message", handleNewMessage);
        socket.off("user-typing", handleTyping);
        socket.off("message-read", handleMessageRead);

        // Clear typing timeouts
        typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
        typingTimeoutRef.current.clear();
      };
    }
  }, [socket, isConnected, conversationId]);

  // Load messages from API
  const loadMessages = useCallback(
    async (page = 1, limit = 50) => {
      if (!conversationId) return;

      setLoading(true);
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const result = await response.json();
        if (response.ok) {
          const loadedMessages = result.messages || [];
          // Sort messages by createdAt to ensure correct order
          loadedMessages.sort((a: Message, b: Message) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          if (page === 1) {
            setMessages(loadedMessages);
          } else {
            // Prepend older messages, maintaining sort order
            setMessages((prev) => {
              const combined = [...loadedMessages, ...prev];
              return combined.sort((a, b) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
            });
          }
        } else {
          toast.error(result.message || "Failed to load messages");
        }
      } catch (error) {
        toast.error("Failed to load messages");
      } finally {
        setLoading(false);
      }
    },
    [conversationId, token],
  );

  // Send message
  const sendMessage = useCallback(
    async (content: string, attachments?: File[], priority: "normal" | "high" | "urgent" = "normal") => {
      // Allow messages with only attachments (no text)
      if (!conversationId || (!content.trim() && (!attachments || attachments.length === 0))) {
        return;
      }

      // Get current user info for optimistic update
      let currentUser: { _id: string; fullName: string; email: string; role: string } | null = null;
      try {
        const userResponse = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (userResponse.ok) {
          const userResult = await userResponse.json();
          currentUser = {
            _id: userResult.user?._id || userResult.profile?._id || "",
            fullName: userResult.user?.fullName || userResult.profile?.fullName || "You",
            email: userResult.user?.email || userResult.profile?.email || "",
            role: userResult.user?.role || userResult.profile?.role || "",
          };
        }
      } catch (error) {
        console.error("Failed to get current user:", error);
      }

      // Create optimistic message
      const tempMessageId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        _id: tempMessageId,
        conversationId,
        senderId: currentUser || {
          _id: "",
          fullName: "You",
          email: "",
          role: "",
        },
        content: content.trim() || "", // Allow empty content if attachments exist
        attachments: attachments && attachments.length > 0 ? attachments.map((file) => ({
          filename: file.name,
          url: URL.createObjectURL(file), // Blob URL for immediate display
          type: file.type || "application/octet-stream",
          size: file.size || 0,
        })) : [],
        priority,
        isRead: false,
        createdAt: new Date(),
      };

      // Optimistically add message to UI immediately
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const formData = new FormData();
        formData.append("content", content.trim() || ""); // Allow empty content
        formData.append("priority", priority);
        if (attachments && attachments.length > 0) {
          attachments.forEach((file) => {
            formData.append("attachments", file);
          });
        }

        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const result = await response.json();
        if (response.ok) {
          const savedMessage = result.data || result.message;
          
          console.log("[useConversation] Message sent successfully:", {
            messageId: savedMessage?._id,
            hasAttachments: savedMessage?.attachments?.length > 0,
            attachmentCount: savedMessage?.attachments?.length || 0,
          });
          
          // Replace optimistic message with real message from server
          if (savedMessage) {
            setMessages((prev) => {
              // Remove optimistic message
              const filtered = prev.filter((msg) => msg._id !== tempMessageId);
              // Check if message already exists (from socket or previous add)
              const exists = filtered.some((msg) => msg._id === savedMessage._id);
              if (!exists) {
                // Add real message at the end with proper attachments
                const messageWithAttachments = {
                  ...savedMessage,
                  attachments: savedMessage.attachments || [],
                };
                console.log("[useConversation] Adding message with attachments:", messageWithAttachments.attachments);
                return [...filtered, messageWithAttachments];
              }
              // If exists, update it with server data (in case attachments changed)
              return filtered.map((msg) => 
                msg._id === savedMessage._id ? { ...savedMessage, attachments: savedMessage.attachments || [] } : msg
              );
            });
          } else {
            // If no message returned, just remove optimistic one (socket will add it)
            setMessages((prev) => prev.filter((msg) => msg._id !== tempMessageId));
          }
          
          return savedMessage;
        } else {
          // Remove optimistic message on error
          setMessages((prev) => prev.filter((msg) => msg._id !== tempMessageId));
          throw new Error(result.message || "Failed to send message");
        }
      } catch (error) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((msg) => msg._id !== tempMessageId));
        toast.error((error as Error).message || "Failed to send message");
        throw error;
      }
    },
    [conversationId, token],
  );

  // Mark message as read
  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!conversationId || !messageId) return;

      try {
        const response = await fetch(`/api/messages/${messageId}/read`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok && socket) {
          // Emit read acknowledgment via socket
          socket.emit("message-read", {
            messageId,
            conversationId,
          });
        }
      } catch (error) {
        console.error("Failed to mark message as read:", error);
      }
    },
    [conversationId, token, socket],
  );

  // Mark all messages as read
  const markAllAsRead = useCallback(async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(`/api/conversations/${conversationId}/mark-read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setMessages((prev) =>
          prev.map((msg) => ({ ...msg, isRead: true, readAt: new Date() })),
        );
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, [conversationId, token]);

  // Typing indicators
  const startTyping = useCallback(() => {
    if (socket && conversationId) {
      socket.emit("typing-start", { conversationId });
    }
  }, [socket, conversationId]);

  const stopTyping = useCallback(() => {
    if (socket && conversationId) {
      socket.emit("typing-stop", { conversationId });
    }
  }, [socket, conversationId]);

  // Load initial messages
  useEffect(() => {
    if (conversationId) {
      loadMessages(1);
    }
  }, [conversationId]);

  return {
    messages,
    typingUsers,
    loading,
    isConnected,
    sendMessage,
    markAsRead,
    markAllAsRead,
    loadMessages,
    startTyping,
    stopTyping,
  };
}
