"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageThread } from "@/components/modules/messages/MessageThread";
import { ConversationHeader } from "@/components/modules/messages/ConversationHeader";
import { MessageInput } from "@/components/modules/messages/MessageInput";
import { SearchMessages } from "@/components/modules/messages/SearchMessages";
import { useConversation } from "@/hooks/useConversation";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import toast from "react-hot-toast";

export default function ConversationPage({ params }: { params: { conversationId: string } }) {
  const router = useRouter();
  const [conversation, setConversation] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
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
  } = useConversation(params.conversationId, token);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);
    fetchUserData();
    fetchConversation();
  }, [params.conversationId]);

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
      }
    } catch (error) {
      console.error("Failed to load user data");
    }
  };

  const fetchConversation = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/conversations/${params.conversationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setConversation(result.conversation);
        markAllAsRead();
      } else {
        toast.error(result.message || "Conversation not found");
        router.push("/messages");
      }
    } catch (error) {
      toast.error("Failed to load conversation");
      router.push("/messages");
    }
  };

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    try {
      await sendMessage(content, attachments);
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    await loadMessages(nextPage);
    setPage(nextPage);
  };

  if (!conversation) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-indigo-600 mx-auto" />
          <p className="text-neutral-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="messages.access">
      <div className="flex h-screen flex-col bg-white">
        <SearchMessages
          conversationId={params.conversationId}
          onResultClick={(messageId) => {
            // Scroll to message
            console.log("Scroll to message:", messageId);
          }}
          token={token}
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
        />

        <ConversationHeader
          participants={conversation.participants || []}
          conversationId={params.conversationId}
          onBack={() => router.push("/messages")}
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
        />
      </div>
    </PermissionGuard>
  );
}
