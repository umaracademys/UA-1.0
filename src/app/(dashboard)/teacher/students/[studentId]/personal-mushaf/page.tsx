"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { PersonalMushafView } from "@/components/modules/mushaf/PersonalMushafView";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import toast from "react-hot-toast";

export default function TeacherStudentPersonalMushafPage({
  params,
}: {
  params: { studentId: string };
}) {
  const router = useRouter();
  const [studentName, setStudentName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, [params.studentId]);

  const fetchStudentData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students/${params.studentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.student?.userId?.fullName) {
        setStudentName(result.student.userId.fullName);
      }
    } catch (error) {
      console.error("Failed to load student data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-indigo-600 mx-auto" />
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="mushaf.access">
      <div className="flex h-screen flex-col">
        {/* Header */}
        <div className="border-b border-neutral-200 bg-white px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-100 p-2 text-indigo-700">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-neutral-900">
                  {studentName || "Student"} - Personal Mushaf
                </h1>
                <p className="text-sm text-neutral-600">View and manage student's recitation mistakes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <PersonalMushafView studentId={params.studentId} mode="teacher" studentName={studentName} />
      </div>
    </PermissionGuard>
  );
}
