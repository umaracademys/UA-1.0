import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AssessmentModel from "@/lib/db/models/Assessment";
import AttendanceModel from "@/lib/db/models/Attendance";
import PersonalMushafModel from "@/lib/db/models/PersonalMushaf";
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

const canAccessStudent = async (decoded: { userId: string; role: string; permissions?: string[] }, studentId: string) => {
  if (decoded.role === "admin" || decoded.role === "super_admin") return true;
  if (hasPermission(decoded.role as never, "users.view") || decoded.permissions?.includes("users.view")) {
    return true;
  }
  if (decoded.role !== "teacher") return false;

  const teacher = await TeacherModel.findOne({ userId: decoded.userId });
  if (!teacher) return false;
  return teacher.assignedStudents.some((id) => id.toString() === studentId);
};

export async function GET(request: Request, context: { params: { studentId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    const { studentId } = context.params;

    if (!Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, message: "Invalid student ID." }, { status: 400 });
    }

    await connectToDatabase();

    const allowed = await canAccessStudent(decoded, studentId);
    if (!allowed) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const student = await StudentModel.findById(studentId)
      .populate("userId", "email fullName contactNumber isActive")
      .populate({
        path: "assignedTeachers",
        select: "userId specialization status",
        populate: { path: "userId", select: "fullName email" },
      })
      .lean();

    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    const personalMushaf = await PersonalMushafModel.findOne({ studentId: student._id }).lean();
    const recentAssessments = await AssessmentModel.find({ studentId: student._id })
      .sort({ date: -1 })
      .limit(5)
      .lean();

    const attendanceSummary = await AttendanceModel.aggregate([
      { $match: { userId: student.userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        student,
        user: student.userId,
        assignedTeachers: student.assignedTeachers,
        recitationProfile: personalMushaf,
        recentAssessments,
        attendanceSummary,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load student." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: { params: { studentId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    const { studentId } = context.params;

    if (!Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, message: "Invalid student ID." }, { status: 400 });
    }

    await connectToDatabase();
    const student = await StudentModel.findById(studentId);
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    const canEdit =
      decoded.role === "admin" ||
      decoded.role === "super_admin" ||
      hasPermission(decoded.role as never, "users.edit") ||
      decoded.permissions?.includes("users.edit") ||
      (decoded.role === "teacher" &&
        (await TeacherModel.findOne({ userId: decoded.userId }))?.assignedStudents.some(
          (id) => id.toString() === studentId,
        ));

    if (!canEdit) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const teacherAllowedFields = [
      "schedule",
      "currentSabq",
      "currentSabqi",
      "currentManzil",
      "status",
      "recitationHistory",
    ];

    const updates: Record<string, unknown> = {};
    Object.entries(body).forEach(([key, value]) => {
      if (decoded.role === "teacher" && !teacherAllowedFields.includes(key)) {
        return;
      }
      updates[key] = value;
    });

    const updated = await StudentModel.findByIdAndUpdate(studentId, updates, { new: true });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to update student." },
      { status: 500 },
    );
  }
}
