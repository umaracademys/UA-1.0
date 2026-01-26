import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AssignmentModel from "@/lib/db/models/Assignment";
import StudentModel from "@/lib/db/models/Student";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";
import type { ClassworkPhase, HomeworkItem } from "@/lib/db/models/Assignment";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

// GET /api/assignments/:id - Get single assignment by ID
export async function GET(request: Request, context: { params: { assignmentId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { assignmentId } = context.params;
    if (!Types.ObjectId.isValid(assignmentId)) {
      return NextResponse.json({ success: false, message: "Invalid assignment ID." }, { status: 400 });
    }

    const assignment = await AssignmentModel.findById(assignmentId).lean();

    if (!assignment) {
      return NextResponse.json({ success: false, message: "Assignment not found." }, { status: 404 });
    }

    // Check access permissions
    if (decoded.role === "student") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      const student = await StudentModel.findOne({ userId: user._id });
      if (!student || assignment.studentId.toString() !== student._id.toString()) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role === "teacher") {
      // Teachers can view assignments they created or for their assigned students
      if (assignment.assignedBy !== decoded.userId) {
        // Check if student is assigned to this teacher
        const student = await StudentModel.findById(assignment.studentId);
        if (student) {
          const user = await UserModel.findById(decoded.userId);
          if (user) {
            // This would require checking teacher-student relationship
            // For now, allow if assignedBy matches or if teacher has access
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load assignment." },
      { status: 500 },
    );
  }
}

// PUT /api/assignments/:id - Update existing assignment
export async function PUT(request: Request, context: { params: { assignmentId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "assignments.edit", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { assignmentId } = context.params;
    if (!Types.ObjectId.isValid(assignmentId)) {
      return NextResponse.json({ success: false, message: "Invalid assignment ID." }, { status: 400 });
    }

    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json({ success: false, message: "Assignment not found." }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { classwork, homework, comment, mushafMistakes, status } = body;

    // Validate homework items if provided
    if (homework?.items && Array.isArray(homework.items)) {
      for (const item of homework.items) {
        // Validate type
        if (!["sabq", "sabqi", "manzil"].includes(item.type)) {
          return NextResponse.json(
            { success: false, message: `Invalid homework item type: ${item.type}` },
            { status: 400 },
          );
        }

        // Validate range
        if (item.range) {
          if (!["surah_ayah", "surah_surah", "juz_juz", "multiple_juz"].includes(item.range.mode)) {
            return NextResponse.json(
              { success: false, message: `Invalid range mode: ${item.range.mode}` },
              { status: 400 },
            );
          }

          // Validate surah numbers (1-114)
          if (item.range.from?.surah && (item.range.from.surah < 1 || item.range.from.surah > 114)) {
            return NextResponse.json(
              { success: false, message: "Surah number must be between 1 and 114." },
              { status: 400 },
            );
          }
          if (item.range.to?.surah && (item.range.to.surah < 1 || item.range.to.surah > 114)) {
            return NextResponse.json(
              { success: false, message: "Surah number must be between 1 and 114." },
              { status: 400 },
            );
          }

          // Validate to.surah >= from.surah
          if (
            item.range.from?.surah &&
            item.range.to?.surah &&
            item.range.to.surah < item.range.from.surah
          ) {
            return NextResponse.json(
              { success: false, message: "End surah must be >= start surah." },
              { status: 400 },
            );
          }
        }
      }
    }

    // Update fields (preserve existing data not in update)
    const updateData: Record<string, unknown> = {};

    if (classwork !== undefined) {
      // Set createdAt for new classwork entries
      const currentDate = new Date();
      updateData.classwork = {
        sabq: (classwork.sabq || []).map((entry: ClassworkPhase) => ({
          ...entry,
          createdAt: entry.createdAt ? new Date(entry.createdAt) : currentDate,
        })),
        sabqi: (classwork.sabqi || []).map((entry: ClassworkPhase) => ({
          ...entry,
          createdAt: entry.createdAt ? new Date(entry.createdAt) : currentDate,
        })),
        manzil: (classwork.manzil || []).map((entry: ClassworkPhase) => ({
          ...entry,
          createdAt: entry.createdAt ? new Date(entry.createdAt) : currentDate,
        })),
      };
    }

    if (homework !== undefined) {
      // Merge with existing homework data
      updateData.homework = {
        ...(assignment.homework || {}),
        ...homework,
      };
    }

    if (comment !== undefined) {
      updateData.comment = comment;
    }

    if (mushafMistakes !== undefined) {
      updateData.mushafMistakes = mushafMistakes;
    }

    if (status !== undefined) {
      updateData.status = status;
      if (status === "completed") {
        updateData.completedAt = new Date();
      }
    }

    const updatedAssignment = await AssignmentModel.findByIdAndUpdate(assignmentId, updateData, {
      new: true,
    }).lean();

    // Emit WebSocket event
    try {
      const { emitAssignmentEvent } = await import("@/lib/socket/server");
      emitAssignmentEvent("assignment:updated", updatedAssignment, [
        (updatedAssignment as any).studentId.toString(),
      ]);
    } catch (error) {
      console.error("Failed to emit WebSocket event:", error);
      // Continue even if WebSocket fails
    }

    return NextResponse.json({
      success: true,
      message: "Assignment updated successfully.",
      data: updatedAssignment,
    });
  } catch (error: any) {
    console.error("Error updating assignment:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update assignment.",
        error: error?.name || "UnknownError",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/assignments/:id - Delete assignment
export async function DELETE(request: Request, context: { params: { assignmentId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "assignments.delete", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { assignmentId } = context.params;
    if (!Types.ObjectId.isValid(assignmentId)) {
      return NextResponse.json({ success: false, message: "Invalid assignment ID." }, { status: 400 });
    }

    await AssignmentModel.findByIdAndDelete(assignmentId);

    return NextResponse.json({
      success: true,
      message: "Assignment deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to delete assignment." },
      { status: 500 },
    );
  }
}
