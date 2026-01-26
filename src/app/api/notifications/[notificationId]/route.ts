import { NextResponse } from "next/server";
import { Types } from "mongoose";

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

export async function GET(
  request: Request,
  context: { params: { notificationId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { notificationId } = context.params;
    if (!Types.ObjectId.isValid(notificationId)) {
      return NextResponse.json({ success: false, message: "Invalid notification ID." }, { status: 400 });
    }

    const notification = await NotificationModel.findById(notificationId).lean();

    if (!notification) {
      return NextResponse.json(
        { success: false, message: "Notification not found." },
        { status: 404 },
      );
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check if user owns this notification
    if (notification.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Error fetching notification:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load notification." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: { notificationId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { notificationId } = context.params;
    if (!Types.ObjectId.isValid(notificationId)) {
      return NextResponse.json({ success: false, message: "Invalid notification ID." }, { status: 400 });
    }

    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      return NextResponse.json(
        { success: false, message: "Notification not found." },
        { status: 404 },
      );
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check if user owns this notification
    if (notification.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    const body = (await request.json()) as {
      isRead?: boolean;
    };

    if (body.isRead !== undefined) {
      notification.isRead = body.isRead;
      if (body.isRead) {
        notification.readAt = new Date();
      } else {
        notification.readAt = undefined;
      }
    }

    await notification.save();

    // Emit WebSocket event for unread count update
    const { emitUnreadCountUpdate } = await import("@/lib/socket/notifications");
    emitUnreadCountUpdate(user._id.toString());

    return NextResponse.json({
      success: true,
      message: "Notification updated successfully.",
      notification,
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to update notification." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { notificationId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { notificationId } = context.params;
    if (!Types.ObjectId.isValid(notificationId)) {
      return NextResponse.json({ success: false, message: "Invalid notification ID." }, { status: 400 });
    }

    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      return NextResponse.json(
        { success: false, message: "Notification not found." },
        { status: 404 },
      );
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check if user owns this notification
    if (notification.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    await NotificationModel.findByIdAndDelete(notificationId);

    // Emit WebSocket event for unread count update
    const { emitUnreadCountUpdate } = await import("@/lib/socket/notifications");
    emitUnreadCountUpdate(user._id.toString());

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to delete notification." },
      { status: 500 },
    );
  }
}
