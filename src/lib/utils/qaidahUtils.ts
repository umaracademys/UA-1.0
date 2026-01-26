import { connectToDatabase } from "@/lib/db/connection";
import QaidahLessonModel from "@/lib/db/models/QaidahLesson";
import StudentQaidahProgressModel from "@/lib/db/models/StudentQaidahProgress";
import { Types } from "mongoose";

type StudentProgress = {
  currentLesson: number;
  completedLessons: Array<{
    lessonId: string;
    lessonNumber: number;
    completedAt: Date;
    score: number;
    attempts: number;
    teacherFeedback?: string;
    approved: boolean;
  }>;
  totalScore: number;
};

type Lesson = {
  _id: string;
  lessonNumber: number;
  title: string;
  category: string;
  difficulty: string;
  order: number;
};

type ProgressReport = {
  studentId: string;
  currentLesson: number;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  averageScore: number;
  totalScore: number;
  lessonsByCategory: Record<string, number>;
  lessonsByDifficulty: Record<string, number>;
  recentCompletions: Array<{
    lessonNumber: number;
    completedAt: Date;
    score: number;
  }>;
};

/**
 * Calculate progress percentage
 */
export function calculateProgressPercentage(progress: StudentProgress): number {
  if (!progress.completedLessons || progress.completedLessons.length === 0) {
    return 0;
  }

  // Get total number of lessons
  // This would ideally come from the total lessons count
  // For now, we'll use currentLesson as a proxy
  const totalLessons = progress.currentLesson + progress.completedLessons.length;
  const completedCount = progress.completedLessons.filter((l) => l.approved).length;

  return totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
}

/**
 * Get next lesson for student
 */
export async function getNextLesson(
  currentLesson: number,
): Promise<Lesson | null> {
  await connectToDatabase();

  const nextLesson = await QaidahLessonModel.findOne({
    lessonNumber: currentLesson,
    isActive: true,
  })
    .select("_id lessonNumber title category difficulty order")
    .lean();

  return nextLesson as Lesson | null;
}

/**
 * Check if student can access a lesson
 */
export function canAccessLesson(
  studentProgress: StudentProgress,
  lessonNumber: number,
): boolean {
  // Student can access:
  // 1. Current lesson
  // 2. Any completed lesson
  // 3. Lessons before current lesson (for review)

  if (lessonNumber <= studentProgress.currentLesson) {
    return true;
  }

  // Check if lesson is completed
  const isCompleted = studentProgress.completedLessons.some(
    (lesson) => lesson.lessonNumber === lessonNumber && lesson.approved,
  );

  return isCompleted;
}

/**
 * Generate comprehensive progress report
 */
export async function generateProgressReport(
  studentId: string,
): Promise<ProgressReport> {
  await connectToDatabase();

  const progress = await StudentQaidahProgressModel.findOne({
    studentId: new Types.ObjectId(studentId),
  }).lean();

  if (!progress) {
    throw new Error("Student progress not found");
  }

  const totalLessons = await QaidahLessonModel.countDocuments({ isActive: true });
  const completedLessons = progress.completedLessons.filter((l) => l.approved);
  const completedCount = completedLessons.length;

  // Calculate average score
  const averageScore =
    completedLessons.length > 0
      ? completedLessons.reduce((sum, lesson) => sum + lesson.score, 0) / completedLessons.length
      : 0;

  // Group by category
  const lessonsByCategory: Record<string, number> = {};
  const lessonsByDifficulty: Record<string, number> = {};

  // Get lesson details for completed lessons
  const lessonIds = completedLessons.map((l) => l.lessonId);
  const lessons = await QaidahLessonModel.find({
    _id: { $in: lessonIds },
  })
    .select("category difficulty")
    .lean();

  lessons.forEach((lesson) => {
    lessonsByCategory[lesson.category] = (lessonsByCategory[lesson.category] || 0) + 1;
    lessonsByDifficulty[lesson.difficulty] = (lessonsByDifficulty[lesson.difficulty] || 0) + 1;
  });

  // Get recent completions
  const recentCompletions = completedLessons
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 10)
    .map((lesson) => ({
      lessonNumber: lesson.lessonNumber,
      completedAt: lesson.completedAt,
      score: lesson.score,
    }));

  const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return {
    studentId: progress.studentId.toString(),
    currentLesson: progress.currentLesson,
    totalLessons,
    completedLessons: completedCount,
    progressPercentage,
    averageScore: Math.round(averageScore * 10) / 10,
    totalScore: progress.totalScore,
    lessonsByCategory,
    lessonsByDifficulty,
    recentCompletions,
  };
}

/**
 * Get lesson statistics
 */
export async function getLessonStatistics() {
  await connectToDatabase();

  const totalLessons = await QaidahLessonModel.countDocuments({ isActive: true });
  const lessonsByCategory = await QaidahLessonModel.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
  ]);

  const lessonsByDifficulty = await QaidahLessonModel.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$difficulty",
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    totalLessons,
    byCategory: lessonsByCategory.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    ),
    byDifficulty: lessonsByDifficulty.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };
}
