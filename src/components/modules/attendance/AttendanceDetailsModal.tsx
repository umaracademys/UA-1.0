"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X, Edit, Trash2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

const editSchema = z.object({
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

type AttendanceRecord = {
  _id: string;
  userId: {
    fullName: string;
    email: string;
  };
  date: Date | string;
  status: "present" | "absent" | "late" | "excused";
  shift?: "morning" | "afternoon" | "evening";
  checkInTime?: Date | string;
  checkOutTime?: Date | string;
  notes?: string;
  markedBy?: {
    fullName: string;
  };
};

type AttendanceDetailsModalProps = {
  record: AttendanceRecord;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: z.infer<typeof editSchema>) => Promise<void>;
  onDelete?: () => Promise<void>;
  canEdit?: boolean;
  canDelete?: boolean;
};

const statusColors = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-yellow-100 text-yellow-700",
  excused: "bg-blue-100 text-blue-700",
};

export function AttendanceDetailsModal({
  record,
  isOpen,
  onClose,
  onSave,
  onDelete,
  canEdit = false,
  canDelete = false,
}: AttendanceDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      status: record.status,
      checkInTime: record.checkInTime
        ? format(new Date(record.checkInTime), "yyyy-MM-dd'T'HH:mm")
        : "",
      checkOutTime: record.checkOutTime
        ? format(new Date(record.checkOutTime), "yyyy-MM-dd'T'HH:mm")
        : "",
      notes: record.notes || "",
    },
  });

  if (!isOpen) return null;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    reset();
  };

  const handleSave = async (data: z.infer<typeof editSchema>) => {
    if (!onSave) return;

    try {
      await onSave(data);
      setIsEditing(false);
      toast.success("Attendance updated successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to update attendance");
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm("Are you sure you want to delete this attendance record?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete();
      toast.success("Attendance deleted successfully");
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete attendance");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">Attendance Details</h2>
          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={handleEdit}
                className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          {isEditing ? (
            <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
              {/* Status */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Status *</label>
                <select
                  {...register("status")}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-xs text-red-600">{errors.status.message}</p>
                )}
              </div>

              {/* Check-In Time */}
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

              {/* Check-Out Time */}
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

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Notes</label>
                <textarea
                  {...register("notes")}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* User Info */}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-medium text-neutral-600">User</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">{record.userId.fullName}</p>
                <p className="text-xs text-neutral-500">{record.userId.email}</p>
              </div>

              {/* Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-medium text-neutral-600">Date</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {format(new Date(record.date), "MMM dd, yyyy")}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-medium text-neutral-600">Status</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColors[record.status]}`}
                  >
                    {record.status}
                  </span>
                </div>
              </div>

              {/* Times */}
              {(record.checkInTime || record.checkOutTime) && (
                <div className="grid grid-cols-2 gap-4">
                  {record.checkInTime && (
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-xs font-medium text-neutral-600">Check-In</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {format(new Date(record.checkInTime), "h:mm a")}
                      </p>
                    </div>
                  )}
                  {record.checkOutTime && (
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-xs font-medium text-neutral-600">Check-Out</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {format(new Date(record.checkOutTime), "h:mm a")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {record.notes && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-medium text-neutral-600">Notes</p>
                  <p className="mt-1 text-sm text-neutral-900 whitespace-pre-wrap">{record.notes}</p>
                </div>
              )}

              {/* Marked By */}
              {record.markedBy && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-medium text-neutral-600">Marked By</p>
                  <p className="mt-1 text-sm text-neutral-900">{record.markedBy.fullName}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
