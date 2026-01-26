import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AttendanceModel from "@/lib/db/models/Attendance";
import StudentModel from "@/lib/db/models/Student";
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
  context: { params: { studentId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { studentId } = context.params;
    if (!Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, message: "Invalid student ID." }, { status: 400 });
    }

    const student = await StudentModel.findById(studentId);
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check access permissions
    if (decoded.role === "student") {
      const studentProfile = await StudentModel.findOne({ userId: user._id });
      if (!studentProfile || studentProfile._id.toString() !== studentId) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role === "teacher") {
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher || !teacher.assignedStudents.some((id) => id.toString() === studentId)) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const groupBy = searchParams.get("groupBy"); // 'month' or custom range

    const query: Record<string, unknown> = {
      userId: student.userId,
      userType: "student",
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
    const attendanceRate = totalDays > 0 ? ((present + excused) / totalDays) * 100 : 0;

    // Group by month if requested
    let grouped = null;
    if (groupBy === "month") {
      grouped = attendanceRecords.reduce((acc, record) => {
        const date = new Date(record.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        
        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: monthKey,
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            records: [],
          };
        }
        
        acc[monthKey].total++;
        acc[monthKey][record.status]++;
        acc[monthKey].records.push(record);
        
        return acc;
      }, {} as Record<string, any>);
    }

    return NextResponse.json({
      success: true,
      attendance: attendanceRecords,
      grouped,
      statistics: {
        totalDays,
        present,
        absent,
        late,
        excused,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load attendance." },
      { status: 500 },
    );
  }
}
