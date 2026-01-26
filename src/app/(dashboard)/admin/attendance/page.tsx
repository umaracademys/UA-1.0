"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { AttendanceTable } from "@/components/modules/attendance/AttendanceTable";
import { AttendanceStatistics } from "@/components/modules/attendance/AttendanceStatistics";
import { AttendanceReport } from "@/components/modules/attendance/AttendanceReport";
import { RecordAttendanceForm } from "@/components/modules/attendance/RecordAttendanceForm";
import { AttendanceDetailsModal } from "@/components/modules/attendance/AttendanceDetailsModal";
import { Plus, Download } from "lucide-react";
import axios from "axios";

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
  markedBy?: {
    fullName: string;
  };
};

type User = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
};

export default function AdminAttendancePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "teachers" | "students">("overview");
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, dateFrom, dateTo, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (statusFilter) params.status = statusFilter;

      const [attendanceRes, teachersRes, studentsRes] = await Promise.all([
        axios.get("/api/attendance", {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }),
        axios.get("/api/teachers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("/api/students", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setAllAttendance(attendanceRes.data.attendance || []);
      setTeachers(teachersRes.data.teachers || []);
      setStudents(studentsRes.data.students || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordSubmit = async (data: any) => {
    await axios.post(
      "/api/attendance",
      {
        ...data,
        checkInTime: data.checkInTime || undefined,
        checkOutTime: data.checkOutTime || undefined,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    setShowRecordForm(false);
    await loadData();
  };

  const handleGenerateReport = async (filters: any) => {
    const response = await axios.post(
      "/api/attendance/report",
      filters,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data.report;
  };

  const handleExport = async (format: "csv" | "excel" | "pdf", filters: any) => {
    const response = await axios.post(
      "/api/attendance/export",
      { ...filters, format },
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: format === "csv" ? "blob" : "json",
      },
    );

    if (format === "csv") {
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${Date.now()}.csv`;
      a.click();
    } else {
      // Handle Excel/PDF export
      console.log("Export data:", response.data);
    }
  };

  const handleSave = async (data: any) => {
    if (!selectedRecord) return;
    await axios.patch(
      `/api/attendance/${selectedRecord._id}`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    setIsModalOpen(false);
    await loadData();
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    await axios.delete(`/api/attendance/${selectedRecord._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setIsModalOpen(false);
    await loadData();
  };

  const teacherIds = new Set(teachers.map((t) => t._id));
  const studentIds = new Set(students.map((s) => s._id));
  const teacherAttendance = allAttendance.filter((r) => teacherIds.has(r.userId._id));
  const studentAttendance = allAttendance.filter((r) => studentIds.has(r.userId._id));

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Attendance Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRecordForm(!showRecordForm)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Record Attendance
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-4">
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
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="excused">Excused</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setStatusFilter("");
            }}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Record Form */}
      {showRecordForm && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <RecordAttendanceForm
            users={[...teachers, ...students]}
            onSubmit={handleRecordSubmit}
            onCancel={() => setShowRecordForm(false)}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex space-x-8">
          {(["overview", "teachers", "students"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-4 text-sm font-medium capitalize ${
                activeTab === tab
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <AttendanceStatistics records={allAttendance} />
          <AttendanceTable
            records={allAttendance}
            showUser
            onView={(record) => {
              setSelectedRecord(record);
              setIsModalOpen(true);
            }}
            canEdit
            canDelete
          />
          <AttendanceReport
            users={[...teachers, ...students]}
            onGenerate={handleGenerateReport}
            onExport={handleExport}
          />
        </div>
      )}

      {activeTab === "teachers" && (
        <div className="space-y-6">
          <AttendanceStatistics records={teacherAttendance} showPaidDays />
          <AttendanceTable
            records={teacherAttendance}
            showUser
            onView={(record) => {
              setSelectedRecord(record);
              setIsModalOpen(true);
            }}
            canEdit
            canDelete
          />
        </div>
      )}

      {activeTab === "students" && (
        <div className="space-y-6">
          <AttendanceStatistics records={studentAttendance} />
          <AttendanceTable
            records={studentAttendance}
            showUser
            onView={(record) => {
              setSelectedRecord(record);
              setIsModalOpen(true);
            }}
            canEdit
            canDelete
          />
        </div>
      )}

      {/* Details Modal */}
      {selectedRecord && (
        <AttendanceDetailsModal
          record={selectedRecord}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRecord(null);
          }}
          onSave={handleSave}
          onDelete={handleDelete}
          canEdit
          canDelete
        />
      )}
    </div>
  );
}
