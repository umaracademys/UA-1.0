"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import toast from "react-hot-toast";

const reportSchema = z.object({
  date: z.string().min(1, "Date is required"),
  summary: z.string().min(1, "Summary is required"),
  studentsAttended: z.array(z.string()).min(1, "At least one student must be selected"),
  topicsCovered: z.string().optional(),
  notes: z.string().optional(),
});

type PairDailyReportFormData = z.infer<typeof reportSchema>;

type Student = {
  _id: string;
  userId: {
    fullName: string;
  };
};

type PairDailyReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSubmit: (data: PairDailyReportFormData) => Promise<void>;
  initialDate?: Date;
};

export function PairDailyReportModal({
  isOpen,
  onClose,
  students,
  onSubmit,
  initialDate,
}: PairDailyReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<PairDailyReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      date: initialDate
        ? initialDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      summary: "",
      studentsAttended: [],
      topicsCovered: "",
      notes: "",
    },
  });

  const selectedStudents = watch("studentsAttended") || [];

  const toggleStudent = (studentId: string) => {
    const current = selectedStudents;
    if (current.includes(studentId)) {
      setValue(
        "studentsAttended",
        current.filter((id) => id !== studentId),
      );
    } else {
      setValue("studentsAttended", [...current, studentId]);
    }
  };

  const handleFormSubmit = async (data: PairDailyReportFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast.success("Daily report submitted successfully");
      reset();
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">Submit Pair Daily Report</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="max-h-[70vh] overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Date *</label>
              <input
                type="date"
                {...register("date")}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
            </div>

            {/* Summary */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Summary *</label>
              <textarea
                {...register("summary")}
                rows={4}
                placeholder="Brief summary of today's session..."
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {errors.summary && (
                <p className="mt-1 text-xs text-red-600">{errors.summary.message}</p>
              )}
            </div>

            {/* Students Attended */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Students Attended * ({selectedStudents.length} selected)
              </label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-3">
                {students.map((student) => (
                  <label
                    key={student._id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 ${
                      selectedStudents.includes(student._id)
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student._id)}
                      onChange={() => toggleStudent(student._id)}
                      className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-neutral-900">{student.userId.fullName}</span>
                  </label>
                ))}
              </div>
              {errors.studentsAttended && (
                <p className="mt-1 text-xs text-red-600">{errors.studentsAttended.message}</p>
              )}
            </div>

            {/* Topics Covered */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Topics Covered</label>
              <textarea
                {...register("topicsCovered")}
                rows={3}
                placeholder="List topics covered in today's session..."
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Additional Notes</label>
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Any additional notes or observations..."
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
