import mongoose, { Model, Schema, Types } from "mongoose";

export type TicketWorkflowStep = "sabq" | "sabqi" | "manzil";
/**
 * Ticket lifecycle: OPEN (pending) → IN_PROGRESS (started) ⇄ PAUSED → SUBMITTED → REVIEWED/CLOSED.
 * Keeps backward compatibility: pending, in-progress, submitted, approved, rejected.
 */
export type TicketStatus =
  | "pending"   // OPEN – created, not started
  | "in-progress" // IN_PROGRESS – listening active
  | "paused"   // PAUSED – session paused, can resume
  | "submitted"  // SUBMITTED – teacher submitted for admin review
  | "approved"   // REVIEWED – admin approved
  | "rejected"   // REJECTED – admin rejected
  | "closed";    // CLOSED – final state after review

/** Listening range (surah + ayah). Locked when ticket is in-progress/paused. */
export interface TicketAyahRange {
  fromSurah: number;
  fromAyah: number;
  toSurah: number;
  toAyah: number;
}

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
  /** Listening range (from ayah → to ayah). Set when teacher starts ticket. */
  ayahRange?: TicketAyahRange;
  /** When true, ayah range cannot be changed (ticket in-progress or paused). */
  rangeLocked?: boolean;
  /** Link to assignment when ticket is for a specific assignment. */
  assignmentId?: Types.ObjectId;
  /** Last heartbeat from teacher client; keeps session alive. */
  lastHeartbeatAt?: Date;
  /** When teacher started the listening session. */
  startedAt?: Date;
  /** When teacher submitted the ticket. */
  submittedAt?: Date;
  /** Total listening duration in seconds (server-calculated on submit). */
  listeningDurationSeconds?: number;
  /** Notes added by teacher during the listening session. */
  sessionNotes?: string;
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
      enum: ["pending", "in-progress", "paused", "submitted", "approved", "rejected", "closed"],
      default: "pending",
    },
    notes: { type: String, trim: true },
    ayahRange: {
      fromSurah: { type: Number },
      fromAyah: { type: Number },
      toSurah: { type: Number },
      toAyah: { type: Number },
    },
    rangeLocked: { type: Boolean, default: false },
    assignmentId: { type: Schema.Types.ObjectId, ref: "Assignment" },
    lastHeartbeatAt: { type: Date },
    startedAt: { type: Date },
    submittedAt: { type: Date },
    listeningDurationSeconds: { type: Number },
    sessionNotes: { type: String, trim: true },
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
