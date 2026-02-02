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
  | "reassigned" // Reassigned to different teacher
  | "closed";    // CLOSED – final state after review

/** Recitation range (Portal legacy). Includes surahName, juzNumber, startAyahText. */
export interface TicketRecitationRange {
  surahName?: string;
  surahNumber?: number;
  endSurahNumber?: number;
  endSurahName?: string;
  juzNumber?: number;
  startAyahNumber?: number;
  startAyahText?: string;
  endAyahNumber?: number;
  endAyahText?: string;
}

/** Sabq entry (Portal legacy). Multiple entries per Sabq ticket. */
export interface SabqEntry {
  id?: string;
  recitationRange?: TicketRecitationRange;
  mistakes?: TicketMistake[];
  mistakeCount?: number | "weak";
  atkees?: number;
  tajweedIssues?: Array<{ type: string; surahName?: string; wordText?: string; note?: string }>;
  adminComment?: string;
}

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
  /** Admin who created the ticket (Portal legacy). */
  createdBy?: Types.ObjectId;
  /** Admin name (Portal legacy). */
  createdByName?: string;
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
  /** Recitation range (Portal legacy): surahName, juzNumber, startAyahText, etc. */
  recitationRange?: TicketRecitationRange;
  /** Sabq-specific: multiple recitation entries per ticket. */
  sabqEntries?: SabqEntry[];
  /** Homework range for next day (Sabq tickets). Maps to Assignment homework when approved. */
  homeworkRange?: TicketRecitationRange;
  /** Mistake count: number 1-20 or 'weak'. */
  mistakeCount?: number | "weak";
  /** Reassignment tracking (Portal legacy) */
  reassignedFromTeacherId?: Types.ObjectId;
  reassignedFromTeacherName?: string;
  reassignedToTeacherId?: Types.ObjectId;
  reassignedToTeacherName?: string;
  reassignmentReason?: string;
  previousTeacherComment?: string;
  previousMistakes?: TicketMistake[];
  reassignedAt?: Date;
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

const sabqEntryRecitationRangeSchema = new Schema(
  {
    surahName: { type: String, trim: true },
    surahNumber: { type: Number },
    endSurahNumber: { type: Number },
    endSurahName: { type: String, trim: true },
    juzNumber: { type: Number },
    startAyahNumber: { type: Number },
    startAyahText: { type: String, trim: true },
    endAyahNumber: { type: Number },
    endAyahText: { type: String, trim: true },
  },
  { _id: false },
);

const sabqEntryTajweedIssueSchema = new Schema(
  {
    type: { type: String, trim: true },
    surahName: { type: String, trim: true },
    wordText: { type: String, trim: true },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const sabqEntrySchema = new Schema(
  {
    id: { type: String },
    recitationRange: { type: sabqEntryRecitationRangeSchema },
    mistakes: { type: [mistakeSchema], default: [] },
    mistakeCount: { type: Schema.Types.Mixed },
    atkees: { type: Number },
    tajweedIssues: { type: [sabqEntryTajweedIssueSchema], default: [] },
    adminComment: { type: String, trim: true },
  },
  { _id: false },
);

const ticketSchema = new Schema<TicketDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    createdByName: { type: String, required: false, trim: true },
    workflowStep: { type: String, enum: ["sabq", "sabqi", "manzil"], required: true },
    status: {
      type: String,
      enum: ["pending", "in-progress", "paused", "submitted", "approved", "rejected", "reassigned", "closed"],
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
    recitationRange: {
      surahName: { type: String, trim: true },
      surahNumber: { type: Number },
      endSurahNumber: { type: Number },
      endSurahName: { type: String, trim: true },
      juzNumber: { type: Number },
      startAyahNumber: { type: Number },
      startAyahText: { type: String, trim: true },
      endAyahNumber: { type: Number },
      endAyahText: { type: String, trim: true },
    },
    sabqEntries: { type: [sabqEntrySchema], default: [] },
    homeworkRange: {
      surahName: { type: String, trim: true },
      surahNumber: { type: Number },
      endSurahNumber: { type: Number },
      endSurahName: { type: String, trim: true },
      juzNumber: { type: Number },
      startAyahNumber: { type: Number },
      startAyahText: { type: String, trim: true },
      endAyahNumber: { type: Number },
      endAyahText: { type: String, trim: true },
    },
    mistakeCount: { type: Schema.Types.Mixed },
    reassignedFromTeacherId: { type: Schema.Types.ObjectId, ref: "Teacher" },
    reassignedFromTeacherName: { type: String, trim: true },
    reassignedToTeacherId: { type: Schema.Types.ObjectId, ref: "Teacher" },
    reassignedToTeacherName: { type: String, trim: true },
    reassignmentReason: { type: String, trim: true },
    previousTeacherComment: { type: String, trim: true },
    previousMistakes: { type: [mistakeSchema], default: [] },
    reassignedAt: { type: Date },
  },
  { timestamps: true },
);

ticketSchema.index({ studentId: 1, workflowStep: 1, status: 1 });
ticketSchema.index({ teacherId: 1, status: 1 });

const TicketModel =
  (mongoose.models.Ticket as Model<TicketDocument>) ||
  mongoose.model<TicketDocument>("Ticket", ticketSchema);

export default TicketModel;
