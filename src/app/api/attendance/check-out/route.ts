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
        { success: false, message: "Check-out is only available for teachers." },
        { status: 403 },
      );
    }

    const teacher = await TeacherModel.findOne({ userId: user._id });
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      notes?: string;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await AttendanceModel.findOne({
      userId: user._id,
      date: today,
    });

    if (!attendance) {
      return NextResponse.json(
        { success: false, message: "No check-in record found for today." },
        { status: 404 },
      );
    }

    if (attendance.checkOutTime) {
      return NextResponse.json(
        { success: false, message: "You have already checked out today." },
        { status: 400 },
      );
    }

    const now = new Date();
    attendance.checkOutTime = now;
    if (body.notes) {
      attendance.notes = attendance.notes
        ? `${attendance.notes}\n${body.notes}`
        : body.notes;
    }

    // Calculate total hours if check-in time exists
    if (attendance.checkInTime) {
      const hoursWorked = (now.getTime() - attendance.checkInTime.getTime()) / (1000 * 60 * 60);
      // Store hours worked (could add a field to model if needed)
    }

    await attendance.save();

    const populatedAttendance = await AttendanceModel.findById(attendance._id)
      .populate("userId", "fullName email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Checked out successfully.",
      attendance: populatedAttendance,
    });
  } catch (error) {
    console.error("Error checking out:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to check out." },
      { status: 500 },
    );
  }
}
