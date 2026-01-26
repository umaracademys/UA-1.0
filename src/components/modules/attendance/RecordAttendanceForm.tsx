"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

const attendanceSchema = z.object({
  userId: z.string().min(1, "User is required"),
  userType: z.enum(["teacher", "student"]),
  date: z.string().min(1, "Date is required"),
  shift: z.enum(["morning", "afternoon", "evening"]).optional(),
  status: z.enum(["present", "absent", "late", "excused"]),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.checkOutTime && !data.checkInTime) {
      return false;
    }
    if (data.checkInTime && data.checkOutTime) {
      const checkIn = new Date(data.checkInTime);
      const checkOut = new Date(data.checkOutTime);
      return checkOut > checkIn;
    }
    return true;
  },
  {
    message: "Check-out time must be after check-in time",
    path: ["checkOutTime"],
  },
);

type AttendanceFormData = z.infer<typeof attendanceSchema>;

type RecordAttendanceFormProps = {
  users: Array<{ _id: string; fullName: string; email: string; role: string }>;
  initialData?: Partial<AttendanceFormData>;
  onSubmit: (data: AttendanceFormData) => Promise<void>;
  onCancel?: () => void;
};

export function RecordAttendanceForm({
  users,
  initialData,
  onSubmit,
  onCancel,
}: RecordAttendanceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      userId: initialData?.userId || "",
      userType: initialData?.userType || "student",
      date: initialData?.date || new Date().toISOString().split("T")[0],
      shift: initialData?.shift || "morning",
      status: initialData?.status || "present",
      checkInTime: initialData?.checkInTime || "",
      checkOutTime: initialData?.checkOutTime || "",
      notes: initialData?.notes || "",
    },
  });

  const selectedUserType = watch("userType");
  const selectedStatus = watch("status");

  const handleFormSubmit = async (data: AttendanceFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast.success("Attendance recorded successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to record attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    if (selectedUserType === "teacher") {
      return user.role === "teacher";
    }
    return user.role === "student";
  });

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* User Type */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">User Type *</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="student"
              {...register("userType")}
              className="h-4 w-4 text-indigo-600"
            />
            <span className="text-sm text-neutral-700">Student</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="teacher"
              {...register("userType")}
              className="h-4 w-4 text-indigo-600"
            />
            <span className="text-sm text-neutral-700">Teacher</span>
          </label>
        </div>
      </div>

      {/* User Selector */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">User *</label>
        <select
          {...register("userId")}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Select {selectedUserType}</option>
          {filteredUsers.map((user) => (
            <option key={user._id} value={user._id}>
              {user.fullName} ({user.email})
            </option>
          ))}
        </select>
        {errors.userId && <p className="mt-1 text-xs text-red-600">{errors.userId.message}</p>}
      </div>

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

      {/* Status */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Status *</label>
        <div className="grid grid-cols-2 gap-2">
          {(["present", "absent", "late", "excused"] as const).map((status) => (
            <label
              key={status}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 ${
                selectedStatus === status
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              <input
                type="radio"
                value={status}
                {...register("status")}
                className="h-4 w-4 text-indigo-600"
              />
              <span className="text-sm font-medium capitalize text-neutral-700">{status}</span>
            </label>
          ))}
        </div>
        {errors.status && <p className="mt-1 text-xs text-red-600">{errors.status.message}</p>}
      </div>

      {/* Shift (if present) */}
      {selectedStatus === "present" && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Shift</label>
          <select
            {...register("shift")}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
          </select>
        </div>
      )}

      {/* Check-In Time */}
      {selectedStatus === "present" && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Check-In Time</label>
          <input
            type="datetime-local"
            {...register("checkInTime")}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {errors.checkInTime && (
            <p className="mt-1 text-xs text-red-600">{errors.checkInTime.message}</p>
          )}
        </div>
      )}

      {/* Check-Out Time */}
      {selectedStatus === "present" && watch("checkInTime") && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Check-Out Time</label>
          <input
            type="datetime-local"
            {...register("checkOutTime")}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {errors.checkOutTime && (
            <p className="mt-1 text-xs text-red-600">{errors.checkOutTime.message}</p>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Notes</label>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="Add any additional notes..."
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

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
          disabled={isSubmitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? "Recording..." : "Record Attendance"}
        </button>
      </div>
    </form>
  );
}
