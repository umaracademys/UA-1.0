import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
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

export async function GET(
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

    const conversation = await ConversationModel.findById(conversationId)
      .populate("participants", "fullName email role")
      .lean();

    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404 });
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (p: any) => p._id.toString() === user._id.toString(),
    );

    if (!isParticipant && decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load conversation." },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    const body = (await request.json()) as {
      isLocked?: boolean;
    };

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404 });
    }

    // Check permission for locking
    if (body.isLocked !== undefined) {
      if (
        !hasPermission(decoded.role, "messages.moderate") &&
        !decoded.permissions?.includes("messages.moderate")
      ) {
        return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
      }
      conversation.isLocked = body.isLocked;
    }

    await conversation.save();

    const updatedConversation = await ConversationModel.findById(conversationId)
      .populate("participants", "fullName email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Conversation updated successfully.",
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to update conversation." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { conversationId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (
      !hasPermission(decoded.role, "messages.delete") &&
      !decoded.permissions?.includes("messages.delete")
    ) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { conversationId } = context.params;
    if (!Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json({ success: false, message: "Invalid conversation ID." }, { status: 400 });
    }

    await ConversationModel.findByIdAndDelete(conversationId);

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to delete conversation." },
      { status: 500 },
    );
  }
}
