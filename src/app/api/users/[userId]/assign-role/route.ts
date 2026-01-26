import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";
import type { UserRole } from "@/types";

type AssignRolePayload = {
  newRole: UserRole;
};

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

const allowedRoles: UserRole[] = ["super_admin", "admin", "teacher", "student"];

export async function PATCH(request: Request, context: { params: { userId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "users.manage_roles", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const { userId } = context.params;
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, message: "Invalid user ID." }, { status: 400 });
    }

    const body = (await request.json()) as Partial<AssignRolePayload>;
    if (!body.newRole || !allowedRoles.includes(body.newRole)) {
      return NextResponse.json({ success: false, message: "Invalid role." }, { status: 400 });
    }

    await connectToDatabase();
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    user.role = body.newRole;
    await user.save();

    let profile = null;
    if (body.newRole === "student") {
      profile =
        (await StudentModel.findOne({ userId: user._id })) ||
        (await StudentModel.create({
          userId: user._id,
          status: "pending",
          assignedTeachers: [],
          siblings: [],
          recitationHistory: [],
        }));
    }

    if (body.newRole === "teacher") {
      profile =
        (await TeacherModel.findOne({ userId: user._id })) ||
        (await TeacherModel.create({
          userId: user._id,
          status: "active",
          assignedStudents: [],
        }));
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        profile,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to update role." },
      { status: 500 },
    );
  }
}
