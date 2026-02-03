import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import TicketModel from "@/lib/db/models/Ticket";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function POST(request: Request, context: { params: { ticketId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "tickets.review", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { ticketId } = context.params;
    if (!Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json({ success: false, message: "Invalid ticket ID." }, { status: 400 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Teacher profile required for teachers; admin/super_admin can start without one
    const isAdmin = decoded.role === "admin" || decoded.role === "super_admin";
    const teacher = await TeacherModel.findOne({ userId: user._id });
    if (!isAdmin && !teacher) {
      return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
    }

    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found." }, { status: 404 });
    }

    if (ticket.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "Ticket is already started or submitted." },
        { status: 400 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      fromSurah?: number;
      fromAyah?: number;
      toSurah?: number;
      toAyah?: number;
      assignmentId?: string;
    };
    const now = new Date();

    ticket.status = "in-progress";
    if (teacher) {
      ticket.teacherId = teacher._id;
    }
    ticket.startedAt = now;
    ticket.lastHeartbeatAt = now;
    ticket.rangeLocked = true;

    if (
      body.fromSurah != null &&
      body.fromAyah != null &&
      body.toSurah != null &&
      body.toAyah != null
    ) {
      ticket.ayahRange = {
        fromSurah: body.fromSurah,
        fromAyah: body.fromAyah,
        toSurah: body.toSurah,
        toAyah: body.toAyah,
      };
    }
    if (body.assignmentId && Types.ObjectId.isValid(body.assignmentId)) {
      ticket.assignmentId = new Types.ObjectId(body.assignmentId);
    }

    await ticket.save();

    const updatedTicket = await TicketModel.findById(ticketId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .populate("assignmentId")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Ticket started successfully. Session is locked; use heartbeat to keep it alive.",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Error starting ticket:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to start ticket." },
      { status: 500 },
    );
  }
}
