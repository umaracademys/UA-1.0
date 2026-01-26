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

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isRead = searchParams.get("isRead");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      userId: user._id,
    };

    if (type) {
      query.type = type;
    }

    if (isRead !== null && isRead !== undefined) {
      query.isRead = isRead === "true";
    }

    if (dateFrom || dateTo) {
      query.createdAt = {} as { $gte?: Date; $lte?: Date };
      if (dateFrom) {
        (query.createdAt as { $gte?: Date; $lte?: Date }).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        (query.createdAt as { $gte?: Date; $lte?: Date }).$lte = endDate;
      }
    }

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments(query),
      NotificationModel.countDocuments({ userId: user._id, isRead: false }),
    ]);

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load notifications." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    // Only allow system/internal use - typically admins or system processes
    if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json(
        { success: false, message: "Forbidden. This endpoint is for system use only." },
        { status: 403 },
      );
    }

    await connectToDatabase();

    const body = (await request.json()) as {
      userId: string;
      type: string;
      title: string;
      message: string;
      relatedEntity?: {
        type: string;
        id: string;
      };
    };

    const { userId, type, title, message, relatedEntity } = body;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, message: "Valid user ID is required." }, { status: 400 });
    }

    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, message: "Type, title, and message are required." },
        { status: 400 },
      );
    }

    const notification = await NotificationModel.create({
      userId: new Types.ObjectId(userId),
      type,
      title,
      message,
      relatedEntity: relatedEntity
        ? {
            type: relatedEntity.type,
            id: new Types.ObjectId(relatedEntity.id),
          }
        : undefined,
    });

    // Emit WebSocket event (will be handled by notification utilities)
    const { emitNotification } = await import("@/lib/socket/notifications");
    emitNotification(userId, notification);

    return NextResponse.json({
      success: true,
      message: "Notification created successfully.",
      notification,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to create notification." },
      { status: 500 },
    );
  }
}
