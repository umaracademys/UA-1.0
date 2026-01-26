"use client";

import { useState, useEffect } from "react";
import { X, File, Download, Edit, Trash2, BookOpen, FileText, Mic } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { SubmissionForm } from "./SubmissionForm";
import { GradeHomeworkModal } from "./GradeHomeworkModal";
import type { AssignmentCardData } from "./AssignmentCard";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";

type AssignmentDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  assignment: AssignmentCardData | null;
  userRole: "student" | "teacher" | "admin";
  onRefresh: () => void;
};

export function AssignmentDetailsModal({
  isOpen,
  onClose,
  assignment,
  userRole,
  onRefresh,
}: AssignmentDetailsModalProps) {
  const { user } = useAuth();
  const [assignmentDetails, setAssignmentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const { hasPermission } = usePermissions();

  useEffect(() => {
    if (isOpen && assignment) {
      fetchAssignmentDetails();
    }
  }, [isOpen, assignment]);

  const fetchAssignmentDetails = async () => {
    if (!assignment) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/assignments/${assignment._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setAssignmentDetails(result.data);
      } else {
        toast.error(result.message || "Failed to load assignment details");
      }
    } catch (error) {
      toast.error("Failed to load assignment details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!assignment || !confirm("Are you sure you want to delete this assignment?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/assignments/${assignment._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("Assignment deleted successfully");
        onRefresh();
        onClose();
      } else {
        toast.error(result.message || "Failed to delete assignment");
      }
    } catch (error) {
      toast.error("Failed to delete assignment");
    }
  };

  if (!assignment) return null;

  const canEdit = hasPermission("assignments.edit");
  const canDelete = hasPermission("assignments.delete");
  const canGrade = hasPermission("assignments.grade_homework");

  const homeworkSubmission = assignmentDetails?.homework?.submission;
  const classwork = assignmentDetails?.classwork;
  const homework = assignmentDetails?.homework;

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                Assignment: {assignment.studentName}
              </Dialog.Title>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    onClick={() => {
                      toast("Edit functionality coming soon");
                    }}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="rounded-md p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="py-12 text-center text-neutral-500">Loading...</div>
              ) : (
                <div className="space-y-6">
                  {/* Assignment Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {assignment.assignedByRole}
                      </span>
                      <span className="text-sm text-neutral-600">
                        Assigned by: {assignment.assignedByName}
                      </span>
                      {assignment.createdAt && (
                        <span className="text-sm text-neutral-600">
                          • {format(new Date(assignment.createdAt), "MMM dd, yyyy")}
                        </span>
                      )}
                    </div>

                    {assignment.comment && (
                      <div>
                        <h3 className="mb-2 text-sm font-medium text-neutral-700">Comment</h3>
                        <p className="whitespace-pre-wrap text-sm text-neutral-900">{assignment.comment}</p>
                      </div>
                    )}

                    {/* Classwork Section */}
                    {classwork && (
                      <div className="rounded-lg border border-neutral-200 p-4">
                        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Classwork</h3>
                        <div className="space-y-4">
                          {/* Sabq */}
                          {classwork.sabq && classwork.sabq.length > 0 && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-neutral-600">
                                <BookOpen className="h-4 w-4" />
                                Sabq ({classwork.sabq.length})
                              </h4>
                              <div className="space-y-2">
                                {classwork.sabq.map((entry: any, index: number) => (
                                  <div
                                    key={index}
                                    className="rounded border border-neutral-200 bg-neutral-50 p-2 text-xs"
                                  >
                                    <p className="font-medium">{entry.assignmentRange}</p>
                                    {entry.details && <p className="text-neutral-600">{entry.details}</p>}
                                    {entry.surahName && (
                                      <p className="text-neutral-500">
                                        {entry.surahName} {entry.fromAyah && `Ayah ${entry.fromAyah}`}
                                        {entry.toAyah && entry.toAyah !== entry.fromAyah
                                          ? `-${entry.toAyah}`
                                          : ""}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sabqi */}
                          {classwork.sabqi && classwork.sabqi.length > 0 && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-neutral-600">
                                <BookOpen className="h-4 w-4" />
                                Sabqi ({classwork.sabqi.length})
                              </h4>
                              <div className="space-y-2">
                                {classwork.sabqi.map((entry: any, index: number) => (
                                  <div
                                    key={index}
                                    className="rounded border border-neutral-200 bg-neutral-50 p-2 text-xs"
                                  >
                                    <p className="font-medium">{entry.assignmentRange}</p>
                                    {entry.details && <p className="text-neutral-600">{entry.details}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Manzil */}
                          {classwork.manzil && classwork.manzil.length > 0 && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-neutral-600">
                                <BookOpen className="h-4 w-4" />
                                Manzil ({classwork.manzil.length})
                              </h4>
                              <div className="space-y-2">
                                {classwork.manzil.map((entry: any, index: number) => (
                                  <div
                                    key={index}
                                    className="rounded border border-neutral-200 bg-neutral-50 p-2 text-xs"
                                  >
                                    <p className="font-medium">{entry.assignmentRange}</p>
                                    {entry.details && <p className="text-neutral-600">{entry.details}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Homework Section */}
                    {homework && (
                      <div className="rounded-lg border border-neutral-200 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-neutral-900">Homework</h3>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              homework.enabled
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {homework.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>

                        {homework.enabled && (
                          <div className="space-y-4">
                            {/* Homework Items */}
                            {homework.items && homework.items.length > 0 && (
                              <div>
                                <h4 className="mb-2 text-xs font-medium text-neutral-600">Homework Items</h4>
                                <div className="space-y-2">
                                  {homework.items.map((item: any, index: number) => (
                                    <div
                                      key={index}
                                      className="rounded border border-neutral-200 bg-neutral-50 p-3 text-xs"
                                    >
                                      <div className="mb-1 flex items-center gap-2">
                                        <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                          {item.type}
                                        </span>
                                        <span className="text-neutral-600">{item.range.mode}</span>
                                      </div>
                                      <p className="font-medium">
                                        {item.range.from.surahName} Ayah {item.range.from.ayah} -{" "}
                                        {item.range.to.surahName} Ayah {item.range.to.ayah}
                                      </p>
                                      {item.content && (
                                        <p className="mt-1 text-neutral-600">{item.content}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Qaidah Homework */}
                            {homework.qaidahHomework && (
                              <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-xs">
                                <h4 className="mb-2 font-medium text-neutral-900">Qaidah Homework</h4>
                                <p>
                                  {homework.qaidahHomework.book} - Page {homework.qaidahHomework.page}
                                </p>
                              </div>
                            )}

                            {/* PDF */}
                            {homework.pdfId && (
                              <div>
                                <h4 className="mb-2 text-xs font-medium text-neutral-600">PDF Document</h4>
                                <a
                                  href={`/pdfs/${homework.pdfId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700 hover:bg-neutral-50"
                                >
                                  <File className="h-4 w-4 text-neutral-400" />
                                  <span className="flex-1">View PDF</span>
                                  <Download className="h-4 w-4 text-neutral-400" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Student View - Homework Submission */}
                  {userRole === "student" && homework?.enabled && (
                    <div className="border-t border-neutral-200 pt-6">
                      {homeworkSubmission?.submitted ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-green-600" />
                            <h3 className="text-lg font-semibold text-neutral-900">Your Submission</h3>
                          </div>

                          {homeworkSubmission.submittedAt && (
                            <p className="text-sm text-neutral-600">
                              Submitted:{" "}
                              {format(new Date(homeworkSubmission.submittedAt), "MMM dd, yyyy 'at' h:mm a")}
                            </p>
                          )}

                          {homeworkSubmission.content && (
                            <div>
                              <h4 className="mb-2 text-sm font-medium text-neutral-700">Content</h4>
                              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                                <p className="whitespace-pre-wrap text-sm text-neutral-900">
                                  {homeworkSubmission.content}
                                </p>
                              </div>
                            </div>
                          )}

                          {homeworkSubmission.link && (
                            <div>
                              <h4 className="mb-2 text-sm font-medium text-neutral-700">Link</h4>
                              <a
                                href={homeworkSubmission.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-indigo-600 hover:underline"
                              >
                                {homeworkSubmission.link}
                              </a>
                            </div>
                          )}

                          {homeworkSubmission.audioUrl && (
                            <div>
                              <h4 className="mb-2 text-sm font-medium text-neutral-700">Audio Recording</h4>
                              <div className="flex items-center gap-2">
                                <Mic className="h-4 w-4 text-neutral-400" />
                                <audio src={homeworkSubmission.audioUrl} controls className="flex-1" />
                              </div>
                            </div>
                          )}

                          {homeworkSubmission.attachments && homeworkSubmission.attachments.length > 0 && (
                            <div>
                              <h4 className="mb-2 text-sm font-medium text-neutral-700">Attachments</h4>
                              <div className="space-y-2">
                                {homeworkSubmission.attachments.map((attachment: any, index: number) => (
                                  <a
                                    key={index}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700 hover:bg-neutral-50"
                                  >
                                    <File className="h-4 w-4 text-neutral-400" />
                                    <span className="flex-1">{attachment.name}</span>
                                    <Download className="h-4 w-4 text-neutral-400" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {homeworkSubmission.grade !== undefined && (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                              <h4 className="mb-2 text-sm font-medium text-green-900">Grade</h4>
                              <p className="text-2xl font-bold text-green-700">{homeworkSubmission.grade}</p>
                              {homeworkSubmission.feedback && (
                                <div className="mt-3">
                                  <h5 className="mb-1 text-xs font-medium text-green-800">Feedback</h5>
                                  <p className="whitespace-pre-wrap text-sm text-green-700">
                                    {homeworkSubmission.feedback}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-yellow-600" />
                            <h3 className="text-lg font-semibold text-neutral-900">Submit Homework</h3>
                          </div>
                          <SubmissionForm
                            assignmentId={assignment._id}
                            studentId={assignment.studentId}
                            studentName={assignment.studentName}
                            onSubmit={() => {
                              fetchAssignmentDetails();
                              onRefresh();
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Teacher/Admin View - Grade Homework */}
                  {(userRole === "teacher" || userRole === "admin") &&
                    homework?.enabled &&
                    homeworkSubmission?.submitted &&
                    canGrade && (
                      <div className="border-t border-neutral-200 pt-6">
                        <div className="mb-4">
                          <h3 className="mb-2 text-lg font-semibold text-neutral-900">Grade Homework</h3>
                          {homeworkSubmission.status === "graded" ? (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                              <p className="text-sm font-medium text-green-900">
                                Graded by {homeworkSubmission.gradedByName} on{" "}
                                {homeworkSubmission.gradedAt &&
                                  format(new Date(homeworkSubmission.gradedAt), "MMM dd, yyyy")}
                              </p>
                              {homeworkSubmission.grade !== undefined && (
                                <p className="mt-2 text-2xl font-bold text-green-700">
                                  Grade: {homeworkSubmission.grade}
                                </p>
                              )}
                              {homeworkSubmission.feedback && (
                                <p className="mt-2 text-sm text-green-700">{homeworkSubmission.feedback}</p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowGradeModal(true)}
                              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                              Grade Homework
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {showGradeModal && assignmentDetails && (
        <GradeHomeworkModal
          isOpen={showGradeModal}
          onClose={() => {
            setShowGradeModal(false);
          }}
          assignmentId={assignment._id}
          assignment={assignmentDetails}
          onSuccess={() => {
            fetchAssignmentDetails();
            onRefresh();
          }}
        />
      )}
    </>
  );
}
