"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { TicketList } from "@/components/modules/tickets/TicketList";
import { TicketDetailsPanel } from "@/components/modules/tickets/TicketDetailsPanel";
import { TicketReviewModal } from "@/components/modules/tickets/TicketReviewModal";
import type { TicketCardData } from "@/components/modules/tickets/TicketCard";
import toast from "react-hot-toast";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketCardData[]>([]);
  const [pendingTickets, setPendingTickets] = useState<TicketCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketCardData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [workflowFilter, setWorkflowFilter] = useState<"all" | "sabq" | "sabqi" | "manzil">("all");

  useEffect(() => {
    fetchTickets();
    fetchPendingTickets();
  }, [workflowFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.append("all", "true");
      if (workflowFilter !== "all") {
        params.append("workflowStep", workflowFilter);
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

  const fetchPendingTickets = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/tickets/pending-review", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setPendingTickets(result.tickets || []);
      }
    } catch (error) {
      console.error("Failed to load pending tickets");
    }
  };

  const handleTicketClick = (ticket: TicketCardData) => {
    setSelectedTicket(ticket);
    setIsDetailsOpen(true);
  };

  const handleReview = (ticket: TicketCardData) => {
    setSelectedTicket(ticket);
    setIsReviewOpen(true);
  };

  const pendingCount = pendingTickets.length;
  const approvedCount = tickets.filter((t) => t.status === "approved").length;
  const rejectedCount = tickets.filter((t) => t.status === "rejected").length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Ticket Review</h1>
        <p className="mt-1 text-sm text-neutral-600">Review and manage recitation tickets</p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Pending Review</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{pendingCount}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 text-yellow-700">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Approved</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{approvedCount}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 text-green-700">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Rejected</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{rejectedCount}</p>
            </div>
            <div className="rounded-full bg-red-100 p-3 text-red-700">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Review Section */}
      {pendingTickets.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-700" />
            <h2 className="text-lg font-semibold text-yellow-900">Pending Review ({pendingCount})</h2>
          </div>
          <TicketList
            tickets={pendingTickets}
            userRole="admin"
            loading={false}
            onTicketClick={handleTicketClick}
            onReview={handleReview}
          />
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 rounded-lg border border-neutral-200 bg-white p-4">
        <select
          value={workflowFilter}
          onChange={(e) => setWorkflowFilter(e.target.value as typeof workflowFilter)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="all">All Workflow Steps</option>
          <option value="sabq">Sabq</option>
          <option value="sabqi">Sabqi</option>
          <option value="manzil">Manzil</option>
        </select>
      </div>

      {/* All Tickets */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">All Tickets</h2>
        <TicketList
          tickets={tickets}
          userRole="admin"
          loading={loading}
          onTicketClick={handleTicketClick}
          onReview={handleReview}
        />
      </div>

      {/* Modals */}
      {selectedTicket && (
        <>
          <TicketDetailsPanel
            isOpen={isDetailsOpen}
            onClose={() => {
              setIsDetailsOpen(false);
              setSelectedTicket(null);
            }}
            ticket={selectedTicket}
            userRole="admin"
            onRefresh={() => {
              fetchTickets();
              fetchPendingTickets();
            }}
            onReview={() => {
              setIsDetailsOpen(false);
              setIsReviewOpen(true);
            }}
          />

          <TicketReviewModal
            isOpen={isReviewOpen}
            onClose={() => {
              setIsReviewOpen(false);
              setSelectedTicket(null);
            }}
            ticket={selectedTicket}
            onSuccess={() => {
              fetchTickets();
              fetchPendingTickets();
            }}
          />
        </>
      )}
    </div>
  );
}
