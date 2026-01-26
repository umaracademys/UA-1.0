"use client";

import { useState } from "react";
import { MoreVertical, User, FileText, Calendar, Star, MessageSquare, Download } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

type Student = {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
  };
  programType?: string;
  currentSabq?: string;
  currentSabqi?: string;
  currentManzil?: string;
  lastSession?: Date | string;
  status?: string;
};

type StudentTableProps = {
  students: Student[];
  onViewProfile?: (studentId: string) => void;
  onCreateTicket?: (studentId: string) => void;
  onRecordAttendance?: (studentId: string) => void;
  onSubmitEvaluation?: (studentId: string) => void;
  onSendMessage?: (studentId: string) => void;
  onExport?: () => void;
  loading?: boolean;
};

export function StudentTable({
  students,
  onViewProfile,
  onCreateTicket,
  onRecordAttendance,
  onSubmitEvaluation,
  onSendMessage,
  onExport,
  loading,
}: StudentTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "program" | "lastSession">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filteredStudents = students
    .filter((student) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        student.userId.fullName.toLowerCase().includes(searchLower) ||
        student.userId.email.toLowerCase().includes(searchLower) ||
        student.programType?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.userId.fullName.localeCompare(b.userId.fullName);
          break;
        case "program":
          comparison = (a.programType || "").localeCompare(b.programType || "");
          break;
        case "lastSession":
          const dateA = a.lastSession ? new Date(a.lastSession).getTime() : 0;
          const dateB = b.lastSession ? new Date(b.lastSession).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  if (loading) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">Assigned Students</h3>
        <div className="flex items-center gap-2">
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Table */}
      {filteredStudents.length === 0 ? (
        <div className="py-8 text-center text-sm text-neutral-500">No students found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
                  onClick={() => {
                    setSortBy("name");
                    setSortOrder(sortBy === "name" && sortOrder === "asc" ? "desc" : "asc");
                  }}
                >
                  Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
                  onClick={() => {
                    setSortBy("program");
                    setSortOrder(sortBy === "program" && sortOrder === "asc" ? "desc" : "asc");
                  }}
                >
                  Program {sortBy === "program" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Current Sabq
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
                  onClick={() => {
                    setSortBy("lastSession");
                    setSortOrder(sortBy === "lastSession" && sortOrder === "asc" ? "desc" : "asc");
                  }}
                >
                  Last Session {sortBy === "lastSession" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredStudents.map((student) => (
                <tr key={student._id} className="hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{student.userId.fullName}</p>
                      <p className="text-xs text-neutral-500">{student.userId.email}</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                    {student.programType || "N/A"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                    {student.currentSabq || "N/A"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                    {student.lastSession
                      ? format(new Date(student.lastSession), "MMM dd, yyyy")
                      : "Never"}
                  </td>
                  <td className="relative whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenu(openMenu === student._id ? null : student._id)
                        }
                        className="rounded-md p-1 text-neutral-600 hover:bg-neutral-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenu === student._id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenu(null)}
                          />
                          <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-neutral-200 bg-white shadow-lg">
                            <div className="py-1">
                              {onViewProfile && (
                                <button
                                  onClick={() => {
                                    onViewProfile(student._id);
                                    setOpenMenu(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                                >
                                  <User className="h-4 w-4" />
                                  View Profile
                                </button>
                              )}
                              {onCreateTicket && (
                                <button
                                  onClick={() => {
                                    onCreateTicket(student._id);
                                    setOpenMenu(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                                >
                                  <FileText className="h-4 w-4" />
                                  Create Ticket
                                </button>
                              )}
                              {onRecordAttendance && (
                                <button
                                  onClick={() => {
                                    onRecordAttendance(student._id);
                                    setOpenMenu(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                                >
                                  <Calendar className="h-4 w-4" />
                                  Record Attendance
                                </button>
                              )}
                              {onSubmitEvaluation && (
                                <button
                                  onClick={() => {
                                    onSubmitEvaluation(student._id);
                                    setOpenMenu(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                                >
                                  <Star className="h-4 w-4" />
                                  Submit Evaluation
                                </button>
                              )}
                              {onSendMessage && (
                                <button
                                  onClick={() => {
                                    onSendMessage(student._id);
                                    setOpenMenu(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  Send Message
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
