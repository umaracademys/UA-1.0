"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { QaidahProgressDashboard } from "@/components/modules/qaidah/QaidahProgressDashboard";
import { QaidahLessonList } from "@/components/modules/qaidah/QaidahLessonList";
import { QaidahLessonView } from "@/components/modules/qaidah/QaidahLessonView";
import { LessonCompletionModal } from "@/components/modules/qaidah/LessonCompletionModal";
import axios from "axios";

export default function TeacherQaidahPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      // Get teacher ID from user profile
      const userRes = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = userRes.data.user || userRes.data;
      const teacherId = user.teacherId?._id || user.teacherId;
      
      if (teacherId) {
        const studentsRes = await axios.get(`/api/teachers/${teacherId}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const studentsList = studentsRes.data.students || studentsRes.data.data || [];
        setStudents(studentsList);
        if (studentsList.length > 0) {
          setSelectedStudentId(studentsList[0]._id);
        }
      } else {
        // Fallback: use /api/students which filters by teacher automatically
        const studentsRes = await axios.get("/api/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const studentsList = studentsRes.data.data || [];
        setStudents(studentsList);
        if (studentsList.length > 0) {
          setSelectedStudentId(studentsList[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    }
  };

  const handleLessonClick = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    // Load lesson details
    axios
      .get(`/api/qaidah/lessons/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setSelectedLesson(res.data.lesson);
      });
  };

  const handleMarkComplete = () => {
    if (selectedLesson) {
      setCompletionModalOpen(true);
    }
  };

  if (!selectedStudentId) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-500">No students assigned</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Qaidah Management</h1>
        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          {students.map((student) => (
            <option key={student._id} value={student._id}>
              {student.userId?.fullName || "Unknown Student"}
            </option>
          ))}
        </select>
      </div>

      {selectedLessonId ? (
        <QaidahLessonView
          lessonId={selectedLessonId}
          studentId={selectedStudentId}
          canMarkComplete={true}
          onComplete={handleMarkComplete}
          onNext={() => setSelectedLessonId(null)}
          onPrevious={() => setSelectedLessonId(null)}
        />
      ) : (
        <>
          <QaidahProgressDashboard studentId={selectedStudentId} />
          <QaidahLessonList
            studentId={selectedStudentId}
            onLessonClick={handleLessonClick}
          />
        </>
      )}

      {selectedLesson && (
        <LessonCompletionModal
          isOpen={completionModalOpen}
          onClose={() => {
            setCompletionModalOpen(false);
            setSelectedLesson(null);
          }}
          onSuccess={() => {
            setSelectedLessonId(null);
            setSelectedLesson(null);
          }}
          studentId={selectedStudentId}
          lessonId={selectedLesson._id}
          lessonTitle={selectedLesson.title}
          studentName={
            students.find((s) => s._id === selectedStudentId)?.userId?.fullName || "Student"
          }
        />
      )}
    </div>
  );
}
