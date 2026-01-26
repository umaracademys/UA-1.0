"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle, Clock, AlertCircle, FileText } from "lucide-react";
import type { SubmissionStatus } from "@/lib/db/models/Submission";

type Submission = {
  _id: string;
  studentId: {
    userId: {
      fullName: string;
      email: string;
    };
  };
  submittedAt?: string | Date;
  status: SubmissionStatus;
  grade?: number;
  content?: string;
  attachments?: Array<{ filename: string; url: string }>;
};

type SubmissionsListProps = {
  submissions: Submission[];
  onGrade: (submission: Submission) => void;
};

export function SubmissionsList({ submissions, onGrade }: SubmissionsListProps) {
  const [filter, setFilter] = useState<"all" | "submitted" | "graded" | "late">("all");

  const filteredSubmissions = submissions.filter((sub) => {
    if (filter === "submitted") return sub.submittedAt && !sub.grade;
    if (filter === "graded") return sub.grade !== undefined;
    if (filter === "late") return sub.status === "late";
    return true;
  });

  const getStatusIcon = (submission: Submission) => {
    if (submission.grade !== undefined) return CheckCircle;
    if (submission.status === "late") return AlertCircle;
    if (submission.submittedAt) return Clock;
    return FileText;
  };

  const getStatusColor = (submission: Submission) => {
    if (submission.grade !== undefined) return "text-green-600";
    if (submission.status === "late") return "text-red-600";
    if (submission.submittedAt) return "text-blue-600";
    return "text-neutral-400";
  };

  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-neutral-500">
        No submissions yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "submitted", "graded", "late"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-indigo-100 text-indigo-700"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">Student</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">Submitted At</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">Grade</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                  No submissions match the filter
                </td>
              </tr>
            ) : (
              filteredSubmissions.map((submission) => {
                const StatusIcon = getStatusIcon(submission);
                const statusColor = getStatusColor(submission);
                const studentName =
                  submission.studentId && typeof submission.studentId === "object" && "userId" in submission.studentId
                    ? (submission.studentId.userId as { fullName: string }).fullName
                    : "Unknown";

                return (
                  <tr key={submission._id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm font-medium text-neutral-900">{studentName}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {submission.submittedAt
                        ? format(new Date(submission.submittedAt), "MMM dd, yyyy 'at' h:mm a")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1.5 ${statusColor}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-sm capitalize">
                          {submission.grade !== undefined
                            ? "Graded"
                            : submission.status === "late"
                              ? "Late"
                              : submission.submittedAt
                                ? "Submitted"
                                : "Pending"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-900">
                      {submission.grade !== undefined ? (
                        <span className="font-semibold">{submission.grade}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onGrade(submission)}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        {submission.grade !== undefined ? "View/Edit" : "Grade"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
