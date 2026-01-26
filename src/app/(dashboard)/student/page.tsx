"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Clock, Star, Calendar, BookOpen, MessageSquare, TrendingUp } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { UpcomingSchedule } from "@/components/dashboard/UpcomingSchedule";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { AssignmentCard, type AssignmentCardData } from "@/components/modules/assignments/AssignmentCard";
import { EvaluationCard } from "@/components/modules/evaluations/EvaluationCard";

type DashboardStats = {
  totalAssignments: number;
  pendingAssignments: number;
  averageGrade: number;
  attendanceRate: number;
};

type Evaluation = {
  _id: string;
  studentId: any;
  teacherId: any;
  weekStartDate: Date | string;
  categories: Array<{ name: string; rating: number; comments?: string }>;
  overallComments?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt?: Date | string;
  reviewedAt?: Date | string;
  reviewedBy?: any;
};

type PersonalMushafStats = {
  totalMistakes: number;
  recentMistakes: number;
  mostCommonType: string;
};

export default function StudentDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssignments: 0,
    pendingAssignments: 0,
    averageGrade: 0,
    attendanceRate: 0,
  });
  const [assignments, setAssignments] = useState<{
    pending: AssignmentCardData[];
    overdue: AssignmentCardData[];
    completed: AssignmentCardData[];
  }>({
    pending: [],
    overdue: [],
    completed: [],
  });
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [mushafStats, setMushafStats] = useState<PersonalMushafStats>({
    totalMistakes: 0,
    recentMistakes: 0,
    mostCommonType: "N/A",
  });
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [scheduleItems, setScheduleItems] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [studentName, setStudentName] = useState("");

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
      setStudentName(userData.fullName || "Student");
      const studentId = userData.studentId?._id || userData.studentId;

      // Load assignments
      const assignmentsRes = await axios.get("/api/assignments/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allAssignments: AssignmentCardData[] = (assignmentsRes.data.data || []).map((a: any) => ({
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
      
      setAssignments({
        pending: allAssignments.filter((a) => 
          a.status === "active" && (!a.homework?.enabled || !a.homework?.submission?.submitted)
        ),
        overdue: allAssignments.filter((a) => a.status === "archived"),
        completed: allAssignments.filter((a) => 
          a.homework?.submission?.submitted && !a.homework?.submission?.grade
        ),
      });

      // Calculate stats
      const gradedAssignments = allAssignments.filter((a) => 
        a.homework?.submission?.grade !== undefined
      );
      const avgGrade = gradedAssignments.length > 0
        ? gradedAssignments.reduce((sum, a) => sum + (a.homework?.submission?.grade || 0), 0) / gradedAssignments.length
        : 0;

      setStats({
        totalAssignments: allAssignments.length,
        pendingAssignments: allAssignments.filter((a) => 
          a.status === "active" && (!a.homework?.enabled || !a.homework?.submission?.submitted)
        ).length,
        averageGrade: Math.round(avgGrade * 10) / 10,
        attendanceRate: 0, // Will be loaded separately
      });

      // Load evaluations
      const evaluationsRes = await axios.get("/api/evaluations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvaluations((evaluationsRes.data.evaluations || []).slice(0, 3));

      // Load attendance
      try {
        const attendanceRes = await axios.get("/api/attendance", {
          headers: { Authorization: `Bearer ${token}` },
          params: { userType: "student" },
        });
        const attendanceRecords = attendanceRes.data.attendance || [];
        const present = attendanceRecords.filter((r: any) => r.status === "present").length;
        const total = attendanceRecords.length;
        const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;
        setStats((prev) => ({ ...prev, attendanceRate }));
      } catch (error) {
        console.error("Failed to load attendance:", error);
      }

      // Load Personal Mushaf stats
      if (studentId) {
        try {
          const mushafRes = await axios.get(`/api/students/${studentId}/personal-mushaf/statistics`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const mushafData = mushafRes.data.statistics || {};
          setMushafStats({
            totalMistakes: mushafData.total || 0,
            recentMistakes: mushafData.recent || 0,
            mostCommonType: mushafData.mostCommonType || "N/A",
          });
        } catch (error) {
          console.error("Failed to load mushaf stats:", error);
        }
      }

      // Load unread messages count
      try {
        const messagesRes = await axios.get("/api/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const conversations = messagesRes.data.conversations || [];
        const unread = conversations.reduce((sum: number, conv: any) => sum + (conv.unreadCount || 0), 0);
        setUnreadMessages(unread);
      } catch (error) {
        console.error("Failed to load messages:", error);
      }

      // Generate progress data
      const progressData = allAssignments
        .filter((a) => a.homework?.submission?.submitted)
        .slice(-6)
        .map((a, index: number) => ({
          name: `A${index + 1}`,
          completed: 1,
          pending: 0,
          grade: a.homework?.submission?.grade || 0,
        }));
      setProgressData(progressData);

      // Mock schedule data (replace with actual API call)
      setScheduleItems([
        {
          _id: "1",
          date: new Date(),
          time: "10:00 AM",
          subject: "Quran Recitation",
          activity: "Sabq Review",
          teacherName: "Teacher Name",
          type: "recitation",
        },
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-neutral-900">
          Welcome back, {studentName}! 👋
        </h1>
        <p className="mt-2 text-neutral-600">
          Here's what's happening with your studies today.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Assignments"
          value={stats.totalAssignments}
          icon={FileText}
          color="blue"
          link="/student/assignments"
        />
        <StatCard
          title="Pending Assignments"
          value={stats.pendingAssignments}
          icon={Clock}
          color="yellow"
          link="/student/assignments?filter=pending"
        />
        <StatCard
          title="Average Grade"
          value={stats.averageGrade > 0 ? stats.averageGrade.toFixed(1) : "N/A"}
          icon={Star}
          color="green"
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          icon={Calendar}
          color="purple"
          link="/student/attendance"
        />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Assignments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assignments Section */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-900">Assignments</h2>
              <Link
                href="/student/assignments"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View All →
              </Link>
            </div>

            {/* Tabs */}
            <div className="mb-4 border-b border-neutral-200">
              <nav className="-mb-px flex space-x-8">
                {["Pending", "Overdue", "Completed"].map((tab) => (
                  <button
                    key={tab}
                    className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
                  >
                    {tab} (
                    {tab === "Pending"
                      ? assignments.pending.length
                      : tab === "Overdue"
                        ? assignments.overdue.length
                        : assignments.completed.length}
                    )
                  </button>
                ))}
              </nav>
            </div>

            {/* Assignment List */}
            <div className="space-y-3">
              {assignments.pending.length === 0 &&
              assignments.overdue.length === 0 &&
              assignments.completed.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-500">No assignments yet</p>
              ) : (
                <>
                  {assignments.overdue.slice(0, 3).map((assignment) => (
                    <AssignmentCard
                      key={assignment._id}
                      assignment={assignment}
                      userRole="student"
                      onClick={() => router.push(`/student/assignments`)}
                    />
                  ))}
                  {assignments.pending.slice(0, 3).map((assignment) => (
                    <AssignmentCard
                      key={assignment._id}
                      assignment={assignment}
                      userRole="student"
                      onClick={() => router.push(`/student/assignments`)}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Progress Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <ProgressChart
              type="line"
              data={progressData}
              title="Assignment Completion"
            />
            <ProgressChart
              type="bar"
              data={progressData}
              title="Grades by Assignment"
            />
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Recent Evaluations */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Recent Evaluations</h3>
              <Link
                href="/student/evaluations"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {evaluations.length === 0 ? (
                <p className="py-4 text-center text-sm text-neutral-500">No evaluations yet</p>
              ) : (
                evaluations.map((evaluation) => (
                  <EvaluationCard
                    key={evaluation._id}
                    evaluation={evaluation}
                    currentUserId=""
                    currentUserRole="student"
                    onView={(id) => router.push(`/student/evaluations/${id}`)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Personal Mushaf Widget */}
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-purple-900">Personal Mushaf</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700">Total Mistakes</span>
                <span className="text-lg font-bold text-purple-900">{mushafStats.totalMistakes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700">Recent (7 days)</span>
                <span className="text-lg font-bold text-purple-900">{mushafStats.recentMistakes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700">Most Common</span>
                <span className="text-sm font-semibold text-purple-900">{mushafStats.mostCommonType}</span>
              </div>
              <Link
                href="/student/personal-mushaf"
                className="mt-4 block w-full rounded-lg bg-purple-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-purple-700"
              >
                View Personal Mushaf
              </Link>
            </div>
          </div>

          {/* Messages Preview */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-neutral-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Messages</h3>
              </div>
              {unreadMessages > 0 && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {unreadMessages}
                </span>
              )}
            </div>
            <p className="mb-4 text-sm text-neutral-600">
              {unreadMessages > 0
                ? `You have ${unreadMessages} unread message${unreadMessages !== 1 ? "s" : ""}`
                : "No unread messages"}
            </p>
            <Link
              href="/messages"
              className="block w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              View All Messages
            </Link>
          </div>

          {/* Upcoming Schedule */}
          <UpcomingSchedule items={scheduleItems} />
        </div>
      </div>
    </div>
  );
}
