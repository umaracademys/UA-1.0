import mongoose, { Model, Schema, Types } from "mongoose";

export type MessagePriority = "normal" | "high" | "urgent";

export interface MessageAttachment {
  filename: string;
  url: string;
  type?: string;
  size?: number;
}

export interface MessageDocument extends mongoose.Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string; // Can be empty if only attachments
  attachments: MessageAttachment[];
  priority: MessagePriority;
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<MessageAttachment>(
  {
    filename: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    type: { type: String, trim: true },
    size: { type: Number },
  },
  { _id: false },
);

const messageSchema = new Schema<MessageDocument>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { 
      type: String, 
      required: false, // Allow empty content if attachments exist
      trim: true,
      default: "",
    },
    attachments: { type: [attachmentSchema], default: [] },
    priority: { type: String, enum: ["normal", "high", "urgent"], default: "normal" },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

const MessageModel =
  (mongoose.models.Message as Model<MessageDocument>) ||
  mongoose.model<MessageDocument>("Message", messageSchema);

export default MessageModel;
