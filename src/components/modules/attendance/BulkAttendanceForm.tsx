"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";

const bulkAttendanceSchema = z.object({
  date: z.string().min(1, "Date is required"),
  records: z
    .array(
      z.object({
        userId: z.string(),
        status: z.enum(["present", "absent", "late", "excused"]),
      }),
    )
    .min(1, "At least one student must be selected"),
  notes: z.string().optional(),
});

type BulkAttendanceFormData = z.infer<typeof bulkAttendanceSchema>;

type Student = {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
  };
};

type BulkAttendanceFormProps = {
  students: Student[];
  onSubmit: (data: BulkAttendanceFormData) => Promise<{ created: number; errors: number }>;
  onCancel?: () => void;
};

export function BulkAttendanceForm({
  students,
  onSubmit,
  onCancel,
}: BulkAttendanceFormProps) {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: number } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BulkAttendanceFormData>({
    resolver: zodResolver(bulkAttendanceSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      records: [],
      notes: "",
    },
  });

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
      const newStatuses = { ...statuses };
      delete newStatuses[studentId];
      setStatuses(newStatuses);
    } else {
      newSelected.add(studentId);
      setStatuses((prev) => ({ ...prev, [studentId]: "present" }));
    }
    setSelectedStudents(newSelected);
  };

  const markAll = (status: "present" | "absent" | "late" | "excused") => {
    const newStatuses: Record<string, typeof status> = {};
    selectedStudents.forEach((id) => {
      newStatuses[id] = status;
    });
    setStatuses(newStatuses);
  };

  const handleFormSubmit = async (data: BulkAttendanceFormData) => {
    if (selectedStudents.size === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setIsSubmitting(true);
    try {
      const records = Array.from(selectedStudents).map((userId) => ({
        userId,
        status: statuses[userId] || "present",
      }));

      const submitData = {
        ...data,
        records,
      };

      const result = await onSubmit(submitData);
      setResult(result);
      toast.success(`Attendance recorded for ${result.created} student(s)`);
      if (result.errors > 0) {
        toast.error(`${result.errors} record(s) failed`);
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to record attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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

      {/* Quick Actions */}
      {selectedStudents.size > 0 && (
        <div className="flex gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <span className="text-sm font-medium text-neutral-700">Quick Actions:</span>
          <button
            type="button"
            onClick={() => markAll("present")}
            className="rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => markAll("absent")}
            className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            Mark All Absent
          </button>
          <button
            type="button"
            onClick={() => markAll("late")}
            className="rounded-md bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-200"
          >
            Mark All Late
          </button>
        </div>
      )}

      {/* Students List */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          Students ({selectedStudents.size} selected)
        </label>
        <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-3">
          {students.map((student) => {
            const isSelected = selectedStudents.has(student._id);
            return (
              <div
                key={student._id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  isSelected ? "border-indigo-500 bg-indigo-50" : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleStudent(student._id)}
                  className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">
                    {student.userId.fullName}
                  </p>
                  <p className="text-xs text-neutral-500">{student.userId.email}</p>
                </div>
                {isSelected && (
                  <select
                    value={statuses[student._id] || "present"}
                    onChange={(e) =>
                      setStatuses((prev) => ({
                        ...prev,
                        [student._id]: e.target.value as typeof statuses[string],
                      }))
                    }
                    className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>
                )}
              </div>
            );
          })}
        </div>
        {errors.records && (
          <p className="mt-1 text-xs text-red-600">{errors.records.message}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Notes (Optional)</label>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="Add notes for all records..."
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Result Summary */}
      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-green-800">
              Successfully recorded {result.created} attendance record(s)
            </p>
          </div>
          {result.errors > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <X className="h-4 w-4 text-red-600" />
              <p className="text-xs text-red-700">{result.errors} record(s) failed</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || selectedStudents.size === 0}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? "Recording..." : `Record Attendance (${selectedStudents.size})`}
        </button>
      </div>
    </form>
  );
}
