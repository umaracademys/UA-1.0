import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import EvaluationModel from "@/lib/db/models/Evaluation";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
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
    if (
      !hasPermission(decoded.role, "evaluation.review") &&
      !decoded.permissions?.includes("evaluation.review") &&
      decoded.role !== "admin" &&
      decoded.role !== "super_admin"
    ) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    // Get all submitted evaluations
    const evaluations = await EvaluationModel.find({ status: "submitted" })
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .sort({ submittedAt: 1 }) // Oldest first
      .lean();

    // Format evaluations with student and teacher details
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
      count: formattedEvaluations.length,
    });
  } catch (error) {
    console.error("Error fetching pending evaluations:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load pending evaluations." },
      { status: 500 },
    );
  }
}
