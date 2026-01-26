import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AssignmentModel from "@/lib/db/models/Assignment";
import SubmissionModel from "@/lib/db/models/Submission";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import NotificationModel from "@/lib/db/models/Notification";
import { verifyToken } from "@/lib/utils/jwt";
import { saveFiles } from "@/lib/utils/fileUpload";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function POST(request: Request, context: { params: { assignmentId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (decoded.role !== "student") {
      return NextResponse.json({ success: false, message: "Only students can submit assignments." }, { status: 403 });
    }

    await connectToDatabase();

    const { assignmentId } = context.params;
    if (!Types.ObjectId.isValid(assignmentId)) {
      return NextResponse.json({ success: false, message: "Invalid assignment ID." }, { status: 400 });
    }

    // Get student profile
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }
    const student = await StudentModel.findOne({ userId: user._id });
    if (!student) {
      return NextResponse.json({ success: false, message: "Student profile not found." }, { status: 404 });
    }

    // Verify assignment exists and student is assigned
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json({ success: false, message: "Assignment not found." }, { status: 404 });
    }

    const isAssigned = assignment.studentId.toString() === student._id.toString();
    if (!isAssigned) {
      return NextResponse.json({ success: false, message: "You are not assigned to this assignment." }, { status: 403 });
    }

    // Parse FormData
    const formData = await request.formData();
    const content = formData.get("content") as string;
    const attachments = formData.getAll("attachments") as File[];

    if (!content && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ success: false, message: "Submission must have content or attachments." }, { status: 400 });
    }

    // Save attachments
    let savedAttachments: Array<{ filename: string; url: string; uploadedAt: Date }> = [];
    if (attachments && attachments.length > 0) {
      const files = attachments.filter((f) => f instanceof File);
      if (files.length > 0) {
        savedAttachments = await saveFiles(files, "submissions");
      }
    }

    // Check if submission is late (dueDate not in new structure, so always pending)
    const status = "pending";

    // Create or update submission
    const submission = await SubmissionModel.findOneAndUpdate(
      {
        assignmentId: new Types.ObjectId(assignmentId),
        studentId: student._id,
      },
      {
        content: content || undefined,
        attachments: savedAttachments,
        submittedAt: new Date(),
        status,
      },
      {
        upsert: true,
        new: true,
      },
    );

    // Update assignment status
    // Since each assignment is for one student, update status directly
    await AssignmentModel.findByIdAndUpdate(assignmentId, { status: "submitted" });

    // Notify teacher/admin who assigned this
    const assignedByUser = await UserModel.findById(assignment.assignedBy);
    if (assignedByUser) {
      await NotificationModel.create({
        userId: assignedByUser._id,
        type: "assignment_submission",
        title: "New Submission",
        message: `${user.fullName} submitted an assignment`,
        relatedEntity: {
          type: "Submission",
          id: submission._id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Assignment submitted successfully.",
      submission: await SubmissionModel.findById(submission._id)
        .populate("assignmentId")
        .populate("studentId", "userId")
        .lean(),
    });
  } catch (error) {
    console.error("Error submitting assignment:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to submit assignment." },
      { status: 500 },
    );
  }
}
