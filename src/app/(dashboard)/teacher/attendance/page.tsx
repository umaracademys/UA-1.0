"use client";

import { useState, useEffect } from "react";
import { CheckInOutButton } from "@/components/modules/attendance/CheckInOutButton";
import { AttendanceCalendar } from "@/components/modules/attendance/AttendanceCalendar";
import { AttendanceStatistics } from "@/components/modules/attendance/AttendanceStatistics";
import { AttendanceTable } from "@/components/modules/attendance/AttendanceTable";
import { BulkAttendanceForm } from "@/components/modules/attendance/BulkAttendanceForm";
import { AttendanceDetailsModal } from "@/components/modules/attendance/AttendanceDetailsModal";
import { Plus } from "lucide-react";
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

type Student = {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
  };
};

export default function TeacherAttendancePage() {
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentAttendance, setStudentAttendance] = useState<Record<string, AttendanceRecord[]>>({});
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<{
    checkedIn: boolean;
    checkInTime?: Date | string;
    checkOutTime?: Date | string;
    hours?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get teacher ID first
      const userRes = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = userRes.data.user || userRes.data;
      const teacherId = user.teacherId?._id || user.teacherId;
      
      const [myAttendanceRes, studentsRes] = await Promise.all([
        axios.get("/api/attendance", {
          headers: { Authorization: `Bearer ${token}` },
          params: { userType: "teacher" },
        }),
        teacherId
          ? axios.get(`/api/teachers/${teacherId}/students`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          : axios.get("/api/students", {
              headers: { Authorization: `Bearer ${token}` },
            }),
      ]);

      setMyAttendance(myAttendanceRes.data.attendance || []);
      const studentsList = studentsRes.data.students || studentsRes.data.data || [];
      setStudents(studentsList);

      // Load attendance for each student
      const studentAttendanceMap: Record<string, AttendanceRecord[]> = {};
      for (const student of studentsList) {
        try {
          const attendanceRes = await axios.get(
            `/api/students/${student._id}/attendance`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          studentAttendanceMap[student._id] = attendanceRes.data.attendance || [];
        } catch (error) {
          console.error(`Failed to load attendance for student ${student._id}:`, error);
        }
      }
      setStudentAttendance(studentAttendanceMap);

      // Check current status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRecord = myAttendanceRes.data.attendance?.find(
        (r: AttendanceRecord) => new Date(r.date).toDateString() === today.toDateString(),
      );
      if (todayRecord) {
        setCurrentStatus({
          checkedIn: !!todayRecord.checkInTime && !todayRecord.checkOutTime,
          checkInTime: todayRecord.checkInTime,
          checkOutTime: todayRecord.checkOutTime,
        });
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    const response = await axios.post(
      "/api/attendance/check-in",
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    setCurrentStatus({
      checkedIn: true,
      checkInTime: response.data.attendance.checkInTime,
    });
    await loadData();
    return response.data.attendance;
  };

  const handleCheckOut = async () => {
    const response = await axios.post(
      "/api/attendance/check-out",
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const checkIn = currentStatus?.checkInTime
      ? new Date(currentStatus.checkInTime)
      : null;
    const checkOut = response.data.attendance.checkOutTime
      ? new Date(response.data.attendance.checkOutTime)
      : null;
    const hours = checkIn && checkOut ? (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) : undefined;
    setCurrentStatus({
      checkedIn: false,
      checkInTime: response.data.attendance.checkInTime,
      checkOutTime: response.data.attendance.checkOutTime,
      hours,
    });
    await loadData();
    return response.data.attendance;
  };

  const handleBulkSubmit = async (data: any) => {
    const response = await axios.post(
      "/api/attendance/bulk-record",
      {
        records: data.records.map((r: any) => ({
          userId: r.userId,
          userType: "student",
          date: data.date,
          status: r.status,
          notes: data.notes,
        })),
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    await loadData();
    return response.data.summary;
  };

  const handleDayClick = (date: Date) => {
    const record = myAttendance.find(
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Attendance</h1>
        <button
          onClick={() => setShowBulkForm(!showBulkForm)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Record Attendance
        </button>
      </div>

      {/* Check In/Out */}
      <div className="grid gap-6 md:grid-cols-2">
        <CheckInOutButton
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          currentStatus={currentStatus || undefined}
        />
        <AttendanceStatistics records={myAttendance} showPaidDays />
      </div>

      {/* Bulk Form */}
      {showBulkForm && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <BulkAttendanceForm
            students={students}
            onSubmit={handleBulkSubmit}
            onCancel={() => setShowBulkForm(false)}
          />
        </div>
      )}

      {/* My Attendance */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-neutral-900">My Attendance</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <AttendanceCalendar records={myAttendance} onDayClick={handleDayClick} />
          <AttendanceTable
            records={myAttendance}
            onView={(record) => {
              setSelectedRecord(record);
              setIsModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* Students Attendance */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-neutral-900">Students Attendance</h2>
        <div className="space-y-4">
          {students.map((student) => (
            <div key={student._id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="mb-3 text-lg font-semibold text-neutral-900">
                {student.userId.fullName}
              </h3>
              <AttendanceTable
                records={studentAttendance[student._id] || []}
                onView={(record) => {
                  setSelectedRecord(record);
                  setIsModalOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      </div>

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
