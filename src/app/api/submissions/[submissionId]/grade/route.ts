import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import SubmissionModel from "@/lib/db/models/Submission";
import AssignmentModel from "@/lib/db/models/Assignment";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import NotificationModel from "@/lib/db/models/Notification";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function POST(request: Request, context: { params: { submissionId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!hasPermission(decoded.role, "homework.grade") && !decoded.permissions?.includes("homework.grade")) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { submissionId } = context.params;
    if (!Types.ObjectId.isValid(submissionId)) {
      return NextResponse.json({ success: false, message: "Invalid submission ID." }, { status: 400 });
    }

    const submission = await SubmissionModel.findById(submissionId).populate("assignmentId");
    if (!submission) {
      return NextResponse.json({ success: false, message: "Submission not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      grade: number;
      feedback?: string;
      teacherNotes?: string;
    };

    if (body.grade === undefined || body.grade === null) {
      return NextResponse.json({ success: false, message: "Grade is required." }, { status: 400 });
    }

    if (body.grade < 0) {
      return NextResponse.json({ success: false, message: "Grade cannot be negative." }, { status: 400 });
    }

    // Get teacher profile
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }
    const teacher = await TeacherModel.findOne({ userId: user._id });
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
    }

    // Update submission
    const updatedSubmission = await SubmissionModel.findByIdAndUpdate(
      submissionId,
      {
        grade: body.grade,
        feedback: body.feedback || undefined,
        teacherNotes: body.teacherNotes || undefined,
        gradedAt: new Date(),
        gradedBy: teacher._id,
        status: "graded",
      },
      { new: true },
    )
      .populate("studentId", "userId")
      .populate("assignmentId")
      .lean();

    // Update assignment status if all submissions are graded
    const assignment = await AssignmentModel.findById(submission.assignmentId);
    if (assignment) {
      const allSubmissions = await SubmissionModel.find({
        assignmentId: assignment._id,
      });
      const allGraded = allSubmissions.every((s) => s.gradedAt);
      if (allGraded) {
        await AssignmentModel.findByIdAndUpdate(assignment._id, {
          status: "completed",
          completedAt: new Date(),
        });
      }
    }

    // Notify student
    const student = await SubmissionModel.findById(submissionId).populate("studentId");
    if (student && "studentId" in student && student.studentId && typeof student.studentId === "object" && "userId" in student.studentId) {
      await NotificationModel.create({
        userId: (student.studentId as { userId: Types.ObjectId }).userId,
        type: "evaluation_feedback",
        title: "Assignment Graded",
        message: `Your submission for assignment has been graded.`,
        relatedEntity: {
          type: "Submission",
          id: new Types.ObjectId(submissionId),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Submission graded successfully.",
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error("Error grading submission:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to grade submission." },
      { status: 500 },
    );
  }
}
