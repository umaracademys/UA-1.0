import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import NotificationModel from "@/lib/db/models/Notification";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";

type AssignStudentsPayload = {
  studentIds: string[];
};

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function POST(request: Request, context: { params: { teacherId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "users.manage_roles", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const { teacherId } = context.params;
    if (!Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json({ success: false, message: "Invalid teacher ID." }, { status: 400 });
    }

    const body = (await request.json()) as Partial<AssignStudentsPayload>;
    if (!body.studentIds || !Array.isArray(body.studentIds) || body.studentIds.length === 0) {
      return NextResponse.json({ success: false, message: "Student IDs array is required." }, { status: 400 });
    }

    // Validate all student IDs
    const validStudentIds = body.studentIds
      .map((id) => {
        try {
          return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Types.ObjectId[];

    if (validStudentIds.length === 0) {
      return NextResponse.json({ success: false, message: "No valid student IDs provided." }, { status: 400 });
    }

    await connectToDatabase();
    const teacher = await TeacherModel.findById(teacherId);
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher not found." }, { status: 404 });
    }

    // Verify all students exist
    const students = await StudentModel.find({ _id: { $in: validStudentIds } });
    if (students.length !== validStudentIds.length) {
      return NextResponse.json({ success: false, message: "Some students not found." }, { status: 404 });
    }

    // Add students to teacher (using $addToSet to avoid duplicates)
    await TeacherModel.updateOne(
      { _id: teacher._id },
      { $addToSet: { assignedStudents: { $each: validStudentIds } } },
    );

    // Add teacher to each student (using $addToSet to avoid duplicates)
    await StudentModel.updateMany(
      { _id: { $in: validStudentIds } },
      { $addToSet: { assignedTeachers: teacher._id } },
    );

    // Get teacher user for notifications
    const teacherUser = await UserModel.findById(teacher.userId);

    // Create notifications for students
    const studentUsers = await UserModel.find({
      _id: { $in: students.map((s) => s.userId) },
    });

    const studentNotifications = studentUsers.map((studentUser) => ({
      userId: studentUser._id,
      type: "registration" as const,
      title: "Teacher assigned",
      message: `A teacher has been assigned to you.`,
      relatedEntity: { type: "Teacher", id: teacher._id },
    }));

    if (studentNotifications.length > 0) {
      await NotificationModel.insertMany(studentNotifications);
    }

    // Create notification for teacher
    if (teacherUser) {
      await NotificationModel.create({
        userId: teacherUser._id,
        type: "registration",
        title: "Students assigned",
        message: `${validStudentIds.length} student(s) have been assigned to you.`,
        relatedEntity: { type: "Teacher", id: teacher._id },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${validStudentIds.length} student(s) to teacher.`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to assign students." },
      { status: 500 },
    );
  }
}
