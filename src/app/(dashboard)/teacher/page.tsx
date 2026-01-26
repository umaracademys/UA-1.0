"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  FileCheck,
  AlertCircle,
  Clock,
  FileText,
  Star,
  Calendar,
  MessageSquare,
  Plus,
  CheckCircle,
} from "lucide-react";
import axios from "axios";
import { StatCard } from "@/components/dashboard/StatCard";
import { StudentTable } from "@/components/dashboard/teacher/StudentTable";
import { ActivityTimeline } from "@/components/dashboard/teacher/ActivityTimeline";
import { PairDailyReportModal } from "@/components/dashboard/teacher/PairDailyReportModal";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { CheckInOutButton } from "@/components/modules/attendance/CheckInOutButton";
import { AttendanceCalendar } from "@/components/modules/attendance/AttendanceCalendar";
import { AttendanceStatistics } from "@/components/modules/attendance/AttendanceStatistics";
import { TicketList } from "@/components/modules/tickets/TicketList";
import { CreateTicketModal } from "@/components/modules/tickets/CreateTicketModal";
import { EvaluationsList } from "@/components/modules/evaluations/EvaluationsList";
import { CreateEvaluationForm } from "@/components/modules/evaluations/CreateEvaluationForm";
import { ConversationList } from "@/components/modules/messages/ConversationList";
import { useConversation } from "@/hooks/useConversation";
import { MessageThread } from "@/components/modules/messages/MessageThread";
import { MessageInput } from "@/components/modules/messages/MessageInput";

// Messages Tab Component
function MessagesTab({
  conversations,
  selectedConversation,
  onSelectConversation,
  currentUserId,
  loading,
}: {
  conversations: any[];
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
  currentUserId: string;
  loading: boolean;
}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const { messages, typingUsers, sendMessage, loading: messagesLoading, startTyping, stopTyping } = useConversation(
    selectedConversation,
    token,
  );

  const handleSend = async (content: string, attachments?: File[]) => {
    await sendMessage(content, attachments);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <ConversationList
          conversations={conversations}
          activeConversationId={selectedConversation || undefined}
          onConversationClick={onSelectConversation}
          loading={loading}
        />
      </div>
      <div className="lg:col-span-2">
        {selectedConversation ? (
          <div className="flex h-[600px] flex-col rounded-lg border border-neutral-200 bg-white">
            <div className="flex-1 overflow-y-auto p-4">
              <MessageThread
                messages={messages}
                typingUsers={typingUsers}
                currentUserId={currentUserId}
                loading={messagesLoading}
              />
            </div>
            <div className="border-t border-neutral-200 p-4">
              <MessageInput
                onSend={handleSend}
                onTypingStart={startTyping}
                onTypingStop={stopTyping}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-96 items-center justify-center rounded-lg border border-neutral-200 bg-white">
            <p className="text-neutral-500">Select a conversation to view messages</p>
          </div>
        )}
      </div>
    </div>
  );
}

type DashboardStats = {
  pairStudentsCount: number;
  totalAssessments: number;
  pendingTickets: number;
  pendingReviews: number;
};

type Student = {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
  };
  programType?: string;
  currentSabq?: string;
  lastSession?: Date | string;
};

