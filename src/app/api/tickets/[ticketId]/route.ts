import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import TicketModel from "@/lib/db/models/Ticket";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";
import type { TicketStatus } from "@/lib/db/models/Ticket";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(request: Request, context: { params: { ticketId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { ticketId } = context.params;
    if (!Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json({ success: false, message: "Invalid ticket ID." }, { status: 400 });
    }

    const ticket = await TicketModel.findById(ticketId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .populate("reviewedBy", "fullName email")
      .populate("homeworkAssigned")
      .populate("assignmentId")
      .lean();

    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load ticket." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: { params: { ticketId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { ticketId } = context.params;
    if (!Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json({ success: false, message: "Invalid ticket ID." }, { status: 400 });
    }

    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      status?: TicketStatus;
      notes?: string;
      audioUrl?: string;
      sessionNotes?: string;
    };

    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    if (body.audioUrl !== undefined) {
      updateData.audioUrl = body.audioUrl;
    }
    if (body.sessionNotes !== undefined && (ticket.status === "in-progress" || ticket.status === "paused")) {
      updateData.sessionNotes = body.sessionNotes;
    }

    const updatedTicket = await TicketModel.findByIdAndUpdate(ticketId, updateData, { new: true })
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .populate("reviewedBy", "fullName email")
      .populate("assignmentId")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Ticket updated successfully.",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to update ticket." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: { params: { ticketId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { ticketId } = context.params;
    if (!Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json({ success: false, message: "Invalid ticket ID." }, { status: 400 });
    }

    await TicketModel.findByIdAndDelete(ticketId);

    return NextResponse.json({
      success: true,
      message: "Ticket deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to delete ticket." },
      { status: 500 },
    );
  }
}
