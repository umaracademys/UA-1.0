import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AttendanceModel from "@/lib/db/models/Attendance";
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

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check if user is a teacher
    if (decoded.role !== "teacher" && decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json(
        { success: false, message: "Check-in is only available for teachers." },
        { status: 403 },
      );
    }

    const teacher = await TeacherModel.findOne({ userId: user._id });
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      shift?: "morning" | "afternoon" | "evening";
      notes?: string;
    };

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existing = await AttendanceModel.findOne({
      userId: user._id,
      date: today,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "You have already checked in today." },
        { status: 400 },
      );
    }

    // Auto-detect shift based on time
    const hour = now.getHours();
    let shift: "morning" | "afternoon" | "evening" = body.shift || "morning";
    if (!body.shift) {
      if (hour < 12) {
        shift = "morning";
      } else if (hour < 17) {
        shift = "afternoon";
      } else {
        shift = "evening";
      }
    }

    // Determine status (late if after expected time)
    let status: "present" | "late" = "present";
    if (shift === "morning" && hour >= 9) {
      status = "late";
    } else if (shift === "afternoon" && hour >= 14) {
      status = "late";
    } else if (shift === "evening" && hour >= 19) {
      status = "late";
    }

    // Create attendance record
    const attendance = await AttendanceModel.create({
      userId: user._id,
      userType: "teacher",
      date: today,
      shift,
      status,
      checkInTime: now,
      notes: body.notes || "",
      markedBy: user._id,
      isPaid: false,
    });

    const populatedAttendance = await AttendanceModel.findById(attendance._id)
      .populate("userId", "fullName email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Checked in successfully (${shift} shift).`,
      attendance: populatedAttendance,
    });
  } catch (error) {
    console.error("Error checking in:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to check in." },
      { status: 500 },
    );
  }
}
