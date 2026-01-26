import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import EvaluationModel from "@/lib/db/models/Evaluation";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import NotificationModel from "@/lib/db/models/Notification";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

export const dynamic = "force-dynamic";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const teacherId = searchParams.get("teacherId");
    const status = searchParams.get("status");
    const weekStartDate = searchParams.get("weekStartDate");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    // Role-based filtering
    if (decoded.role === "student") {
      const student = await StudentModel.findOne({ userId: user._id });
      if (!student) {
        return NextResponse.json({ success: false, message: "Student profile not found." }, { status: 404 });
      }
      query.studentId = student._id;
    } else if (decoded.role === "teacher") {
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
      }
      query.teacherId = teacher._id;
    } else if (decoded.role === "admin" || decoded.role === "super_admin") {
      // Admins can see all, but if status is 'submitted', show pending reviews
      if (status === "submitted" || !status) {
        // Show submitted evaluations for review
      }
    }

    // Apply filters
    if (studentId && Types.ObjectId.isValid(studentId)) {
      query.studentId = new Types.ObjectId(studentId);
    }

    if (teacherId && Types.ObjectId.isValid(teacherId)) {
      query.teacherId = new Types.ObjectId(teacherId);
    }

    if (status) {
      query.status = status;
    }

    if (weekStartDate) {
      const startDate = new Date(weekStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      query.weekStartDate = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const [evaluations, total] = await Promise.all([
      EvaluationModel.find(query)
        .populate("studentId", "userId")
        .populate("teacherId", "userId")
        .populate("reviewedBy", "fullName email")
        .populate("homeworkAssigned")
        .sort({ weekStartDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EvaluationModel.countDocuments(query),
    ]);

    // Format evaluations
    const formattedEvaluations = await Promise.all(
      evaluations.map(async (evaluation: any) => {
        const student = await StudentModel.findById(evaluation.studentId).populate("userId", "fullName email").lean();
        const teacher = await TeacherModel.findById(evaluation.teacherId).populate("userId", "fullName email").lean();

        return {
          ...evaluation,
          student: student?.userId,
          teacher: teacher?.userId,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      evaluations: formattedEvaluations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load evaluations." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (
      !hasPermission(decoded.role, "evaluation.create") &&
      !decoded.permissions?.includes("evaluation.create")
    ) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const teacher = await TeacherModel.findOne({ userId: user._id });
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      studentId: string;
      weekStartDate: string;
      categories: Array<{
        name: string;
        rating: number;
        comments: string;
      }>;
      overallComments: string;
      status: "draft" | "submitted";
    };

    const { studentId, weekStartDate, categories, overallComments, status } = body;

    if (!studentId || !Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, message: "Valid student ID is required." }, { status: 400 });
    }

    if (!weekStartDate) {
      return NextResponse.json({ success: false, message: "Week start date is required." }, { status: 400 });
    }

    if (!categories || categories.length === 0) {
      return NextResponse.json({ success: false, message: "At least one category is required." }, { status: 400 });
    }

    // Validate ratings
    const invalidRating = categories.find((cat) => cat.rating < 1 || cat.rating > 5);
    if (invalidRating) {
      return NextResponse.json(
        { success: false, message: "Ratings must be between 1 and 5." },
        { status: 400 },
      );
    }

    const student = await StudentModel.findById(studentId).populate("userId", "fullName");
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    // Get student name for notification
    const studentName =
      student.userId && typeof student.userId === "object" && "fullName" in student.userId
        ? (student.userId as { fullName: string }).fullName
        : "student";

    // Create evaluation
    const evaluation = await EvaluationModel.create({
      studentId: new Types.ObjectId(studentId),
      teacherId: teacher._id,
      weekStartDate: new Date(weekStartDate),
      categories,
      overallComments: overallComments || "",
      status: status || "draft",
      submittedAt: status === "submitted" ? new Date() : undefined,
    });

    // Create notification for admin if submitted
    if (status === "submitted") {
      const admins = await UserModel.find({ role: { $in: ["admin", "super_admin"] } }).select("_id").lean();
      
      const notifications = admins.map((admin) => ({
        userId: admin._id,
        type: "evaluation_feedback" as const,
        title: "New Evaluation Submitted",
        message: `${user.fullName} submitted an evaluation for ${studentName}`,
        relatedEntity: {
          type: "Evaluation",
          id: evaluation._id,
        },
      }));

      if (notifications.length > 0) {
        await NotificationModel.insertMany(notifications);
      }
    }

    const populatedEvaluation = await EvaluationModel.findById(evaluation._id)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Evaluation created successfully.",
      evaluation: populatedEvaluation,
    });
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to create evaluation." },
      { status: 500 },
    );
  }
}
