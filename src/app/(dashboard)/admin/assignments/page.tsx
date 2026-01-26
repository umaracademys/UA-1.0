"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useState, useEffect } from "react";
import { BookOpen, FileText, TrendingUp, Download } from "lucide-react";
import { AssignmentList } from "@/components/modules/assignments/AssignmentList";
import { AssignmentDetailsModal } from "@/components/modules/assignments/AssignmentDetailsModal";
import { CreateAssignmentModal } from "@/components/modules/assignments/CreateAssignmentModal";
import type { AssignmentCardData } from "@/components/modules/assignments/AssignmentCard";
import toast from "react-hot-toast";

type StudentOption = {
  id: string;
  name: string;
  email: string;
};

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentCardData[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentCardData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    archived: 0,
  });
  const [studentFilter, setStudentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchAssignments();
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [studentFilter, statusFilter]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (studentFilter !== "all") params.append("studentId", studentFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`/api/assignments?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        const formattedAssignments: AssignmentCardData[] = (result.data || []).map((a: any) => ({
          _id: a._id,
          studentId: a.studentId,
          studentName: a.studentName,
          assignedBy: a.assignedBy,
          assignedByName: a.assignedByName,
          assignedByRole: a.assignedByRole,
          status: a.status || "active",
          classwork: a.classwork,
          homework: a.homework,
          comment: a.comment,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        }));
        setAssignments(formattedAssignments);
        calculateStats(formattedAssignments);
      } else {
        toast.error(result.message || "Failed to load assignments");
      }
    } catch (error) {
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/students", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        const studentsList = result.data || result.students || [];
        const formattedStudents: StudentOption[] = studentsList.map((s: any) => ({
          id: s._id,
          name: s.userId?.fullName || "Unknown",
          email: s.userId?.email || "",
        }));
        setStudents(formattedStudents);
      }
    } catch (error) {
      console.error("Failed to load students");
    }
  };

  const calculateStats = (assignments: AssignmentCardData[]) => {
    const total = assignments.length;
    const active = assignments.filter((a) => a.status === "active").length;
    const completed = assignments.filter((a) => a.status === "completed").length;
    const archived = assignments.filter((a) => a.status === "archived").length;

    setStats({ total, active, completed, archived });
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    toast("Export functionality coming soon", { icon: "ℹ️" });
  };

  const handleAssignmentClick = (assignment: AssignmentCardData) => {
    setSelectedAssignment(assignment);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">All Assignments</h1>
          <p className="mt-1 text-sm text-neutral-600">Overview of all assignments in the system</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            Create Assignment
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Total Assignments</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.total}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 text-blue-700">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Active</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.active}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 text-green-700">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Completed</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.completed}</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Archived</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.archived}</p>
            </div>
            <div className="rounded-full bg-gray-100 p-3 text-gray-700">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Student</label>
          <select
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
          >
            <option value="all">All Students</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Assignments List */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <AssignmentList
          assignments={assignments}
          userRole="admin"
          loading={loading}
          onAssignmentClick={handleAssignmentClick}
        />
      </div>

      {/* Modals */}
      {isCreateOpen && (
        <CreateAssignmentModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          students={students}
          onSuccess={fetchAssignments}
        />
      )}

      {/* Details Modal */}
      {selectedAssignment && (
        <AssignmentDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment}
          userRole="admin"
          onRefresh={fetchAssignments}
        />
      )}
    </div>
  );
}
