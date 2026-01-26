"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Lock, Award, ChevronDown, ChevronUp } from "lucide-react";
import axios from "axios";
import { QaidahCategoryCard } from "./QaidahCategoryCard";

type Lesson = {
  _id: string;
  lessonNumber: number;
  title: string;
  arabicTitle: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  isActive: boolean;
};

type CompletedLesson = {
  lessonId: string;
  lessonNumber: number;
  score: number;
  approved: boolean;
};

type QaidahLessonListProps = {
  studentId?: string;
  onLessonClick: (lessonId: string) => void;
};

const difficultyColors = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-yellow-100 text-yellow-700",
  advanced: "bg-red-100 text-red-700",
};

export function QaidahLessonList({ studentId, onLessonClick }: QaidahLessonListProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [completedLessons, setCompletedLessons] = useState<CompletedLesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    loadLessons();
    if (studentId) {
      loadProgress();
    }
  }, [studentId]);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/qaidah/lessons", {
        headers: { Authorization: `Bearer ${token}` },
        params: selectedCategory ? { category: selectedCategory } : {},
      });
      setLessons(response.data.lessons || []);
      const uniqueCategories = Array.from(
        new Set((response.data.lessons || []).map((l: Lesson) => l.category)),
      ) as string[];
      setCategories(uniqueCategories);
      setExpandedCategories(new Set(uniqueCategories));
    } catch (error) {
      console.error("Failed to load lessons:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    if (!studentId) return;
    try {
      const response = await axios.get(`/api/students/${studentId}/qaidah-progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const progress = response.data.progress;
      setCurrentLesson(progress?.currentLesson || 1);
      setCompletedLessons(progress?.completedLessons || []);
    } catch (error) {
      console.error("Failed to load progress:", error);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const isLessonAccessible = (lessonNumber: number): boolean => {
    return lessonNumber <= currentLesson;
  };

  const isLessonCompleted = (lessonId: string): boolean => {
    return completedLessons.some((cl) => cl.lessonId === lessonId && cl.approved);
  };

  const getLessonScore = (lessonId: string): number | null => {
    const completed = completedLessons.find((cl) => cl.lessonId === lessonId);
    return completed?.score || null;
  };

  const lessonsByCategory = categories.reduce((acc, category) => {
    acc[category] = lessons.filter((lesson) => lesson.category === category);
    return acc;
  }, {} as Record<string, Lesson[]>);

  const getCategoryCompletion = (category: string): number => {
    const categoryLessons = lessonsByCategory[category] || [];
    const completed = categoryLessons.filter((lesson) => isLessonCompleted(lesson._id));
    return completed.length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-500">Loading lessons...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("")}
            className={`rounded-lg border px-3 py-1 text-sm ${
              selectedCategory === ""
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-lg border px-3 py-1 text-sm ${
                selectedCategory === category
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Lessons by Category */}
      <div className="space-y-4">
        {categories.map((category) => {
          const categoryLessons = lessonsByCategory[category] || [];
          const isExpanded = expandedCategories.has(category);
          const completedCount = getCategoryCompletion(category);

          if (categoryLessons.length === 0) return null;

          return (
            <div key={category} className="rounded-lg border border-neutral-200 bg-white">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-neutral-900">{category}</h3>
                    <span className="text-sm text-neutral-500">
                      {completedCount} / {categoryLessons.length} completed
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-neutral-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-neutral-500" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-neutral-200 px-4 py-3">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {categoryLessons.map((lesson) => {
                      const accessible = isLessonAccessible(lesson.lessonNumber);
                      const completed = isLessonCompleted(lesson._id);
                      const score = getLessonScore(lesson._id);

                      return (
                        <button
                          key={lesson._id}
                          onClick={() => accessible && onLessonClick(lesson._id)}
                          disabled={!accessible}
                          className={`group relative rounded-lg border p-4 text-left transition-all ${
                            accessible
                              ? "border-neutral-200 bg-white hover:border-indigo-300 hover:shadow-md"
                              : "border-neutral-200 bg-neutral-50 opacity-60"
                          }`}
                        >
                          {!accessible && (
                            <div className="absolute right-2 top-2">
                              <Lock className="h-4 w-4 text-neutral-400" />
                            </div>
                          )}

                          {completed && (
                            <div className="absolute right-2 top-2">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                          )}

                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-sm font-semibold text-neutral-900">
                              Lesson {lesson.lessonNumber}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                difficultyColors[lesson.difficulty]
                              }`}
                            >
                              {lesson.difficulty}
                            </span>
                          </div>

                          <h4 className="mb-1 font-medium text-neutral-900">{lesson.title}</h4>
                          <p className="mb-2 text-sm text-neutral-600">{lesson.arabicTitle}</p>

                          {score !== null && (
                            <div className="flex items-center gap-1">
                              <Award className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm font-medium text-neutral-700">
                                Score: {score}%
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
