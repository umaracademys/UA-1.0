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

    // Find all conversations where user is a participant
    const conversations = await ConversationModel.find({
      participants: user._id,
    })
      .populate("participants", "fullName email role")
      .sort({ lastMessageAt: -1 })
      .lean();

    // Format conversations with unread count for current user
    const formattedConversations = conversations.map((conv) => {
      // unreadCount is a Map in Mongoose but becomes a plain object with .lean()
      const unreadCountMap = conv.unreadCount as any;
      const unreadCount = unreadCountMap && typeof unreadCountMap === 'object' 
        ? (unreadCountMap[user._id.toString()] || 0)
        : (unreadCountMap?.get ? unreadCountMap.get(user._id.toString()) || 0 : 0);
      return {
        ...conv,
        unreadCount,
        participants: conv.participants.filter((p: any) => p._id.toString() !== user._id.toString()),
      };
    });

    return NextResponse.json({
      success: true,
      conversations: formattedConversations,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load conversations." },
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
    await connectToDatabase();

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      participantIds: string[];
      type: "teacher-student" | "teacher-teacher";
    };

    const { participantIds, type } = body;

    if (!participantIds || participantIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one participant is required." },
        { status: 400 },
      );
    }

    // Validate participant IDs
    const validParticipantIds = participantIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (validParticipantIds.length === 0) {
      return NextResponse.json({ success: false, message: "Invalid participant IDs." }, { status: 400 });
    }

    // Include current user in participants
    const allParticipants = [user._id, ...validParticipantIds];

    // Check if conversation already exists between these participants
    const existingConversation = await ConversationModel.findOne({
      participants: { $all: allParticipants, $size: allParticipants.length },
      type,
    });

    if (existingConversation) {
      const existingConv = await ConversationModel.findById(existingConversation._id)
        .populate("participants", "fullName email role")
        .lean();
      
      // .lean() converts Map to plain object, ensure it's an object
      const formattedConv = {
        ...existingConv,
        unreadCount: existingConv?.unreadCount && typeof existingConv.unreadCount === 'object'
          ? (existingConv.unreadCount instanceof Map 
              ? Object.fromEntries(existingConv.unreadCount) 
              : existingConv.unreadCount)
          : {},
      };
      
      return NextResponse.json({
        success: true,
        message: "Conversation already exists.",
        conversation: formattedConv,
      });
    }

    // Create new conversation
    const conversation = await ConversationModel.create({
      participants: allParticipants,
      type,
      lastMessage: "",
      lastMessageAt: new Date(),
      unreadCount: new Map(),
      isLocked: false,
    });

    const populatedConversation = await ConversationModel.findById(conversation._id)
      .populate("participants", "fullName email role")
      .lean();

    // .lean() converts Map to plain object, ensure it's an object
    const formattedConversation = {
      ...populatedConversation,
      unreadCount: populatedConversation?.unreadCount && typeof populatedConversation.unreadCount === 'object'
        ? (populatedConversation.unreadCount instanceof Map 
            ? Object.fromEntries(populatedConversation.unreadCount) 
            : populatedConversation.unreadCount)
        : {},
    };

    return NextResponse.json({
      success: true,
      message: "Conversation created successfully.",
      conversation: formattedConversation,
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to create conversation." },
      { status: 500 },
    );
  }
}
