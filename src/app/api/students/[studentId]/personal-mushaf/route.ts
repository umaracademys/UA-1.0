import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import PersonalMushafModel from "@/lib/db/models/PersonalMushaf";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(
  request: Request,
  context: { params: { studentId: string } },
) {
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
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    // Get Personal Mushaf
    const personalMushaf = await PersonalMushafModel.findOne({ studentId: new Types.ObjectId(studentId) });

    if (!personalMushaf) {
      return NextResponse.json({
        success: true,
        personalMushaf: {
          studentId,
          studentName: student.userId ? (await UserModel.findById(student.userId).select("fullName").lean())?.fullName : "Unknown",
          mistakes: [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      personalMushaf: {
        _id: personalMushaf._id,
        studentId: personalMushaf.studentId,
        studentName: personalMushaf.studentName,
        mistakes: personalMushaf.mistakes,
        createdAt: personalMushaf.createdAt,
        updatedAt: personalMushaf.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching Personal Mushaf:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load Personal Mushaf." },
      { status: 500 },
    );
  }
}
