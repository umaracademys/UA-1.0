"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import { useAuth } from "@/contexts/AuthContext";

const gradeSchema = z.object({
  feedback: z.string().min(1, "Feedback is required"),
  grade: z.number().min(0).max(100).optional(),
});

type GradeFormData = z.infer<typeof gradeSchema>;

type GradeHomeworkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  assignment: any;
  onSuccess: () => void;
};

export function GradeHomeworkModal({
  isOpen,
  onClose,
  assignmentId,
  assignment,
  onSuccess,
}: GradeHomeworkModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      feedback: "",
      grade: undefined,
    },
  });

  const onSubmit = async (data: GradeFormData) => {
    if (!user) {
      toast.error("User information not available");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/assignments/${assignmentId}/grade-homework`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedback: data.feedback,
          grade: data.grade,
          gradedBy: user._id,
          gradedByName: user.fullName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to grade homework");
      }

      toast.success("Homework graded successfully!");
      reset();
      onSuccess();
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to grade homework");
    } finally {
      setLoading(false);
    }
  };

  const submission = assignment?.homework?.submission;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">
              Grade Homework - {assignment?.studentName}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
            {/* Submission Preview */}
            {submission && (
              <div className="mb-6 space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <h3 className="text-sm font-medium text-neutral-700">Student Submission</h3>
                {submission.content && (
                  <div>
                    <p className="text-xs text-neutral-600">Content:</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-900">{submission.content}</p>
                  </div>
                )}
                {submission.link && (
                  <div>
                    <p className="text-xs text-neutral-600">Link:</p>
                    <a
                      href={submission.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      {submission.link}
                    </a>
                  </div>
                )}
                {submission.audioUrl && (
                  <div>
                    <p className="mb-1 text-xs text-neutral-600">Audio:</p>
                    <audio src={submission.audioUrl} controls className="w-full" />
                  </div>
                )}
              </div>
            )}

            {/* Grading Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Feedback * <span className="text-xs text-neutral-500">(Required)</span>
                </label>
                <textarea
                  {...register("feedback")}
                  rows={4}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter feedback for the student..."
                />
                {errors.feedback && (
                  <p className="mt-1 text-xs text-red-600">{errors.feedback.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Grade <span className="text-xs text-neutral-500">(Optional, 0-100)</span>
                </label>
                <input
                  {...register("grade", { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter grade (optional)"
                />
                {errors.grade && <p className="mt-1 text-xs text-red-600">{errors.grade.message}</p>}
                <p className="mt-1 text-xs text-neutral-500">
                  If no grade is provided, homework will be marked as "returned" instead of "graded".
                </p>
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
