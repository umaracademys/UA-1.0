import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import ConversationModel from "@/lib/db/models/Conversation";
import MessageModel from "@/lib/db/models/Message";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function POST(
  request: Request,
  context: { params: { conversationId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { conversationId } = context.params;
    if (!Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json({ success: false, message: "Invalid conversation ID." }, { status: 400 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404 });
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(
      (id) => id.toString() === user._id.toString(),
    );

    if (!isParticipant) {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    // Mark all unread messages as read
    const unreadMessages = await MessageModel.find({
      conversationId: new Types.ObjectId(conversationId),
      senderId: { $ne: user._id },
      isRead: false,
      isDeleted: false,
    });

    if (unreadMessages.length > 0) {
      await MessageModel.updateMany(
        {
          conversationId: new Types.ObjectId(conversationId),
          senderId: { $ne: user._id },
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },
      );
    }

    // Reset unread count
    conversation.unreadCount?.set(user._id.toString(), 0);
    await conversation.save();

    // Emit WebSocket event
    try {
      const { emitConversationRead } = await import("@/lib/socket/server");
      emitConversationRead(conversationId, user._id.toString());
    } catch (error) {
      console.error("Failed to emit WebSocket event:", error);
    }

    return NextResponse.json({
      success: true,
      message: "All messages marked as read.",
      unreadCount: 0,
    });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to mark conversation as read." },
      { status: 500 },
    );
  }
}
