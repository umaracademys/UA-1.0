import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/connection";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { generateToken } from "@/lib/utils/jwt";
import { validatePassword } from "@/lib/utils/password";
import { isValidEmail } from "@/lib/middleware/security";
import type { UserRole } from "@/types";

type RegisterPayload = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  contactNumber?: string;
};

const allowedRoles: UserRole[] = ["super_admin", "admin", "teacher", "student"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RegisterPayload>;
    const { email, password, fullName, role, contactNumber } = body;

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

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: "Invalid role selection." },
        { status: 400 },
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, message: "Password does not meet requirements.", errors: passwordValidation.errors },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
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

    if (role === "student") {
      await StudentModel.create({ userId: user._id, status: "pending", assignedTeachers: [], siblings: [], recitationHistory: [] });
    }

    if (role === "teacher") {
      await TeacherModel.create({ userId: user._id, status: "active", assignedStudents: [] });
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: "Registration successful.",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        contactNumber: user.contactNumber,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Registration failed." },
      { status: 500 },
    );
  }
}
