"use client";

import { useState, useEffect } from "react";
import { BookOpen, Info } from "lucide-react";
import { PersonalMushafView } from "@/components/modules/mushaf/PersonalMushafView";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import toast from "react-hot-toast";

export default function StudentPersonalMushafPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.profile?._id) {
        setStudentId(result.profile._id);
        setStudentName(result.user?.fullName || "Student");
      } else {
        toast.error("Failed to load student data");
      }
    } catch (error) {
      toast.error("Failed to load student data");
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

  if (!studentId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-neutral-600">Student data not found</p>
      </div>
    );
  }

  return (
    <PermissionGuard permission="mushaf.access">
      <div className="flex h-screen flex-col">
        {/* Help Banner */}
        <div className="border-b border-blue-200 bg-blue-50 px-6 py-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-700 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">My Personal Mushaf</p>
              <p className="text-xs text-blue-700">
                Your Personal Mushaf contains all the mistakes marked during your recitation sessions. Use this to
                track your progress and focus on areas that need improvement.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <PersonalMushafView studentId={studentId} mode="student" studentName={studentName} />
      </div>
    </PermissionGuard>
  );
}
