import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AssignmentModel from "@/lib/db/models/Assignment";
import SubmissionModel from "@/lib/db/models/Submission";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(request: Request, context: { params: { assignmentId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (
      !hasPermission(decoded.role, "homework.view_submissions") &&
      !decoded.permissions?.includes("homework.view_submissions") &&
      decoded.role !== "admin" &&
      decoded.role !== "super_admin"
    ) {
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

    const submissions = await SubmissionModel.find({ assignmentId: new Types.ObjectId(assignmentId) })
      .populate("studentId", "userId")
      .populate("gradedBy", "userId")
      .sort({ submittedAt: -1 })
      .lean();

    // Get statistics
    const stats = {
      total: submissions.length,
      submitted: submissions.filter((s) => s.submittedAt).length,
      pending: submissions.filter((s) => !s.submittedAt).length,
      graded: submissions.filter((s) => s.gradedAt).length,
      late: submissions.filter((s) => s.status === "late").length,
    };

    return NextResponse.json({
      success: true,
      submissions,
      statistics: stats,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load submissions." },
      { status: 500 },
    );
  }
}
