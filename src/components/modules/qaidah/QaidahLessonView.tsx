"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Play } from "lucide-react";
import axios from "axios";
import { AudioPlayer } from "./AudioPlayer";
import toast from "react-hot-toast";

type Lesson = {
  _id: string;
  lessonNumber: number;
  title: string;
  arabicTitle: string;
  category: string;
  content: string;
  examples: string[];
  audioUrl: string;
  videoUrl?: string;
  practiceWords: string[];
  objectives: string[];
  difficulty: string;
};

type QaidahLessonViewProps = {
  lessonId: string;
  studentId?: string;
  onComplete?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  canMarkComplete?: boolean;
};

export function QaidahLessonView({
  lessonId,
  studentId,
  onComplete,
  onNext,
  onPrevious,
  canMarkComplete = false,
}: QaidahLessonViewProps) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    loadLesson();
    loadAllLessons();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/qaidah/lessons/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLesson(response.data.lesson);
    } catch (error) {
      toast.error("Failed to load lesson");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllLessons = async () => {
    try {
      const response = await axios.get("/api/qaidah/lessons", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const lessons = response.data.lessons || [];
      setAllLessons(lessons);
      const index = lessons.findIndex((l: Lesson) => l._id === lessonId);
      setCurrentIndex(index);
    } catch (error) {
      console.error("Failed to load all lessons:", error);
    }
  };

  const handleMarkComplete = async () => {
    if (!studentId || !lesson) return;

    try {
      await axios.post(
        `/api/students/${studentId}/qaidah-progress/complete-lesson`,
        {
          lessonId: lesson._id,
          score: 100, // Default score, can be adjusted
          approved: false,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success("Lesson marked as complete");
      onComplete?.();
    } catch (error) {
      toast.error("Failed to mark lesson as complete");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-500">Loading lesson...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-red-600">Lesson not found</div>
      </div>
    );
  }

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allLessons.length - 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-500">
                Lesson {lesson.lessonNumber}
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {lesson.category}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                {lesson.difficulty}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">{lesson.title}</h1>
            <h2 className="mt-1 text-xl text-neutral-700" dir="rtl">
              {lesson.arabicTitle}
            </h2>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="ml-auto flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Objectives */}
      {lesson.objectives && lesson.objectives.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Learning Objectives</h3>
          <ul className="space-y-2">
            {lesson.objectives.map((objective, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <span className="text-neutral-700">{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Lesson Content</h3>
        <div className="prose max-w-none text-neutral-700 whitespace-pre-wrap">{lesson.content}</div>
      </div>

      {/* Examples */}
      {lesson.examples && lesson.examples.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Examples</h3>
          <div className="space-y-4">
            {lesson.examples.map((example, index) => (
              <div key={index} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="mb-2 text-2xl text-neutral-900" dir="rtl">
                  {example}
                </div>
                <AudioPlayer src={lesson.audioUrl} title={`Example ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practice Words */}
      {lesson.practiceWords && lesson.practiceWords.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Practice Words</h3>
          <div className="flex flex-wrap gap-2">
            {lesson.practiceWords.map((word, index) => (
              <div
                key={index}
                className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-lg"
                dir="rtl"
              >
                {word}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Tutorial */}
      {lesson.videoUrl && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Video Tutorial</h3>
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-neutral-900">
            <iframe
              src={lesson.videoUrl}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Actions */}
      {canMarkComplete && studentId && (
        <div className="flex justify-end">
          <button
            onClick={handleMarkComplete}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <CheckCircle2 className="h-5 w-5" />
            Mark as Complete
          </button>
        </div>
      )}
    </div>
  );
}
