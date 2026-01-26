import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AttendanceModel from "@/lib/db/models/Attendance";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import NotificationModel from "@/lib/db/models/Notification";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

export const dynamic = "force-dynamic";

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
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const userType = searchParams.get("userType");
    const date = searchParams.get("date");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");
    const groupBy = searchParams.get("groupBy");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    // Role-based filtering
    if (decoded.role === "student") {
      const student = await StudentModel.findOne({ userId: user._id });
      if (!student) {
        return NextResponse.json({ success: false, message: "Student profile not found." }, { status: 404 });
      }
      query.userId = student.userId;
      query.userType = "student";
    } else if (decoded.role === "teacher") {
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
      }
      // Teachers can see their own attendance and assigned students
      const assignedStudentIds = teacher.assignedStudents.map((id) => {
        return StudentModel.findById(id).select("userId").lean();
      });
      const studentUsers = await Promise.all(assignedStudentIds);
      const userIds = [
        user._id,
        ...studentUsers.filter(Boolean).map((s: any) => s?.userId).filter(Boolean),
      ];
      query.userId = { $in: userIds };
    }
    // Admins can see all (no additional filter)

    // Apply filters
    if (userId && Types.ObjectId.isValid(userId)) {
      query.userId = new Types.ObjectId(userId);
    }

    if (userType) {
      query.userType = userType;
    }

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    } else if (dateFrom || dateTo) {
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

    if (status) {
      query.status = status;
    }

    const [attendanceRecords, total] = await Promise.all([
      AttendanceModel.find(query)
        .populate("userId", "fullName email role")
        .populate("markedBy", "fullName email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AttendanceModel.countDocuments(query),
    ]);

    // Group results if requested
    let groupedResults = null;
    if (groupBy) {
      groupedResults = groupAttendanceBy(attendanceRecords, groupBy);
    }

    return NextResponse.json({
      success: true,
      attendance: attendanceRecords,
      grouped: groupedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load attendance." },
      { status: 500 },
    );
  }
}

function groupAttendanceBy(records: any[], groupBy: string) {
  const grouped: Record<string, any[]> = {};

  records.forEach((record) => {
    const date = new Date(record.date);
    let key = "";

    switch (groupBy) {
      case "day":
        key = date.toISOString().split("T")[0];
        break;
      case "week":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
        break;
      case "month":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        break;
      default:
        return;
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(record);
  });

  return grouped;
}

export async function POST(request: Request) {
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

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      userId: string;
      userType: "teacher" | "student";
      date: string;
      shift?: "morning" | "afternoon" | "evening";
      status: "present" | "absent" | "late" | "excused";
      checkInTime?: string;
      checkOutTime?: string;
      notes?: string;
    };

    const { userId, userType, date, shift, status, checkInTime, checkOutTime, notes } = body;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, message: "Valid user ID is required." }, { status: 400 });
    }

    if (!userType || !["teacher", "student"].includes(userType)) {
      return NextResponse.json(
        { success: false, message: "User type must be 'teacher' or 'student'." },
        { status: 400 },
      );
    }

    if (!date) {
      return NextResponse.json({ success: false, message: "Date is required." }, { status: 400 });
    }

    if (!status || !["present", "absent", "late", "excused"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Valid status is required." },
        { status: 400 },
      );
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check for duplicate
    const existing = await AttendanceModel.findOne({
      userId: new Types.ObjectId(userId),
      date: attendanceDate,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Attendance already recorded for this date." },
        { status: 400 },
      );
    }

    // Auto-detect shift if not provided
    let detectedShift = shift;
    if (!detectedShift && checkInTime) {
      const checkIn = new Date(checkInTime);
      const hour = checkIn.getHours();
      if (hour < 12) {
        detectedShift = "morning";
      } else if (hour < 17) {
        detectedShift = "afternoon";
      } else {
        detectedShift = "evening";
      }
    }

    // Create attendance record
    const attendance = await AttendanceModel.create({
      userId: new Types.ObjectId(userId),
      userType,
      date: attendanceDate,
      shift: detectedShift || "morning",
      status,
      checkInTime: checkInTime ? new Date(checkInTime) : undefined,
      checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
      notes: notes || "",
      markedBy: user._id,
      isPaid: userType === "teacher" && status === "present" ? false : undefined,
    });

    // Create notification for absent/late
    if (status === "absent" || status === "late") {
      const targetUser = await UserModel.findById(userId);
      if (targetUser) {
        await NotificationModel.create({
          userId: new Types.ObjectId(userId),
          type: "attendance" as const,
          title: status === "absent" ? "Absence Recorded" : "Late Arrival Recorded",
          message: `Your attendance has been marked as ${status} for ${attendanceDate.toLocaleDateString()}`,
          relatedEntity: {
            type: "Attendance",
            id: attendance._id,
          },
        });
      }
    }

    const populatedAttendance = await AttendanceModel.findById(attendance._id)
      .populate("userId", "fullName email role")
      .populate("markedBy", "fullName email")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Attendance recorded successfully.",
      attendance: populatedAttendance,
    });
  } catch (error) {
    console.error("Error creating attendance:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to record attendance." },
      { status: 500 },
    );
  }
}
