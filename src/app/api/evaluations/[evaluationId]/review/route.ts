import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import EvaluationModel from "@/lib/db/models/Evaluation";
import AssignmentModel from "@/lib/db/models/Assignment";
import StudentModel from "@/lib/db/models/Student";
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

export async function POST(
  request: Request,
  context: { params: { evaluationId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (
      !hasPermission(decoded.role, "evaluation.approve") &&
      !decoded.permissions?.includes("evaluation.approve")
    ) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { evaluationId } = context.params;
    if (!Types.ObjectId.isValid(evaluationId)) {
      return NextResponse.json({ success: false, message: "Invalid evaluation ID." }, { status: 400 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const evaluation = await EvaluationModel.findById(evaluationId)
      .populate("studentId")
      .populate("teacherId");
    if (!evaluation) {
      return NextResponse.json({ success: false, message: "Evaluation not found." }, { status: 404 });
    }

    if (evaluation.status !== "submitted") {
      return NextResponse.json(
        { success: false, message: "Evaluation is not in submitted status." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      action: "approve" | "reject";
      reviewNotes: string;
      homeworkAssignmentData?: {
        title: string;
        description: string;
        dueDate: string;
        instructions: string;
      };
    };

    const { action, reviewNotes, homeworkAssignmentData } = body;

    if (!action || (action !== "approve" && action !== "reject")) {
      return NextResponse.json(
        { success: false, message: "Action must be 'approve' or 'reject'." },
        { status: 400 },
      );
    }

    // Update evaluation
    evaluation.status = action === "approve" ? "approved" : "rejected";
    evaluation.reviewedBy = user._id;
    evaluation.reviewedAt = new Date();
    evaluation.reviewNotes = reviewNotes || "";

    // Create assignment from evaluation (new structure)
    let homeworkAssignment = null;
    if (action === "approve" && homeworkAssignmentData) {
      const student = await StudentModel.findById(evaluation.studentId);
      const teacher = await TeacherModel.findById(evaluation.teacherId);
      const teacherUser = await UserModel.findById(teacher?.userId);
      const studentUser = await StudentModel.findById(evaluation.studentId).then((s) =>
        s ? UserModel.findById(s.userId) : null,
      );

      if (student && teacher && teacherUser && studentUser) {
        // Determine assignedByRole
        let assignedByRole: "admin" | "super_admin" | "teacher" = "teacher";
        if (teacherUser.role === "admin") {
          assignedByRole = "admin";
        } else if (teacherUser.role === "super_admin") {
          assignedByRole = "super_admin";
        }

        // Create homework structure
        const homework = {
          enabled: true,
          items: [
            {
              type: "sabq" as const,
              range: {
                mode: "surah_ayah" as const,
                from: { surah: 1, surahName: "Al-Fatihah", ayah: 1 },
                to: { surah: 1, surahName: "Al-Fatihah", ayah: 7 },
              },
              source: {
                suggestedFrom: "manual" as const,
                ticketIds: [],
              },
              content: homeworkAssignmentData.instructions || homeworkAssignmentData.description || "",
            },
          ],
        };

        // Create new assignment
        homeworkAssignment = await AssignmentModel.create({
          studentId: student._id,
          studentName: studentUser.fullName,
          assignedBy: teacherUser._id.toString(),
          assignedByName: teacherUser.fullName,
          assignedByRole,
          weeklyEvaluationId: evaluation._id,
          classwork: {
            sabq: [],
            sabqi: [],
            manzil: [],
          },
          homework,
          comment: reviewNotes || "",
          status: "active",
        });

        evaluation.homeworkAssigned = homeworkAssignment._id;
      }
    }

    await evaluation.save();

    // Create notifications
    const student = await StudentModel.findById(evaluation.studentId);
    const teacher = await TeacherModel.findById(evaluation.teacherId);
    
    const notifications = [];

    if (student && student.userId) {
      notifications.push({
        userId: student.userId,
        type: "evaluation_feedback" as const,
        title: `Evaluation ${action === "approve" ? "Approved" : "Rejected"}`,
        message: `Your evaluation has been ${action === "approve" ? "approved" : "rejected"} by ${user.fullName}`,
        relatedEntity: {
          type: "Evaluation",
          id: evaluation._id,
        },
      });
    }

    if (teacher && teacher.userId) {
      notifications.push({
        userId: teacher.userId,
        type: "evaluation_feedback" as const,
        title: `Evaluation ${action === "approve" ? "Approved" : "Rejected"}`,
        message: `Your evaluation has been ${action === "approve" ? "approved" : "rejected"}`,
        relatedEntity: {
          type: "Evaluation",
          id: evaluation._id,
        },
      });
    }

    if (notifications.length > 0) {
      await NotificationModel.insertMany(notifications);
    }

    const updatedEvaluation = await EvaluationModel.findById(evaluationId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .populate("reviewedBy", "fullName email")
      .populate("homeworkAssigned")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Evaluation ${action === "approve" ? "approved" : "rejected"} successfully.`,
      evaluation: updatedEvaluation,
      homeworkAssignment: homeworkAssignment ? {
        _id: homeworkAssignment._id,
        studentName: homeworkAssignment.studentName,
      } : null,
    });
  } catch (error) {
    console.error("Error reviewing evaluation:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to review evaluation." },
      { status: 500 },
    );
  }
}
