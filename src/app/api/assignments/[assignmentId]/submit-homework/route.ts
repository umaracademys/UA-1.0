import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AssignmentModel from "@/lib/db/models/Assignment";
import StudentModel from "@/lib/db/models/Student";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { saveFile } from "@/lib/utils/fileUpload";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

// POST /api/assignments/:id/submit-homework - Submit homework (students)
export async function POST(
  request: Request,
  context: { params: { assignmentId: string } },
) {
  try {
    const token = getAuthToken(request);
    // Authentication is optional for students
    let decoded: any = null;
    if (token) {
      decoded = await verifyToken(token);
    }

    await connectToDatabase();

    const { assignmentId } = context.params;
    if (!Types.ObjectId.isValid(assignmentId)) {
      return NextResponse.json({ success: false, message: "Invalid assignment ID." }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { content, link, audioUrl, attachments, studentId, studentName } = body;

    // Validate required fields
    if (!studentId || !studentName) {
      return NextResponse.json(
        { success: false, message: "studentId and studentName are required." },
        { status: 400 },
      );
    }

    // Validate at least one submission method
    if (!content && !link && !audioUrl && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { success: false, message: "At least one submission method is required (content, link, audioUrl, or attachments)." },
        { status: 400 },
      );
    }

    // Find assignment
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json({ success: false, message: "Assignment not found." }, { status: 404 });
    }

    // Validate homework is enabled
    if (!assignment.homework.enabled) {
      return NextResponse.json(
        { success: false, message: "Homework is not enabled for this assignment." },
        { status: 400 },
      );
    }

    // Validate student matches assignment
    if (assignment.studentId.toString() !== studentId) {
      return NextResponse.json(
        { success: false, message: "This assignment does not belong to the specified student." },
        { status: 403 },
      );
    }

    // Initialize submission object if it doesn't exist
    if (!assignment.homework.submission) {
      assignment.homework.submission = {
        submitted: false,
        status: "submitted",
      };
    }

    // Handle file attachments if provided
    let processedAttachments: Array<{ name: string; url: string; type: string; size?: number }> = [];
    if (attachments && Array.isArray(attachments)) {
      // If attachments are already URLs, use them directly
      processedAttachments = attachments.map((att: any) => ({
        name: att.name || att.filename || "attachment",
        url: att.url || att.path,
        type: att.type || "application/octet-stream",
        size: att.size,
      }));
    }

    // Update submission
    assignment.homework.submission.submitted = true;
    assignment.homework.submission.submittedAt = new Date();
    assignment.homework.submission.submittedBy = studentId;
    assignment.homework.submission.submittedByName = studentName;
    assignment.homework.submission.content = content || "";
    assignment.homework.submission.link = link || "";
    assignment.homework.submission.audioUrl = audioUrl || "";
    assignment.homework.submission.attachments = processedAttachments;
    assignment.homework.submission.status = "submitted";

    await assignment.save();

    // Emit WebSocket event
    try {
      const { emitAssignmentEvent } = await import("@/lib/socket/server");
      emitAssignmentEvent("assignment:updated", assignment, [studentId]);
    } catch (error) {
      console.error("Failed to emit WebSocket event:", error);
      // Continue even if WebSocket fails
    }

    const populatedAssignment = await AssignmentModel.findById(assignmentId).lean();

    return NextResponse.json({
      success: true,
      message: "Homework submitted successfully.",
      data: populatedAssignment,
    });
  } catch (error: any) {
    console.error("Error submitting homework:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to submit homework.",
        error: error?.name || "UnknownError",
      },
      { status: 500 },
    );
  }
}
