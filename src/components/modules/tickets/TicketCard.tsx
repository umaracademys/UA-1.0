"use client";

import { format } from "date-fns";
import { Clock, Play, Eye, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import type { TicketWorkflowStep, TicketStatus } from "@/lib/db/models/Ticket";

export type TicketCardData = {
  _id: string;
  studentId: {
    userId: {
      fullName: string;
      email?: string;
    };
  };
  teacherId?: {
    userId: {
      fullName: string;
    };
  };
  workflowStep: TicketWorkflowStep;
  status: TicketStatus;
  mistakes?: Array<{ type: string; category: string }>;
  createdAt: string | Date;
  reviewedAt?: string | Date;
  /** Listening range set when ticket is started */
  ayahRange?: { fromSurah: number; fromAyah: number; toSurah: number; toAyah: number };
  /** Portal legacy: surah/ayah range */
  recitationRange?: {
    surahNumber?: number;
    surahName?: string;
    juzNumber?: number;
    startAyahNumber?: number;
    endAyahNumber?: number;
    endSurahNumber?: number;
    endSurahName?: string;
  };
};

type TicketCardProps = {
  ticket: TicketCardData;
  userRole: "student" | "teacher" | "admin" | "super_admin";
  onStart?: (ticket: TicketCardData) => void;
  onView: () => void;
  onReview?: () => void;
};

const workflowStepColors: Record<TicketWorkflowStep, string> = {
  sabq: "bg-blue-100 text-blue-700",
  sabqi: "bg-purple-100 text-purple-700",
  manzil: "bg-green-100 text-green-700",
};

const statusColors: Record<TicketStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  "in-progress": "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  submitted: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  reassigned: "bg-indigo-100 text-indigo-700",
  closed: "bg-neutral-100 text-neutral-700",
};

const statusIcons: Record<TicketStatus, typeof Clock> = {
  pending: Clock,
  "in-progress": Play,
  paused: Clock,
  submitted: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  reassigned: RefreshCw,
  closed: XCircle,
};

export function TicketCard({ ticket, userRole, onStart, onView, onReview }: TicketCardProps) {
  const StatusIcon = statusIcons[ticket.status] ?? Clock;
  const studentName =
    ticket.studentId && typeof ticket.studentId === "object" && "userId" in ticket.studentId
      ? (ticket.studentId.userId as { fullName: string }).fullName
      : "Unknown Student";

  const assignedTeacherName =
    ticket.teacherId && typeof ticket.teacherId === "object" && "userId" in ticket.teacherId
      ? (ticket.teacherId.userId as { fullName: string }).fullName
      : null;

  const juzNumber = ticket.recitationRange?.juzNumber;
  const surahName =
    ticket.recitationRange?.surahName ??
    (ticket.recitationRange?.surahNumber != null ? `Surah ${ticket.recitationRange.surahNumber}` : null);
  const rangeText = ticket.ayahRange
    ? `${ticket.ayahRange.fromSurah}:${ticket.ayahRange.fromAyah} → ${ticket.ayahRange.toSurah}:${ticket.ayahRange.toAyah}`
    : null;

  const mistakesCount = ticket.mistakes?.length || 0;

  const canManageSession =
    userRole === "teacher" || userRole === "admin" || userRole === "super_admin";

  return (
    <div className="group rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-lg font-semibold text-neutral-900" title="Student">
              {studentName}
            </h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${workflowStepColors[ticket.workflowStep] ?? "bg-neutral-100 text-neutral-700"}`}
            >
              {ticket.workflowStep}
            </span>
            <div className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[ticket.status] ?? "bg-neutral-100 text-neutral-700"}`}>
              <StatusIcon className="h-3 w-3" />
              <span className="capitalize">{(ticket.status ?? "").replace("-", " ")}</span>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-4 text-sm text-neutral-500">
            <span>Created: {format(new Date(ticket.createdAt), "MMM dd, yyyy")}</span>
            {mistakesCount > 0 && <span>{mistakesCount} mistake{mistakesCount !== 1 ? "s" : ""}</span>}
          </div>

          <div className="space-y-1 text-sm text-neutral-600">
            {assignedTeacherName && <p>Teacher: {assignedTeacherName}</p>}
            {juzNumber != null && <p>Juz: {juzNumber}</p>}
            {surahName && <p>Surah: {surahName}</p>}
            {rangeText && <p>Range: {rangeText}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {ticket.status === "pending" && onStart && canManageSession && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart(ticket);
              }}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              Start Session
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>

          {ticket.status === "submitted" && onReview && (userRole === "admin" || userRole === "super_admin") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReview();
              }}
              className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
            >
              Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
