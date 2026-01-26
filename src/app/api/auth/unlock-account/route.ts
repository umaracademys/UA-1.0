import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/connection";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";

export const dynamic = "force-dynamic";

type UnlockPayload = {
  userId: string;
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

    const decoded = await verifyToken(token);
    if (decoded.role !== "super_admin") {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Partial<UnlockPayload>;
    if (!body.userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const user = await UserModel.findById(body.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );
    }

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = undefined;
    await user.save();

    return NextResponse.json({ success: true, message: "Account unlocked successfully." });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Unlock failed." },
      { status: 500 },
    );
  }
}