type Activity = {
  _id: string;
  type: "ticket_created" | "evaluation_submitted" | "attendance_recorded" | "message_sent" | "ticket_approved" | "ticket_rejected";
  description: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
  createdAt: Date | string;
  studentName?: string;
};

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "actions" | "tickets" | "evaluations" | "attendance" | "messages">("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    pairStudentsCount: 0,
    totalAssessments: 0,
    pendingTickets: 0,
    pendingReviews: 0,
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [selectedStudentForTicket, setSelectedStudentForTicket] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [teacherName, setTeacherName] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

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
      setTeacherName(userData.fullName || "Teacher");
      setCurrentUserId(userData._id || userData.id);
      const teacherId = userData.teacherId?._id || userData.teacherId;

      // Load assigned students
      if (teacherId) {
        const studentsRes = await axios.get(`/api/teachers/${teacherId}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudents(studentsRes.data.students || studentsRes.data.data || []);
        setStats((prev) => ({
          ...prev,
          pairStudentsCount: studentsRes.data.students?.length || 0,
        }));
      }

      // Load tickets
      const ticketsRes = await axios.get("/api/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ticketsData = ticketsRes.data.tickets || ticketsRes.data.data || [];
      setTickets(ticketsData);
      setStats((prev) => ({
        ...prev,
        pendingTickets: ticketsData.filter((t: any) => t.status === "pending" || t.status === "in-progress").length,
      }));

      // Load evaluations
      const evaluationsRes = await axios.get("/api/evaluations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const evaluationsData = evaluationsRes.data.evaluations || evaluationsRes.data.data || [];
      setEvaluations(evaluationsData);
      setStats((prev) => ({
        ...prev,
        pendingReviews: evaluationsData.filter((e: any) => e.status === "submitted").length,
        totalAssessments: evaluationsData.length,
      }));

      // Load conversations
      try {
        const conversationsRes = await axios.get("/api/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setConversations(conversationsRes.data.conversations || []);
      } catch (error) {
        console.error("Failed to load conversations:", error);
      }

      // Mock activities (replace with actual API call)
      setActivities([
        {
          _id: "1",
          type: "ticket_created",
          description: "Created recitation ticket",
          relatedEntity: { type: "Ticket", id: "1" },
          createdAt: new Date(),
          studentName: "Student Name",
        },
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = (studentId?: string) => {
    setSelectedStudentForTicket(studentId || null);
    setShowCreateTicket(true);
  };

  const handleSubmitDailyReport = async (data: any) => {
    // API call to submit daily report
    console.log("Submitting daily report:", data);
    // await axios.post("/api/reports/daily", data, { headers: { Authorization: `Bearer ${token}` } });
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: CheckCircle },
    { id: "actions", label: "Actions", icon: Plus },
    { id: "tickets", label: "Tickets", icon: FileText },
    { id: "evaluations", label: "Evaluations", icon: Star },
    { id: "attendance", label: "Attendance", icon: Calendar },
    { id: "messages", label: "Messages", icon: MessageSquare },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
        <h1 className="text-3xl font-bold text-neutral-900">Welcome back, {teacherName}! 👋</h1>
        <p className="mt-2 text-neutral-600">Manage your students and track their progress.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Pair Students"
              value={stats.pairStudentsCount}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Total Assessments"
              value={stats.totalAssessments}
              icon={FileCheck}
              color="green"
            />
            <StatCard
              title="Pending Tickets"
              value={stats.pendingTickets}
              icon={AlertCircle}
              color="yellow"
              link="/teacher/tickets?filter=pending"
            />
            <StatCard
              title="Pending Reviews"
              value={stats.pendingReviews}
              icon={Clock}
              color="red"
              link="/teacher/evaluations?filter=submitted"
            />
          </div>

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Student Table */}
            <div className="lg:col-span-2">
              <StudentTable
                students={students}
                loading={loading}
                onViewProfile={(id) => router.push(`/teacher/students/${id}`)}
                onCreateTicket={handleCreateTicket}
                onRecordAttendance={(id) => router.push(`/teacher/attendance?student=${id}`)}
                onSubmitEvaluation={(id) => {
                  setActiveTab("evaluations");
                  // Pre-select student in evaluation form
                }}
                onSendMessage={(id) => {
                  setActiveTab("messages");
                  // Open conversation with student
                }}
              />
            </div>

            {/* Activity Timeline */}
            <div>
              <ActivityTimeline activities={activities} loading={loading} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "actions" && (
        <div className="space-y-6">
          <QuickActions />
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Additional Actions</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                onClick={() => setShowDailyReport(true)}
                className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <FileText className="h-4 w-4" />
                Submit Pair Daily Report
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "tickets" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900">Recitation Tickets</h2>
            <button
              onClick={() => handleCreateTicket()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4" />
              Create Ticket
            </button>
          </div>
          <TicketList
            tickets={tickets}
            userRole="teacher"
            loading={loading}
            onTicketClick={(ticket) => {
              // Handle ticket click - could open details modal
              console.log("Ticket clicked:", ticket);
            }}
          />
        </div>
      )}

      {activeTab === "evaluations" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900">Weekly Evaluations</h2>
            <button
              onClick={() => router.push("/teacher/evaluations")}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4" />
              Create Evaluation
            </button>
          </div>
          <EvaluationsList
            evaluations={evaluations}
            userRole="teacher"
            loading={loading}
            onRefresh={loadDashboardData}
          />
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <CheckInOutButton
              onCheckIn={async () => {
                const res = await axios.post("/api/attendance/check-in", {}, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                return res.data.attendance;
              }}
              onCheckOut={async () => {
                const res = await axios.post("/api/attendance/check-out", {}, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                return res.data.attendance;
              }}
            />
            <AttendanceStatistics records={[]} showPaidDays />
          </div>
          <AttendanceCalendar records={[]} />
        </div>
      )}

      {activeTab === "messages" && (
        <MessagesTab
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          currentUserId={currentUserId}
          loading={loading}
        />
      )}

      {/* Modals */}
      {showCreateTicket && (
        <CreateTicketModal
          isOpen={showCreateTicket}
          onClose={() => {
            setShowCreateTicket(false);
            setSelectedStudentForTicket(null);
          }}
          onSuccess={() => {
            loadDashboardData();
            setShowCreateTicket(false);
            setSelectedStudentForTicket(null);
          }}
        />
      )}

      {showDailyReport && (
        <PairDailyReportModal
          isOpen={showDailyReport}
          onClose={() => setShowDailyReport(false)}
          students={students}
          onSubmit={handleSubmitDailyReport}
        />
      )}
    </div>
  );
}
