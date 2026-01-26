import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AssignmentModel from "@/lib/db/models/Assignment";
import SubmissionModel from "@/lib/db/models/Submission";
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

export async function GET(request: Request, context: { params: { studentId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { studentId } = context.params;
    if (!Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, message: "Invalid student ID." }, { status: 400 });
    }

    const student = await StudentModel.findById(studentId);
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    // Check access permissions
    if (decoded.role === "student") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      const studentProfile = await StudentModel.findOne({ userId: user._id });
      if (!studentProfile || studentProfile._id.toString() !== studentId) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role === "teacher") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher || !teacher.assignedStudents.some((id) => id.toString() === studentId)) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      if (
        !hasPermission(decoded.role, "assignments.access") &&
        !decoded.permissions?.includes("assignments.access")
      ) {
        return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
      }
    }

    // Get all assignments for this student
    const assignments = await AssignmentModel.find({
      assignedTo: new Types.ObjectId(studentId),
    })
      .populate("assignedBy", "userId")
      .sort({ createdAt: -1 })
      .lean();

    // Get submissions for each assignment
    const assignmentsWithSubmissions = await Promise.all(
      assignments.map(async (assignment) => {
        const submission = await SubmissionModel.findOne({
          assignmentId: assignment._id,
          studentId: new Types.ObjectId(studentId),
        }).lean();

        // Categorize assignment
        let category = "pending";
        if (submission?.gradedAt) {
          category = "graded";
        } else if (submission?.submittedAt) {
          category = "completed";
        }
        // Note: dueDate not in new Assignment model structure

        return {
          ...assignment,
          submission,
          category,
        };
      }),
    );

    // Calculate statistics
    const stats = {
      total: assignments.length,
      pending: assignmentsWithSubmissions.filter((a) => a.category === "pending").length,
      completed: assignmentsWithSubmissions.filter((a) => a.category === "completed").length,
      overdue: assignmentsWithSubmissions.filter((a) => a.category === "overdue").length,
      graded: assignmentsWithSubmissions.filter((a) => a.category === "graded").length,
    };

    // Categorize assignments
    const categorized = {
      pending: assignmentsWithSubmissions.filter((a) => a.category === "pending"),
      completed: assignmentsWithSubmissions.filter((a) => a.category === "completed"),
      overdue: assignmentsWithSubmissions.filter((a) => a.category === "overdue"),
      graded: assignmentsWithSubmissions.filter((a) => a.category === "graded"),
    };

    return NextResponse.json({
      success: true,
      assignments: assignmentsWithSubmissions,
      categorized,
      statistics: stats,
    });
  } catch (error) {
    console.error("Error fetching student assignments:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load assignments." },
      { status: 500 },
    );
  }
}
