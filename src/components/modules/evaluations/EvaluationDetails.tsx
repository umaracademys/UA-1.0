"use client";

import { format, startOfWeek, endOfWeek } from "date-fns";
import { Edit, Trash2, Printer, Download, CheckCircle, XCircle, Clock, Send } from "lucide-react";
import { StarRating } from "./StarRating";
import Link from "next/link";

type EvaluationDetailsProps = {
  evaluation: {
    _id: string;
    studentId: any;
    teacherId: any;
    weekStartDate: Date | string;
    categories: Array<{ name: string; rating: number; comments?: string }>;
    overallComments?: string;
    status: "draft" | "submitted" | "approved" | "rejected";
    submittedAt?: Date | string;
    reviewedBy?: any;
    reviewNotes?: string;
    reviewedAt?: Date | string;
    homeworkAssigned?: any;
    createdAt: Date | string;
  };
  currentUserId: string;
  currentUserRole: string;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function EvaluationDetails({
  evaluation,
  currentUserId,
  currentUserRole,
  onEdit,
  onDelete,
}: EvaluationDetailsProps) {
  const weekStart = new Date(evaluation.weekStartDate);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekRange = `${format(weekStart, "MMMM dd")} - ${format(weekEnd, "MMMM dd, yyyy")}`;

  const averageRating =
    evaluation.categories.reduce((sum, cat) => sum + cat.rating, 0) / evaluation.categories.length;

  const studentName = evaluation.studentId?.userId?.fullName || evaluation.studentId?.fullName || "Unknown";
  const teacherName = evaluation.teacherId?.userId?.fullName || evaluation.teacherId?.fullName || "Unknown";
  const reviewerName = evaluation.reviewedBy?.fullName || "Unknown";

  const canEdit = evaluation.status === "draft" && evaluation.teacherId?.userId?._id === currentUserId;
  const canDelete = canEdit && (currentUserRole === "admin" || currentUserRole === "super_admin");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Evaluation Details</h2>
          <p className="text-sm text-neutral-500">{weekRange}</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          <button className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Student and Teacher Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-medium text-neutral-600">Student</p>
          <p className="mt-1 text-sm font-semibold text-neutral-900">{studentName}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-medium text-neutral-600">Teacher</p>
          <p className="mt-1 text-sm font-semibold text-neutral-900">{teacherName}</p>
        </div>
      </div>

      {/* Overall Rating */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-neutral-700">Overall Rating</p>
        <StarRating rating={averageRating} readOnly size="lg" showValue />
      </div>

      {/* Categories */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900">Category Ratings</h3>
        {evaluation.categories.map((category, index) => (
          <div key={index} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-neutral-900">{category.name}</p>
              <StarRating rating={category.rating} readOnly size="sm" showValue />
            </div>
            {category.comments && (
              <p className="mt-2 text-sm text-neutral-600">{category.comments}</p>
            )}
          </div>
        ))}
      </div>

      {/* Overall Comments */}
      {evaluation.overallComments && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-medium text-neutral-700">Overall Comments</h3>
          <p className="text-sm text-neutral-900 whitespace-pre-wrap">{evaluation.overallComments}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-4 text-sm font-medium text-neutral-700">Timeline</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-neutral-400" />
            <div>
              <p className="text-sm font-medium text-neutral-900">Created</p>
              <p className="text-xs text-neutral-500">
                {format(new Date(evaluation.createdAt), "MMM dd, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>

          {evaluation.submittedAt && (
            <div className="flex items-center gap-3">
              <Send className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-neutral-900">Submitted</p>
                <p className="text-xs text-neutral-500">
                  {format(new Date(evaluation.submittedAt), "MMM dd, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          )}

          {evaluation.reviewedAt && (
            <div className="flex items-center gap-3">
              {evaluation.status === "approved" ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {evaluation.status === "approved" ? "Approved" : "Rejected"} by {reviewerName}
                </p>
                <p className="text-xs text-neutral-500">
                  {format(new Date(evaluation.reviewedAt), "MMM dd, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Notes */}
      {evaluation.reviewNotes && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-blue-900">Review Notes</h3>
          <p className="text-sm text-blue-800 whitespace-pre-wrap">{evaluation.reviewNotes}</p>
        </div>
      )}

      {/* Homework Assignment */}
      {evaluation.homeworkAssigned && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-green-900">Assigned Homework</h3>
          <p className="mb-2 text-sm text-green-800">{evaluation.homeworkAssigned.title}</p>
          <Link
            href={`/assignments/${evaluation.homeworkAssigned._id}`}
            className="text-sm font-medium text-green-700 hover:underline"
          >
            View Assignment →
          </Link>
        </div>
      )}
    </div>
  );
}
