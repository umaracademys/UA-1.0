import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/connection";
import NotificationModel from "@/lib/db/models/Notification";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const result = await NotificationModel.updateMany(
      { userId: user._id, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );

    // Emit WebSocket event for unread count update
    const { emitUnreadCountUpdate } = await import("@/lib/socket/notifications");
    emitUnreadCountUpdate(user._id.toString());

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to mark notifications as read." },
      { status: 500 },
    );
  }
}
