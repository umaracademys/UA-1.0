"use client";

import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  Star,
  Calendar,
  MessageSquare,
  User,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";

type Activity = {
  _id: string;
  type: "ticket_created" | "evaluation_submitted" | "attendance_recorded" | "message_sent" | "ticket_approved" | "ticket_rejected";
  description: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
  createdAt: Date | string;
  studentName?: string;
};

type ActivityTimelineProps = {
  activities: Activity[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
};

const activityIcons = {
  ticket_created: FileText,
  evaluation_submitted: Star,
  attendance_recorded: Calendar,
  message_sent: MessageSquare,
  ticket_approved: CheckCircle,
  ticket_rejected: XCircle,
};

const activityColors = {
  ticket_created: "bg-blue-100 text-blue-600",
  evaluation_submitted: "bg-green-100 text-green-600",
  attendance_recorded: "bg-purple-100 text-purple-600",
  message_sent: "bg-neutral-100 text-neutral-600",
  ticket_approved: "bg-green-100 text-green-600",
  ticket_rejected: "bg-red-100 text-red-600",
};

function getActivityUrl(activity: Activity): string | null {
  if (!activity.relatedEntity) return null;

  const { type, id } = activity.relatedEntity;

  switch (type) {
    case "Ticket":
      return `/teacher/tickets/${id}`;
    case "Evaluation":
      return `/teacher/evaluations/${id}`;
    case "Attendance":
      return `/teacher/attendance`;
    case "Conversation":
      return `/messages/${id}`;
    default:
      return null;
  }
}

export function ActivityTimeline({
  activities,
  loading,
  onLoadMore,
  hasMore,
}: ActivityTimelineProps) {
  if (loading && activities.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Recent Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Recent Activity</h3>
        <div className="py-8 text-center text-sm text-neutral-500">No recent activity</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-4 text-lg font-semibold text-neutral-900">Recent Activity</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neutral-200" />

        {/* Activities */}
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = activityIcons[activity.type] || Clock;
            const colorClass = activityColors[activity.type] || "bg-neutral-100 text-neutral-600";
            const url = getActivityUrl(activity);

            const content = (
              <div className="relative flex items-start gap-4">
                {/* Icon */}
                <div className={`relative z-10 flex-shrink-0 rounded-full p-2 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-900">
                    {activity.description}
                    {activity.studentName && (
                      <span className="font-medium"> - {activity.studentName}</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );

            if (url) {
              return (
                <Link key={activity._id} href={url} className="block">
                  {content}
                </Link>
              );
            }

            return <div key={activity._id}>{content}</div>;
          })}
        </div>

        {/* Load More */}
        {hasMore && onLoadMore && (
          <div className="mt-4 text-center">
            <button
              onClick={onLoadMore}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
