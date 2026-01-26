import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import StudentQaidahProgressModel from "@/lib/db/models/StudentQaidahProgress";
import StudentModel from "@/lib/db/models/Student";
import { verifyToken } from "@/lib/utils/jwt";
import { Types } from "mongoose";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(
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

    // Check access: student can view own progress, teachers/admins can view any
    if (decoded.role === "student") {
      const student = await StudentModel.findOne({ userId: decoded.userId });
      if (!student || student._id.toString() !== studentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const progress = await StudentQaidahProgressModel.findOne({
      studentId: new Types.ObjectId(studentId),
    })
      .populate("completedLessons.lessonId", "title arabicTitle category")
      .lean();

    if (!progress) {
      // Return default progress for new student
      return NextResponse.json({
        success: true,
        progress: {
          studentId,
          currentLesson: 1,
          completedLessons: [],
          totalScore: 0,
          lastAccessedAt: new Date(),
          startedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("Error fetching Qaidah progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress", message: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await verifyToken(token);
    await connectToDatabase();

    const { studentId } = await params;

    // Check if progress already exists
    const existingProgress = await StudentQaidahProgressModel.findOne({
      studentId: new Types.ObjectId(studentId),
    });

    if (existingProgress) {
      return NextResponse.json(
        { error: "Progress record already exists" },
        { status: 400 },
      );
    }

    // Create initial progress
    const progress = new StudentQaidahProgressModel({
      studentId: new Types.ObjectId(studentId),
      currentLesson: 1,
      completedLessons: [],
      totalScore: 0,
      lastAccessedAt: new Date(),
      startedAt: new Date(),
    });

    await progress.save();

    return NextResponse.json(
      {
        success: true,
        message: "Progress record created successfully",
        progress,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating Qaidah progress:", error);
    return NextResponse.json(
      { error: "Failed to create progress", message: (error as Error).message },
      { status: 500 },
    );
  }
}
