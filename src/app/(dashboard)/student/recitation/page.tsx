"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { BookOpen, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { RecitationTimeline } from "@/components/modules/tickets/RecitationTimeline";
import { TicketDetailsPanel } from "@/components/modules/tickets/TicketDetailsPanel";
import type { TicketCardData } from "@/components/modules/tickets/TicketCard";
import type { TicketWorkflowStep, TicketStatus } from "@/lib/db/models/Ticket";
import toast from "react-hot-toast";

type RecitationHistory = {
  tickets: any[];
  grouped: Record<TicketWorkflowStep, any[]>;
  statistics: {
    totalSessions: number;
    totalMistakes: number;
    byWorkflowStep: Record<TicketWorkflowStep, { total: number; mistakes: number }>;
  };
  timeline: Array<{
    id: string;
    workflowStep: TicketWorkflowStep;
    status: TicketStatus;
    createdAt: string | Date;
    reviewedAt?: string | Date;
    mistakesCount: number;
  }>;
};

export default function StudentRecitationPage() {
  const [history, setHistory] = useState<RecitationHistory | null>(null);
  const [currentSabq, setCurrentSabq] = useState<string>("—");
  const [currentSabqi, setCurrentSabqi] = useState<string>("—");
  const [currentManzil, setCurrentManzil] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketCardData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [workflowFilter, setWorkflowFilter] = useState<TicketWorkflowStep | "all">("all");
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentData();
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchRecitationHistory();
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.profile?._id) {
        setStudentId(result.profile._id);
        setCurrentSabq(result.profile.currentSabq || "—");
        setCurrentSabqi(result.profile.currentSabqi || "—");
        setCurrentManzil(result.profile.currentManzil || "—");
      }
    } catch (error) {
      console.error("Failed to load student data");
    }
  };

  const fetchRecitationHistory = async () => {
    if (!studentId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students/${studentId}/recitation-history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setHistory(result);
      } else {
        toast.error(result.message || "Failed to load recitation history");
      }
    } catch (error) {
      toast.error("Failed to load recitation history");
    } finally {
      setLoading(false);
    }
  };

  const handleTimelineClick = async (entry: any) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${entry.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setSelectedTicket(result.ticket as any);
        setIsDetailsOpen(true);
      }
    } catch (error) {
      toast.error("Failed to load ticket details");
    }
  };

  const stats = history?.statistics || {
    totalSessions: 0,
    totalMistakes: 0,
    byWorkflowStep: {
      sabq: { total: 0, mistakes: 0 },
      sabqi: { total: 0, mistakes: 0 },
      manzil: { total: 0, mistakes: 0 },
    },
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Recitation</h1>
        <p className="mt-1 text-sm text-neutral-600">View your recitation progress and history</p>
      </div>

      {/* Current Progress */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-full bg-blue-100 p-2 text-blue-700">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-neutral-700">Current Sabq</span>
          </div>
          <p className="text-lg font-semibold text-neutral-900">{currentSabq}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-full bg-purple-100 p-2 text-purple-700">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-neutral-700">Current Sabqi</span>
          </div>
          <p className="text-lg font-semibold text-neutral-900">{currentSabqi}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-full bg-green-100 p-2 text-green-700">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-neutral-700">Current Manzil</span>
          </div>
          <p className="text-lg font-semibold text-neutral-900">{currentManzil}</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-600">Total Sessions</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.totalSessions}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-600">Total Mistakes</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.totalMistakes}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-600">Sabq Sessions</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.byWorkflowStep.sabq.total}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-600">Sabqi Sessions</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.byWorkflowStep.sabqi.total}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 rounded-lg border border-neutral-200 bg-white p-4">
        <button
          onClick={() => setWorkflowFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            workflowFilter === "all"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setWorkflowFilter("sabq")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            workflowFilter === "sabq"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Sabq
        </button>
        <button
          onClick={() => setWorkflowFilter("sabqi")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            workflowFilter === "sabqi"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Sabqi
        </button>
        <button
          onClick={() => setWorkflowFilter("manzil")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            workflowFilter === "manzil"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Manzil
        </button>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Recitation History</h2>
        {loading ? (
          <div className="py-12 text-center text-neutral-500">Loading...</div>
        ) : history?.timeline && history.timeline.length > 0 ? (
          <RecitationTimeline
            entries={history.timeline}
            onEntryClick={handleTimelineClick}
            workflowFilter={workflowFilter}
          />
        ) : (
          <div className="py-12 text-center text-neutral-500">No recitation history found</div>
        )}
      </div>

      {/* Personal Mushaf Link */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-indigo-900">Personal Mushaf</h3>
            <p className="text-sm text-indigo-700">View all your marked mistakes on the interactive mushaf</p>
          </div>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
            View Mushaf
          </button>
        </div>
      </div>

      {/* Details Modal */}
      {selectedTicket && (
        <TicketDetailsPanel
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedTicket(null);
          }}
          ticket={selectedTicket}
          userRole="student"
          onRefresh={fetchRecitationHistory}
        />
      )}
    </div>
  );
}
