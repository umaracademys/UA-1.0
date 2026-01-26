import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import EvaluationModel from "@/lib/db/models/Evaluation";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(
  request: Request,
  context: { params: { evaluationId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { evaluationId } = context.params;
    if (!Types.ObjectId.isValid(evaluationId)) {
      return NextResponse.json({ success: false, message: "Invalid evaluation ID." }, { status: 400 });
    }

    const evaluation = await EvaluationModel.findById(evaluationId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .populate("reviewedBy", "fullName email")
      .populate("homeworkAssigned")
      .lean();

    if (!evaluation) {
      return NextResponse.json({ success: false, message: "Evaluation not found." }, { status: 404 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check access permissions
    if (decoded.role === "student") {
      const student = await StudentModel.findOne({ userId: user._id });
      if (!student || student._id.toString() !== (evaluation.studentId as any)._id.toString()) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role === "teacher") {
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
      if (teacher._id.toString() !== (evaluation.teacherId as any)._id.toString()) {
        // Check if teacher is assigned to student
        const student = await StudentModel.findById(evaluation.studentId);
        if (!student || !student.assignedTeachers.some((id) => id.toString() === teacher._id.toString())) {
          return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load evaluation." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: { evaluationId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { evaluationId } = context.params;
    if (!Types.ObjectId.isValid(evaluationId)) {
      return NextResponse.json({ success: false, message: "Invalid evaluation ID." }, { status: 400 });
    }

    const evaluation = await EvaluationModel.findById(evaluationId);
    if (!evaluation) {
      return NextResponse.json({ success: false, message: "Evaluation not found." }, { status: 404 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check if user can update
    const teacher = await TeacherModel.findOne({ userId: user._id });
    const isOwner = teacher && teacher._id.toString() === evaluation.teacherId.toString();
    const canEdit = isOwner && evaluation.status === "draft";
    const hasPermissionToEdit =
      hasPermission(decoded.role, "evaluation.edit") ||
      decoded.permissions?.includes("evaluation.edit");

    if (!canEdit && !hasPermissionToEdit) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as {
      weekStartDate?: string;
      categories?: Array<{
        name: string;
        rating: number;
        comments: string;
      }>;
      overallComments?: string;
      status?: "draft" | "submitted";
    };

    // Validate ratings if categories are provided
    if (body.categories) {
      const invalidRating = body.categories.find((cat) => cat.rating < 1 || cat.rating > 5);
      if (invalidRating) {
        return NextResponse.json(
          { success: false, message: "Ratings must be between 1 and 5." },
          { status: 400 },
        );
      }
      evaluation.categories = body.categories;
    }

    if (body.weekStartDate) {
      evaluation.weekStartDate = new Date(body.weekStartDate);
    }

    if (body.overallComments !== undefined) {
      evaluation.overallComments = body.overallComments;
    }

    if (body.status && body.status !== evaluation.status) {
      evaluation.status = body.status;
      if (body.status === "submitted") {
        evaluation.submittedAt = new Date();
      }
    }

    await evaluation.save();

    const updatedEvaluation = await EvaluationModel.findById(evaluationId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .populate("reviewedBy", "fullName email")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Evaluation updated successfully.",
      evaluation: updatedEvaluation,
    });
  } catch (error) {
    console.error("Error updating evaluation:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to update evaluation." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { evaluationId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { evaluationId } = context.params;
    if (!Types.ObjectId.isValid(evaluationId)) {
      return NextResponse.json({ success: false, message: "Invalid evaluation ID." }, { status: 400 });
    }

    await EvaluationModel.findByIdAndDelete(evaluationId);

    return NextResponse.json({
      success: true,
      message: "Evaluation deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting evaluation:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to delete evaluation." },
      { status: 500 },
    );
  }
}
