"use client";

import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  FileText,
  Star,
  MessageSquare,
  UserPlus,
  Calendar,
  Check,
  X,
  Trash2,
} from "lucide-react";
import Link from "next/link";

type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
  isRead: boolean;
  createdAt: Date | string;
};

type NotificationItemProps = {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
};

const typeIcons = {
  recitation_review: BookOpen,
  assignment_submission: FileText,
  evaluation_feedback: Star,
  message: MessageSquare,
  registration: UserPlus,
  attendance_issue: Calendar,
};

const typeColors = {
  recitation_review: "text-purple-600 bg-purple-100",
  assignment_submission: "text-blue-600 bg-blue-100",
  evaluation_feedback: "text-green-600 bg-green-100",
  message: "text-neutral-600 bg-neutral-100",
  registration: "text-orange-600 bg-orange-100",
  attendance_issue: "text-red-600 bg-red-100",
};

function getNotificationUrl(notification: Notification): string | null {
  if (!notification.relatedEntity) return null;

  const { type, id } = notification.relatedEntity;

  switch (type) {
    case "Ticket":
      return `/teacher/tickets/${id}`;
    case "Submission":
    case "Assignment":
      return `/teacher/assignments/${id}`;
    case "Evaluation":
      return `/teacher/evaluations/${id}`;
    case "Conversation":
      return `/messages/${id}`;
    case "Student":
      return `/admin/students/${id}`;
    case "Attendance":
      return `/admin/attendance`;
    default:
      return null;
  }
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  showActions = false,
}: NotificationItemProps) {
  const Icon = typeIcons[notification.type as keyof typeof typeIcons] || MessageSquare;
  const colorClass = typeColors[notification.type as keyof typeof typeColors] || "text-neutral-600 bg-neutral-100";
  const url = getNotificationUrl(notification);

  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification._id);
    }
  };

  const content = (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        notification.isRead
          ? "border-neutral-200 bg-white"
          : "border-indigo-200 bg-indigo-50"
      } ${url ? "cursor-pointer hover:bg-indigo-100" : ""}`}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 rounded-lg p-2 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-semibold ${notification.isRead ? "text-neutral-700" : "text-neutral-900"}`}>
                {notification.title}
              </p>
              {!notification.isRead && (
                <div className="h-2 w-2 rounded-full bg-indigo-600" />
              )}
            </div>
            <p className={`mt-1 text-sm ${notification.isRead ? "text-neutral-500" : "text-neutral-700"}`}>
              {notification.message}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </p>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {!notification.isRead && onMarkAsRead && (
                <button
                  onClick={() => onMarkAsRead(notification._id)}
                  className="rounded-md p-1 text-green-600 hover:bg-green-50"
                  title="Mark as read"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
              {notification.isRead && onMarkAsUnread && (
                <button
                  onClick={() => onMarkAsUnread(notification._id)}
                  className="rounded-md p-1 text-blue-600 hover:bg-blue-50"
                  title="Mark as unread"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(notification._id)}
                  className="rounded-md p-1 text-red-600 hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (url) {
    return (
      <Link href={url} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
