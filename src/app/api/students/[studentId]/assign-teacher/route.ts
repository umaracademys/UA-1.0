import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import NotificationModel from "@/lib/db/models/Notification";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";

type AssignTeacherPayload = {
  teacherId: string;
};

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function POST(request: Request, context: { params: { studentId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "users.manage_roles", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const { studentId } = context.params;
    if (!Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, message: "Invalid student ID." }, { status: 400 });
    }

    const body = (await request.json()) as Partial<AssignTeacherPayload>;
    if (!body.teacherId || !Types.ObjectId.isValid(body.teacherId)) {
      return NextResponse.json({ success: false, message: "Invalid teacher ID." }, { status: 400 });
    }

    await connectToDatabase();
    const student = await StudentModel.findById(studentId);
    const teacher = await TeacherModel.findById(body.teacherId);
    if (!student || !teacher) {
      return NextResponse.json({ success: false, message: "Student or teacher not found." }, { status: 404 });
    }

    await StudentModel.updateOne(
      { _id: student._id },
      { $addToSet: { assignedTeachers: teacher._id } },
    );

    await TeacherModel.updateOne(
      { _id: teacher._id },
      { $addToSet: { assignedStudents: student._id } },
    );

    const studentUser = await UserModel.findById(student.userId);
    const teacherUser = await UserModel.findById(teacher.userId);

    if (studentUser) {
      await NotificationModel.create({
        userId: studentUser._id,
        type: "registration",
        title: "Teacher assigned",
        message: `A teacher has been assigned to you.`,
        relatedEntity: { type: "Teacher", id: teacher._id },
      });
    }

    if (teacherUser) {
      await NotificationModel.create({
        userId: teacherUser._id,
        type: "registration",
        title: "Student assigned",
        message: `A student has been assigned to you.`,
        relatedEntity: { type: "Student", id: student._id },
      });
    }

    return NextResponse.json({ success: true, message: "Teacher assigned successfully." });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to assign teacher." },
      { status: 500 },
    );
  }
}
