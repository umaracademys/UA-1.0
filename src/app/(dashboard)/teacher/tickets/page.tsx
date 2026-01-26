"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Plus, BookOpen, Clock, CheckCircle } from "lucide-react";
import { CreateTicketModal } from "@/components/modules/tickets/CreateTicketModal";
import { TicketList } from "@/components/modules/tickets/TicketList";
import { TicketDetailsPanel } from "@/components/modules/tickets/TicketDetailsPanel";
import { TicketReviewModal } from "@/components/modules/tickets/TicketReviewModal";
import type { TicketCardData } from "@/components/modules/tickets/TicketCard";
import toast from "react-hot-toast";

export default function TeacherTicketsPage() {
  const [tickets, setTickets] = useState<TicketCardData[]>([]);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketCardData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in-progress" | "submitted">("all");

  useEffect(() => {
    fetchTickets();
    fetchStudents();
  }, [statusFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/tickets?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setTickets(result.tickets || []);
      } else {
        toast.error(result.message || "Failed to load tickets");
      }
    } catch (error) {
      toast.error("Failed to load tickets");
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
        const formattedStudents = studentsList.map((s: any) => ({
          id: s._id,
          name: s.userId?.fullName || "Unknown",
        }));
        setStudents(formattedStudents);
      }
    } catch (error) {
      console.error("Failed to load students");
    }
  };

  const handleTicketClick = (ticket: TicketCardData) => {
    setSelectedTicket(ticket);
    setIsDetailsOpen(true);
  };

  const handleStart = async (ticket: TicketCardData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticket._id}/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("Ticket started successfully");
        fetchTickets();
      } else {
        toast.error(result.message || "Failed to start ticket");
      }
    } catch (error) {
      toast.error("Failed to start ticket");
    }
  };

  const pendingCount = tickets.filter((t) => t.status === "pending").length;
  const inProgressCount = tickets.filter((t) => t.status === "in-progress").length;
  const submittedCount = tickets.filter((t) => t.status === "submitted").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Recitation Tickets</h1>
          <p className="mt-1 text-sm text-neutral-600">Manage student recitation tickets</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Create Ticket
        </button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Pending</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{pendingCount}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 text-yellow-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">In Progress</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{inProgressCount}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 text-blue-700">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Submitted</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{submittedCount}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 text-green-700">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 rounded-lg border border-neutral-200 bg-white p-4">
        <button
          onClick={() => setStatusFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "pending"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setStatusFilter("in-progress")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "in-progress"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setStatusFilter("submitted")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "submitted"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Submitted
        </button>
      </div>

      {/* Tickets List */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <TicketList
          tickets={tickets}
          userRole="teacher"
          loading={loading}
          onTicketClick={handleTicketClick}
          onStart={handleStart}
          students={students}
        />
      </div>

      {/* Modals */}
      {isCreateOpen && (
        <CreateTicketModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={fetchTickets}
        />
      )}

      {selectedTicket && (
        <TicketDetailsPanel
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedTicket(null);
          }}
          ticket={selectedTicket}
          userRole="teacher"
          onRefresh={fetchTickets}
        />
      )}
    </div>
  );
}
