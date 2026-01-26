import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import TicketModel from "@/lib/db/models/Ticket";
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
    if (!hasPermission(decoded.role, "tickets.approve") && !decoded.permissions?.includes("tickets.approve")) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { ticketId } = context.params;
    if (!Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json({ success: false, message: "Invalid ticket ID." }, { status: 400 });
    }

    const ticket = await TicketModel.findById(ticketId).populate("teacherId", "userId");
    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      reviewNotes: string;
    };

    if (!body.reviewNotes) {
      return NextResponse.json({ success: false, message: "Review notes are required." }, { status: 400 });
    }

    // Get reviewer info
    const reviewer = await UserModel.findById(decoded.userId);
    if (!reviewer) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Update ticket
    ticket.status = "rejected";
    ticket.reviewedBy = reviewer._id;
    ticket.reviewedAt = new Date();
    ticket.reviewNotes = body.reviewNotes;
    await ticket.save();

    // Create notification for teacher
    const teacher = await TeacherModel.findById(ticket.teacherId);
    if (teacher) {
      await NotificationModel.create({
        userId: teacher.userId,
        type: "recitation_review",
        title: "Ticket Rejected",
        message: `The ${ticket.workflowStep} ticket has been rejected. Review notes: ${body.reviewNotes}`,
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
      message: "Ticket rejected successfully.",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Error rejecting ticket:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to reject ticket." },
      { status: 500 },
    );
  }
}
