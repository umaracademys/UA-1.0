"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  FileText,
  Star,
  AlertCircle,
  Clock,
  MessageSquare,
  Calendar,
  BarChart3,
  Settings,
} from "lucide-react";
import axios from "axios";
import { StatCard } from "@/components/dashboard/StatCard";
import { ModuleCard } from "@/components/dashboard/admin/ModuleCard";
import { PendingActionsPanel } from "@/components/dashboard/admin/PendingActionsPanel";
import { SystemActivity } from "@/components/dashboard/admin/SystemActivity";
import { AnalyticsCharts } from "@/components/dashboard/admin/AnalyticsCharts";

type DashboardStats = {
  totalStudents: number;
  totalTeachers: number;
  pendingTickets: number;
  pendingEvaluations: number;
  activeAssignments: number;
};

type PendingItem = {
  _id: string;
  title: string;
  description?: string;
  type: "ticket" | "evaluation" | "registration";
  createdAt: Date | string;
  link: string;
};

type Activity = {
  _id: string;
  user: {
    fullName: string;
    role: string;
  };
  action: string;
  module: string;
  details?: string;
  createdAt: Date | string;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    pendingTickets: 0,
    pendingEvaluations: 0,
    activeAssignments: 0,
  });
  const [pendingTickets, setPendingTickets] = useState<PendingItem[]>([]);
  const [pendingEvaluations, setPendingEvaluations] = useState<PendingItem[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [adminName, setAdminName] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load user info
      const userRes = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = userRes.data.user || userRes.data;
      setAdminName(userData.fullName || "Admin");

      // Load students
      const studentsRes = await axios.get("/api/students", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const students = studentsRes.data.students || [];
      setStats((prev) => ({ ...prev, totalStudents: students.length }));

      // Load teachers
      const teachersRes = await axios.get("/api/teachers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const teachers = teachersRes.data.teachers || [];
      setStats((prev) => ({ ...prev, totalTeachers: teachers.length }));

      // Load pending tickets
      const ticketsRes = await axios.get("/api/tickets/pending-review", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tickets = ticketsRes.data.tickets || [];
      setPendingTickets(
        tickets.map((t: any) => ({
          _id: t._id,
          title: `Ticket for ${t.studentId?.userId?.fullName || "Student"}`,
          description: `Workflow: ${t.workflowStep}`,
          type: "ticket" as const,
          createdAt: t.submittedAt || t.createdAt,
          link: `/admin/tickets/${t._id}`,
        })),
      );
      setStats((prev) => ({ ...prev, pendingTickets: tickets.length }));

      // Load pending evaluations
      const evaluationsRes = await axios.get("/api/evaluations/pending-review", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const evaluations = evaluationsRes.data.evaluations || [];
      setPendingEvaluations(
        evaluations.map((e: any) => ({
          _id: e._id,
          title: `Evaluation for ${e.studentId?.userId?.fullName || "Student"}`,
          description: `Week: ${new Date(e.weekStartDate).toLocaleDateString()}`,
          type: "evaluation" as const,
          createdAt: e.submittedAt || e.createdAt,
          link: `/admin/evaluations/${e._id}`,
        })),
      );
      setStats((prev) => ({ ...prev, pendingEvaluations: evaluations.length }));

      // Load assignments
      const assignmentsRes = await axios.get("/api/assignments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const assignments = assignmentsRes.data.assignments || [];
      setStats((prev) => ({
        ...prev,
        activeAssignments: assignments.filter((a: any) => a.status === "pending" || a.status === "submitted").length,
      }));

      // Load pending registrations (students with pending status)
      const pendingStudents = students.filter((s: any) => s.status === "pending");
      setPendingRegistrations(
        pendingStudents.map((s: any) => ({
          _id: s._id,
          title: `New student: ${s.userId?.fullName || "Unknown"}`,
          description: `Program: ${s.programType || "N/A"}`,
          type: "registration" as const,
          createdAt: s.enrollmentDate || s.createdAt,
          link: `/admin/students/${s._id}`,
        })),
      );

      // Mock activities (replace with actual API call)
      setActivities([
        {
          _id: "1",
          user: { fullName: "Teacher Name", role: "teacher" },
          action: "Created assignment",
          module: "Assignments",
          details: "Assignment: Math Homework",
          createdAt: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      name: "Users Management",
      icon: Users,
      description: "Manage all system users",
      count: stats.totalStudents + stats.totalTeachers,
      link: "/admin/users",
      color: "blue" as const,
    },
    {
      name: "Students",
      icon: Users,
      description: "Manage student profiles",
      count: stats.totalStudents,
      link: "/admin/students",
      color: "green" as const,
    },
    {
      name: "Teachers",
      icon: UserCheck,
      description: "Manage teacher accounts",
      count: stats.totalTeachers,
      link: "/admin/teachers",
      color: "purple" as const,
    },
    {
      name: "Assignments",
      icon: FileText,
      description: "View and manage assignments",
      count: stats.activeAssignments,
      link: "/admin/assignments",
      color: "blue" as const,
    },
    {
      name: "Tickets",
      icon: AlertCircle,
      description: "Review recitation tickets",
      count: stats.pendingTickets,
      link: "/admin/tickets",
      color: "yellow" as const,
    },
    {
      name: "Evaluations",
      icon: Star,
      description: "Review weekly evaluations",
      count: stats.pendingEvaluations,
      link: "/admin/evaluations",
      color: "orange" as const,
    },
    {
      name: "Attendance",
      icon: Calendar,
      description: "Track attendance records",
      count: "View",
      link: "/admin/attendance",
      color: "indigo" as const,
    },
    {
      name: "Messages",
      icon: MessageSquare,
      description: "Monitor conversations",
      count: "View",
      link: "/admin/messages",
      color: "blue" as const,
    },
    {
      name: "Reports",
      icon: BarChart3,
      description: "Generate system reports",
      count: "Generate",
      link: "/admin/reports",
      color: "green" as const,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Hero Section */}
      <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
        <h1 className="text-3xl font-bold text-neutral-900">Welcome back, {adminName}! 👋</h1>
        <p className="mt-2 text-neutral-600">System overview and management dashboard.</p>
      </div>

      {/* System Statistics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="blue"
          link="/admin/students"
        />
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers}
          icon={UserCheck}
          color="green"
          link="/admin/teachers"
        />
        <StatCard
          title="Pending Tickets"
          value={stats.pendingTickets}
          icon={AlertCircle}
          color="yellow"
          link="/admin/tickets?filter=submitted"
        />
        <StatCard
          title="Pending Evaluations"
          value={stats.pendingEvaluations}
          icon={Star}
          color="orange"
          link="/admin/evaluations?filter=submitted"
        />
        <StatCard
          title="Active Assignments"
          value={stats.activeAssignments}
          icon={FileText}
          color="purple"
          link="/admin/assignments"
        />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Pending Actions */}
        <div className="lg:col-span-1">
          <PendingActionsPanel
            tickets={pendingTickets}
            evaluations={pendingEvaluations}
            registrations={pendingRegistrations}
          />
        </div>

        {/* Right Column - Activity & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          <SystemActivity activities={activities} loading={loading} />
          <AnalyticsCharts />
        </div>
      </div>

      {/* Quick Access Modules */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-neutral-900">Quick Access Modules</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard
              key={module.name}
              name={module.name}
              icon={module.icon}
              description={module.description}
              count={module.count}
              link={module.link}
              color={module.color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
