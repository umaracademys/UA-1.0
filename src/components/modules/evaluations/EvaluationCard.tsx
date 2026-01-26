"use client";

import { format, startOfWeek, endOfWeek } from "date-fns";
import { Eye, Edit, Trash2 } from "lucide-react";
import { StarRating } from "./StarRating";
import { UnreadBadge } from "../messages/UnreadBadge";

type EvaluationCardProps = {
  evaluation: {
    _id: string;
    studentId: any;
    teacherId: any;
    weekStartDate: Date | string;
    categories: Array<{ name: string; rating: number; comments?: string }>;
    overallComments?: string;
    status: "draft" | "submitted" | "approved" | "rejected";
    submittedAt?: Date | string;
    reviewedAt?: Date | string;
    reviewedBy?: any;
  };
  currentUserId: string;
  currentUserRole: string;
  onView: (evaluationId: string) => void;
  onEdit?: (evaluationId: string) => void;
  onDelete?: (evaluationId: string) => void;
};

export function EvaluationCard({
  evaluation,
  currentUserId,
  currentUserRole,
  onView,
  onEdit,
  onDelete,
}: EvaluationCardProps) {
  const weekStart = new Date(evaluation.weekStartDate);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekRange = `${format(weekStart, "MMM dd")} - ${format(weekEnd, "MMM dd, yyyy")}`;

  // Calculate average rating
  const averageRating =
    evaluation.categories.reduce((sum, cat) => sum + cat.rating, 0) / evaluation.categories.length;

  const statusColors = {
    draft: "bg-neutral-100 text-neutral-700",
    submitted: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  const studentName = evaluation.studentId?.userId?.fullName || evaluation.studentId?.fullName || "Unknown";
  const canEdit = evaluation.status === "draft" && evaluation.teacherId?.userId?._id === currentUserId;
  const canDelete = canEdit && (currentUserRole === "admin" || currentUserRole === "super_admin");

  return (
    <div
      className="cursor-pointer rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      onClick={() => onView(evaluation._id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-neutral-900">{studentName}</p>
              <p className="text-xs text-neutral-500">{weekRange}</p>
            </div>
          </div>

          {/* Rating */}
          <div className="mb-2">
            <StarRating rating={averageRating} readOnly size="sm" showValue />
          </div>

          {/* Status */}
          <div className="mb-2">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColors[evaluation.status]}`}
            >
              {evaluation.status}
            </span>
          </div>

          {/* Comments Preview */}
          {evaluation.overallComments && (
            <p className="line-clamp-2 text-sm text-neutral-600">
              {evaluation.overallComments}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onView(evaluation._id)}
            className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
          >
            <Eye className="h-4 w-4" />
          </button>
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(evaluation._id)}
              className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(evaluation._id)}
              className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
