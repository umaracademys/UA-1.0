import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AssignmentModel from "@/lib/db/models/Assignment";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

// POST /api/assignments/:id/grade-homework - Grade homework (teachers/admins)
export async function POST(
  request: Request,
  context: { params: { assignmentId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "assignments.grade_homework", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { assignmentId } = context.params;
    if (!Types.ObjectId.isValid(assignmentId)) {
      return NextResponse.json({ success: false, message: "Invalid assignment ID." }, { status: 400 });
    }

    // Get user grading the homework
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { feedback, grade, gradedBy, gradedByName } = body;

    // Validate required fields
    if (!feedback || !gradedBy || !gradedByName) {
      return NextResponse.json(
        { success: false, message: "feedback, gradedBy, and gradedByName are required." },
        { status: 400 },
      );
    }

    // Find assignment
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json({ success: false, message: "Assignment not found." }, { status: 404 });
    }

    // Validate submission exists and is submitted
    if (!assignment.homework.submission || !assignment.homework.submission.submitted) {
      return NextResponse.json(
        { success: false, message: "No homework submission found or homework not yet submitted." },
        { status: 400 },
      );
    }

    // Update grading fields
    assignment.homework.submission.feedback = feedback;
    assignment.homework.submission.grade = grade !== undefined && grade !== null ? grade : undefined;
    assignment.homework.submission.gradedBy = gradedBy;
    assignment.homework.submission.gradedByName = gradedByName;
    assignment.homework.submission.gradedAt = new Date();
    // Set status: 'graded' if grade provided, 'returned' if no grade
    assignment.homework.submission.status =
      grade !== undefined && grade !== null ? "graded" : "returned";

    await assignment.save();

    // Emit WebSocket event
    try {
      const { emitAssignmentEvent } = await import("@/lib/socket/server");
      emitAssignmentEvent("assignment:updated", assignment, [assignment.studentId.toString()]);
    } catch (error) {
      console.error("Failed to emit WebSocket event:", error);
      // Continue even if WebSocket fails
    }

    const populatedAssignment = await AssignmentModel.findById(assignmentId).lean();

    return NextResponse.json({
      success: true,
      message: "Homework graded successfully.",
      data: populatedAssignment,
    });
  } catch (error: any) {
    console.error("Error grading homework:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to grade homework.",
        error: error?.name || "UnknownError",
      },
      { status: 500 },
    );
  }
}
