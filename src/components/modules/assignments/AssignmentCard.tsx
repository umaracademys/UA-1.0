"use client";

import { format } from "date-fns";
import { Calendar, BookOpen, CheckCircle, Clock, AlertCircle, FileText } from "lucide-react";
import type { AssignmentStatus } from "@/lib/db/models/Assignment";

export type AssignmentCardData = {
  _id: string;
  studentId: string;
  studentName: string;
  assignedBy: string;
  assignedByName: string;
  assignedByRole: string;
  status: AssignmentStatus;
  classwork?: {
    sabq: any[];
    sabqi: any[];
    manzil: any[];
  };
  homework?: {
    enabled: boolean;
    submission?: {
      submitted: boolean;
      submittedAt?: string | Date;
      grade?: number;
      status?: "submitted" | "graded" | "returned";
    };
  };
  comment?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type AssignmentCardProps = {
  assignment: AssignmentCardData;
  userRole: "student" | "teacher" | "admin";
  onClick: () => void;
};

const statusColors: Record<AssignmentStatus | "overdue", string> = {
  active: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
};

const statusIcons: Record<AssignmentStatus | "overdue", typeof CheckCircle> = {
  active: Clock,
  completed: CheckCircle,
  archived: AlertCircle,
  overdue: AlertCircle,
};

export function AssignmentCard({ assignment, userRole, onClick }: AssignmentCardProps) {
  const displayStatus = assignment.status;
  const StatusIcon = statusIcons[displayStatus];

  // Count classwork entries
  const classworkCount =
    (assignment.classwork?.sabq?.length || 0) +
    (assignment.classwork?.sabqi?.length || 0) +
    (assignment.classwork?.manzil?.length || 0);

  // Check homework status
  const homeworkStatus = assignment.homework?.submission?.status;
  const homeworkGrade = assignment.homework?.submission?.grade;

  return (
    <div
      className="group cursor-pointer rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-lg font-semibold text-neutral-900">{assignment.studentName}</h3>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {assignment.assignedByRole === "teacher" ? "Teacher" : assignment.assignedByRole}
            </span>
          </div>

          {assignment.comment && (
            <p className="mb-3 text-sm text-neutral-600">
              {assignment.comment.length > 100
                ? `${assignment.comment.substring(0, 100)}...`
                : assignment.comment}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
            {assignment.createdAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>Created: {format(new Date(assignment.createdAt), "MMM dd, yyyy")}</span>
              </div>
            )}

            {classworkCount > 0 && (
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                <span>
                  {classworkCount} classwork {classworkCount === 1 ? "entry" : "entries"}
                </span>
              </div>
            )}

            {assignment.homework?.enabled && (
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <span>
                  {homeworkStatus === "graded"
                    ? "Graded"
                    : homeworkStatus === "submitted"
                      ? "Submitted"
                      : "Pending"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusColors[displayStatus]}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            <span className="capitalize">{displayStatus}</span>
          </div>

          {userRole === "student" && homeworkGrade !== undefined && (
            <div className="text-sm font-semibold text-neutral-700">
              Grade: <span className="text-indigo-600">{homeworkGrade}</span>
            </div>
          )}
        </div>
      </div>

      {userRole === "student" && assignment.homework?.submission?.submittedAt && (
        <div className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
          Submitted:{" "}
          {format(new Date(assignment.homework.submission.submittedAt), "MMM dd, yyyy 'at' h:mm a")}
        </div>
      )}
    </div>
  );
}
