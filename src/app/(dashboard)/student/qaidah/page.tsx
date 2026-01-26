"use client";

import { useState, useEffect } from "react";
import { QaidahProgressDashboard } from "@/components/modules/qaidah/QaidahProgressDashboard";
import { QaidahLessonList } from "@/components/modules/qaidah/QaidahLessonList";
import { QaidahLessonView } from "@/components/modules/qaidah/QaidahLessonView";
import { BookOpen, HelpCircle } from "lucide-react";
import axios from "axios";

export default function StudentQaidahPage() {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (token) {
      loadStudentId();
    }
  }, [token]);

  const loadStudentId = async () => {
    try {
      if (!token) {
        console.error("No token available");
        return;
      }
      const response = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = response.data.user || response.data;
      if (user.role === "student") {
        // The /api/auth/me route already returns the student profile
        const profile = response.data.profile;
        if (profile && profile._id) {
          setStudentId(profile._id);
        } else {
          console.error("Student profile not found in response:", response.data);
        }
      }
    } catch (error) {
      console.error("Failed to load student ID:", error);
      if (axios.isAxiosError(error)) {
        console.error("Error details:", error.response?.data || error.message);
      }
    }
  };

  if (!studentId) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Qaidah Learning</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Learn Arabic reading fundamentals step by step
          </p>
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <HelpCircle className="h-4 w-4" />
          Help
        </button>
      </div>

      {/* Help Section */}
      {showHelp && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">How to Use Qaidah Learning</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-blue-800">
            <li>Lessons are organized by category and difficulty level</li>
            <li>Complete lessons in order to unlock the next ones</li>
            <li>Listen to audio examples to learn proper pronunciation</li>
            <li>Practice with the provided words and examples</li>
            <li>Your progress is tracked automatically</li>
          </ul>
        </div>
      )}

      {selectedLessonId ? (
        <QaidahLessonView
          lessonId={selectedLessonId}
          studentId={studentId}
          onComplete={() => {
            setSelectedLessonId(null);
            // Refresh progress
          }}
          onNext={() => {
            // Navigate to next lesson
            setSelectedLessonId(null);
          }}
          onPrevious={() => {
            // Navigate to previous lesson
            setSelectedLessonId(null);
          }}
        />
      ) : (
        <>
          <QaidahProgressDashboard studentId={studentId} />
          <QaidahLessonList
            studentId={studentId}
            onLessonClick={setSelectedLessonId}
          />
        </>
      )}
    </div>
  );
}
