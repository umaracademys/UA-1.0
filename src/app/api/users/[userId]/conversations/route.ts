import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
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

export async function GET(
  request: Request,
  context: { params: { userId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { userId } = context.params;
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, message: "Invalid user ID." }, { status: 400 });
    }

    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Users can only see their own conversations unless admin
    if (decoded.userId !== userId && decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    // Find all conversations for this user
    const conversations = await ConversationModel.find({
      participants: new Types.ObjectId(userId),
    })
      .populate("participants", "fullName email role")
      .sort({ lastMessageAt: -1 })
      .lean();

    // Format conversations
    const formattedConversations = conversations.map((conv) => {
      // unreadCount is a Map in Mongoose but becomes a plain object with .lean()
      const unreadCountMap = conv.unreadCount as any;
      const unreadCount = unreadCountMap && typeof unreadCountMap === 'object' 
        ? (unreadCountMap[userId] || 0)
        : (unreadCountMap?.get ? unreadCountMap.get(userId) || 0 : 0);
      return {
        ...conv,
        unreadCount,
        participants: conv.participants.filter((p: any) => p._id.toString() !== userId),
      };
    });

    return NextResponse.json({
      success: true,
      conversations: formattedConversations,
    });
  } catch (error) {
    console.error("Error fetching user conversations:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load conversations." },
      { status: 500 },
    );
  }
}
