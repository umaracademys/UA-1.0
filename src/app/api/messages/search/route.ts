import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import MessageModel from "@/lib/db/models/Message";
import ConversationModel from "@/lib/db/models/Conversation";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";

export const dynamic = "force-dynamic";

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

    const body = (await request.json()) as {
      query: string;
      conversationId?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    const { query, conversationId, dateFrom, dateTo } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Search query is required." },
        { status: 400 },
      );
    }

    // Build search query
    const searchQuery: Record<string, unknown> = {
      content: { $regex: query, $options: "i" },
      isDeleted: false,
    };

    if (conversationId && Types.ObjectId.isValid(conversationId)) {
      // Check if user is participant
      const conversation = await ConversationModel.findById(conversationId);
      if (conversation) {
        const isParticipant = conversation.participants.some(
          (id) => id.toString() === user._id.toString(),
        );

        if (!isParticipant && decoded.role !== "admin" && decoded.role !== "super_admin") {
          return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
        }

        searchQuery.conversationId = new Types.ObjectId(conversationId);
      }
    } else {
      // Search across all conversations user is part of
      const userConversations = await ConversationModel.find({
        participants: user._id,
      }).select("_id");

      const conversationIds = userConversations.map((conv) => conv._id);
      searchQuery.conversationId = { $in: conversationIds };
    }

    if (dateFrom || dateTo) {
      searchQuery.createdAt = {} as { $gte?: Date; $lte?: Date };
      if (dateFrom) {
        (searchQuery.createdAt as { $gte?: Date; $lte?: Date }).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        (searchQuery.createdAt as { $gte?: Date; $lte?: Date }).$lte = new Date(dateTo);
      }
    }

    // Search messages
    const messages = await MessageModel.find(searchQuery)
      .populate("senderId", "fullName email role")
      .populate("conversationId")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Format results with context and highlight
    const formattedMessages = messages.map((msg: any) => {
      const content = msg.content || "";
      const queryLower = query.toLowerCase();
      const contentLower = content.toLowerCase();
      const index = contentLower.indexOf(queryLower);

      let highlightedContent = content;
      if (index !== -1) {
        const before = content.substring(Math.max(0, index - 50), index);
        const match = content.substring(index, index + query.length);
        const after = content.substring(index + query.length, Math.min(content.length, index + query.length + 50));
        highlightedContent = `${before}<mark>${match}</mark>${after}`;
      }

      return {
        ...msg,
        highlightedContent,
        context: content.substring(0, 200),
      };
    });

    return NextResponse.json({
      success: true,
      results: formattedMessages,
      count: formattedMessages.length,
      query,
    });
  } catch (error) {
    console.error("Error searching messages:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to search messages." },
      { status: 500 },
    );
  }
}
