"use client";

import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

type LessonCompletionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  studentId: string;
  lessonId: string;
  lessonTitle: string;
  studentName: string;
};

export function LessonCompletionModal({
  isOpen,
  onClose,
  onSuccess,
  studentId,
  lessonId,
  lessonTitle,
  studentName,
}: LessonCompletionModalProps) {
  const [score, setScore] = useState<number>(100);
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [approved, setApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (score < 0 || score > 100) {
      toast.error("Score must be between 0 and 100");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `/api/students/${studentId}/qaidah-progress/complete-lesson`,
        {
          lessonId,
          score,
          teacherFeedback: teacherFeedback || undefined,
          approved,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      toast.success(approved ? "Lesson completed and approved" : "Lesson marked as complete");
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to complete lesson");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setScore(100);
    setTeacherFeedback("");
    setApproved(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-neutral-900">Mark Lesson Complete</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4">
            <p className="text-sm text-neutral-600">Student</p>
            <p className="font-medium text-neutral-900">{studentName}</p>
          </div>

          <div className="mb-4">
            <p className="text-sm text-neutral-600">Lesson</p>
            <p className="font-medium text-neutral-900">{lessonTitle}</p>
          </div>

          {/* Score */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Score (0-100) *
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          {/* Teacher Feedback */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Teacher Feedback
            </label>
            <textarea
              value={teacherFeedback}
              onChange={(e) => setTeacherFeedback(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Provide feedback for the student..."
            />
          </div>

          {/* Approve */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="approve"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="approve" className="text-sm font-medium text-neutral-700">
              Approve and advance to next lesson
            </label>
          </div>

          {approved && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-700">
                If approved, the student will automatically advance to the next lesson.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? "Submitting..." : "Mark Complete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
