"use client";

import { useState, useMemo } from "react";
import { Search, SortAsc, SortDesc } from "lucide-react";
import { TicketCard, type TicketCardData } from "./TicketCard";
import type { TicketWorkflowStep, TicketStatus } from "@/lib/db/models/Ticket";

type FilterTab = "all" | TicketStatus;

type TicketListProps = {
  tickets: TicketCardData[];
  userRole: "student" | "teacher" | "admin" | "super_admin";
  loading?: boolean;
  onTicketClick: (ticket: TicketCardData) => void;
  onStart?: (ticket: TicketCardData) => void | Promise<void>;
  onReview?: (ticket: TicketCardData) => void;
  students?: Array<{ id: string; name: string }>;
};

export function TicketList({
  tickets,
  userRole,
  loading = false,
  onTicketClick,
  onStart,
  onReview,
  students = [],
}: TicketListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState<TicketWorkflowStep | "all">("all");
  const [studentFilter, setStudentFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredAndSorted = useMemo(() => {
    let filtered = [...tickets];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => {
        const studentName =
          t.studentId && typeof t.studentId === "object" && "userId" in t.studentId
            ? (t.studentId.userId as { fullName: string }).fullName.toLowerCase()
            : "";
        return studentName.includes(query) || t.workflowStep.toLowerCase().includes(query);
      });
    }

    // Apply tab filter
    if (activeTab !== "all") {
      filtered = filtered.filter((t) => t.status === activeTab);
    }

    // Apply workflow filter
    if (workflowFilter !== "all") {
      filtered = filtered.filter((t) => t.workflowStep === workflowFilter);
    }

    // Apply student filter
    if (studentFilter !== "all") {
      filtered = filtered.filter((t) => {
        const studentId =
          t.studentId && typeof t.studentId === "object" && "_id" in t.studentId
            ? (t.studentId as any)._id.toString()
            : "";
        return studentId === studentFilter;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  }, [tickets, activeTab, searchQuery, workflowFilter, studentFilter, sortOrder]);

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: "all", label: "All", count: tickets.length },
    { id: "pending", label: "Pending" },
    { id: "in-progress", label: "In Progress" },
    { id: "submitted", label: "Submitted" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {students.length > 0 && (
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={workflowFilter}
            onChange={(e) => setWorkflowFilter(e.target.value as TicketWorkflowStep | "all")}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Steps</option>
            <option value="sabq">Sabq</option>
            <option value="sabqi">Sabqi</option>
            <option value="manzil">Manzil</option>
          </select>

          <button
            className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 hover:bg-neutral-50"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-neutral-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tickets Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
          <p className="text-neutral-500">No tickets found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((ticket) => (
            <TicketCard
              key={ticket._id}
              ticket={ticket}
              userRole={userRole}
              onStart={onStart ? () => onStart(ticket) : undefined}
              onView={() => onTicketClick(ticket)}
              onReview={onReview ? () => onReview(ticket) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
