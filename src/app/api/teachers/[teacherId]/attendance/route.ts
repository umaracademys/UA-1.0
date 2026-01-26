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

export async function GET(
  request: Request,
  context: { params: { teacherId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { teacherId } = context.params;
    if (!Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json({ success: false, message: "Invalid teacher ID." }, { status: 400 });
    }

    const teacher = await TeacherModel.findById(teacherId);
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher not found." }, { status: 404 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check access permissions
    if (decoded.role === "teacher") {
      const teacherProfile = await TeacherModel.findOne({ userId: user._id });
      if (!teacherProfile || teacherProfile._id.toString() !== teacherId) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const query: Record<string, unknown> = {
      userId: teacher.userId,
      userType: "teacher",
    };

    if (dateFrom || dateTo) {
      query.date = {} as { $gte?: Date; $lte?: Date };
      if (dateFrom) {
        (query.date as { $gte?: Date; $lte?: Date }).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        (query.date as { $gte?: Date; $lte?: Date }).$lte = endDate;
      }
    }

    // Get all attendance records
    const attendanceRecords = await AttendanceModel.find(query)
      .populate("markedBy", "fullName email")
      .sort({ date: -1 })
      .lean();

    // Calculate statistics
    const totalDays = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.status === "present").length;
    const absent = attendanceRecords.filter((r) => r.status === "absent").length;
    const late = attendanceRecords.filter((r) => r.status === "late").length;
    const excused = attendanceRecords.filter((r) => r.status === "excused").length;
    const paidDays = attendanceRecords.filter((r) => r.isPaid === true).length;
    const attendanceRate = totalDays > 0 ? ((present + excused) / totalDays) * 100 : 0;

    // Calculate total hours worked (if check-in/out times available)
    let totalHours = 0;
    attendanceRecords.forEach((record) => {
      if (record.checkInTime && record.checkOutTime) {
        const hours = (new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });

    return NextResponse.json({
      success: true,
      attendance: attendanceRecords,
      statistics: {
        totalDays,
        present,
        absent,
        late,
        excused,
        paidDays,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Error fetching teacher attendance:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load attendance." },
      { status: 500 },
    );
  }
}
