"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";
import toast from "react-hot-toast";
import { AttendanceStatistics } from "./AttendanceStatistics";
import { AttendanceTable } from "./AttendanceTable";

type AttendanceRecord = {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
  };
  date: Date | string;
  status: "present" | "absent" | "late" | "excused";
  checkInTime?: Date | string;
  checkOutTime?: Date | string;
  notes?: string;
};

type AttendanceReportProps = {
  users: Array<{ _id: string; fullName: string; email: string; role: string }>;
  onGenerate: (filters: {
    userIds?: string[];
    userType?: "teacher" | "student";
    dateFrom: string;
    dateTo: string;
  }) => Promise<{
    records: AttendanceRecord[];
    summary: {
      totalRecords: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      attendanceRate: number;
    };
  }>;
  onExport?: (format: "csv" | "excel" | "pdf", filters: any) => Promise<void>;
};

export function AttendanceReport({ users, onGenerate, onExport }: AttendanceReportProps) {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedUserType, setSelectedUserType] = useState<"teacher" | "student" | "all">("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<{
    records: AttendanceRecord[];
    summary: any;
  } | null>(null);

  const filteredUsers = users.filter((user) => {
    if (selectedUserType === "all") return true;
    return user.role === selectedUserType;
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const filters = {
        dateFrom,
        dateTo,
        userType: selectedUserType !== "all" ? selectedUserType : undefined,
        userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      };
      const data = await onGenerate(filters);
      setReportData(data);
      toast.success("Report generated successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    if (!reportData) {
      toast.error("Please generate a report first");
      return;
    }

    try {
      const filters = {
        dateFrom,
        dateTo,
        userType: selectedUserType !== "all" ? selectedUserType : undefined,
        userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
        format,
      };
      await onExport?.(format, filters);
      toast.success(`Exporting ${format.toUpperCase()}...`);
    } catch (error) {
      toast.error((error as Error).message || "Failed to export");
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Generate Report</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Date Range */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* User Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">User Type</label>
            <select
              value={selectedUserType}
              onChange={(e) => {
                setSelectedUserType(e.target.value as typeof selectedUserType);
                setSelectedUserIds([]);
              }}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All</option>
              <option value="teacher">Teachers</option>
              <option value="student">Students</option>
            </select>
          </div>

          {/* Users */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Users (Optional)
            </label>
            <select
              multiple
              value={selectedUserIds}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, (option) => option.value);
                setSelectedUserIds(values);
              }}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              size={5}
            >
              {filteredUsers.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.fullName} ({user.email})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">Hold Ctrl/Cmd to select multiple</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </button>
          {reportData && onExport && (
            <div className="flex gap-2">
              <button
                onClick={() => handleExport("csv")}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <FileText className="h-4 w-4" />
                CSV
              </button>
              <button
                onClick={() => handleExport("excel")}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </button>
              <button
                onClick={() => handleExport("pdf")}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <File className="h-4 w-4" />
                PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Summary</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div>
                <p className="text-xs font-medium text-neutral-600">Total Records</p>
                <p className="mt-1 text-xl font-bold text-neutral-900">{reportData.summary.totalRecords}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-green-700">Present</p>
                <p className="mt-1 text-xl font-bold text-green-900">{reportData.summary.present}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-red-700">Absent</p>
                <p className="mt-1 text-xl font-bold text-red-900">{reportData.summary.absent}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-yellow-700">Late</p>
                <p className="mt-1 text-xl font-bold text-yellow-900">{reportData.summary.late}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-indigo-700">Attendance Rate</p>
                <p className="mt-1 text-xl font-bold text-indigo-900">
                  {reportData.summary.attendanceRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <AttendanceStatistics records={reportData.records} />

          {/* Detailed Table */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Detailed Records</h3>
            <AttendanceTable records={reportData.records} showUser />
          </div>
        </div>
      )}
    </div>
  );
}
