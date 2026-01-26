import mongoose, { Model, Schema, Types } from "mongoose";

export type ConversationType = "teacher-student" | "teacher-teacher";

export interface ConversationDocument extends mongoose.Document {
  participants: Types.ObjectId[];
  type: ConversationType;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: Map<string, number>;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<ConversationDocument>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    type: { type: String, enum: ["teacher-student", "teacher-teacher"], required: true },
    lastMessage: { type: String, trim: true },
    lastMessageAt: { type: Date },
    unreadCount: { type: Map, of: Number, default: {} },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, type: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const ConversationModel =
  (mongoose.models.Conversation as Model<ConversationDocument>) ||
  mongoose.model<ConversationDocument>("Conversation", conversationSchema);

export default ConversationModel;
