import { NextResponse } from "next/server";

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

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const user = await UserModel.findById(decoded.userId).select(
      "_id email role fullName contactNumber isActive lastLogin createdAt updatedAt",
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );
    }

    const student =
      user.role === "student" ? await StudentModel.findOne({ userId: user._id }) : null;
    const teacher =
      user.role === "teacher" ? await TeacherModel.findOne({ userId: user._id }) : null;

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        contactNumber: user.contactNumber,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      profile: student ?? teacher,
      permissions: decoded.permissions ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Unauthorized." },
      { status: 401 },
    );
  }
}
