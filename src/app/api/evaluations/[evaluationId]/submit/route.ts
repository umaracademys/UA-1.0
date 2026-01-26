import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import EvaluationModel from "@/lib/db/models/Evaluation";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import NotificationModel from "@/lib/db/models/Notification";
import { verifyToken } from "@/lib/utils/jwt";

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
    await connectToDatabase();

    const { evaluationId } = context.params;
    if (!Types.ObjectId.isValid(evaluationId)) {
      return NextResponse.json({ success: false, message: "Invalid evaluation ID." }, { status: 400 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check if user is a teacher
    if (decoded.role !== "teacher" && decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const teacher = await TeacherModel.findOne({ userId: user._id });
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
    }

    const evaluation = await EvaluationModel.findById(evaluationId);
    if (!evaluation) {
      return NextResponse.json({ success: false, message: "Evaluation not found." }, { status: 404 });
    }

    // Check if teacher owns this evaluation
    if (evaluation.teacherId.toString() !== teacher._id.toString()) {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    // Check if already submitted
    if (evaluation.status === "submitted" || evaluation.status === "approved" || evaluation.status === "rejected") {
      return NextResponse.json(
        { success: false, message: "Evaluation is already submitted or reviewed." },
        { status: 400 },
      );
    }

    // Update status
    evaluation.status = "submitted";
    evaluation.submittedAt = new Date();
    await evaluation.save();

    // Create notification for admins
    const admins = await UserModel.find({ role: { $in: ["admin", "super_admin"] } }).select("_id").lean();
    
    const notifications = admins.map((admin) => ({
      userId: admin._id,
      type: "evaluation_feedback" as const,
      title: "New Evaluation Submitted",
      message: `${user.fullName} submitted an evaluation for review`,
      relatedEntity: {
        type: "Evaluation",
        id: evaluation._id,
      },
    }));

    if (notifications.length > 0) {
      await NotificationModel.insertMany(notifications);
    }

    const updatedEvaluation = await EvaluationModel.findById(evaluationId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Evaluation submitted successfully.",
      evaluation: updatedEvaluation,
    });
  } catch (error) {
    console.error("Error submitting evaluation:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to submit evaluation." },
      { status: 500 },
    );
  }
}
