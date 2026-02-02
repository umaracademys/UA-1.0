/**
 * POST /api/tickets/[ticketId]/pause
 * Teacher pauses the listening session. Timer stops; range stays locked. Can resume later.
 */
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

    const teacher = await UserModel.findById(decoded.userId).then((u) =>
      u ? TeacherModel.findOne({ userId: u._id }) : null,
    );
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
    }

    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found." }, { status: 404 });
    }

    if (ticket.status !== "in-progress") {
      return NextResponse.json(
        { success: false, message: "Only an in-progress ticket can be paused." },
        { status: 400 },
      );
    }

    if (ticket.teacherId?.toString() !== teacher._id.toString()) {
      return NextResponse.json({ success: false, message: "Only the assigned teacher can pause." }, { status: 403 });
    }

    ticket.status = "paused";
    await ticket.save();

    const updated = await TicketModel.findById(ticketId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Ticket paused. You can resume later.",
      ticket: updated,
    });
  } catch (error) {
    console.error("Error pausing ticket:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Pause failed." },
      { status: 500 },
    );
  }
}
