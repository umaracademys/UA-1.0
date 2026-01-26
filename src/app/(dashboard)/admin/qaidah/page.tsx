"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { CreateLessonModal } from "@/components/modules/qaidah/CreateLessonModal";
import { QaidahLessonList } from "@/components/modules/qaidah/QaidahLessonList";
import axios from "axios";
import toast from "react-hot-toast";
import { PermissionGuard } from "@/components/shared/PermissionGuard";

export default function AdminQaidahPage() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/qaidah/lessons", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLessons(response.data.lessons || []);
    } catch (error) {
      toast.error("Failed to load lessons");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (lessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) {
      return;
    }

    try {
      await axios.delete(`/api/qaidah/lessons/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Lesson deleted successfully");
      loadLessons();
    } catch (error) {
      toast.error("Failed to delete lesson");
    }
  };

  return (
    <PermissionGuard permission="qaidah.manage">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Qaidah Lesson Management</h1>
            <p className="mt-1 text-sm text-neutral-500">Create and manage Qaidah lessons</p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Add Lesson
          </button>
        </div>

        {/* Lessons List */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-neutral-500">Loading lessons...</div>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Lesson #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Difficulty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {lessons.map((lesson) => (
                    <tr key={lesson._id} className="hover:bg-neutral-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-neutral-900">
                        {lesson.lessonNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <div>
                          <div className="font-medium">{lesson.title}</div>
                          <div className="text-xs text-neutral-500" dir="rtl">
                            {lesson.arabicTitle}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                        {lesson.category}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium">
                          {lesson.difficulty}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                        {lesson.order}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {lesson.isActive ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingLesson(lesson._id)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lesson._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modals */}
        <CreateLessonModal
          isOpen={createModalOpen || editingLesson !== null}
          onClose={() => {
            setCreateModalOpen(false);
            setEditingLesson(null);
          }}
          onSuccess={() => {
            loadLessons();
            setCreateModalOpen(false);
            setEditingLesson(null);
          }}
          lessonId={editingLesson || undefined}
        />
      </div>
    </PermissionGuard>
  );
}
