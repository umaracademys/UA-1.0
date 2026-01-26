import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/connection";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { validatePassword } from "@/lib/utils/password";

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Partial<ChangePasswordPayload>;
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Current and new passwords are required." },
        { status: 400 },
      );
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: "Password does not meet requirements.", errors: validation.errors },
        { status: 400 },
      );
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const user = await UserModel.findById(decoded.userId).select("+password");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Current password is incorrect." },
        { status: 401 },
      );
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Password update failed." },
      { status: 500 },
    );
  }
}
