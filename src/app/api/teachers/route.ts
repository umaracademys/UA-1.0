import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { validatePassword } from "@/lib/utils/password";
import { checkAPIPermission } from "@/lib/utils/permissions";
import { isValidEmail } from "@/lib/middleware/security";

export const dynamic = "force-dynamic";

type TeacherCreatePayload = {
  email: string;
  password: string;
  fullName: string;
  contactNumber?: string;
  teacherData?: Record<string, unknown>;
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
    // Allow teachers, students, admins, and super_admins to view teachers for messaging
    // Teachers need to see other teachers, students need to see their teachers
    const canView = 
      decoded.role === "super_admin" || 
      decoded.role === "admin" || 
      decoded.role === "teacher" || 
      decoded.role === "student" ||
      checkAPIPermission(decoded.role, "users.view", decoded.permissions);
    
    if (!canView) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();
    const teachers = await TeacherModel.find()
      .populate("userId", "email fullName contactNumber isActive role")
      .lean();

    const data = await Promise.all(
      teachers.map(async (teacher) => {
        const count = await StudentModel.countDocuments({ assignedTeachers: teacher._id });
        return { ...teacher, assignedStudentCount: count };
      }),
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load teachers." },
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

    const body = (await request.json()) as Partial<TeacherCreatePayload>;
    const { email, password, fullName, contactNumber, teacherData } = body;

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
      role: "teacher",
      contactNumber,
    });

    const teacher = await TeacherModel.create({
      userId: user._id,
      status: "active",
      assignedStudents: [],
      ...(teacherData ?? {}),
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
          teacher,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to create teacher." },
      { status: 500 },
    );
  }
}
