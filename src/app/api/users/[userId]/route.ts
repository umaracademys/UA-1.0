import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission, hasPermission } from "@/lib/utils/permissions";
import { isValidEmail } from "@/lib/middleware/security";

type UpdateUserPayload = {
  email?: string;
  fullName?: string;
  contactNumber?: string;
  isActive?: boolean;
  studentData?: Record<string, unknown>;
  teacherData?: Record<string, unknown>;
};

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

const isSelfOrPermitted = (decodedId: string, userId: string, permission: string, role: string, permissions: string[]) => {
  if (decodedId === userId) return true;
  if (role === "admin" || role === "super_admin") return true;
  return hasPermission(role as never, permission) || permissions.includes(permission);
};

export async function GET(request: Request, context: { params: { userId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    const { userId } = context.params;

    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, message: "Invalid user ID." }, { status: 400 });
    }

    if (!isSelfOrPermitted(decoded.userId, userId, "users.view", decoded.role, decoded.permissions ?? [])) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const user = await UserModel.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const student =
      user.role === "student" ? await StudentModel.findOne({ userId: user._id }).lean() : null;
    const teacher =
      user.role === "teacher" ? await TeacherModel.findOne({ userId: user._id }).lean() : null;

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        profile: student ?? teacher,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load user." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: { params: { userId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    const { userId } = context.params;

    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, message: "Invalid user ID." }, { status: 400 });
    }

    const canEdit = isSelfOrPermitted(decoded.userId, userId, "users.edit", decoded.role, decoded.permissions ?? []);
    if (!canEdit) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as Partial<UpdateUserPayload>;
    const { email, fullName, contactNumber, isActive, studentData, teacherData } = body;

    await connectToDatabase();
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    if (email) {
      if (!isValidEmail(email)) {
        return NextResponse.json({ success: false, message: "Invalid email address." }, { status: 400 });
      }
      const existing = await UserModel.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
      if (existing) {
        return NextResponse.json({ success: false, message: "Email already in use." }, { status: 409 });
      }
      user.email = email;
    }

    if (fullName) user.fullName = fullName;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;
    if (typeof isActive === "boolean") user.isActive = isActive;

    await user.save();

    let profile = null;
    if (user.role === "student" && studentData) {
      profile = await StudentModel.findOneAndUpdate({ userId: user._id }, studentData, {
        new: true,
      });
    }
    if (user.role === "teacher" && teacherData) {
      profile = await TeacherModel.findOneAndUpdate({ userId: user._id }, teacherData, {
        new: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        contactNumber: user.contactNumber,
        isActive: user.isActive,
        profile,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to update user." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: { params: { userId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "users.delete", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const { userId } = context.params;
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, message: "Invalid user ID." }, { status: 400 });
    }

    await connectToDatabase();
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    user.isActive = false;
    await user.save();

    return NextResponse.json({ success: true, message: "User deactivated successfully." });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to delete user." },
      { status: 500 },
    );
  }
}
