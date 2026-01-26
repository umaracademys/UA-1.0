"use client";

import { useState } from "react";
import { ArrowLeft, MoreVertical, CheckCheck, Search, Archive, Shield } from "lucide-react";
import { Menu, Transition } from "@headlessui/react";
import { format } from "date-fns";
import toast from "react-hot-toast";

type Participant = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
};

type ConversationHeaderProps = {
  participants: Participant[];
  isOnline?: boolean;
  conversationId: string;
  onBack?: () => void;
  onMarkAllRead?: () => void;
  onSearch?: () => void;
  onArchive?: () => void;
  token: string | null;
};

export function ConversationHeader({
  participants,
  isOnline = false,
  conversationId,
  onBack,
  onMarkAllRead,
  onSearch,
  onArchive,
  token,
}: ConversationHeaderProps) {
  const [loading, setLoading] = useState(false);

  const handleMarkAllRead = async () => {
    if (!onMarkAllRead) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/mark-read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("All messages marked as read");
        onMarkAllRead();
      } else {
        toast.error(result.message || "Failed to mark as read");
      }
    } catch (error) {
      toast.error("Failed to mark as read");
    } finally {
      setLoading(false);
    }
  };

  const participantNames = participants.map((p) => p.fullName).join(", ");

  return (
    <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              {participants[0]?.fullName.charAt(0).toUpperCase() || "U"}
            </div>
            {isOnline && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">{participantNames}</p>
            <p className="text-xs text-neutral-500">
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
      </div>

      <Menu as="div" className="relative">
        <Menu.Button className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100">
          <MoreVertical className="h-5 w-5" />
        </Menu.Button>

        <Transition
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg border border-neutral-200 bg-white shadow-lg">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={loading}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                      active ? "bg-neutral-100" : ""
                    } ${loading ? "opacity-50" : ""}`}
                  >
                    <CheckCheck className="h-4 w-4" />
                    Mark all as read
                  </button>
                )}
              </Menu.Item>

              {onSearch && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onSearch}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                        active ? "bg-neutral-100" : ""
                      }`}
                    >
                      <Search className="h-4 w-4" />
                      Search in conversation
                    </button>
                  )}
                </Menu.Item>
              )}

              {onArchive && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onArchive}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                        active ? "bg-neutral-100" : ""
                      }`}
                    >
                      <Archive className="h-4 w-4" />
                      Archive conversation
                    </button>
                  )}
                </Menu.Item>
              )}

              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 ${
                      active ? "bg-red-50" : ""
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    Report
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}
