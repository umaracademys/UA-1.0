/**
 * POST /api/tickets/[ticketId]/submit-for-review
 * Teacher submits ticket for admin review.
 * Validation rules: ticket must be in-progress or paused.
 * Duplicate submission prevention: once submittedAt is set, no second submit (returns 400).
 * Assignment → listened sync: when ticket is linked (assignmentId), sets assignment status to "listened".
 */
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import TicketModel from "@/lib/db/models/Ticket";
import AssignmentModel from "@/lib/db/models/Assignment";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
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

export async function POST(request: Request, context: { params: { ticketId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!hasPermission(decoded.role, "tickets.review") && !decoded.permissions?.includes("tickets.review")) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { ticketId } = context.params;
    if (!Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json({ success: false, message: "Invalid ticket ID." }, { status: 400 });
    }

    const ticket = await TicketModel.findById(ticketId).populate("studentId", "userId");
    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found." }, { status: 404 });
    }

    if (ticket.status !== "in-progress" && ticket.status !== "paused") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only an in-progress or paused ticket can be submitted. Current status: " + ticket.status,
        },
        { status: 400 },
      );
    }

    // Prevent duplicate submission: once submittedAt is set, no second submit.
    if (ticket.submittedAt) {
      return NextResponse.json(
        { success: false, message: "Ticket was already submitted. Duplicate submission not allowed." },
        { status: 400 },
      );
    }

    const now = new Date();
    ticket.status = "submitted";
    ticket.submittedAt = now;
    if (ticket.startedAt) {
      ticket.listeningDurationSeconds = Math.round(
        (now.getTime() - new Date(ticket.startedAt).getTime()) / 1000,
      );
    }

    const body = (await request.json().catch(() => ({}))) as { sessionNotes?: string };
    if (typeof body.sessionNotes === "string") {
      ticket.sessionNotes = body.sessionNotes;
    }

    await ticket.save();

    // When ticket is linked to an assignment, update assignment status to LISTENED
    if (ticket.assignmentId) {
      await AssignmentModel.findByIdAndUpdate(ticket.assignmentId, {
        status: "listened",
        updatedAt: new Date(),
      });
    }

    // Create notification for admin
    const admins = await UserModel.find({ role: { $in: ["admin", "super_admin"] } }).select("_id").lean();
    const student = await UserModel.findById(
      ticket.studentId && typeof ticket.studentId === "object" && "userId" in ticket.studentId
        ? (ticket.studentId.userId as Types.ObjectId)
        : null,
    ).select("fullName").lean();

    const notifications = admins.map((admin) => ({
      userId: admin._id,
      type: "recitation_review" as const,
      title: "Ticket Submitted for Review",
      message: `${student?.fullName || "Student"}'s ${ticket.workflowStep} ticket is ready for review`,
      relatedEntity: {
        type: "Ticket",
        id: ticket._id,
      },
    }));

    if (notifications.length > 0) {
      await NotificationModel.insertMany(notifications);
    }

    const updatedTicket = await TicketModel.findById(ticketId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Ticket submitted for review successfully.",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Error submitting ticket:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to submit ticket." },
      { status: 500 },
    );
  }
}
