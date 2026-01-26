"use client";

import { useState, useEffect } from "react";
import { Database, Server, HardDrive, Users, Shield, Settings, Key, Activity, AlertCircle } from "lucide-react";
import axios from "axios";
import { StatCard } from "@/components/dashboard/StatCard";
import { HealthCard } from "@/components/dashboard/super-admin/HealthCard";
import { SecurityAlert } from "@/components/dashboard/super-admin/SecurityAlert";
import { PendingActionsPanel } from "@/components/dashboard/admin/PendingActionsPanel";
import { SystemActivity } from "@/components/dashboard/admin/SystemActivity";
import { AnalyticsCharts } from "@/components/dashboard/admin/AnalyticsCharts";
import { ModuleCard } from "@/components/dashboard/admin/ModuleCard";
// Removed direct import - using API route instead

type DashboardStats = {
  totalStudents: number;
  totalTeachers: number;
  pendingTickets: number;
  pendingEvaluations: number;
  activeAssignments: number;
  activeUsers: number;
};

type SecurityAlertType = {
  id: string;
  type: "failed_login" | "locked_account" | "suspicious_activity" | "password_change" | "permission_change";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  user?: {
    fullName: string;
    email: string;
  };
  ipAddress?: string;
  timestamp: Date | string;
};

export default function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    pendingTickets: 0,
    pendingEvaluations: 0,
    activeAssignments: 0,
    activeUsers: 0,
  });
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlertType[]>([]);
  const [pendingTickets, setPendingTickets] = useState<any[]>([]);
  const [pendingEvaluations, setPendingEvaluations] = useState<any[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [adminName, setAdminName] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.warn("Dashboard data loading timeout");
          setLoading(false);
        }, 10000); // 10 second timeout

        await Promise.all([loadDashboardData(), loadSystemHealth()]);
        clearTimeout(timeoutId);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        setLoading(false);
      }
    };

    loadData();

    // Refresh system health every 30 seconds
    const healthInterval = setInterval(() => {
      if (token) {
        loadSystemHealth();
      }
    }, 30000);

    return () => clearInterval(healthInterval);
  }, [token]);

  const loadDashboardData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load user info
      const userRes = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = userRes.data.user || userRes.data;
      setAdminName(userData.fullName || "Super Admin");

      // Load all stats (same as admin dashboard)
      const [studentsRes, teachersRes, ticketsRes, evaluationsRes, assignmentsRes] = await Promise.allSettled([
        axios.get("/api/students", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/api/teachers", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/api/tickets/pending-review", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/api/evaluations/pending-review", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/api/assignments", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const students = studentsRes.status === "fulfilled" ? (studentsRes.value.data.students || []) : [];
      const teachers = teachersRes.status === "fulfilled" ? (teachersRes.value.data.teachers || []) : [];
      const tickets = ticketsRes.status === "fulfilled" ? (ticketsRes.value.data.tickets || []) : [];
      const evaluations = evaluationsRes.status === "fulfilled" ? (evaluationsRes.value.data.evaluations || []) : [];
      const assignments = assignmentsRes.status === "fulfilled" ? (assignmentsRes.value.data.assignments || []) : [];

      setStats({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        pendingTickets: tickets.length,
        pendingEvaluations: evaluations.length,
        activeAssignments: assignments.filter((a: any) => a.status === "pending" || a.status === "submitted").length,
        activeUsers: 0, // Would query active sessions
      });

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

      // Load security alerts (mock data - would come from security monitoring API)
      setSecurityAlerts([
        {
          id: "1",
          type: "failed_login",
          severity: "high",
          title: "Multiple failed login attempts",
          description: "User 'test@example.com' has 5 failed login attempts in the last hour",
          user: { fullName: "Test User", email: "test@example.com" },
          ipAddress: "192.168.1.100",
          timestamp: new Date(),
        },
      ]);

      // Mock activities
      setActivities([
        {
          _id: "1",
          user: { fullName: "Admin User", role: "admin" },
          action: "Updated system settings",
          module: "Settings",
          details: "Changed password policy",
          createdAt: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemHealth = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get("/api/system/health", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setSystemHealth(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load system health:", error);
      // Set default health status on error
      setSystemHealth({
        database: { status: "unhealthy" },
        api: { status: "unhealthy" },
        storage: { status: "healthy", usage: 0, total: "0GB", available: "0GB" },
        activeUsers: { count: 0, status: "healthy" },
      });
    }
  };

  const modules = [
    {
      name: "System Settings",
      icon: Settings,
      description: "Configure system settings",
      count: "Manage",
      link: "/super-admin/settings",
      color: "blue" as const,
    },
    {
      name: "Permissions",
      icon: Key,
      description: "Manage role permissions",
      count: "Manage",
      link: "/super-admin/permissions",
      color: "purple" as const,
    },
    {
      name: "Security",
      icon: Shield,
      description: "Security monitoring",
      count: securityAlerts.length > 0 ? securityAlerts.length : "View",
      link: "/super-admin/security",
      color: "red" as const,
    },
    {
      name: "Database",
      icon: Database,
      description: "Database management",
      count: "Manage",
      link: "/super-admin/database",
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
        <h1 className="text-3xl font-bold text-neutral-900">Super Admin Dashboard</h1>
        <p className="mt-2 text-neutral-600">Welcome back, {adminName}! System management and monitoring.</p>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <HealthCard
          title="Database"
          status={systemHealth?.database?.status || "healthy"}
          icon={Database}
          responseTime={systemHealth?.database?.responseTime}
        />
        <HealthCard
          title="API"
          status={systemHealth?.api?.status || "healthy"}
          icon={Server}
          responseTime={systemHealth?.api?.responseTime}
        />
        <HealthCard
          title="Storage"
          status={systemHealth?.storage?.status || "healthy"}
          icon={HardDrive}
          usage={systemHealth?.storage?.usage}
          total={systemHealth?.storage?.total}
        />
        <HealthCard
          title="Active Users"
          status="healthy"
          icon={Users}
          value={stats.activeUsers}
        />
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
          icon={Users}
          color="green"
          link="/admin/teachers"
        />
        <StatCard
          title="Pending Tickets"
          value={stats.pendingTickets}
          icon={Activity}
          color="yellow"
          link="/admin/tickets?filter=submitted"
        />
        <StatCard
          title="Pending Evaluations"
          value={stats.pendingEvaluations}
          icon={Activity}
          color="orange"
          link="/admin/evaluations?filter=submitted"
        />
        <StatCard
          title="Active Assignments"
          value={stats.activeAssignments}
          icon={Activity}
          color="purple"
          link="/admin/assignments"
        />
      </div>

      {/* Security Alerts */}
      {securityAlerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900">Security Alerts</h2>
          <div className="space-y-3">
            {securityAlerts.map((alert) => (
              <SecurityAlert
                key={alert.id}
                {...alert}
                onInvestigate={(id) => {
                  // Navigate to security page with alert ID
                  window.location.href = `/super-admin/security?alert=${id}`;
                }}
                onDismiss={(id) => {
                  setSecurityAlerts((prev) => prev.filter((a) => a.id !== id));
                }}
                onBlock={(id, type) => {
                  // Block user or IP
                  console.log(`Block ${type} for alert ${id}`);
                }}
              />
            ))}
          </div>
        </div>
      )}

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

      {/* System Management Modules */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-neutral-900">System Management</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
