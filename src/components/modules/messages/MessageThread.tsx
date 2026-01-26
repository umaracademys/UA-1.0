"use client";

import { useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Check, CheckCheck } from "lucide-react";
import { MessageAttachment } from "./MessageAttachment";
import { TypingIndicator } from "./TypingIndicator";
import type { Message, TypingUser } from "@/hooks/useConversation";

type MessageThreadProps = {
  messages: Message[];
  typingUsers: TypingUser[];
  currentUserId: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
};

export function MessageThread({
  messages,
  typingUsers,
  currentUserId,
  onLoadMore,
  hasMore = false,
  loading = false,
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isNearTop, setIsNearTop] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages.length, messages]);

  // Handle scroll for pagination
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const scrollTop = container.scrollTop;
    setIsNearTop(scrollTop < 100);

    if (scrollTop < 100 && hasMore && onLoadMore && !loading) {
      onLoadMore();
    }
  };

  // Sort messages by date first, then group by date
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Group messages by date
  const groupedMessages = sortedMessages.reduce((groups, message) => {
    const date = new Date(message.createdAt);
    const dateKey = format(date, "yyyy-MM-dd");
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM dd, yyyy");
  };

  const formatMessageTime = (date: Date) => {
    return format(date, "h:mm a");
  };

  return (
    <div className="flex h-full flex-col bg-neutral-50">
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4"
      >
        {loading && isNearTop && (
          <div className="mb-4 text-center text-sm text-neutral-500">Loading more messages...</div>
        )}

        {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => {
          const date = new Date(dateKey);
          return (
            <div key={dateKey}>
              {/* Date Header */}
              <div className="my-4 flex items-center justify-center">
                <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-500 shadow-sm">
                  {formatDateHeader(date)}
                </div>
              </div>

              {/* Messages for this date */}
              {dateMessages.map((message) => {
                // Compare IDs as strings to handle ObjectId vs string
                const isOwn = String(message.senderId._id) === String(currentUserId);
                const senderName = message.senderId.fullName;

                return (
                  <div
                    key={message._id}
                    className={`mb-4 flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex max-w-[70%] flex-col ${isOwn ? "items-end" : "items-start"}`}>
                      {/* Sender Name (for received messages) */}
                      {!isOwn && (
                        <p className="mb-1 text-xs font-medium text-neutral-600">{senderName}</p>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isOwn
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-neutral-900 shadow-sm"
                        }`}
                      >
                        {/* Attachments - show first if present */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mb-2 space-y-2">
                            {message.attachments.map((attachment, index) => (
                              <MessageAttachment key={index} attachment={attachment} />
                            ))}
                          </div>
                        )}

                        {/* Message content - only show if not empty */}
                        {message.content && message.content.trim() && (
                          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        )}

                        {/* Timestamp and Read Status */}
                        <div
                          className={`mt-1 flex items-center gap-1 text-xs ${
                            isOwn ? "text-indigo-100" : "text-neutral-500"
                          }`}
                        >
                          <span>{formatMessageTime(new Date(message.createdAt))}</span>
                          {isOwn && (
                            <span>
                              {message.isRead ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
