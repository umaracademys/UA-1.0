import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import ConversationModel from "@/lib/db/models/Conversation";
import MessageModel from "@/lib/db/models/Message";
import UserModel from "@/lib/db/models/User";
import NotificationModel from "@/lib/db/models/Notification";
import { verifyToken } from "@/lib/utils/jwt";
import { saveFile } from "@/lib/utils/fileUpload";

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

    // Check if user is participant
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404 });
    }

    const isParticipant = conversation.participants.some(
      (id) => id.toString() === user._id.toString(),
    );

    if (!isParticipant && decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;
    const before = searchParams.get("before");
    const after = searchParams.get("after");

    const query: Record<string, unknown> = {
      conversationId: new Types.ObjectId(conversationId),
      isDeleted: false,
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    if (after) {
      query.createdAt = { $gt: new Date(after) };
    }

    const [messages, total] = await Promise.all([
      MessageModel.find(query)
        .populate("senderId", "fullName email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MessageModel.countDocuments(query),
    ]);

    // Mark messages as read for current user
    const unreadMessageIds = messages
      .filter((msg: any) => !msg.isRead && msg.senderId._id.toString() !== user._id.toString())
      .map((msg: any) => msg._id);

    if (unreadMessageIds.length > 0) {
      await MessageModel.updateMany(
        { _id: { $in: unreadMessageIds } },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },
      );

      // Update unread count in conversation
      // Handle both Map (Mongoose document) and plain object (from .lean())
      const userIdStr = user._id.toString();
      let currentUnread = 0;
      if (conversation.unreadCount) {
        if (conversation.unreadCount instanceof Map) {
          currentUnread = conversation.unreadCount.get(userIdStr) || 0;
          conversation.unreadCount.set(userIdStr, Math.max(0, currentUnread - unreadMessageIds.length));
        } else if (typeof conversation.unreadCount === 'object') {
          const unreadCountObj = conversation.unreadCount as Record<string, number>;
          currentUnread = unreadCountObj[userIdStr] || 0;
          unreadCountObj[userIdStr] = Math.max(0, currentUnread - unreadMessageIds.length);
        }
      }
      await conversation.save();
    }

    return NextResponse.json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load messages." },
      { status: 500 },
    );
  }
}

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

    // Check if user is participant
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404 });
    }

    const isParticipant = conversation.participants.some(
      (id) => id.toString() === user._id.toString(),
    );

    if (!isParticipant) {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    // Check if conversation is locked
    if (conversation.isLocked) {
      return NextResponse.json(
        { success: false, message: "Conversation is locked." },
        { status: 403 },
      );
    }

    // Parse form data
    const formData = await request.formData();
    const contentRaw = formData.get("content");
    // Ensure content is always a string, never null or undefined
    const content = contentRaw ? String(contentRaw) : "";
    const priority = (formData.get("priority") as string) || "normal";
    const attachments = formData.getAll("attachments") as File[];

    // Allow messages with only attachments (no text content)
    if ((!content || content.trim().length === 0) && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { success: false, message: "Message content or attachment is required." },
        { status: 400 },
      );
    }

    // Handle file uploads
    const uploadedAttachments: Array<{
      filename: string;
      url: string;
      type: string;
      size: number;
    }> = [];

    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        if (file.size > 0) {
          try {
            const uploadResult = await saveFile(file, "messages");
            uploadedAttachments.push({
              filename: uploadResult.filename,
              url: uploadResult.url,
              type: file.type,
              size: file.size,
            });
          } catch (error) {
            console.error("Error uploading file:", error);
            // Continue with other files
          }
        }
      }
    }

    // Create message
    // Ensure content is always a string (can be empty if only attachments)
    // Explicitly convert to string to avoid any null/undefined issues
    let messageContent = "";
    if (content !== null && content !== undefined) {
      messageContent = String(content).trim();
    }
    
    // Validate: must have either content or attachments
    if (!messageContent && (!uploadedAttachments || uploadedAttachments.length === 0)) {
      return NextResponse.json(
        { success: false, message: "Message must have content or at least one attachment." },
        { status: 400 },
      );
    }
    
    // Build message data object - ensure content is explicitly set as empty string if needed
    const messageData: Record<string, any> = {
      conversationId: new Types.ObjectId(conversationId),
      senderId: user._id,
      attachments: uploadedAttachments || [],
      priority: priority as "normal" | "high" | "urgent",
      isRead: false,
      isDeleted: false,
    };
    
    // Always set content explicitly, even if empty
    messageData.content = messageContent;
    
    console.log("[API] Creating message:", {
      hasContent: !!messageData.content,
      contentType: typeof messageData.content,
      contentValue: messageData.content,
      contentLength: messageData.content.length,
      attachmentCount: messageData.attachments.length,
    });
    
    let message;
    try {
      message = await MessageModel.create(messageData);
      console.log("[API] Message created successfully:", message._id);
    } catch (createError: any) {
      console.error("[API] Error creating message:", createError);
      console.error("[API] Error name:", createError?.name);
      console.error("[API] Error message:", createError?.message);
      console.error("[API] Error stack:", createError?.stack);
      console.error("[API] Message data:", JSON.stringify(messageData, null, 2));
      
      // Check if it's a validation error
      if (createError?.name === 'ValidationError') {
        const validationErrors = Object.values(createError.errors || {}).map((err: any) => err.message);
        return NextResponse.json(
          { 
            success: false, 
            message: "Validation error", 
            errors: validationErrors,
            details: createError.message 
          },
          { status: 400 },
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: createError?.message || "Failed to create message.",
          error: createError?.name || "UnknownError"
        },
        { status: 500 },
      );
    }

    // Update conversation
    // Use content if available, otherwise indicate attachment
    if (content && content.trim()) {
      conversation.lastMessage = content.substring(0, 100);
    } else if (uploadedAttachments.length > 0) {
      const attachmentType = uploadedAttachments[0].type?.startsWith("image/") ? "📷 Image" : "📎 Attachment";
      conversation.lastMessage = attachmentType;
    } else {
      conversation.lastMessage = "";
    }
    conversation.lastMessageAt = new Date();

    // Increment unread count for other participants
    conversation.participants.forEach((participantId) => {
      if (participantId.toString() !== user._id.toString()) {
        const participantIdStr = participantId.toString();
        if (conversation.unreadCount) {
          if (conversation.unreadCount instanceof Map) {
            const currentUnread = conversation.unreadCount.get(participantIdStr) || 0;
            conversation.unreadCount.set(participantIdStr, currentUnread + 1);
          } else if (typeof conversation.unreadCount === 'object') {
            const unreadCountObj = conversation.unreadCount as Record<string, number>;
            const currentUnread = unreadCountObj[participantIdStr] || 0;
            unreadCountObj[participantIdStr] = currentUnread + 1;
          }
        }
      }
    });

    await conversation.save();

    // Create notifications for recipients
    const recipientIds = conversation.participants.filter(
      (id) => id.toString() !== user._id.toString(),
    );

    // Create notification message
    let notificationMessage = "";
    if (messageContent && messageContent.trim()) {
      notificationMessage = `${user.fullName}: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? "..." : ""}`;
    } else if (uploadedAttachments.length > 0) {
      const attachmentType = uploadedAttachments[0].type?.startsWith("image/") ? "📷 Image" : "📎 Attachment";
      notificationMessage = `${user.fullName} sent ${uploadedAttachments.length > 1 ? `${uploadedAttachments.length} ${attachmentType}s` : `an ${attachmentType}`}`;
    } else {
      notificationMessage = `${user.fullName} sent a message`;
    }

    const notifications = recipientIds.map((recipientId) => ({
      userId: recipientId,
      type: "message" as const,
      title: "New Message",
      message: notificationMessage,
      relatedEntity: {
        type: "Message",
        id: message._id,
      },
    }));

    if (notifications.length > 0) {
      await NotificationModel.insertMany(notifications);
    }

    // Populate message for response
    const populatedMessage = await MessageModel.findById(message._id)
      .populate("senderId", "fullName email role")
      .lean();

    // Emit WebSocket event for real-time delivery
    try {
      const { emitNewMessage } = await import("@/lib/socket/server");
      emitNewMessage(conversationId, populatedMessage);
    } catch (error) {
      console.error("Failed to emit WebSocket event:", error);
      // Continue even if WebSocket fails
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully.",
      data: populatedMessage,
    });
  } catch (error: any) {
    console.error("[API] Unhandled error in POST /messages:", error);
    console.error("[API] Error name:", error?.name);
    console.error("[API] Error message:", error?.message);
    console.error("[API] Error stack:", error?.stack);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error?.message || "Failed to send message.",
        error: error?.name || "UnknownError",
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 },
    );
  }
}
