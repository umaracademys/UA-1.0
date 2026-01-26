import mongoose, { Model, Schema, Types } from "mongoose";

export type NotificationType =
  | "recitation_review"
  | "assignment_submission"
  | "evaluation_feedback"
  | "message"
  | "registration"
  | "attendance_issue";

export interface NotificationDocument extends mongoose.Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity?: {
    type: string;
    id: Types.ObjectId;
  };
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "recitation_review",
        "assignment_submission",
        "evaluation_feedback",
        "message",
        "registration",
        "attendance_issue",
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    relatedEntity: {
      type: {
        type: String,
        trim: true,
      },
      id: { type: Schema.Types.ObjectId },
    },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

const NotificationModel =
  (mongoose.models.Notification as Model<NotificationDocument>) ||
  mongoose.model<NotificationDocument>("Notification", notificationSchema);

export default NotificationModel;
