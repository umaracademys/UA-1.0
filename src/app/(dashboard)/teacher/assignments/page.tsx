"use client";

import { useState, useEffect } from "react";
import { Plus, BookOpen, CheckCircle, Clock } from "lucide-react";
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

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentCardData[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentCardData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchAssignments();
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [statusFilter]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
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

  const handleAssignmentClick = (assignment: AssignmentCardData) => {
    setSelectedAssignment(assignment);
    setIsDetailsOpen(true);
  };

  const pendingGrading = assignments.filter(
    (a) =>
      a.homework?.enabled &&
      a.homework?.submission?.submitted &&
      a.homework?.submission?.status !== "graded",
  ).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Assignments</h1>
          <p className="mt-1 text-sm text-neutral-600">Create and manage student assignments</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Create Assignment
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Total</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{assignments.length}</p>
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
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                {assignments.filter((a) => a.status === "active").length}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3 text-green-700">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Pending Grading</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{pendingGrading}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 text-yellow-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Completed</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                {assignments.filter((a) => a.status === "completed").length}
              </p>
            </div>
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-700">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-neutral-700">Filter by Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Assignments List */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <AssignmentList
          assignments={assignments}
          userRole="teacher"
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

      {selectedAssignment && (
        <AssignmentDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment}
          userRole="teacher"
          onRefresh={fetchAssignments}
        />
      )}
    </div>
  );
}
