"use client";

import { useState, useEffect } from "react";
import { BookOpen, Clock, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { AssignmentList } from "@/components/modules/assignments/AssignmentList";
import { AssignmentDetailsModal } from "@/components/modules/assignments/AssignmentDetailsModal";
import type { AssignmentCardData } from "@/components/modules/assignments/AssignmentCard";
import toast from "react-hot-toast";

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentCardData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
    averageGrade: 0,
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/assignments/me", {
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

  const getCategory = (assignment: any): "pending" | "completed" | "overdue" | "graded" => {
    if (assignment.homework?.submission?.grade !== undefined) return "graded";
    if (assignment.homework?.submission?.submitted) return "completed";
    if (assignment.status === "archived") return "overdue";
    return "pending";
  };

  const calculateStats = (assignments: AssignmentCardData[]) => {
    const total = assignments.length;
    const pending = assignments.filter((a) => getCategory(a) === "pending").length;
    const completed = assignments.filter((a) => getCategory(a) === "completed").length;
    const overdue = assignments.filter((a) => getCategory(a) === "overdue").length;
    const graded = assignments.filter(
      (a) => a.homework?.submission?.grade !== undefined,
    );
    const averageGrade =
      graded.length > 0
        ? graded.reduce((sum, a) => sum + (a.homework?.submission?.grade || 0), 0) / graded.length
        : 0;

    setStats({ total, pending, completed, overdue, averageGrade });
  };

  const handleAssignmentClick = (assignment: AssignmentCardData) => {
    setSelectedAssignment(assignment);
    setIsDetailsOpen(true);
  };

  const statCards = [
    {
      label: "Total Assignments",
      value: stats.total,
      icon: BookOpen,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "bg-yellow-100 text-yellow-700",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      icon: AlertCircle,
      color: "bg-red-100 text-red-700",
    },
    {
      label: "Average Grade",
      value: stats.averageGrade > 0 ? stats.averageGrade.toFixed(1) : "—",
      icon: TrendingUp,
      color: "bg-indigo-100 text-indigo-700",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Assignments</h1>
        <p className="mt-1 text-sm text-neutral-600">View and manage your assignments</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900">{card.value}</p>
                </div>
                <div className={`rounded-full p-3 ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assignments List */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <AssignmentList
          assignments={assignments}
          userRole="student"
          loading={loading}
          onAssignmentClick={handleAssignmentClick}
        />
      </div>

      {/* Details Modal */}
      {selectedAssignment && (
        <AssignmentDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment}
          userRole="student"
          onRefresh={fetchAssignments}
        />
      )}
    </div>
  );
}
