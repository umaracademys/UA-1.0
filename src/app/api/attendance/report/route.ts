import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AttendanceModel from "@/lib/db/models/Attendance";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
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

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (
      !hasPermission(decoded.role, "attendance.view_reports") &&
      !decoded.permissions?.includes("attendance.view_reports")
    ) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const body = (await request.json()) as {
      userIds?: string[];
      userType?: "teacher" | "student";
      dateFrom: string;
      dateTo: string;
      groupBy?: "day" | "week" | "month";
    };

    const { userIds, userType, dateFrom, dateTo, groupBy } = body;

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { success: false, message: "Date range is required." },
        { status: 400 },
      );
    }

    const query: Record<string, unknown> = {
      date: {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo),
      },
    };

    if (userType) {
      query.userType = userType;
    }

    if (userIds && userIds.length > 0) {
      const validUserIds = userIds.filter((id) => Types.ObjectId.isValid(id));
      if (validUserIds.length > 0) {
        query.userId = { $in: validUserIds.map((id) => new Types.ObjectId(id)) };
      }
    }

    const attendanceRecords = await AttendanceModel.find(query)
      .populate("userId", "fullName email role")
      .populate("markedBy", "fullName email")
      .sort({ date: -1 })
      .lean();

    // Calculate summary statistics
    const totalRecords = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.status === "present").length;
    const absent = attendanceRecords.filter((r) => r.status === "absent").length;
    const late = attendanceRecords.filter((r) => r.status === "late").length;
    const excused = attendanceRecords.filter((r) => r.status === "excused").length;
    const attendanceRate = totalRecords > 0 ? ((present + excused) / totalRecords) * 100 : 0;

    // Group data for charts
    let chartData = null;
    if (groupBy) {
      chartData = groupAttendanceForCharts(attendanceRecords, groupBy);
    }

    // User-wise statistics
    const userStats = calculateUserStatistics(attendanceRecords);

    return NextResponse.json({
      success: true,
      report: {
        summary: {
          totalRecords,
          present,
          absent,
          late,
          excused,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
        },
        records: attendanceRecords,
        chartData,
        userStatistics: userStats,
        dateRange: {
          from: dateFrom,
          to: dateTo,
        },
      },
    });
  } catch (error) {
    console.error("Error generating attendance report:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to generate report." },
      { status: 500 },
    );
  }
}

function groupAttendanceForCharts(records: any[], groupBy: string) {
  const grouped: Record<string, any> = {};

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
      grouped[key] = {
        date: key,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
      };
    }

    grouped[key].total++;
    grouped[key][record.status]++;
  });

  return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
}

function calculateUserStatistics(records: any[]) {
  const userMap = new Map<string, any>();

  records.forEach((record) => {
    const userId = record.userId._id.toString();
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        userId,
        userName: record.userId.fullName,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        attendanceRate: 0,
      });
    }

    const stats = userMap.get(userId)!;
    stats.total++;
    stats[record.status]++;
  });

  // Calculate attendance rates
  userMap.forEach((stats) => {
    stats.attendanceRate = stats.total > 0 ? ((stats.present + stats.excused) / stats.total) * 100 : 0;
  });

  return Array.from(userMap.values());
}
