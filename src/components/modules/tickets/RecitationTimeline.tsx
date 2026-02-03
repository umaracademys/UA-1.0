"use client";

import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, Play, Pause, CircleStop, RefreshCw } from "lucide-react";
import type { TicketWorkflowStep, TicketStatus } from "@/lib/db/models/Ticket";

type TimelineEntry = {
  id: string;
  workflowStep: TicketWorkflowStep;
  status: TicketStatus;
  createdAt: string | Date;
  reviewedAt?: string | Date;
  mistakesCount: number;
};

type RecitationTimelineProps = {
  entries: TimelineEntry[];
  onEntryClick?: (entry: TimelineEntry) => void;
  workflowFilter?: TicketWorkflowStep | "all";
};

const workflowStepColors: Record<TicketWorkflowStep, string> = {
  sabq: "bg-blue-100 text-blue-700 border-blue-200",
  sabqi: "bg-purple-100 text-purple-700 border-purple-200",
  manzil: "bg-green-100 text-green-700 border-green-200",
};

const statusIcons: Record<TicketStatus, typeof CheckCircle> = {
  pending: Clock,
  "in-progress": Play,
  paused: Pause,
  submitted: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  reassigned: RefreshCw,
  closed: CircleStop,
};

const statusColors: Record<TicketStatus, string> = {
  pending: "text-yellow-600",
  "in-progress": "text-blue-600",
  paused: "text-amber-600",
  submitted: "text-purple-600",
  approved: "text-green-600",
  rejected: "text-red-600",
  reassigned: "text-indigo-600",
  closed: "text-neutral-500",
};

export function RecitationTimeline({
  entries,
  onEntryClick,
  workflowFilter = "all",
}: RecitationTimelineProps) {
  const filteredEntries =
    workflowFilter === "all"
      ? entries
      : entries.filter((entry) => entry.workflowStep === workflowFilter);

  if (filteredEntries.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center text-neutral-500">
        No recitation history found
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-neutral-200" />

      {/* Timeline Entries */}
      <div className="space-y-6">
        {filteredEntries.map((entry, index) => {
          const StatusIcon = statusIcons[entry.status];
          const statusColor = statusColors[entry.status];

          return (
            <div
              key={entry.id}
              className={`relative flex items-start gap-4 ${
                onEntryClick ? "cursor-pointer hover:opacity-80" : ""
              }`}
              onClick={() => onEntryClick?.(entry)}
            >
              {/* Timeline Dot */}
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-white shadow-md">
                <StatusIcon className={`h-6 w-6 ${statusColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${workflowStepColors[entry.workflowStep]}`}
                  >
                    {entry.workflowStep}
                  </span>
                  <span className={`text-xs font-medium capitalize ${statusColor}`}>
                    {entry.status.replace("-", " ")}
                  </span>
                  {entry.mistakesCount > 0 && (
                    <span className="text-xs text-neutral-500">
                      {entry.mistakesCount} mistake{entry.mistakesCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="text-sm text-neutral-600">
                  <p>Created: {format(new Date(entry.createdAt), "MMM dd, yyyy 'at' h:mm a")}</p>
                  {entry.reviewedAt && (
                    <p>
                      Reviewed: {format(new Date(entry.reviewedAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
