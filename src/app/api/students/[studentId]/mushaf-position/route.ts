/**
 * GET /api/students/[studentId]/mushaf-position
 * Returns the student's last Mushaf position (page, surah, ayah). GET restores last Mushaf position when opening the Mushaf.
 *
 * PATCH /api/students/[studentId]/mushaf-position
 * Updates the student's last Mushaf position when they navigate (or teacher opens Mushaf for them).
 * Fields are optional. No data loss or migration required.
 */
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
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

    const student = await StudentModel.findById(studentId).lean();
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    if (decoded.role === "student") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      const profile = await StudentModel.findOne({ userId: user._id });
      if (!profile || profile._id.toString() !== studentId) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role === "teacher") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher || !teacher.assignedStudents.some((id) => id.toString() === studentId)) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      position: {
        lastPage: student.lastMushafPage ?? 1,
        lastSurah: student.lastMushafSurah,
        lastAyah: student.lastMushafAyah,
      },
    });
  } catch (error) {
    console.error("Error fetching mushaf position:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load position." },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    if (decoded.role === "student") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      const profile = await StudentModel.findOne({ userId: user._id });
      if (!profile || profile._id.toString() !== studentId) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role === "teacher") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher || !teacher.assignedStudents.some((id) => id.toString() === studentId)) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      lastPage?: number;
      lastSurah?: number;
      lastAyah?: number;
    };

    if (body.lastPage != null && body.lastPage >= 1 && body.lastPage <= 604) {
      student.lastMushafPage = body.lastPage;
    }
    if (body.lastSurah != null && body.lastSurah >= 1 && body.lastSurah <= 114) {
      student.lastMushafSurah = body.lastSurah;
    }
    if (body.lastAyah != null && body.lastAyah >= 1) {
      student.lastMushafAyah = body.lastAyah;
    }

    await student.save();

    return NextResponse.json({
      success: true,
      message: "Mushaf position updated.",
      position: {
        lastPage: student.lastMushafPage ?? 1,
        lastSurah: student.lastMushafSurah,
        lastAyah: student.lastMushafAyah,
      },
    });
  } catch (error) {
    console.error("Error updating mushaf position:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to update position." },
      { status: 500 },
    );
  }
}
