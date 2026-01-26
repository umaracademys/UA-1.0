"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import type { TicketWorkflowStep } from "@/lib/db/models/Ticket";

const ticketSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  workflowStep: z.enum(["sabq", "sabqi", "manzil"]),
  notes: z.string().optional(),
  audioUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type TicketFormData = z.infer<typeof ticketSchema>;

type StudentOption = {
  id: string;
  name: string;
  email: string;
};

type CreateTicketModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function CreateTicketModal({ isOpen, onClose, onSuccess }: CreateTicketModalProps) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      workflowStep: "sabq",
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen]);

  const fetchStudents = async () => {
    setFetchingStudents(true);
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
        const formattedStudents: StudentOption[] = studentsList.map((s: any) => ({
          id: s._id,
          name: s.userId?.fullName || "Unknown",
          email: s.userId?.email || "",
        }));
        setStudents(formattedStudents);
      } else {
        console.error("Failed to load students:", result.message);
        toast.error(result.message || "Failed to load students");
      }
    } catch (error) {
      console.error("Failed to load students");
    } finally {
      setFetchingStudents(false);
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const onSubmit = async (data: TicketFormData) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create ticket");
      }

      toast.success("Ticket created successfully!");
      reset();
      setSearchQuery("");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  const selectedStudentId = watch("studentId");

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">
              Create Recitation Ticket
            </Dialog.Title>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6">
            <div className="space-y-4">
              {/* Student Selection */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Student *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-neutral-200">
                  {fetchingStudents ? (
                    <div className="py-4 text-center text-sm text-neutral-500">Loading students...</div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="py-4 text-center text-sm text-neutral-500">No students found</div>
                  ) : (
                    filteredStudents.map((student) => (
                      <label
                        key={student.id}
                        className="flex cursor-pointer items-center gap-2 border-b border-neutral-100 p-3 last:border-b-0 hover:bg-neutral-50"
                      >
                        <input
                          {...register("studentId")}
                          type="radio"
                          value={student.id}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-neutral-900">{student.name}</p>
                          <p className="text-xs text-neutral-500">{student.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {errors.studentId && (
                  <p className="mt-1 text-xs text-red-600">{errors.studentId.message}</p>
                )}
              </div>

              {/* Workflow Step */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Workflow Step *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      {...register("workflowStep")}
                      type="radio"
                      value="sabq"
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm">Sabq</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      {...register("workflowStep")}
                      type="radio"
                      value="sabqi"
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm">Sabqi</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      {...register("workflowStep")}
                      type="radio"
                      value="manzil"
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm">Manzil</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Notes</label>
                <textarea
                  {...register("notes")}
                  rows={4}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter any notes about this recitation..."
                />
              </div>

              {/* Audio URL */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Audio URL (Optional)</label>
                <input
                  {...register("audioUrl")}
                  type="url"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="https://..."
                />
                {errors.audioUrl && <p className="mt-1 text-xs text-red-600">{errors.audioUrl.message}</p>}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedStudentId}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Ticket"}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
