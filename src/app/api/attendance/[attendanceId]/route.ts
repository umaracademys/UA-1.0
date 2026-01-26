import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AttendanceModel from "@/lib/db/models/Attendance";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(
  request: Request,
  context: { params: { attendanceId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { attendanceId } = context.params;
    if (!Types.ObjectId.isValid(attendanceId)) {
      return NextResponse.json({ success: false, message: "Invalid attendance ID." }, { status: 400 });
    }

    const attendance = await AttendanceModel.findById(attendanceId)
      .populate("userId", "fullName email role")
      .populate("markedBy", "fullName email")
      .lean();

    if (!attendance) {
      return NextResponse.json({ success: false, message: "Attendance record not found." }, { status: 404 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check access permissions
    if (decoded.role === "student") {
      if (attendance.userId._id.toString() !== user._id.toString()) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      // Teachers can view their own and assigned students
      if (attendance.userId._id.toString() !== user._id.toString()) {
        // Check if assigned student (would need to check Teacher model)
        // For now, allow if has permission
        if (
          !hasPermission(decoded.role, "attendance.view_reports") &&
          !decoded.permissions?.includes("attendance.view_reports")
        ) {
          return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load attendance." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: { attendanceId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (
      !hasPermission(decoded.role, "attendance.record") &&
      !decoded.permissions?.includes("attendance.record")
    ) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { attendanceId } = context.params;
    if (!Types.ObjectId.isValid(attendanceId)) {
      return NextResponse.json({ success: false, message: "Invalid attendance ID." }, { status: 400 });
    }

    const attendance = await AttendanceModel.findById(attendanceId);
    if (!attendance) {
      return NextResponse.json({ success: false, message: "Attendance record not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      status?: "present" | "absent" | "late" | "excused";
      checkInTime?: string;
      checkOutTime?: string;
      notes?: string;
      shift?: "morning" | "afternoon" | "evening";
      isPaid?: boolean;
    };

    if (body.status && !["present", "absent", "late", "excused"].includes(body.status)) {
      return NextResponse.json({ success: false, message: "Invalid status." }, { status: 400 });
    }

    if (body.status) {
      attendance.status = body.status;
    }

    if (body.checkInTime) {
      attendance.checkInTime = new Date(body.checkInTime);
    }

    if (body.checkOutTime) {
      attendance.checkOutTime = new Date(body.checkOutTime);
    }

    if (body.notes !== undefined) {
      attendance.notes = body.notes;
    }

    if (body.shift) {
      attendance.shift = body.shift;
    }

    if (body.isPaid !== undefined && attendance.userType === "teacher") {
      attendance.isPaid = body.isPaid;
    }

    await attendance.save();

    const updatedAttendance = await AttendanceModel.findById(attendanceId)
      .populate("userId", "fullName email role")
      .populate("markedBy", "fullName email")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Attendance updated successfully.",
      attendance: updatedAttendance,
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to update attendance." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { attendanceId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { attendanceId } = context.params;
    if (!Types.ObjectId.isValid(attendanceId)) {
      return NextResponse.json({ success: false, message: "Invalid attendance ID." }, { status: 400 });
    }

    await AttendanceModel.findByIdAndDelete(attendanceId);

    return NextResponse.json({
      success: true,
      message: "Attendance record deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to delete attendance." },
      { status: 500 },
    );
  }
}
