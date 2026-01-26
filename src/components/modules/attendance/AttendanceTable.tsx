"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Edit, Trash2, Eye } from "lucide-react";

type AttendanceRecord = {
  _id: string;
  userId: {
    _id: string;
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

type AttendanceTableProps = {
  records: AttendanceRecord[];
  onEdit?: (record: AttendanceRecord) => void;
  onDelete?: (recordId: string) => void;
  onView?: (record: AttendanceRecord) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  showUser?: boolean;
};

const statusColors = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-yellow-100 text-yellow-700",
  excused: "bg-blue-100 text-blue-700",
};

function calculateHours(checkIn?: Date | string, checkOut?: Date | string): string {
  if (!checkIn || !checkOut) return "-";
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return `${hours.toFixed(1)}h`;
}

export function AttendanceTable({
  records,
  onEdit,
  onDelete,
  onView,
  canEdit = false,
  canDelete = false,
  showUser = false,
}: AttendanceTableProps) {
  const [sortBy, setSortBy] = useState<"date" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortedRecords = [...records].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "date") {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else {
      comparison = a.status.localeCompare(b.status);
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: "date" | "status") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <p className="text-neutral-500">No attendance records found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full">
        <thead className="bg-neutral-50">
          <tr>
            {showUser && (
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                User
              </th>
            )}
            <th
              className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
              onClick={() => handleSort("date")}
            >
              <div className="flex items-center gap-1">
                Date
                {sortBy === "date" && (
                  <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Day
            </th>
            <th
              className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
              onClick={() => handleSort("status")}
            >
              <div className="flex items-center gap-1">
                Status
                {sortBy === "status" && (
                  <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Check-In
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Check-Out
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Hours
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Notes
            </th>
            {(canEdit || canDelete || onView) && (
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 bg-white">
          {sortedRecords.map((record) => (
            <tr key={record._id} className="hover:bg-neutral-50">
              {showUser && (
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-neutral-900">{record.userId.fullName}</p>
                    <p className="text-xs text-neutral-500">{record.userId.email}</p>
                  </div>
                </td>
              )}
              <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-900">
                {format(new Date(record.date), "MMM dd, yyyy")}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                {format(new Date(record.date), "EEE")}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColors[record.status]}`}
                >
                  {record.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                {record.checkInTime
                  ? format(new Date(record.checkInTime), "h:mm a")
                  : "-"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                {record.checkOutTime
                  ? format(new Date(record.checkOutTime), "h:mm a")
                  : "-"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                {calculateHours(record.checkInTime, record.checkOutTime)}
              </td>
              <td className="px-4 py-3 text-sm text-neutral-600">
                {record.notes ? (
                  <span className="line-clamp-1 max-w-xs">{record.notes}</span>
                ) : (
                  "-"
                )}
              </td>
              {(canEdit || canDelete || onView) && (
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {onView && (
                      <button
                        onClick={() => onView(record)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {canEdit && onEdit && (
                      <button
                        onClick={() => onEdit(record)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && onDelete && (
                      <button
                        onClick={() => onDelete(record._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
