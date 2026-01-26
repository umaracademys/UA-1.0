import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import TicketModel from "@/lib/db/models/Ticket";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import NotificationModel from "@/lib/db/models/Notification";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";
import type { TicketWorkflowStep, TicketStatus } from "@/lib/db/models/Ticket";

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

    const { searchParams } = new URL(request.url);
    const workflowStep = searchParams.get("workflowStep") as TicketWorkflowStep | null;
    const status = searchParams.get("status") as TicketStatus | null;
    const studentId = searchParams.get("studentId");
    const teacherId = searchParams.get("teacherId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Build query based on user role
    const query: Record<string, unknown> = {};

    if (decoded.role === "teacher") {
      // Teachers see their own tickets
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
      }
      query.teacherId = teacher._id;
    } else if (decoded.role === "admin" || decoded.role === "super_admin") {
      // Admins see tickets needing review
      if (searchParams.get("all") !== "true") {
        query.status = { $in: ["submitted", "pending"] };
      }
    } else if (decoded.role === "student") {
      // Students see their own tickets
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      const student = await StudentModel.findOne({ userId: user._id });
      if (!student) {
        return NextResponse.json({ success: false, message: "Student profile not found." }, { status: 404 });
      }
      query.studentId = student._id;
    }

    if (workflowStep) {
      query.workflowStep = workflowStep;
    }
    if (status) {
      query.status = status;
    }
    if (studentId && Types.ObjectId.isValid(studentId)) {
      query.studentId = new Types.ObjectId(studentId);
    }
    if (teacherId && Types.ObjectId.isValid(teacherId)) {
      query.teacherId = new Types.ObjectId(teacherId);
    }

    const [tickets, total] = await Promise.all([
      TicketModel.find(query)
        .populate("studentId", "userId")
        .populate("teacherId", "userId")
        .populate("reviewedBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TicketModel.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load tickets." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!hasPermission(decoded.role, "tickets.create") && !decoded.permissions?.includes("tickets.create")) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const body = (await request.json()) as {
      studentId: string;
      workflowStep: TicketWorkflowStep;
      notes?: string;
      audioUrl?: string;
    };

    const { studentId, workflowStep, notes, audioUrl } = body;

    if (!studentId || !workflowStep) {
      return NextResponse.json({ success: false, message: "Missing required fields." }, { status: 400 });
    }

    if (!Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, message: "Invalid student ID." }, { status: 400 });
    }

    // Get teacher profile if user is a teacher
    let teacherId: Types.ObjectId | undefined;
    if (decoded.role === "teacher") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
      }
      teacherId = teacher._id;
    }

    // Verify student exists
    const student = await StudentModel.findById(studentId).populate("userId", "fullName");
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    // Get student name for notification
    const studentName = student.userId && typeof student.userId === "object" && "fullName" in student.userId
      ? (student.userId as { fullName: string }).fullName
      : "student";

    // Create ticket
    const ticket = await TicketModel.create({
      studentId: new Types.ObjectId(studentId),
      teacherId,
      workflowStep,
      status: "pending",
      notes: notes || undefined,
      audioUrl: audioUrl || undefined,
      mistakes: [],
    });

    // Create notification for admin (review needed)
    const admins = await UserModel.find({ role: { $in: ["admin", "super_admin"] } }).select("_id").lean();
    const notifications = admins.map((admin) => ({
      userId: admin._id,
      type: "recitation_review" as const,
      title: "New Recitation Ticket",
      message: `New ${workflowStep} ticket created for ${studentName}`,
      relatedEntity: {
        type: "Ticket",
        id: ticket._id,
      },
    }));

    if (notifications.length > 0) {
      await NotificationModel.insertMany(notifications);
    }

    return NextResponse.json({
      success: true,
      message: "Ticket created successfully.",
      ticket: await TicketModel.findById(ticket._id)
        .populate("studentId", "userId")
        .populate("teacherId", "userId")
        .lean(),
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to create ticket." },
      { status: 500 },
    );
  }
}
