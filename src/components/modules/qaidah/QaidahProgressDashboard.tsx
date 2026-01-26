"use client";

import { useState, useEffect } from "react";
import { BookOpen, CheckCircle2, Award, TrendingUp } from "lucide-react";
import axios from "axios";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type QaidahProgressDashboardProps = {
  studentId: string;
};

export function QaidahProgressDashboard({ studentId }: QaidahProgressDashboardProps) {
  const [progress, setProgress] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    loadProgress();
  }, [studentId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const progressRes = await axios.get(`/api/students/${studentId}/qaidah-progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProgress(progressRes.data.progress);
      
      // Calculate report from progress data
      if (progressRes.data.progress) {
        const progressData = progressRes.data.progress;
        const completedLessons = progressData.completedLessons?.filter((l: any) => l.approved) || [];
        const completedCount = completedLessons.length;
        
        // Group by category (would need lesson details for full report)
        const lessonsByCategory: Record<string, number> = {};
        completedLessons.forEach((lesson: any) => {
          const category = lesson.lessonId?.category || "Unknown";
          lessonsByCategory[category] = (lessonsByCategory[category] || 0) + 1;
        });

        setReport({
          progressPercentage: 0, // Would need total lessons count
          lessonsByCategory,
          recentCompletions: completedLessons
            .sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
            .slice(0, 10)
            .map((lesson: any) => ({
              lessonNumber: lesson.lessonNumber,
              completedAt: lesson.completedAt,
              score: lesson.score,
            })),
        });
      }
    } catch (error) {
      console.error("Failed to load progress:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-500">Loading progress...</div>
      </div>
    );
  }

  const currentLesson = progress?.currentLesson || 1;
  const completedLessons = progress?.completedLessons?.filter((l: any) => l.approved) || [];
  const completedCount = completedLessons.length;
  const totalScore = progress?.totalScore || 0;
  const averageScore =
    completedCount > 0
      ? Math.round(
          completedLessons.reduce((sum: number, l: any) => sum + l.score, 0) / completedCount,
        )
      : 0;

  // Calculate progress percentage (would need total lessons count)
  const progressPercentage = report?.progressPercentage || 0;

  // Prepare chart data
  const categoryData = report?.lessonsByCategory
    ? Object.entries(report.lessonsByCategory).map(([category, count]) => ({
        category,
        completed: count,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Lesson"
          value={currentLesson}
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Completed Lessons"
          value={completedCount}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Overall Progress"
          value={`${progressPercentage}%`}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Average Score"
          value={`${averageScore}%`}
          icon={Award}
          color="orange"
        />
      </div>

      {/* Progress Bar */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">Overall Progress</h3>
          <span className="text-sm font-medium text-neutral-600">{progressPercentage}%</span>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Charts */}
      {categoryData.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Progress by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#6366f1" name="Completed Lessons" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Activity */}
      {report?.recentCompletions && report.recentCompletions.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Recent Activity</h3>
          <div className="space-y-3">
            {report.recentCompletions.map((completion: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3"
              >
                <div>
                  <p className="font-medium text-neutral-900">
                    Lesson {completion.lessonNumber} completed
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(completion.completedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold text-neutral-900">{completion.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Lesson Recommendation */}
      {currentLesson && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-indigo-900">Next Lesson</h3>
          <p className="text-indigo-700">
            Continue with Lesson {currentLesson} to advance your learning.
          </p>
        </div>
      )}
    </div>
  );
}
