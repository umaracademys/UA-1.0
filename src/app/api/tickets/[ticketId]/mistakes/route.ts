/**
 * DELETE /api/tickets/[ticketId]/mistakes
 * Remove a mistake from the ticket by index (so teacher can remove or edit before submission).
 * Body: { index: number }. Only in-progress or paused tickets; only assigned teacher.
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

export async function DELETE(request: Request, context: { params: { ticketId: string } }) {
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

    if (ticket.status !== "in-progress" && ticket.status !== "paused") {
      return NextResponse.json(
        { success: false, message: "Mistakes can only be removed from an in-progress or paused ticket." },
        { status: 400 },
      );
    }

    if (ticket.teacherId?.toString() !== teacher._id.toString()) {
      return NextResponse.json({ success: false, message: "Only the assigned teacher can remove mistakes." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { index?: number };
    const mistakeIndex = body.index;
    if (typeof mistakeIndex !== "number" || mistakeIndex < 0 || mistakeIndex >= (ticket.mistakes?.length ?? 0)) {
      return NextResponse.json(
        { success: false, message: "Invalid mistake index." },
        { status: 400 },
      );
    }

    ticket.mistakes.splice(mistakeIndex, 1);
    await ticket.save();

    const updated = await TicketModel.findById(ticketId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Mistake removed.",
      ticket: updated,
    });
  } catch (error) {
    console.error("Error removing mistake:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to remove mistake." },
      { status: 500 },
    );
  }
}
