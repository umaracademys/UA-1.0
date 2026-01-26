import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import TicketModel from "@/lib/db/models/Ticket";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";
import type { TicketWorkflowStep } from "@/lib/db/models/Ticket";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(request: Request, context: { params: { studentId: string } }) {
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

    // Check access permissions
    if (decoded.role === "student") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      const studentProfile = await StudentModel.findOne({ userId: user._id });
      if (!studentProfile || studentProfile._id.toString() !== studentId) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role === "teacher") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher || !teacher.assignedStudents.some((id) => id.toString() === studentId)) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      if (
        !hasPermission(decoded.role, "tickets.access") &&
        !decoded.permissions?.includes("tickets.access")
      ) {
        return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
      }
    }

    // Get all tickets for this student
    const tickets = await TicketModel.find({ studentId: new Types.ObjectId(studentId) })
      .populate("teacherId", "userId")
      .populate("reviewedBy", "fullName email")
      .sort({ createdAt: -1 })
      .lean();

    // Group by workflow step
    const grouped: Record<TicketWorkflowStep, typeof tickets> = {
      sabq: [],
      sabqi: [],
      manzil: [],
    };

    tickets.forEach((ticket) => {
      grouped[ticket.workflowStep].push(ticket);
    });

    // Calculate statistics
    const stats = {
      totalSessions: tickets.length,
      totalMistakes: tickets.reduce((sum, ticket) => sum + (ticket.mistakes?.length || 0), 0),
      byWorkflowStep: {
        sabq: {
          total: grouped.sabq.length,
          mistakes: grouped.sabq.reduce((sum, t) => sum + (t.mistakes?.length || 0), 0),
        },
        sabqi: {
          total: grouped.sabqi.length,
          mistakes: grouped.sabqi.reduce((sum, t) => sum + (t.mistakes?.length || 0), 0),
        },
        manzil: {
          total: grouped.manzil.length,
          mistakes: grouped.manzil.reduce((sum, t) => sum + (t.mistakes?.length || 0), 0),
        },
      },
    };

    return NextResponse.json({
      success: true,
      tickets,
      grouped,
      statistics: stats,
      timeline: tickets.map((ticket) => ({
        id: ticket._id,
        workflowStep: ticket.workflowStep,
        status: ticket.status,
        createdAt: ticket.createdAt,
        reviewedAt: ticket.reviewedAt,
        mistakesCount: ticket.mistakes?.length || 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching recitation history:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load recitation history." },
      { status: 500 },
    );
  }
}
