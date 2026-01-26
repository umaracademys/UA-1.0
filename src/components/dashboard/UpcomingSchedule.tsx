"use client";

import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { Calendar, Clock, User } from "lucide-react";
import Link from "next/link";

type ScheduleItem = {
  _id: string;
  date: Date | string;
  time: string;
  subject: string;
  activity?: string;
  teacherName: string;
  type: "class" | "recitation" | "evaluation" | "other";
};

type UpcomingScheduleProps = {
  items: ScheduleItem[];
  loading?: boolean;
};

function formatScheduleDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  
  if (isToday(dateObj)) {
    return "Today";
  }
  if (isTomorrow(dateObj)) {
    return "Tomorrow";
  }
  return format(dateObj, "MMM dd, yyyy");
}

export function UpcomingSchedule({ items, loading }: UpcomingScheduleProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Upcoming Schedule</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Upcoming Schedule</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="h-12 w-12 text-neutral-300" />
          <p className="mt-2 text-sm font-medium text-neutral-900">No upcoming schedule</p>
          <p className="mt-1 text-xs text-neutral-500">Your schedule will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">Upcoming Schedule</h3>
        <Link
          href="/student/schedule"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          View All →
        </Link>
      </div>
      <div className="space-y-3">
        {items.slice(0, 5).map((item) => (
          <div
            key={item._id}
            className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 transition-colors hover:bg-neutral-100"
          >
            <div className="flex-shrink-0 rounded-lg bg-indigo-100 p-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">{item.subject}</p>
                  {item.activity && (
                    <p className="mt-0.5 text-xs text-neutral-600">{item.activity}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatScheduleDate(item.date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{item.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{item.teacherName}</span>
                    </div>
                  </div>
                </div>
                <span className="flex-shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 capitalize">
                  {item.type}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
