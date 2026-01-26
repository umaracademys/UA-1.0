import mongoose, { Model, Schema, Types } from "mongoose";

export type TicketWorkflowStep = "sabq" | "sabqi" | "manzil";
export type TicketStatus = "pending" | "in-progress" | "submitted" | "approved" | "rejected";

export interface TicketMistake {
  type: string;
  category: string;
  page?: number;
  surah?: number;
  ayah?: number;
  wordIndex?: number;
  letterIndex?: number;
  position?: { x: number; y: number };
  tajweedData?: Record<string, unknown>;
  note?: string;
  audioUrl?: string;
  timestamp?: Date;
}

export interface TicketDocument extends mongoose.Document {
  studentId: Types.ObjectId;
  teacherId?: Types.ObjectId;
  workflowStep: TicketWorkflowStep;
  status: TicketStatus;
  notes?: string;
  audioUrl?: string;
  mistakes: TicketMistake[];
  reviewedBy?: Types.ObjectId;
  reviewNotes?: string;
  reviewedAt?: Date;
  homeworkAssigned?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const mistakeSchema = new Schema<TicketMistake>(
  {
    type: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    page: { type: Number },
    surah: { type: Number },
    ayah: { type: Number },
    wordIndex: { type: Number },
    letterIndex: { type: Number },
    position: {
      x: { type: Number },
      y: { type: Number },
    },
    tajweedData: { type: Schema.Types.Mixed },
    note: { type: String, trim: true },
    audioUrl: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ticketSchema = new Schema<TicketDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher" },
    workflowStep: { type: String, enum: ["sabq", "sabqi", "manzil"], required: true },
    status: {
      type: String,
      enum: ["pending", "in-progress", "submitted", "approved", "rejected"],
      default: "pending",
    },
    notes: { type: String, trim: true },
    audioUrl: { type: String, trim: true },
    mistakes: { type: [mistakeSchema], default: [] },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewNotes: { type: String, trim: true },
    reviewedAt: { type: Date },
    homeworkAssigned: { type: Schema.Types.ObjectId, ref: "Assignment" },
  },
  { timestamps: true },
);

ticketSchema.index({ studentId: 1, workflowStep: 1, status: 1 });
ticketSchema.index({ teacherId: 1, status: 1 });

const TicketModel =
  (mongoose.models.Ticket as Model<TicketDocument>) ||
  mongoose.model<TicketDocument>("Ticket", ticketSchema);

export default TicketModel;
