import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import TicketModel from "@/lib/db/models/Ticket";
import TeacherModel from "@/lib/db/models/Teacher";
import NotificationModel from "@/lib/db/models/Notification";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

/**
 * POST /api/tickets/:ticketId/reassign
 * Admin reassigns ticket to a different teacher.
 * Portal-compatible: saves previous teacher's comment and mistakes, resets for new teacher.
 */
export async function POST(request: Request, context: { params: { ticketId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!hasPermission(decoded.role, "tickets.approve") && !decoded.permissions?.includes("tickets.approve")) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { ticketId } = context.params;
    if (!Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json({ success: false, message: "Invalid ticket ID." }, { status: 400 });
    }

    const body = (await request.json()) as {
      newTeacherId: string;
      reassignmentReason?: string;
    };

    const { newTeacherId, reassignmentReason } = body;

    if (!newTeacherId || !Types.ObjectId.isValid(newTeacherId)) {
      return NextResponse.json(
        { success: false, message: "Valid newTeacherId is required." },
        { status: 400 },
      );
    }

    const ticket = await TicketModel.findById(ticketId)
      .populate("teacherId", "userId")
      .populate("studentId", "userId");
    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found." }, { status: 404 });
    }

    // Only allow reassign when ticket is in-progress, paused, or submitted (teacher has been working)
    const allowedStatuses = ["in-progress", "paused", "submitted"];
    if (!allowedStatuses.includes(ticket.status)) {
      return NextResponse.json(
        { success: false, message: `Cannot reassign ticket with status '${ticket.status}'.` },
        { status: 400 },
      );
    }

    // Verify new teacher exists
    const newTeacher = await TeacherModel.findById(newTeacherId).populate("userId", "fullName");
    if (!newTeacher) {
      return NextResponse.json({ success: false, message: "New teacher not found." }, { status: 404 });
    }

    const newTeacherName =
      newTeacher.userId && typeof newTeacher.userId === "object" && "fullName" in newTeacher.userId
        ? (newTeacher.userId as { fullName: string }).fullName
        : "Teacher";

    // Save previous teacher's work (Portal metadata mapping)
    const previousMistakes = [...(ticket.mistakes || [])];
    const previousComment = ticket.sessionNotes || "";

    // Get previous teacher name for reassignment tracking
    let previousTeacherName = "";
    if (ticket.teacherId) {
      const prevTeacher =
        typeof ticket.teacherId === "object" && ticket.teacherId !== null
          ? await TeacherModel.findById(ticket.teacherId).populate("userId", "fullName")
          : null;
      if (prevTeacher?.userId && typeof prevTeacher.userId === "object" && "fullName" in prevTeacher.userId) {
        previousTeacherName = (prevTeacher.userId as { fullName: string }).fullName;
      }
    }

    // Update ticket (Portal-compatible logic)
    const previousTeacherId =
      ticket.teacherId instanceof Types.ObjectId
        ? ticket.teacherId
        : (ticket.teacherId as { _id: Types.ObjectId } | null)?._id;

    ticket.status = "reassigned";
    ticket.reassignedFromTeacherId = previousTeacherId;
    ticket.reassignedFromTeacherName = previousTeacherName;
    ticket.reassignedToTeacherId = new Types.ObjectId(newTeacherId);
    ticket.reassignedToTeacherName = newTeacherName;
    ticket.reassignmentReason = reassignmentReason || "";
    ticket.previousTeacherComment = previousComment;
    ticket.previousMistakes = previousMistakes;
    ticket.teacherId = new Types.ObjectId(newTeacherId);
    ticket.sessionNotes = "";
    ticket.mistakes = [];
    ticket.reassignedAt = new Date();

    await ticket.save();

    // Notify new teacher
    if (newTeacher.userId) {
      await NotificationModel.create({
        userId: newTeacher.userId,
        type: "recitation_review",
        title: "Ticket Reassigned to You",
        message: `A ticket has been reassigned to you.${reassignmentReason ? ` Reason: ${reassignmentReason}` : ""}`,
        relatedEntity: {
          type: "Ticket",
          id: ticket._id,
        },
      });
    }

    const updatedTicket = await TicketModel.findById(ticketId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .populate("reviewedBy", "fullName email")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Ticket reassigned successfully.",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Error reassigning ticket:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to reassign ticket." },
      { status: 500 },
    );
  }
}
