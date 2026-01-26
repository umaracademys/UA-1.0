import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AssignmentModel from "@/lib/db/models/Assignment";
import StudentModel from "@/lib/db/models/Student";
import UserModel from "@/lib/db/models/User";
import NotificationModel from "@/lib/db/models/Notification";
import TicketModel from "@/lib/db/models/Ticket";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";
import type { ClassworkPhase } from "@/lib/db/models/Assignment";

export const dynamic = "force-dynamic";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

// GET /api/assignments - List all assignments with optional filters
export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const assignedBy = searchParams.get("assignedBy");
    const program = searchParams.get("program");
    const status = searchParams.get("status");
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "500", 10)));
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));

    // Build query
    const query: Record<string, unknown> = {};

    // Role-based filtering
    if (decoded.role === "student") {
      // Students only see their own assignments
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      const student = await StudentModel.findOne({ userId: user._id });
      if (!student) {
        return NextResponse.json({ success: false, message: "Student profile not found." }, { status: 404 });
      }
      query.studentId = student._id;
    } else if (decoded.role === "teacher") {
      // Teachers see assignments they created
      query.assignedBy = decoded.userId;
    }
    // Admins and super_admins see all (no filter)

    // Additional filters
    if (studentId) {
      query.studentId = new Types.ObjectId(studentId);
    }
    if (assignedBy) {
      query.assignedBy = assignedBy;
    }
    if (status) {
      query.status = status;
    }
    if (program) {
      // Filter by student program if needed
      const students = await StudentModel.find({ program }).select("_id").lean();
      const studentIds = students.map((s) => s._id);
      query.studentId = { $in: studentIds };
    }

    const [assignments, total] = await Promise.all([
      AssignmentModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AssignmentModel.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: assignments,
      pagination: {
        limit,
        skip,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load assignments." },
      { status: 500 },
    );
  }
}

// POST /api/assignments - Create new assignment
export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "assignments.create", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    // Get user creating the assignment
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Determine assignedByRole
    let assignedByRole: "admin" | "super_admin" | "teacher" = "teacher";
    if (decoded.role === "admin") {
      assignedByRole = "admin";
    } else if (decoded.role === "super_admin") {
      assignedByRole = "super_admin";
    }

    // Parse request body (JSON)
    const body = await request.json();
    const {
      studentId,
      studentName,
      ticketId,
      weeklyEvaluationId,
      fromRecitationReviewId,
      classwork,
      homework,
      comment,
      mushafMistakes,
    } = body;

    // Validate required fields
    if (!studentId || !studentName || !assignedByRole) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: studentId, studentName, assignedByRole." },
        { status: 400 },
      );
    }

    // Validate student exists
    const student = await StudentModel.findById(studentId);
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    // Set createdAt for all classwork entries
    const currentDate = new Date();
    const processedClasswork = {
      sabq: (classwork?.sabq || []).map((entry: ClassworkPhase) => ({
        ...entry,
        createdAt: entry.createdAt ? new Date(entry.createdAt) : currentDate,
      })),
      sabqi: (classwork?.sabqi || []).map((entry: ClassworkPhase) => ({
        ...entry,
        createdAt: entry.createdAt ? new Date(entry.createdAt) : currentDate,
      })),
      manzil: (classwork?.manzil || []).map((entry: ClassworkPhase) => ({
        ...entry,
        createdAt: entry.createdAt ? new Date(entry.createdAt) : currentDate,
      })),
    };

    // Create assignment
    const assignment = await AssignmentModel.create({
      studentId: new Types.ObjectId(studentId),
      studentName,
      assignedBy: decoded.userId,
      assignedByName: user.fullName,
      assignedByRole,
      weeklyEvaluationId: weeklyEvaluationId ? new Types.ObjectId(weeklyEvaluationId) : undefined,
      fromTicketId: ticketId ? new Types.ObjectId(ticketId) : undefined,
      fromRecitationReviewId: fromRecitationReviewId
        ? new Types.ObjectId(fromRecitationReviewId)
        : undefined,
      classwork: processedClasswork,
      homework: homework || { enabled: false },
      comment,
      mushafMistakes: mushafMistakes || [],
      status: "active",
    });

    // Create admin notification
    const admins = await UserModel.find({ role: { $in: ["admin", "super_admin"] } }).select("_id").lean();
    const notifications = admins.map((admin) => ({
      userId: admin._id,
      type: "assignment_submitted" as const,
      title: "New Assignment Created",
      message: `New assignment created for ${studentName} by ${user.fullName}`,
      relatedEntity: {
        type: "Assignment",
        id: assignment._id,
      },
    }));

    if (notifications.length > 0) {
      await NotificationModel.insertMany(notifications);
    }

    // Link ticket if provided
    if (ticketId) {
      try {
        await TicketModel.findByIdAndUpdate(ticketId, {
          sentToAssignmentId: assignment._id,
        });
      } catch (error) {
        console.error("Error linking ticket:", error);
        // Continue even if ticket linking fails
      }
    }

    // Emit WebSocket event
    try {
      const { emitAssignmentEvent } = await import("@/lib/socket/server");
      emitAssignmentEvent("assignment:created", assignment, [studentId]);
    } catch (error) {
      console.error("Failed to emit WebSocket event:", error);
      // Continue even if WebSocket fails
    }

    // Populate and return
    const populatedAssignment = await AssignmentModel.findById(assignment._id).lean();

    return NextResponse.json(
      {
        success: true,
        message: "Assignment created successfully.",
        data: populatedAssignment,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create assignment.",
        error: error?.name || "UnknownError",
      },
      { status: 500 },
    );
  }
}
