import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import StudentQaidahProgressModel from "@/lib/db/models/StudentQaidahProgress";
import QaidahLessonModel from "@/lib/db/models/QaidahLesson";
import StudentModel from "@/lib/db/models/Student";
import { verifyToken } from "@/lib/utils/jwt";
import { Types } from "mongoose";
import { z } from "zod";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

const completeLessonSchema = z.object({
  lessonId: z.string(),
  score: z.number().min(0).max(100),
  teacherFeedback: z.string().optional(),
  approved: z.boolean().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { studentId } = await params;
    const body = await req.json();

    // Validate input
    const validation = completeLessonSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { lessonId, score, teacherFeedback, approved } = validation.data;

    // Verify lesson exists
    const lesson = await QaidahLessonModel.findById(lessonId);
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Get or create progress
    let progress = await StudentQaidahProgressModel.findOne({
      studentId: new Types.ObjectId(studentId),
    });

    if (!progress) {
      progress = new StudentQaidahProgressModel({
        studentId: new Types.ObjectId(studentId),
        currentLesson: 1,
        completedLessons: [],
        totalScore: 0,
        lastAccessedAt: new Date(),
        startedAt: new Date(),
      });
    }

    // Check access: students can complete their own lessons, teachers can approve
    if (decoded.role === "student") {
      const student = await StudentModel.findOne({ userId: decoded.userId });
      if (!student || student._id.toString() !== studentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Students can't approve their own lessons
      if (approved) {
        return NextResponse.json(
          { error: "Students cannot approve lessons" },
          { status: 403 },
        );
      }
    }

    // Complete lesson using the model method
    await (progress as any).completeLesson(
      new Types.ObjectId(lessonId),
      lesson.lessonNumber,
      score,
      approved,
      teacherFeedback,
    );

    const updatedProgress = await StudentQaidahProgressModel.findById(progress._id)
      .populate("completedLessons.lessonId", "title arabicTitle category")
      .lean();

    return NextResponse.json({
      success: true,
      message: approved ? "Lesson completed and approved" : "Lesson completed",
      progress: updatedProgress,
    });
  } catch (error) {
    console.error("Error completing lesson:", error);
    return NextResponse.json(
      { error: "Failed to complete lesson", message: (error as Error).message },
      { status: 500 },
    );
  }
}
