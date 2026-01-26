"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import { MistakeList } from "./MistakeList";
import type { TicketCardData } from "./TicketCard";

const reviewSchema = z.object({
  reviewNotes: z.string().optional(),
  assignHomework: z.boolean(),
  homeworkTitle: z.string().optional(),
  homeworkDescription: z.string().optional(),
  homeworkInstructions: z.string().optional(),
  homeworkDueDate: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

type TicketReviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketCardData | null;
  onSuccess: () => void;
};

export function TicketReviewModal({ isOpen, onClose, ticket, onSuccess }: TicketReviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      assignHomework: false,
    },
  });

  const assignHomework = watch("assignHomework");

  // Fetch ticket details when modal opens
  useEffect(() => {
    if (isOpen && ticket) {
      fetchTicketDetails();
    }
  }, [isOpen, ticket]);

  const fetchTicketDetails = async () => {
    if (!ticket) return;

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
      }
    } catch (error) {
      console.error("Failed to load ticket details");
    }
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (!ticket || !action) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      if (action === "approve") {
        const payload: any = {
          reviewNotes: data.reviewNotes || undefined,
        };

        if (data.assignHomework && data.homeworkTitle) {
          payload.homeworkAssignmentData = {
            title: data.homeworkTitle,
            description: data.homeworkDescription,
            instructions: data.homeworkInstructions,
            dueDate: data.homeworkDueDate,
          };
        }

        const response = await fetch(`/api/tickets/${ticket._id}/approve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (response.ok) {
          toast.success("Ticket approved successfully!");
          reset();
          onSuccess();
          onClose();
        } else {
          throw new Error(result.message || "Failed to approve ticket");
        }
      } else if (action === "reject") {
        if (!data.reviewNotes) {
          toast.error("Review notes are required for rejection");
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/tickets/${ticket._id}/reject`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reviewNotes: data.reviewNotes,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          toast.success("Ticket rejected");
          reset();
          onSuccess();
          onClose();
        } else {
          throw new Error(result.message || "Failed to reject ticket");
        }
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to process review");
    } finally {
      setLoading(false);
    }
  };

  if (!ticket) return null;

  const mistakesCount = ticketDetails?.mistakes?.length || 0;
  const studentName =
    ticket.studentId && typeof ticket.studentId === "object" && "userId" in ticket.studentId
      ? (ticket.studentId.userId as { fullName: string }).fullName
      : "Unknown Student";

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">
              Review Ticket - {studentName}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Ticket Info */}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-neutral-700">Workflow Step:</span>{" "}
                    <span className="text-neutral-900 capitalize">{ticket.workflowStep}</span>
                  </div>
                  <div>
                    <span className="font-medium text-neutral-700">Mistakes:</span>{" "}
                    <span className="text-neutral-900">{mistakesCount}</span>
                  </div>
                </div>
              </div>

              {/* Mistakes List */}
              {ticketDetails?.mistakes && ticketDetails.mistakes.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-medium text-neutral-700">Marked Mistakes</h3>
                  <MistakeList mistakes={ticketDetails.mistakes} />
                  {action === "approve" && mistakesCount > 0 && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <span>
                        {mistakesCount} mistake{mistakesCount !== 1 ? "s" : ""} will be added to the student's
                        Personal Mushaf upon approval.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Review Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Review Notes</label>
                <textarea
                  {...register("reviewNotes")}
                  rows={4}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter your review notes..."
                />
              </div>

              {/* Assign Homework (only for approve) */}
              {action === "approve" && (
                <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <label className="flex items-center gap-2">
                    <input
                      {...register("assignHomework")}
                      type="checkbox"
                      className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-neutral-700">Assign Homework</span>
                  </label>

                  {assignHomework && (
                    <div className="space-y-3 pl-6">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                          Title *
                        </label>
                        <input
                          {...register("homeworkTitle")}
                          type="text"
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="Enter homework title"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                          Description
                        </label>
                        <textarea
                          {...register("homeworkDescription")}
                          rows={2}
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="Enter homework description"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                          Instructions
                        </label>
                        <textarea
                          {...register("homeworkInstructions")}
                          rows={3}
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="Enter homework instructions"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-neutral-700">Due Date</label>
                        <input
                          {...register("homeworkDueDate")}
                          type="datetime-local"
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAction("reject");
                    handleSubmit(onSubmit)();
                  }}
                  disabled={loading || action === "approve"}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  {loading && action === "reject" ? "Rejecting..." : "Reject"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAction("approve");
                    handleSubmit(onSubmit)();
                  }}
                  disabled={loading || action === "reject"}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {loading && action === "approve" ? "Approving..." : "Approve"}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
