import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AssessmentModel from "@/lib/db/models/Assessment";
import AttendanceModel from "@/lib/db/models/Attendance";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(request: Request, context: { params: { teacherId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    const { teacherId } = context.params;

    if (!Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json({ success: false, message: "Invalid teacher ID." }, { status: 400 });
    }

    await connectToDatabase();

    const teacher = await TeacherModel.findById(teacherId);
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher not found." }, { status: 404 });
    }

    const canView =
      checkAPIPermission(decoded.role, "users.view", decoded.permissions) ||
      teacher.userId.toString() === decoded.userId;

    if (!canView) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const students = await StudentModel.find({ assignedTeachers: teacher._id })
      .populate("userId", "email fullName")
      .lean();

    const enriched = await Promise.all(
      students.map(async (student) => {
        const recentAssessment = await AssessmentModel.findOne({ studentId: student._id })
          .sort({ date: -1 })
          .lean();
        const attendanceCount = await AttendanceModel.countDocuments({
          userId: student.userId,
          status: "present",
        });
        return {
          ...student,
          recentAssessment,
          attendanceCount,
        };
      }),
    );

    return NextResponse.json({ success: true, students: enriched, data: enriched });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load students." },
      { status: 500 },
    );
  }
}
