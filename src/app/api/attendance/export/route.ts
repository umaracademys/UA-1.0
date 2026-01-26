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

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (
      !hasPermission(decoded.role, "attendance.export") &&
      !decoded.permissions?.includes("attendance.export")
    ) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const body = (await request.json()) as {
      userIds?: string[];
      userType?: "teacher" | "student";
      dateFrom?: string;
      dateTo?: string;
      format: "csv" | "excel" | "pdf";
    };

    const { userIds, userType, dateFrom, dateTo, format } = body;

    if (!format || !["csv", "excel", "pdf"].includes(format)) {
      return NextResponse.json(
        { success: false, message: "Valid format (csv, excel, pdf) is required." },
        { status: 400 },
      );
    }

    const query: Record<string, unknown> = {};

    if (userType) {
      query.userType = userType;
    }

    if (userIds && userIds.length > 0) {
      const validUserIds = userIds.filter((id) => Types.ObjectId.isValid(id));
      if (validUserIds.length > 0) {
        query.userId = { $in: validUserIds.map((id) => new Types.ObjectId(id)) };
      }
    }

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

    const attendanceRecords = await AttendanceModel.find(query)
      .populate("userId", "fullName email role")
      .populate("markedBy", "fullName email")
      .sort({ date: -1 })
      .lean();

    // Generate export data based on format
    if (format === "csv") {
      const csvData = generateCSV(attendanceRecords);
      return NextResponse.json({
        success: true,
        data: csvData,
        format: "csv",
        filename: `attendance-${Date.now()}.csv`,
      });
    } else if (format === "excel") {
      // For Excel, return structured data that can be converted on client or server
      return NextResponse.json({
        success: true,
        data: attendanceRecords,
        format: "excel",
        filename: `attendance-${Date.now()}.xlsx`,
        message: "Excel export data ready. Use a library like xlsx to generate file.",
      });
    } else if (format === "pdf") {
      // For PDF, return structured data
      return NextResponse.json({
        success: true,
        data: attendanceRecords,
        format: "pdf",
        filename: `attendance-${Date.now()}.pdf`,
        message: "PDF export data ready. Use a library like pdf-lib to generate file.",
      });
    }

    return NextResponse.json({
      success: false,
      message: "Unsupported format.",
    });
  } catch (error) {
    console.error("Error exporting attendance:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to export attendance." },
      { status: 500 },
    );
  }
}

function generateCSV(records: any[]): string {
  const headers = ["Date", "Name", "Email", "Type", "Shift", "Status", "Check In", "Check Out", "Notes"];
  const rows = records.map((record) => {
    const user = record.userId;
    return [
      new Date(record.date).toLocaleDateString(),
      user.fullName || "",
      user.email || "",
      record.userType || "",
      record.shift || "",
      record.status || "",
      record.checkInTime ? new Date(record.checkInTime).toLocaleString() : "",
      record.checkOutTime ? new Date(record.checkOutTime).toLocaleString() : "",
      record.notes || "",
    ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",");
  });

  return [headers.map((h) => `"${h}"`).join(","), ...rows].join("\n");
}
