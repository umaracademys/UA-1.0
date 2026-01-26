"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { AssignStudentModal } from "@/components/modules/users/AssignStudentModal";

type TeacherRow = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  specialization?: string;
  assignedStudentCount: number;
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRow | null>(null);
  const [filters, setFilters] = useState({
    specialization: "",
    status: "all",
    search: "",
  });

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to view teachers.");
        return;
      }
      const response = await fetch("/api/teachers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load teachers.");

      const mapped = (data.data ?? []).map((teacher: any) => ({
        id: teacher._id ?? teacher.id,
        fullName: teacher.userId?.fullName ?? "—",
        email: teacher.userId?.email ?? "—",
        status: teacher.status,
        specialization: teacher.specialization,
        assignedStudentCount: teacher.assignedStudentCount ?? 0,
      }));
      setTeachers(mapped);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load teachers.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch("/api/students", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.data) {
        setStudents(
          data.data.map((student: any) => ({
            id: student._id ?? student.id,
            name: student.userId?.fullName ?? "Student",
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load students:", error);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchStudents();
  }, [fetchTeachers, fetchStudents]);

  const [currentStudentIds, setCurrentStudentIds] = useState<string[]>([]);

  const handleAssignStudents = async (teacher: TeacherRow) => {
    setSelectedTeacher(teacher);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to view assigned students.");
        return;
      }
      const response = await fetch(`/api/teachers/${teacher.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.data?.assignedStudents) {
        setCurrentStudentIds(
          data.data.assignedStudents.map((s: any) => s._id ?? s.id),
        );
      } else {
        setCurrentStudentIds([]);
      }
      setAssignModalOpen(true);
    } catch (error) {
      console.error("Failed to load assigned students:", error);
      setCurrentStudentIds([]);
      setAssignModalOpen(true);
    }
  };

  const handleSaveStudents = async (studentIds: string[]) => {
    if (!selectedTeacher) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to assign students.");
        return;
      }

      const response = await fetch(`/api/teachers/${selectedTeacher.id}/assign-students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentIds }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to assign students.");
      }

      // Refresh teachers list
      await fetchTeachers();
      toast.success("Students assigned successfully.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to assign students.");
      throw error;
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      if (filters.status !== "all" && teacher.status !== filters.status) return false;
      if (filters.specialization && !teacher.specialization?.toLowerCase().includes(filters.specialization.toLowerCase())) {
        return false;
      }
      if (filters.search) {
        const term = filters.search.toLowerCase();
        return (
          teacher.fullName.toLowerCase().includes(term) ||
          teacher.email.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [teachers, filters]);

  return (
    <PermissionGuard permission="users.view" fallback={<div className="p-6">Unauthorized</div>}>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Teacher Management</h1>
            <p className="text-sm text-neutral-500">Monitor workload and teacher activity.</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600">
              View Schedule
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 rounded-lg border border-neutral-200 bg-white p-4">
          <div>
            <label className="text-xs font-medium text-neutral-500">Specialization</label>
            <input
              className="mt-1 rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={filters.specialization}
              onChange={(event) => setFilters((prev) => ({ ...prev, specialization: event.target.value }))}
              placeholder="e.g. Tajweed"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">Status</label>
            <select
              className="mt-1 rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-neutral-500">Search</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              placeholder="Search by name or email"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Teacher</th>
                <th className="px-4 py-3 text-left font-semibold">Specialization</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Student Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                    Loading teachers...
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                    No teachers found.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{teacher.fullName}</p>
                      <p className="text-xs text-neutral-500">{teacher.email}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{teacher.specialization ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{teacher.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-600">{teacher.assignedStudentCount}</span>
                        <button
                          onClick={() => handleAssignStudents(teacher)}
                          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-dark"
                        >
                          Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedTeacher && (
          <AssignStudentModal
            open={assignModalOpen}
            onClose={() => {
              setAssignModalOpen(false);
              setSelectedTeacher(null);
            }}
            teacherName={selectedTeacher.fullName}
            students={students}
            currentStudentIds={currentStudentIds}
            onSave={handleSaveStudents}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
