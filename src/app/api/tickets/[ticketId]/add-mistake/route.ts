import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import TicketModel from "@/lib/db/models/Ticket";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";
import type { TicketMistake } from "@/lib/db/models/Ticket";

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

    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found." }, { status: 404 });
    }

    const body = (await request.json()) as Omit<TicketMistake, "timestamp">;

    if (!body.type || !body.category) {
      return NextResponse.json({ success: false, message: "Type and category are required." }, { status: 400 });
    }

    // Add mistake to ticket
    const mistake: TicketMistake = {
      ...body,
      timestamp: new Date(),
    };

    ticket.mistakes.push(mistake);
    await ticket.save();

    const updatedTicket = await TicketModel.findById(ticketId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Mistake added successfully.",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Error adding mistake:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to add mistake." },
      { status: 500 },
    );
  }
}
