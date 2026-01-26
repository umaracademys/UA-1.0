"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { AssignTeacherModal } from "@/components/modules/users/AssignTeacherModal";
import type { ProgramType } from "@/types";

type StudentRow = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  programType?: ProgramType;
  assignedTeachers: Array<{ id: string; name: string }>;
};

const programOptions: ProgramType[] = ["Full-Time HQ", "Part-Time HQ", "After School"];

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [filters, setFilters] = useState({
    programType: "all",
    status: "all",
    teacherId: "all",
    search: "",
  });

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to view students.");
        return;
      }
      const params = new URLSearchParams();
      if (filters.programType !== "all") params.set("programType", filters.programType);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.teacherId !== "all") params.set("teacherId", filters.teacherId);
      if (filters.search) params.set("search", filters.search);

      const response = await fetch(`/api/students?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load students.");

      const mapped = (data.data ?? []).map((student: any) => ({
        id: student._id ?? student.id,
        fullName: student.userId?.fullName ?? "—",
        email: student.userId?.email ?? "—",
        status: student.status,
        programType: student.programType,
        assignedTeachers:
          student.assignedTeachers?.map((teacher: any) => ({
            id: teacher._id ?? teacher.id,
            name: teacher.userId?.fullName ?? "Teacher",
          })) ?? [],
      }));

      setStudents(mapped);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchTeachers = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch("/api/teachers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.data) {
        setTeachers(
          data.data.map((teacher: any) => ({
            id: teacher._id ?? teacher.id,
            name: teacher.userId?.fullName ?? "Teacher",
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load teachers:", error);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchTeachers();
  }, [fetchStudents, fetchTeachers]);

  const handleAssignTeachers = (student: StudentRow) => {
    setSelectedStudent(student);
    setAssignModalOpen(true);
  };

  const handleSaveTeachers = async (teacherIds: string[]) => {
    if (!selectedStudent) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to assign teachers.");
        return;
      }

      // Remove all existing teachers first, then add new ones
      // For simplicity, we'll add teachers one by one (the API uses $addToSet so duplicates are avoided)
      for (const teacherId of teacherIds) {
        const response = await fetch(`/api/students/${selectedStudent.id}/assign-teacher`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ teacherId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to assign teacher.");
        }
      }

      // Refresh students list
      await fetchStudents();
      toast.success("Teachers assigned successfully.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to assign teachers.");
      throw error;
    }
  };

  const stats = useMemo(() => {
    return {
      total: students.length,
      active: students.filter((student) => student.status === "active").length,
      pending: students.filter((student) => student.status === "pending").length,
    };
  }, [students]);

  return (
    <PermissionGuard permission="users.view" fallback={<div className="p-6">Unauthorized</div>}>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Student Management</h1>
            <p className="text-sm text-neutral-500">View and manage enrolled students.</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600">
              Bulk Assign Teachers
            </button>
            <button className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600">
              Export List
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">Total Students</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">Active Students</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{stats.active}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">Pending Students</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{stats.pending}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 rounded-lg border border-neutral-200 bg-white p-4">
          <div>
            <label className="text-xs font-medium text-neutral-500">Program</label>
            <select
              className="mt-1 rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={filters.programType}
              onChange={(event) => setFilters((prev) => ({ ...prev, programType: event.target.value }))}
            >
              <option value="all">All</option>
              {programOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
              <option value="pending">Pending</option>
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
                <th className="px-4 py-3 text-left font-semibold">Student</th>
                <th className="px-4 py-3 text-left font-semibold">Program</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Assigned Teachers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{student.fullName}</p>
                      <p className="text-xs text-neutral-500">{student.email}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{student.programType ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{student.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-600">{student.assignedTeachers.length}</span>
                        <button
                          onClick={() => handleAssignTeachers(student)}
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

        {selectedStudent && (
          <AssignTeacherModal
            open={assignModalOpen}
            onClose={() => {
              setAssignModalOpen(false);
              setSelectedStudent(null);
            }}
            studentName={selectedStudent.fullName}
            teachers={teachers}
            currentTeacherIds={selectedStudent.assignedTeachers.map((t) => t.id)}
            onSave={handleSaveTeachers}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
