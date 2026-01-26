import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import MessageModel from "@/lib/db/models/Message";
import ConversationModel from "@/lib/db/models/Conversation";
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
  context: { params: { messageId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { messageId } = context.params;
    if (!Types.ObjectId.isValid(messageId)) {
      return NextResponse.json({ success: false, message: "Invalid message ID." }, { status: 400 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      return NextResponse.json({ success: false, message: "Message not found." }, { status: 404 });
    }

    // Don't mark own messages as read
    if (message.senderId.toString() === user._id.toString()) {
      return NextResponse.json({
        success: true,
        message: "Message is already read (own message).",
        data: message,
      });
    }

    // Mark as read
    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();

      // Decrement unread count in conversation
      const conversation = await ConversationModel.findById(message.conversationId);
      if (conversation) {
        const userIdStr = user._id.toString();
        if (conversation.unreadCount) {
          if (conversation.unreadCount instanceof Map) {
            const currentUnread = conversation.unreadCount.get(userIdStr) || 0;
            conversation.unreadCount.set(userIdStr, Math.max(0, currentUnread - 1));
          } else if (typeof conversation.unreadCount === 'object') {
            const unreadCountObj = conversation.unreadCount as Record<string, number>;
            const currentUnread = unreadCountObj[userIdStr] || 0;
            unreadCountObj[userIdStr] = Math.max(0, currentUnread - 1);
          }
        }
        await conversation.save();
      }

      // Emit WebSocket event
      try {
        const conversation = await ConversationModel.findById(message.conversationId);
        if (conversation) {
          const { emitMessageRead } = await import("@/lib/socket/server");
          emitMessageRead(messageId, user._id.toString(), conversation._id.toString());
        }
      } catch (error) {
        console.error("Failed to emit WebSocket event:", error);
      }
    }

    const updatedMessage = await MessageModel.findById(messageId)
      .populate("senderId", "fullName email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Message marked as read.",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to mark message as read." },
      { status: 500 },
    );
  }
}
