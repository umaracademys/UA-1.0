import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import MessageModel from "@/lib/db/models/Message";
import ConversationModel from "@/lib/db/models/Conversation";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

const MESSAGE_EDIT_TIME_LIMIT = 15 * 60 * 1000; // 15 minutes

export async function GET(
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

    const message = await MessageModel.findById(messageId)
      .populate("senderId", "fullName email role")
      .populate("conversationId")
      .lean();

    if (!message) {
      return NextResponse.json({ success: false, message: "Message not found." }, { status: 404 });
    }

    // Check access - user must be participant in conversation
    const conversation = await ConversationModel.findById(message.conversationId);
    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const isParticipant = conversation.participants.some(
      (id) => id.toString() === user._id.toString(),
    );

    if (!isParticipant && decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Error fetching message:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load message." },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    const message = await MessageModel.findById(messageId);
    if (!message) {
      return NextResponse.json({ success: false, message: "Message not found." }, { status: 404 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check if user is sender
    const isSender = message.senderId.toString() === user._id.toString();
    const isModerator =
      hasPermission(decoded.role, "messages.moderate") ||
      decoded.permissions?.includes("messages.moderate");

    if (!isSender && !isModerator) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    // Check time limit for editing (only for sender)
    if (isSender && !isModerator) {
      const messageAge = Date.now() - new Date(message.createdAt).getTime();
      if (messageAge > MESSAGE_EDIT_TIME_LIMIT) {
        return NextResponse.json(
          { success: false, message: "Message can only be edited within 15 minutes." },
          { status: 400 },
        );
      }
    }

    const body = (await request.json()) as {
      content?: string;
    };

    if (body.content !== undefined) {
      if (!body.content || body.content.trim().length === 0) {
        return NextResponse.json(
          { success: false, message: "Message content cannot be empty." },
          { status: 400 },
        );
      }
      message.content = body.content.trim();
    }

    await message.save();

    const updatedMessage = await MessageModel.findById(messageId)
      .populate("senderId", "fullName email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Message updated successfully.",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to update message." },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const message = await MessageModel.findById(messageId);
    if (!message) {
      return NextResponse.json({ success: false, message: "Message not found." }, { status: 404 });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Check if user is sender or moderator
    const isSender = message.senderId.toString() === user._id.toString();
    const isModerator =
      hasPermission(decoded.role, "messages.delete") ||
      decoded.permissions?.includes("messages.delete");

    if (!isSender && !isModerator) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    return NextResponse.json({
      success: true,
      message: "Message deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to delete message." },
      { status: 500 },
    );
  }
}
