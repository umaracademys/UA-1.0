"use client";

import { useState, useEffect } from "react";
import { AttendanceCalendar } from "@/components/modules/attendance/AttendanceCalendar";
import { AttendanceStatistics } from "@/components/modules/attendance/AttendanceStatistics";
import { AttendanceTable } from "@/components/modules/attendance/AttendanceTable";
import { AttendanceDetailsModal } from "@/components/modules/attendance/AttendanceDetailsModal";
import { Calendar } from "lucide-react";
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

export default function StudentAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (token) {
      loadAttendance();
    }
  }, [token]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/attendance", {
        headers: { Authorization: `Bearer ${token}` },
        params: { userType: "student" },
      });
      setAttendance(response.data.attendance || []);
    } catch (error) {
      console.error("Failed to load attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (date: Date) => {
    const record = attendance.find(
      (r) => new Date(r.date).toDateString() === date.toDateString(),
    );
    if (record) {
      setSelectedRecord(record);
      setIsModalOpen(true);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const excusedAbsences = attendance.filter((r) => r.status === "excused");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">My Attendance</h1>
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Calendar className="h-4 w-4" />
          <span>View your attendance history</span>
        </div>
      </div>

      {/* Statistics */}
      <AttendanceStatistics records={attendance} />

      {/* Calendar and Table */}
      <div className="grid gap-6 md:grid-cols-2">
        <AttendanceCalendar records={attendance} onDayClick={handleDayClick} />
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900">Recent Records</h2>
          <AttendanceTable
            records={attendance.slice(0, 10)}
            onView={(record) => {
              setSelectedRecord(record);
              setIsModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* Excused Absences */}
      {excusedAbsences.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h2 className="mb-3 text-lg font-semibold text-blue-900">Excused Absences</h2>
          <div className="space-y-2">
            {excusedAbsences.map((record) => (
              <div
                key={record._id}
                className="rounded-lg border border-blue-200 bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {new Date(record.date).toLocaleDateString()}
                    </p>
                    {record.notes && (
                      <p className="mt-1 text-xs text-neutral-600">{record.notes}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    Excused
                  </span>
                </div>
              </div>
            ))}
          </div>
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
          canEdit={false}
          canDelete={false}
        />
      )}
    </div>
  );
}
