import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AttendanceModel from "@/lib/db/models/Attendance";
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
      records: Array<{
        userId: string;
        userType: "teacher" | "student";
        date: string;
        shift?: "morning" | "afternoon" | "evening";
        status: "present" | "absent" | "late" | "excused";
        checkInTime?: string;
        checkOutTime?: string;
        notes?: string;
      }>;
    };

    const { records } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, message: "Records array is required." },
        { status: 400 },
      );
    }

    if (records.length > 100) {
      return NextResponse.json(
        { success: false, message: "Maximum 100 records allowed per request." },
        { status: 400 },
      );
    }

    const results = {
      created: [] as any[],
      errors: [] as Array<{ index: number; error: string }>,
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      try {
        // Validate record
        if (!record.userId || !Types.ObjectId.isValid(record.userId)) {
          results.errors.push({ index: i, error: "Invalid user ID" });
          continue;
        }

        if (!record.userType || !["teacher", "student"].includes(record.userType)) {
          results.errors.push({ index: i, error: "Invalid user type" });
          continue;
        }

        if (!record.date) {
          results.errors.push({ index: i, error: "Date is required" });
          continue;
        }

        if (!record.status || !["present", "absent", "late", "excused"].includes(record.status)) {
          results.errors.push({ index: i, error: "Invalid status" });
          continue;
        }

        const attendanceDate = new Date(record.date);
        attendanceDate.setHours(0, 0, 0, 0);

        // Check for duplicate
        const existing = await AttendanceModel.findOne({
          userId: new Types.ObjectId(record.userId),
          date: attendanceDate,
        });

        if (existing) {
          results.errors.push({ index: i, error: "Attendance already exists for this date" });
          continue;
        }

        // Auto-detect shift if not provided
        let shift = record.shift || "morning";
        if (!record.shift && record.checkInTime) {
          const checkIn = new Date(record.checkInTime);
          const hour = checkIn.getHours();
          if (hour < 12) {
            shift = "morning";
          } else if (hour < 17) {
            shift = "afternoon";
          } else {
            shift = "evening";
          }
        }

        // Create attendance record
        const attendance = await AttendanceModel.create({
          userId: new Types.ObjectId(record.userId),
          userType: record.userType,
          date: attendanceDate,
          shift,
          status: record.status,
          checkInTime: record.checkInTime ? new Date(record.checkInTime) : undefined,
          checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : undefined,
          notes: record.notes || "",
          markedBy: user._id,
          isPaid: record.userType === "teacher" && record.status === "present" ? false : undefined,
        });

        results.created.push({
          _id: attendance._id,
          userId: record.userId,
          date: attendanceDate,
        });

        // Create notification for absent/late
        if (record.status === "absent" || record.status === "late") {
          await NotificationModel.create({
            userId: new Types.ObjectId(record.userId),
            type: "attendance" as const,
            title: record.status === "absent" ? "Absence Recorded" : "Late Arrival Recorded",
            message: `Your attendance has been marked as ${record.status} for ${attendanceDate.toLocaleDateString()}`,
            relatedEntity: {
              type: "Attendance",
              id: attendance._id,
            },
          });
        }
      } catch (error) {
        results.errors.push({
          index: i,
          error: (error as Error).message || "Failed to create record",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.created.length} attendance record(s).`,
      created: results.created,
      errors: results.errors,
      summary: {
        total: records.length,
        created: results.created.length,
        failed: results.errors.length,
      },
    });
  } catch (error) {
    console.error("Error bulk recording attendance:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to record attendance." },
      { status: 500 },
    );
  }
}
