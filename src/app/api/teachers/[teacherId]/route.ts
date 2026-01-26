import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

type TeacherUpdatePayload = {
  specialization?: string;
  status?: "active" | "inactive";
};

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

    await verifyToken(token);
    const { teacherId } = context.params;

    if (!Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json({ success: false, message: "Invalid teacher ID." }, { status: 400 });
    }

    await connectToDatabase();

    const teacher = await TeacherModel.findById(teacherId)
      .populate("userId", "email fullName contactNumber isActive")
      .lean();

    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher not found." }, { status: 404 });
    }

    const students = await StudentModel.find({ assignedTeachers: teacher._id })
      .populate("userId", "email fullName")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        teacher,
        assignedStudents: students,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load teacher." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: { params: { teacherId: string } }) {
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

    const canEdit =
      decoded.role === "admin" ||
      decoded.role === "super_admin" ||
      hasPermission(decoded.role, "users.edit") ||
      decoded.permissions?.includes("users.edit") ||
      teacher.userId.toString() === decoded.userId;

    if (!canEdit) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as Partial<TeacherUpdatePayload>;
    const updates: Record<string, unknown> = {};

    if (body.specialization !== undefined) updates.specialization = body.specialization;
    if (body.status !== undefined) updates.status = body.status;

    const updated = await TeacherModel.findByIdAndUpdate(teacherId, updates, { new: true });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to update teacher." },
      { status: 500 },
    );
  }
}
