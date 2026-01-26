"use client";

import { useState, useEffect } from "react";
import { X, Play, Send, CheckCircle, XCircle, Clock, User, FileText, BookOpen, List } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import { MistakeList } from "./MistakeList";
import { InteractiveMushaf } from "@/components/modules/mushaf/InteractiveMushaf";
import type { TicketCardData } from "./TicketCard";
import type { TicketMistake } from "@/lib/db/models/Ticket";

type TicketDetailsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketCardData | null;
  userRole: "student" | "teacher" | "admin" | "super_admin";
  onRefresh: () => void;
  onReview?: () => void;
};

export function TicketDetailsPanel({
  isOpen,
  onClose,
  ticket,
  userRole,
  onRefresh,
  onReview,
}: TicketDetailsPanelProps) {
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"details" | "mushaf">("details");

  useEffect(() => {
    if (isOpen && ticket) {
      fetchTicketDetails();
    }
  }, [isOpen, ticket]);

  const fetchTicketDetails = async () => {
    if (!ticket) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticket._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setTicketDetails(result.ticket);
        // Auto-switch to Mushaf view if ticket is in-progress and teacher
        if (result.ticket?.status === "in-progress" && userRole === "teacher") {
          setViewMode("mushaf");
        }
      } else {
        toast.error(result.message || "Failed to load ticket details");
      }
    } catch (error) {
      toast.error("Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!ticket) return;

    setSubmitting(true);
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
        await fetchTicketDetails();
        onRefresh();
        // Automatically switch to Mushaf view when ticket is started
        setViewMode("mushaf");
      } else {
        toast.error(result.message || "Failed to start ticket");
      }
    } catch (error) {
      toast.error("Failed to start ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!ticket) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticket._id}/submit-for-review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("Ticket submitted for review");
        fetchTicketDetails();
        onRefresh();
      } else {
        toast.error(result.message || "Failed to submit ticket");
      }
    } catch (error) {
      toast.error("Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ticket) return null;

  const studentName =
    ticket.studentId && typeof ticket.studentId === "object" && "userId" in ticket.studentId
      ? (ticket.studentId.userId as { fullName: string }).fullName
      : "Unknown Student";

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className={`w-full rounded-lg bg-white shadow-xl ${
          viewMode === "mushaf" ? "max-w-[95vw] h-[95vh]" : "max-w-4xl"
        }`}>
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                Ticket Details - {studentName}
              </Dialog.Title>
              {ticketDetails?.status === "in-progress" && userRole === "teacher" && (
                <div className="flex gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
                  <button
                    onClick={() => setViewMode("details")}
                    className={`flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors ${
                      viewMode === "details"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    Details
                  </button>
                  <button
                    onClick={() => setViewMode("mushaf")}
                    className={`flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors ${
                      viewMode === "mushaf"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Mushaf
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className={viewMode === "mushaf" ? "h-[calc(95vh-80px)] overflow-hidden" : "max-h-[calc(100vh-200px)] overflow-y-auto p-6"}>
            {loading ? (
              <div className="py-12 text-center text-neutral-500">Loading...</div>
            ) : viewMode === "mushaf" && ticketDetails?.status === "in-progress" ? (
              <div className="h-full">
                <InteractiveMushaf
                  mode="marking"
                  studentId={ticketDetails?.studentId?._id || ticketDetails?.studentId}
                  ticketId={ticket._id}
                  showHistoricalMistakes={false}
                  onMistakeMarked={async () => {
                    // Refresh ticket details after mistake is marked
                    await fetchTicketDetails();
                    onRefresh();
                  }}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Student Info */}
                <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <div className="rounded-full bg-indigo-100 p-3 text-indigo-700">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">{studentName}</p>
                    <p className="text-sm text-neutral-600">
                      {ticketDetails?.studentId?.userId?.email || ""}
                    </p>
                  </div>
                </div>

                {/* Workflow Step and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">Workflow Step</label>
                    <p className="text-sm font-semibold text-neutral-900 capitalize">{ticket.workflowStep}</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
                    <p className="text-sm font-semibold text-neutral-900 capitalize">
                      {ticket.status.replace("-", " ")}
                    </p>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="mb-3 text-sm font-medium text-neutral-700">Timeline</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Clock className="h-4 w-4" />
                      <span>Created: {format(new Date(ticket.createdAt), "MMM dd, yyyy 'at' h:mm a")}</span>
                    </div>
                    {ticketDetails?.teacherId && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Play className="h-4 w-4" />
                        <span>
                          Started:{" "}
                          {ticketDetails.teacherId.userId?.fullName
                            ? `by ${ticketDetails.teacherId.userId.fullName}`
                            : ""}
                        </span>
                      </div>
                    )}
                    {ticketDetails?.reviewedAt && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        {ticket.status === "approved" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span>
                          {ticket.status === "approved" ? "Approved" : "Rejected"}:{" "}
                          {format(new Date(ticketDetails.reviewedAt), "MMM dd, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {ticketDetails?.notes && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-neutral-700">Notes</h3>
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <p className="text-sm text-neutral-900 whitespace-pre-wrap">{ticketDetails.notes}</p>
                    </div>
                  </div>
                )}

                {/* Audio */}
                {ticketDetails?.audioUrl && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-neutral-700">Audio Recording</h3>
                    <audio controls className="w-full">
                      <source src={ticketDetails.audioUrl} />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}

                {/* Mistakes */}
                {ticketDetails?.mistakes && ticketDetails.mistakes.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-neutral-700">Mistakes</h3>
                    <MistakeList mistakes={ticketDetails.mistakes} />
                  </div>
                )}

                {/* Review Notes */}
                {ticketDetails?.reviewNotes && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-neutral-700">Review Notes</h3>
                    <div className="rounded-lg border border-neutral-200 bg-blue-50 p-3">
                      <p className="text-sm text-neutral-900 whitespace-pre-wrap">
                        {ticketDetails.reviewNotes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4">
                  {ticket.status === "pending" && userRole === "teacher" && (
                    <button
                      onClick={handleStart}
                      disabled={submitting}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      {submitting ? "Starting..." : "Start Ticket"}
                    </button>
                  )}

                  {ticket.status === "in-progress" && userRole === "teacher" && (
                    <>
                      <button
                        onClick={() => setViewMode(viewMode === "mushaf" ? "details" : "mushaf")}
                        className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <BookOpen className="h-4 w-4" />
                        {viewMode === "mushaf" ? "View Details" : "Open Mushaf"}
                      </button>
                      <button
                        onClick={handleSubmitForReview}
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        {submitting ? "Submitting..." : "Submit for Review"}
                      </button>
                    </>
                  )}

                  {ticket.status === "submitted" && (userRole === "admin" || userRole === "super_admin") && onReview && (
                    <button
                      onClick={onReview}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      <FileText className="h-4 w-4" />
                      Review Ticket
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
