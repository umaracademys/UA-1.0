import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import TicketModel from "@/lib/db/models/Ticket";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

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
    if (
      decoded.role !== "admin" &&
      decoded.role !== "super_admin" &&
      !hasPermission(decoded.role, "tickets.approve") &&
      !decoded.permissions?.includes("tickets.approve")
    ) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Get all tickets with status 'submitted'
    const [tickets, total] = await Promise.all([
      TicketModel.find({ status: "submitted" })
        .populate("studentId", "userId")
        .populate("teacherId", "userId")
        .sort({ createdAt: 1 }) // Oldest first
        .skip(skip)
        .limit(limit)
        .lean(),
      TicketModel.countDocuments({ status: "submitted" }),
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
    console.error("Error fetching pending review tickets:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load pending review tickets." },
      { status: 500 },
    );
  }
}
