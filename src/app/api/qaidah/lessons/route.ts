import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import QaidahLessonModel from "@/lib/db/models/QaidahLesson";
import StudentQaidahProgressModel from "@/lib/db/models/StudentQaidahProgress";
import StudentModel from "@/lib/db/models/Student";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";
import { z } from "zod";

export const dynamic = "force-dynamic";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

const lessonSchema = z.object({
  lessonNumber: z.number().int().positive(),
  title: z.string().min(1),
  arabicTitle: z.string().min(1),
  category: z.enum(["Letters", "Harakat", "Tanween", "Sukoon", "Shaddah", "Madd", "Advanced"]),
  content: z.string().min(1),
  examples: z.array(z.string()).optional(),
  audioUrl: z.string().url(),
  videoUrl: z.string().url().optional(),
  practiceWords: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  order: z.number().int().nonnegative(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const difficulty = searchParams.get("difficulty");
    const sortBy = searchParams.get("sortBy") || "order";

    const query: any = { isActive: true };

    // Filters
    if (category) {
      query.category = category;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    // For students, only show lessons up to their current level
    if (decoded.role === "student") {
      const student = await StudentModel.findOne({ userId: decoded.userId });
      if (student) {
        const progress = await StudentQaidahProgressModel.findOne({ studentId: student._id });
        if (progress) {
          // Show current lesson and all previous lessons
          query.lessonNumber = { $lte: progress.currentLesson };
        } else {
          // New student, only show first lesson
          query.lessonNumber = 1;
        }
      }
    }

    // Sort
    let sort: any = { order: 1 };
    if (sortBy === "lessonNumber") {
      sort = { lessonNumber: 1 };
    } else if (sortBy === "difficulty") {
      sort = { difficulty: 1, order: 1 };
    }

    const lessons = await QaidahLessonModel.find(query).sort(sort).lean();

    return NextResponse.json({
      success: true,
      lessons,
    });
  } catch (error) {
    console.error("Error fetching Qaidah lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons", message: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    // Check permission
    if (!checkAPIPermission(decoded.role, "qaidah.manage", decoded.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Validate input
    const validation = lessonSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Check if lesson number already exists
    const existingLesson = await QaidahLessonModel.findOne({
      lessonNumber: data.lessonNumber,
    });

    if (existingLesson) {
      return NextResponse.json(
        { error: "Lesson number already exists" },
        { status: 400 },
      );
    }

    // Create lesson
    const lesson = new QaidahLessonModel({
      ...data,
      examples: data.examples || [],
      practiceWords: data.practiceWords || [],
      objectives: data.objectives || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    await lesson.save();

    return NextResponse.json(
      {
        success: true,
        message: "Lesson created successfully",
        lesson,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating Qaidah lesson:", error);
    return NextResponse.json(
      { error: "Failed to create lesson", message: (error as Error).message },
      { status: 500 },
    );
  }
}
