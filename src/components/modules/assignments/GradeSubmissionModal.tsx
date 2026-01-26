"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, File, Download } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import { format } from "date-fns";

const gradeSchema = z.object({
  grade: z.number().min(0, "Grade cannot be negative"),
  feedback: z.string().optional(),
  teacherNotes: z.string().optional(),
});

type GradeFormData = z.infer<typeof gradeSchema>;

type SubmissionData = {
  _id: string;
  studentId: {
    userId: {
      fullName: string;
      email: string;
    };
  };
  content?: string;
  attachments: Array<{ filename: string; url: string }>;
  submittedAt?: string | Date;
  status: "pending" | "graded" | "late";
};

type GradeSubmissionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  submission: SubmissionData;
  onSuccess: () => void;
};

export function GradeSubmissionModal({
  isOpen,
  onClose,
  submission,
  onSuccess,
}: GradeSubmissionModalProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      grade: undefined,
      feedback: "",
      teacherNotes: "",
    },
  });

  const onSubmit = async (data: GradeFormData) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/submissions/${submission._id}/grade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to grade submission");
      }

      toast.success("Submission graded successfully!");
      reset();
      onSuccess();
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to grade submission");
    } finally {
      setLoading(false);
    }
  };

  const studentName =
    submission.studentId && typeof submission.studentId === "object" && "userId" in submission.studentId
      ? (submission.studentId.userId as { fullName: string }).fullName
      : "Unknown Student";

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">
              Grade Submission - {studentName}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
            {/* Submission Details */}
            <div className="mb-6 space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700">Student</h3>
                <p className="text-sm text-neutral-900">{studentName}</p>
              </div>

              {submission.submittedAt && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-neutral-700">Submitted At</h3>
                  <p className="text-sm text-neutral-900">
                    {format(new Date(submission.submittedAt), "MMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
              )}

              {submission.content && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-neutral-700">Content</h3>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <p className="whitespace-pre-wrap text-sm text-neutral-900">{submission.content}</p>
                  </div>
                </div>
              )}

              {submission.attachments && submission.attachments.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-neutral-700">Attachments</h3>
                  <div className="space-y-2">
                    {submission.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700 hover:bg-neutral-50"
                      >
                        <File className="h-4 w-4 text-neutral-400" />
                        <span className="flex-1">{attachment.filename}</span>
                        <Download className="h-4 w-4 text-neutral-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Grading Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border-t border-neutral-200 pt-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Grade *
                </label>
                <input
                  {...register("grade", { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  min="0"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter grade"
                />
                {errors.grade && <p className="mt-1 text-xs text-red-600">{errors.grade.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Feedback (Visible to Student)
                </label>
                <textarea
                  {...register("feedback")}
                  rows={4}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter feedback for the student..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Teacher Notes (Private)
                </label>
                <textarea
                  {...register("teacherNotes")}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Private notes (not visible to student)..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Grading..." : "Submit Grade"}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
