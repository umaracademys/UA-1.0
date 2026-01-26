import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AttendanceModel from "@/lib/db/models/Attendance";
import PersonalMushafModel from "@/lib/db/models/PersonalMushaf";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { validatePassword } from "@/lib/utils/password";
import { checkAPIPermission } from "@/lib/utils/permissions";
import { isValidEmail } from "@/lib/middleware/security";
import type { UserRole } from "@/types";

type StudentCreatePayload = {
  email: string;
  password: string;
  fullName: string;
  contactNumber?: string;
  studentData?: Record<string, unknown>;
  assignedTeacherIds?: string[];
};

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    // Allow teachers, students, admins, and super_admins to view students for messaging
    // Teachers need to see their students, students need to see other students for messaging
    const canView = 
      decoded.role === "super_admin" || 
      decoded.role === "admin" || 
      decoded.role === "teacher" || 
      decoded.role === "student" ||
      checkAPIPermission(decoded.role, "users.view", decoded.permissions);
    
    if (!canView) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teacherIdParam = searchParams.get("teacherId");
    const programType = searchParams.get("programType") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    await connectToDatabase();

    let teacherId: Types.ObjectId | null = null;
    if (decoded.role === "teacher") {
      const teacherProfile = await TeacherModel.findOne({ userId: decoded.userId });
      if (!teacherProfile) {
        return NextResponse.json({ success: true, data: [] });
      }
      teacherId = teacherProfile._id;
    } else if (teacherIdParam && Types.ObjectId.isValid(teacherIdParam)) {
      teacherId = new Types.ObjectId(teacherIdParam);
    }

    const filter: Record<string, unknown> = {};
    if (programType) filter.programType = programType;
    if (status) filter.status = status;
    if (teacherId) filter.assignedTeachers = teacherId;

    let students = await StudentModel.find(filter)
      .populate("userId", "email fullName contactNumber isActive")
      .populate({
        path: "assignedTeachers",
        select: "userId specialization status",
        populate: { path: "userId", select: "fullName email" },
      })
      .lean();

    if (search) {
      const term = search.toLowerCase();
      students = students.filter((student) => {
        const user = student.userId as { email?: string; fullName?: string };
        return (
          user?.email?.toLowerCase().includes(term) ||
          user?.fullName?.toLowerCase().includes(term)
        );
      });
    }

    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load students." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "users.create", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as Partial<StudentCreatePayload>;
    const { email, password, fullName, contactNumber, studentData, assignedTeacherIds } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email address." },
        { status: 400 },
      );
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: "Password does not meet requirements.", errors: validation.errors },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Email already registered." },
        { status: 409 },
      );
    }

    const user = await UserModel.create({
      email,
      password,
      fullName,
      role: "student",
      contactNumber,
    });

    const assignedTeachers = (assignedTeacherIds ?? [])
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const student = await StudentModel.create({
      userId: user._id,
      status: "pending",
      assignedTeachers,
      siblings: [],
      recitationHistory: [],
      ...(studentData ?? {}),
    });

    if (assignedTeachers.length > 0) {
      await TeacherModel.updateMany(
        { _id: { $in: assignedTeachers } },
        { $addToSet: { assignedStudents: student._id } },
      );
    }

    await PersonalMushafModel.create({
      studentId: student._id,
      studentName: user.fullName,
      mistakes: [],
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          },
          student,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to create student." },
      { status: 500 },
    );
  }
}
