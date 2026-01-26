"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { ConversationList } from "@/components/modules/messages/ConversationList";
import { MessageThread } from "@/components/modules/messages/MessageThread";
import { MessageInput } from "@/components/modules/messages/MessageInput";
import { ConversationHeader } from "@/components/modules/messages/ConversationHeader";
import { NewConversationModal } from "@/components/modules/messages/NewConversationModal";
import { SearchMessages } from "@/components/modules/messages/SearchMessages";
import { useConversation } from "@/hooks/useConversation";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import toast from "react-hot-toast";

type Conversation = {
  _id: string;
  participants: Array<{
    _id: string;
    fullName: string;
    email: string;
    role: string;
  }>;
  lastMessage?: string;
  lastMessageAt?: Date | string;
  unreadCount: number;
  type: "teacher-student" | "teacher-teacher";
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [page, setPage] = useState(1);

  const {
    messages,
    typingUsers,
    sendMessage,
    markAllAsRead,
    loadMessages,
    startTyping,
    stopTyping,
  } = useConversation(activeConversationId, token);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);
    fetchUserData();
    fetchConversations();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setCurrentUserId(result.user?._id || result.profile?._id || "");
        setCurrentUserRole(result.user?.role || "");
      }
    } catch (error) {
      console.error("Failed to load user data");
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setConversations(result.conversations || []);
        // Select first conversation by default
        if (result.conversations && result.conversations.length > 0 && !activeConversationId) {
          setActiveConversationId(result.conversations[0]._id);
        }
      } else {
        toast.error(result.message || "Failed to load conversations");
      }
    } catch (error) {
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setPage(1);
    // Mark as read when opening
    markAllAsRead();
  };

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!activeConversationId) return;

    try {
      await sendMessage(content, attachments);
      // Refresh conversations to update last message
      fetchConversations();
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleConversationCreated = (conversationId: string) => {
    setActiveConversationId(conversationId);
    fetchConversations();
  };

  const handleLoadMore = async () => {
    if (!activeConversationId) return;
    const nextPage = page + 1;
    await loadMessages(nextPage);
    setPage(nextPage);
  };

  const activeConversation = conversations.find((c) => c._id === activeConversationId);

  return (
    <PermissionGuard permission="messages.access">
      <div className="flex h-screen flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
          <h1 className="text-xl font-bold text-neutral-900">Messages</h1>
          <button
            onClick={() => setShowNewConversation(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            New Message
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Conversations List - Hidden on mobile when conversation is selected */}
          <div
            className={`hidden lg:block lg:w-[30%] ${
              activeConversationId ? "hidden lg:block" : "block"
            }`}
          >
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId || undefined}
              onConversationClick={handleConversationClick}
              loading={loading}
            />
          </div>

          {/* Message Thread - 70% width on desktop, full on mobile */}
          {activeConversationId && activeConversation ? (
            <div className="flex flex-1 flex-col lg:w-[70%]">
              <SearchMessages
                conversationId={activeConversationId}
                onResultClick={(messageId) => {
                  // Scroll to message - would need message ref
                  console.log("Scroll to message:", messageId);
                }}
                token={token}
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
              />

              <ConversationHeader
                participants={activeConversation.participants}
                conversationId={activeConversationId}
                onBack={() => setActiveConversationId(null)}
                onMarkAllRead={markAllAsRead}
                onSearch={() => setShowSearch(true)}
                token={token}
              />

              <MessageThread
                messages={messages}
                typingUsers={typingUsers}
                currentUserId={currentUserId}
                onLoadMore={handleLoadMore}
                hasMore={messages.length >= 50 * page}
                loading={false}
              />

              <MessageInput
                onSend={handleSendMessage}
                onTypingStart={startTyping}
                onTypingStop={stopTyping}
                disabled={!activeConversationId}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-neutral-50">
              <div className="text-center">
                <p className="text-neutral-500">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>

        {/* New Conversation Modal */}
        {showNewConversation && (
          <NewConversationModal
            isOpen={showNewConversation}
            onClose={() => setShowNewConversation(false)}
            onConversationCreated={handleConversationCreated}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            token={token}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
