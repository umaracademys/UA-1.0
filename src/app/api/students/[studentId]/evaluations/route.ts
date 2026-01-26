import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import EvaluationModel from "@/lib/db/models/Evaluation";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(
  request: Request,
  context: { params: { studentId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { studentId } = context.params;
    if (!Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, message: "Invalid student ID." }, { status: 400 });
    }

    const student = await StudentModel.findById(studentId);
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check access permissions
    if (decoded.role === "student") {
      const studentProfile = await StudentModel.findOne({ userId: user._id });
      if (!studentProfile || studentProfile._id.toString() !== studentId) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role === "teacher") {
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher || !teacher.assignedStudents.some((id) => id.toString() === studentId)) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    // Get all evaluations for this student
    const evaluations = await EvaluationModel.find({ studentId: new Types.ObjectId(studentId) })
      .populate("teacherId", "userId")
      .populate("reviewedBy", "fullName email")
      .populate("homeworkAssigned")
      .sort({ weekStartDate: -1 })
      .lean();

    // Calculate trends
    const trends = {
      improvement: [] as Array<{ category: string; trend: "improving" | "declining" | "stable" }>,
      averageRating: 0,
      totalEvaluations: evaluations.length,
    };

    if (evaluations.length > 1) {
      // Calculate average rating
      let totalRating = 0;
      let ratingCount = 0;

      evaluations.forEach((evaluation: any) => {
        if (evaluation.categories) {
          evaluation.categories.forEach((cat: any) => {
            totalRating += cat.rating;
            ratingCount++;
          });
        }
      });

      trends.averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      // Calculate category trends (comparing last 2 evaluations)
      const recentEvaluations = evaluations.slice(0, 2);
      if (recentEvaluations.length === 2) {
        const categoryMap = new Map<string, number[]>();

        recentEvaluations.forEach((evaluation: any) => {
          if (evaluation.categories) {
            evaluation.categories.forEach((cat: any) => {
              if (!categoryMap.has(cat.name)) {
                categoryMap.set(cat.name, []);
              }
              categoryMap.get(cat.name)!.push(cat.rating);
            });
          }
        });

        categoryMap.forEach((ratings, category) => {
          if (ratings.length === 2) {
            const trend =
              ratings[0] > ratings[1]
                ? "improving"
                : ratings[0] < ratings[1]
                  ? "declining"
                  : "stable";
            trends.improvement.push({ category, trend });
          }
        });
      }
    }

    // Format evaluations with teacher details
    const formattedEvaluations = await Promise.all(
      evaluations.map(async (evaluation: any) => {
        const teacher = await TeacherModel.findById(evaluation.teacherId).populate("userId", "fullName email").lean();
        return {
          ...evaluation,
          teacher: teacher?.userId,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      evaluations: formattedEvaluations,
      trends,
    });
  } catch (error) {
    console.error("Error fetching student evaluations:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load evaluations." },
      { status: 500 },
    );
  }
}
