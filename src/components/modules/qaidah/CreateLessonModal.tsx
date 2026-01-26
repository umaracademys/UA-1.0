"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

type CreateLessonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  lessonId?: string; // For editing
};

export function CreateLessonModal({
  isOpen,
  onClose,
  onSuccess,
  lessonId,
}: CreateLessonModalProps) {
  const [formData, setFormData] = useState({
    lessonNumber: 1,
    title: "",
    arabicTitle: "",
    category: "Letters" as const,
    content: "",
    examples: [""],
    audioUrl: "",
    videoUrl: "",
    practiceWords: [""],
    objectives: [""],
    difficulty: "beginner" as const,
    order: 0,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (lessonId) {
        loadLesson();
      }
    }
  }, [isOpen, lessonId]);

  const loadCategories = async () => {
    try {
      const response = await axios.get("/api/qaidah/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data.categories.map((c: any) => c.name));
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadLesson = async () => {
    if (!lessonId) return;
    try {
      const response = await axios.get(`/api/qaidah/lessons/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const lesson = response.data.lesson;
      setFormData({
        lessonNumber: lesson.lessonNumber,
        title: lesson.title,
        arabicTitle: lesson.arabicTitle,
        category: lesson.category,
        content: lesson.content,
        examples: lesson.examples || [""],
        audioUrl: lesson.audioUrl,
        videoUrl: lesson.videoUrl || "",
        practiceWords: lesson.practiceWords || [""],
        objectives: lesson.objectives || [""],
        difficulty: lesson.difficulty,
        order: lesson.order,
        isActive: lesson.isActive,
      });
    } catch (error) {
      toast.error("Failed to load lesson");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        ...formData,
        examples: formData.examples.filter((e) => e.trim()),
        practiceWords: formData.practiceWords.filter((w) => w.trim()),
        objectives: formData.objectives.filter((o) => o.trim()),
        videoUrl: formData.videoUrl || undefined,
      };

      if (lessonId) {
        await axios.patch(`/api/qaidah/lessons/${lessonId}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Lesson updated successfully");
      } else {
        await axios.post("/api/qaidah/lessons", data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Lesson created successfully");
      }

      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to save lesson");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      lessonNumber: 1,
      title: "",
      arabicTitle: "",
      category: "Letters",
      content: "",
      examples: [""],
      audioUrl: "",
      videoUrl: "",
      practiceWords: [""],
      objectives: [""],
      difficulty: "beginner",
      order: 0,
      isActive: true,
    });
    onClose();
  };

  const addExample = () => {
    setFormData({ ...formData, examples: [...formData.examples, ""] });
  };

  const removeExample = (index: number) => {
    setFormData({
      ...formData,
      examples: formData.examples.filter((_, i) => i !== index),
    });
  };

  const updateExample = (index: number, value: string) => {
    const newExamples = [...formData.examples];
    newExamples[index] = value;
    setFormData({ ...formData, examples: newExamples });
  };

  const addPracticeWord = () => {
    setFormData({ ...formData, practiceWords: [...formData.practiceWords, ""] });
  };

  const removePracticeWord = (index: number) => {
    setFormData({
      ...formData,
      practiceWords: formData.practiceWords.filter((_, i) => i !== index),
    });
  };

  const updatePracticeWord = (index: number, value: string) => {
    const newWords = [...formData.practiceWords];
    newWords[index] = value;
    setFormData({ ...formData, practiceWords: newWords });
  };

  const addObjective = () => {
    setFormData({ ...formData, objectives: [...formData.objectives, ""] });
  };

  const removeObjective = (index: number) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter((_, i) => i !== index),
    });
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...formData.objectives];
    newObjectives[index] = value;
    setFormData({ ...formData, objectives: newObjectives });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-lg border border-neutral-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-neutral-900">
            {lessonId ? "Edit Lesson" : "Create New Lesson"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Lesson Number *
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.lessonNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, lessonNumber: parseInt(e.target.value) || 1 })
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Order *</label>
                <input
                  type="number"
                  min={0}
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Arabic Title *
              </label>
              <input
                type="text"
                value={formData.arabicTitle}
                onChange={(e) => setFormData({ ...formData, arabicTitle: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                dir="rtl"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as any })
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Difficulty *
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData({ ...formData, difficulty: e.target.value as any })
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            {/* Examples */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-700">Examples</label>
                <button
                  type="button"
                  onClick={addExample}
                  className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {formData.examples.map((example, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={example}
                      onChange={(e) => updateExample(index, e.target.value)}
                      className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Arabic example"
                      dir="rtl"
                    />
                    {formData.examples.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExample(index)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Practice Words */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-700">Practice Words</label>
                <button
                  type="button"
                  onClick={addPracticeWord}
                  className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {formData.practiceWords.map((word, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={word}
                      onChange={(e) => updatePracticeWord(index, e.target.value)}
                      className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Practice word"
                      dir="rtl"
                    />
                    {formData.practiceWords.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePracticeWord(index)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Objectives */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-700">Objectives</label>
                <button
                  type="button"
                  onClick={addObjective}
                  className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {formData.objectives.map((objective, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={objective}
                      onChange={(e) => updateObjective(index, e.target.value)}
                      className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Learning objective"
                    />
                    {formData.objectives.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeObjective(index)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* URLs */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Audio URL *
              </label>
              <input
                type="url"
                value={formData.audioUrl}
                onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Video URL (Optional)
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-neutral-700">
                Active (visible to students)
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : lessonId ? "Update Lesson" : "Create Lesson"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
