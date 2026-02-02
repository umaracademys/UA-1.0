"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Send, Pause, PlayCircle, CheckCircle, XCircle, Clock, User, FileText, BookOpen, List } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import { MistakeList } from "./MistakeList";
import { InteractiveMushaf } from "@/components/modules/mushaf/InteractiveMushaf";
import type { TicketCardData } from "./TicketCard";
import type { TicketMistake } from "@/lib/db/models/Ticket";

// Heartbeat runs every ~45 seconds. Interval runs only when ticket is in-progress and panel is mounted. Page refresh does not kill the ticket (server state is authoritative).
const HEARTBEAT_INTERVAL_MS = 45 * 1000;

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
  const [sessionNotes, setSessionNotes] = useState("");
  const [listeningElapsedSeconds, setListeningElapsedSeconds] = useState<number | null>(null);
  const [showHistoricalInMushaf, setShowHistoricalInMushaf] = useState(false);
  const [startRange, setStartRange] = useState<{ fromSurah: number; fromAyah: number; toSurah: number; toAyah: number } | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen && ticket) {
      fetchTicketDetails();
    }
  }, [isOpen, ticket]);

  const sendHeartbeat = useCallback(async () => {
    if (!ticket?._id) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/tickets/${ticket._id}/heartbeat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTicketDetails((prev: any) => (prev ? { ...prev, lastHeartbeatAt: data.lastHeartbeatAt } : prev));
      }
    } catch {
      // Non-blocking; session still valid
    }
  }, [ticket?._id]);

  useEffect(() => {
    if (!isOpen || !ticket) return;
    const isActive = ticketDetails?.status === "in-progress" && userRole === "teacher";
    if (isActive) {
      heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
      return () => {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      };
    }
  }, [isOpen, ticket, ticketDetails?.status, userRole, sendHeartbeat]);

  // Listening timer: elapsed time when ticket is in-progress or paused. Survives refresh (server has startedAt).
  useEffect(() => {
    if (!ticketDetails?.startedAt || (ticketDetails?.status !== "in-progress" && ticketDetails?.status !== "paused")) {
      setListeningElapsedSeconds(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    const updateElapsed = () => {
      const started = new Date(ticketDetails.startedAt).getTime();
      setListeningElapsedSeconds(Math.floor((Date.now() - started) / 1000));
    };
    updateElapsed();
    timerRef.current = setInterval(updateElapsed, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [ticketDetails?.startedAt, ticketDetails?.status]);

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

  const handleStart = async (ayahRange?: { fromSurah: number; fromAyah: number; toSurah: number; toAyah: number }, assignmentId?: string) => {
    if (!ticket) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const body: Record<string, unknown> = {};
      if (ayahRange) {
        body.fromSurah = ayahRange.fromSurah;
        body.fromAyah = ayahRange.fromAyah;
        body.toSurah = ayahRange.toSurah;
        body.toAyah = ayahRange.toAyah;
      }
      if (assignmentId) body.assignmentId = assignmentId;

      const response = await fetch(`/api/tickets/${ticket._id}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: Object.keys(body).length ? JSON.stringify(body) : undefined,
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("Ticket started. Session is locked; heartbeat keeps it alive.");
        await fetchTicketDetails();
        onRefresh();
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

  const handlePause = async () => {
    if (!ticket) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/tickets/${ticket._id}/pause`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("Ticket paused. You can resume later.");
        await fetchTicketDetails();
        onRefresh();
      } else {
        toast.error(result.message || "Failed to pause");
      }
    } catch {
      toast.error("Failed to pause");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResume = async () => {
    if (!ticket) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/tickets/${ticket._id}/resume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("Ticket resumed.");
        await fetchTicketDetails();
        onRefresh();
      } else {
        toast.error(result.message || "Failed to resume");
      }
    } catch {
      toast.error("Failed to resume");
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
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionNotes: sessionNotes.trim() || undefined }),
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("Ticket submitted for review");
        setSessionNotes("");
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
                  {(ticketDetails?.status === "in-progress" || ticketDetails?.status === "paused") && userRole === "teacher" && (
                <div className="flex flex-wrap items-center gap-3">
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
                  {listeningElapsedSeconds != null && (
                    <span className="rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary" title="Listening time (survives refresh)">
                      Listening: {Math.floor(listeningElapsedSeconds / 60)}:{String(listeningElapsedSeconds % 60).padStart(2, "0")}
                    </span>
                  )}
                  {viewMode === "mushaf" && (
                    <label className="flex items-center gap-1.5 text-xs text-neutral-600">
                      <input
                        type="checkbox"
                        checked={showHistoricalInMushaf}
                        onChange={(e) => setShowHistoricalInMushaf(e.target.checked)}
                        className="rounded border-neutral-300 text-primary focus:ring-primary"
                      />
                      Show past mistakes
                    </label>
                  )}
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
            ) : viewMode === "mushaf" && (ticketDetails?.status === "in-progress" || ticketDetails?.status === "paused") ? (
                <div className="h-full">
                <InteractiveMushaf
                  mode="marking"
                  studentId={ticketDetails?.studentId?._id || ticketDetails?.studentId}
                  ticketId={ticket._id}
                  showHistoricalMistakes={showHistoricalInMushaf}
                  ayahRange={ticketDetails?.ayahRange}
                  rangeLocked={ticketDetails?.rangeLocked}
                  onMistakeMarked={async () => {
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

                {/* Ayah range (when set) */}
                {ticketDetails?.ayahRange && (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <h3 className="mb-1 text-sm font-medium text-neutral-700">Listening range</h3>
                    <p className="text-sm text-neutral-600">
                      Surah {ticketDetails.ayahRange.fromSurah} Ayah {ticketDetails.ayahRange.fromAyah}
                      {" → "}
                      Surah {ticketDetails.ayahRange.toSurah} Ayah {ticketDetails.ayahRange.toAyah}
                      {ticketDetails?.rangeLocked && (
                        <span className="ml-2 text-xs text-amber-600">(locked)</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Listening duration (when submitted) */}
                {ticketDetails?.listeningDurationSeconds != null && (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <h3 className="mb-1 text-sm font-medium text-neutral-700">Listening duration</h3>
                    <p className="text-sm text-neutral-600">
                      {Math.floor(ticketDetails.listeningDurationSeconds / 60)}m {ticketDetails.listeningDurationSeconds % 60}s
                    </p>
                  </div>
                )}

                {/* Session notes (teacher notes during listening) */}
                {ticketDetails?.sessionNotes && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-neutral-700">Session notes</h3>
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <p className="text-sm text-neutral-900 whitespace-pre-wrap">{ticketDetails.sessionNotes}</p>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h3 className="mb-3 text-sm font-medium text-neutral-700">Timeline</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Clock className="h-4 w-4" />
                      <span>Created: {format(new Date(ticket.createdAt), "MMM dd, yyyy 'at' h:mm a")}</span>
                    </div>
                    {ticketDetails?.startedAt && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Play className="h-4 w-4" />
                        <span>Started: {format(new Date(ticketDetails.startedAt), "MMM dd, yyyy 'at' h:mm a")}</span>
                      </div>
                    )}
                    {ticketDetails?.teacherId && !ticketDetails?.startedAt && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Play className="h-4 w-4" />
                        <span>
                          Teacher:{" "}
                          {ticketDetails.teacherId.userId?.fullName
                            ? ticketDetails.teacherId.userId.fullName
                            : ""}
                        </span>
                      </div>
                    )}
                    {ticketDetails?.submittedAt && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Send className="h-4 w-4" />
                        <span>Submitted: {format(new Date(ticketDetails.submittedAt), "MMM dd, yyyy 'at' h:mm a")}</span>
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

                {/* Optional listening range (teacher, pending ticket) */}
                {ticket.status === "pending" && userRole === "teacher" && (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <h3 className="mb-2 text-sm font-medium text-neutral-700">Listening range (optional)</h3>
                    <p className="mb-3 text-xs text-neutral-500">Set start and end ayah; range locks when you start.</p>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">From Surah</label>
                        <input
                          type="number"
                          min={1}
                          max={114}
                          value={startRange?.fromSurah ?? ""}
                          onChange={(e) => setStartRange((r) => ({ ...(r ?? { fromSurah: 1, fromAyah: 1, toSurah: 1, toAyah: 1 }), fromSurah: parseInt(e.target.value, 10) || 1 }))}
                          className="w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">From Ayah</label>
                        <input
                          type="number"
                          min={1}
                          value={startRange?.fromAyah ?? ""}
                          onChange={(e) => setStartRange((r) => ({ ...(r ?? { fromSurah: 1, fromAyah: 1, toSurah: 1, toAyah: 1 }), fromAyah: parseInt(e.target.value, 10) || 1 }))}
                          className="w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">To Surah</label>
                        <input
                          type="number"
                          min={1}
                          max={114}
                          value={startRange?.toSurah ?? ""}
                          onChange={(e) => setStartRange((r) => ({ ...(r ?? { fromSurah: 1, fromAyah: 1, toSurah: 1, toAyah: 1 }), toSurah: parseInt(e.target.value, 10) || 1 }))}
                          className="w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">To Ayah</label>
                        <input
                          type="number"
                          min={1}
                          value={startRange?.toAyah ?? ""}
                          onChange={(e) => setStartRange((r) => ({ ...(r ?? { fromSurah: 1, fromAyah: 1, toSurah: 1, toAyah: 1 }), toAyah: parseInt(e.target.value, 10) || 1 }))}
                          className="w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-200 pt-4">
                  {ticket.status === "pending" && userRole === "teacher" && (
                    <button
                      onClick={() => {
                        const range =
                          startRange &&
                          startRange.fromSurah >= 1 &&
                          startRange.fromAyah >= 1 &&
                          startRange.toSurah >= 1 &&
                          startRange.toAyah >= 1
                            ? startRange
                            : undefined;
                        handleStart(range);
                      }}
                      disabled={submitting}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      {submitting ? "Starting..." : "Start Ticket"}
                    </button>
                  )}

                  {(ticket.status === "in-progress" || ticket.status === "paused") && userRole === "teacher" && (
                    <>
                      <button
                        onClick={() => setViewMode(viewMode === "mushaf" ? "details" : "mushaf")}
                        className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <BookOpen className="h-4 w-4" />
                        {viewMode === "mushaf" ? "View Details" : "Open Mushaf"}
                      </button>
                      {ticket.status === "in-progress" && (
                        <button
                          onClick={handlePause}
                          disabled={submitting}
                          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                        >
                          <Pause className="h-4 w-4" />
                          Pause
                        </button>
                      )}
                      {ticket.status === "paused" && (
                        <button
                          onClick={handleResume}
                          disabled={submitting}
                          className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100 disabled:opacity-50"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Resume
                        </button>
                      )}
                      <div className="w-full border-t border-neutral-100 pt-3">
                        <label className="mb-1 block text-xs font-medium text-neutral-500">Session notes (saved on submit)</label>
                        <textarea
                          value={sessionNotes}
                          onChange={(e) => setSessionNotes(e.target.value)}
                          placeholder="Notes during listening..."
                          rows={2}
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
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
