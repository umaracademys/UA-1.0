import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import NotificationModel from "@/lib/db/models/Notification";
import { verifyToken } from "@/lib/utils/jwt";
import { validatePassword } from "@/lib/utils/password";
import { checkAPIPermission } from "@/lib/utils/permissions";
import { isValidEmail } from "@/lib/middleware/security";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

type RegisterPayload = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  contactNumber?: string;
  studentData?: Record<string, unknown>;
  teacherData?: Record<string, unknown>;
  roleSpecificData?: Record<string, unknown>;
};

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

const requireUserView = (role: UserRole, permissions: string[]) => {
  // Super admin always has access
  if (role === "super_admin") {
    return true;
  }
  // Admin has access
  if (role === "admin") {
    return true;
  }
  // Teachers and students can view users for messaging purposes
  // They need to see other users to start conversations
  if (role === "teacher" || role === "student") {
    return true;
  }
  // Check via checkAPIPermission (which handles hasPermission and token permissions)
  return checkAPIPermission(role, "users.view", permissions);
};

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!requireUserView(decoded.role, decoded.permissions ?? [])) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "10")));

    await connectToDatabase();

    const filter: Record<string, unknown> = {};
    if (role) {
      filter.role = role;
    }
    if (status) {
      filter.isActive = status === "active";
    }
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
    }

    const total = await UserModel.countDocuments(filter);
    const users = await UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const userIds = users.map((user) => user._id);
    const students = await StudentModel.find({ userId: { $in: userIds } }).lean();
    const teachers = await TeacherModel.find({ userId: { $in: userIds } }).lean();

    const studentByUserId = new Map(
      students.map((student) => [student.userId.toString(), student]),
    );
    const teacherByUserId = new Map(
      teachers.map((teacher) => [teacher.userId.toString(), teacher]),
    );

    const results = users.map((user) => ({
      ...user,
      profile:
        user.role === "student"
          ? studentByUserId.get(user._id.toString()) ?? null
          : user.role === "teacher"
            ? teacherByUserId.get(user._id.toString()) ?? null
            : null,
    }));

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load users." },
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

    const body = (await request.json()) as Partial<RegisterPayload>;
    const { email, password, fullName, role, contactNumber, studentData, teacherData, roleSpecificData } =
      body;

    if (!email || !password || !fullName || !role) {
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
      role,
      contactNumber,
    });

    let profile = null;
    const extraData = roleSpecificData ?? {};

    if (role === "student") {
      profile = await StudentModel.create({
        userId: user._id,
        status: "pending",
        assignedTeachers: [],
        siblings: [],
        recitationHistory: [],
        ...(studentData ?? {}),
        ...extraData,
      });
    }

    if (role === "teacher") {
      profile = await TeacherModel.create({
        userId: user._id,
        status: "active",
        assignedStudents: [],
        ...(teacherData ?? {}),
        ...extraData,
      });
    }

    await NotificationModel.create({
      userId: user._id,
      type: "registration",
      title: "Welcome to Umar Academy Portal",
      message: "Your account has been created successfully.",
      relatedEntity: { type: "User", id: user._id },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user._id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          contactNumber: user.contactNumber,
          profile,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create user.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
