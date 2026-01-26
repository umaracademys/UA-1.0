"use client";

import { useState, useMemo } from "react";
import { Search, MessageSquare, Archive } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { UnreadBadge } from "./UnreadBadge";

type Participant = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
};

type Conversation = {
  _id: string;
  participants: Participant[];
  lastMessage?: string;
  lastMessageAt?: Date | string;
  unreadCount: number;
  type: "teacher-student" | "teacher-teacher";
};

type ConversationListProps = {
  conversations: Conversation[];
  activeConversationId?: string;
  onConversationClick: (conversationId: string) => void;
  loading?: boolean;
};

type FilterType = "all" | "unread" | "archived";
type SortType = "recent" | "alphabetical";

export function ConversationList({
  conversations,
  activeConversationId,
  onConversationClick,
  loading = false,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("recent");

  const filteredAndSorted = useMemo(() => {
    let filtered = [...conversations];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((conv) => {
        const participantNames = conv.participants
          .map((p) => p.fullName.toLowerCase())
          .join(" ");
        const lastMessage = (conv.lastMessage || "").toLowerCase();
        return participantNames.includes(query) || lastMessage.includes(query);
      });
    }

    // Apply filter
    if (filter === "unread") {
      filtered = filtered.filter((conv) => conv.unreadCount > 0);
    } else if (filter === "archived") {
      // Archived conversations would have a flag - for now, filter none
      filtered = [];
    }

    // Apply sort
    if (sort === "recent") {
      filtered.sort((a, b) => {
        const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sort === "alphabetical") {
      filtered.sort((a, b) => {
        const nameA = a.participants[0]?.fullName || "";
        const nameB = b.participants[0]?.fullName || "";
        return nameA.localeCompare(nameB);
      });
    }

    return filtered;
  }, [conversations, searchQuery, filter, sort]);

  if (loading) {
    return (
      <div className="flex h-full flex-col border-r border-neutral-200 bg-white">
        <div className="p-4">
          <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />
        </div>
        <div className="flex-1 space-y-2 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-r border-neutral-200 bg-white">
      {/* Search */}
      <div className="border-b border-neutral-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-neutral-200 p-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "all"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "unread"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Unread
        </button>
        <button
          onClick={() => setFilter("archived")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "archived"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Archived
        </button>

        <div className="ml-auto">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="recent">Recent</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAndSorted.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="h-12 w-12 text-neutral-300" />
            <p className="mt-2 text-sm text-neutral-500">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredAndSorted.map((conversation) => {
              const participant = conversation.participants[0];
              const isActive = conversation._id === activeConversationId;

              return (
                <button
                  key={conversation._id}
                  onClick={() => onConversationClick(conversation._id)}
                  className={`w-full text-left transition-colors hover:bg-neutral-50 ${
                    isActive ? "bg-indigo-50 border-l-4 border-indigo-600" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 p-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                        {participant?.fullName.charAt(0).toUpperCase() || "U"}
                      </div>
                      {/* Online indicator would go here */}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {participant?.fullName || "Unknown"}
                        </p>
                        {conversation.lastMessageAt && (
                          <span className="ml-2 flex-shrink-0 text-xs text-neutral-500">
                            {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="truncate text-xs text-neutral-600">
                          {conversation.lastMessage || "No messages yet"}
                        </p>
                        <UnreadBadge count={conversation.unreadCount} className="ml-2" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
