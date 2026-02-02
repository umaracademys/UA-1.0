import mongoose, { Model, Schema, Types } from "mongoose";

/** Assignment lifecycle: ASSIGNED (active) → IN_PROGRESS → LISTENED → COMPLETED or NEEDS_REVISION. */
export type AssignmentStatus =
  | "active"       // ASSIGNED – not yet started
  | "in_progress"  // Teacher/student working on it
  | "listened"     // Linked ticket was submitted (listening done)
  | "needs_revision" // Ticket rejected or needs re-do
  | "completed"    // Done (ticket approved or marked complete)
  | "archived";

/** Assignment / listening types: Sabq, Sabqi, Manzil, Revision, Special Practice. */
export type ClassworkType = "sabq" | "sabqi" | "manzil" | "revision" | "special_practice";
export type HomeworkRangeMode = "surah_ayah" | "surah_surah" | "juz_juz" | "multiple_juz";
export type HomeworkSubmissionStatus = "submitted" | "graded" | "returned";
export type MistakeType =
  | "madd"
  | "holding"
  | "memory"
  | "ikhfa"
  | "tech"
  | "other"
  | "letter"
  | "heavy_letter"
  | "no_rounding_lips"
  | "heavy_h"
  | "light_l"
  | "atkee";

// Classwork Phase Schema
export interface ClassworkPhase {
  type: ClassworkType;
  assignmentRange: string; // e.g., "Surah Al-Fatiha, Ayah 1-7"
  details?: string;
  fromPage?: number;
  toPage?: number;
  fromAyah?: number;
  toAyah?: number;
  surahNumber?: number;
  surahName?: string;
  createdAt: Date | string;
}

// Homework Item Range Schema
export interface HomeworkRange {
  mode: HomeworkRangeMode;
  from: {
    surah: number;
    surahName: string;
    ayah: number;
  };
  to: {
    surah: number;
    surahName: string;
    ayah: number;
  };
  juzList?: number[]; // For juz_juz and multiple_juz modes
}

// Homework Item Source Schema
export interface HomeworkItemSource {
  suggestedFrom: "ticket" | "manual";
  ticketIds?: string[];
}

// Homework Item Attachment Schema
export interface HomeworkAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

// Homework Item Schema
export interface HomeworkItem {
  type: ClassworkType;
  range: HomeworkRange;
  source: HomeworkItemSource;
  content?: string;
  attachments?: HomeworkAttachment[];
}

// Qaidah Homework Schema
export interface QaidahHomework {
  book: "qaidah1" | "qaidah2";
  page: number;
  teachingDate: Date | string;
  qaidahMarkId?: Types.ObjectId;
  learningObjectiveId?: Types.ObjectId;
  letters?: string[];
  rules?: string[];
  learningObjectives?: string;
  links?: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
}

// Homework Submission Schema
export interface HomeworkSubmission {
  submitted: boolean;
  submittedAt?: Date | string;
  submittedBy?: string;
  submittedByName?: string;
  content?: string;
  link?: string;
  audioUrl?: string;
  attachments?: HomeworkAttachment[];
  feedback?: string;
  gradedBy?: string;
  gradedByName?: string;
  gradedAt?: Date | string;
  grade?: number;
  status?: HomeworkSubmissionStatus;
}

// Mushaf Mistake Schema
export interface AssignmentMushafMistake {
  id: string;
  type: MistakeType;
  page: number;
  surah: number;
  ayah: number;
  wordIndex: number;
  position: { x: number; y: number };
  note?: string;
  audioUrl?: string;
  workflowStep: ClassworkType;
  markedBy: string;
  markedByName: string;
  timestamp: Date | string;
}

// Main Assignment Document Interface
export interface AssignmentDocument extends mongoose.Document {
  // Student Information
  studentId: Types.ObjectId;
  studentName: string;

  // Assignment Creator
  assignedBy: string; // User ID
  assignedByName: string;
  assignedByRole: "admin" | "super_admin" | "teacher";

  // Source Tracking
  weeklyEvaluationId?: Types.ObjectId;
  fromTicketId?: Types.ObjectId;
  fromRecitationReviewId?: Types.ObjectId;

  // Status
  status: AssignmentStatus;
  completedAt?: Date;

  // Classwork Structure
  classwork: {
    sabq: ClassworkPhase[];
    sabqi: ClassworkPhase[];
    manzil: ClassworkPhase[];
  };

  // Homework Structure
  homework: {
    enabled: boolean;
    // Legacy fields (for backward compatibility)
    content?: string;
    link?: string;
    // PDF Support
    pdfId?: Types.ObjectId;
    pdfAnnotations?: Record<string, unknown>;
    // Structured homework items
    items?: HomeworkItem[];
    notes?: string;
    // Qaidah-specific homework
    qaidahHomework?: QaidahHomework;
    // Submission
    submission?: HomeworkSubmission;
  };

  // Additional Fields
  comment?: string;
  mushafMistakes?: AssignmentMushafMistake[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Sub-schemas
const classworkPhaseSchema = new Schema<ClassworkPhase>(
  {
    type: { type: String, enum: ["sabq", "sabqi", "manzil", "revision", "special_practice"], required: true },
    assignmentRange: { type: String, required: true, trim: true },
    details: { type: String, trim: true },
    fromPage: { type: Number },
    toPage: { type: Number },
    fromAyah: { type: Number },
    toAyah: { type: Number },
    surahNumber: { type: Number },
    surahName: { type: String, trim: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const homeworkRangeSchema = new Schema<HomeworkRange>(
  {
    mode: {
      type: String,
      enum: ["surah_ayah", "surah_surah", "juz_juz", "multiple_juz"],
      required: true,
    },
    from: {
      surah: { type: Number, required: true },
      surahName: { type: String, required: true, trim: true },
      ayah: { type: Number, required: true },
    },
    to: {
      surah: { type: Number, required: true },
      surahName: { type: String, required: true, trim: true },
      ayah: { type: Number, required: true },
    },
    juzList: { type: [Number] },
  },
  { _id: false },
);

const homeworkItemSourceSchema = new Schema<HomeworkItemSource>(
  {
    suggestedFrom: { type: String, enum: ["ticket", "manual"], required: true },
    ticketIds: { type: [String] },
  },
  { _id: false },
);

const homeworkAttachmentSchema = new Schema<HomeworkAttachment>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    type: { type: String, trim: true },
    size: { type: Number },
  },
  { _id: false },
);

const homeworkItemSchema = new Schema<HomeworkItem>(
  {
    type: { type: String, enum: ["sabq", "sabqi", "manzil", "revision", "special_practice"], required: true },
    range: { type: homeworkRangeSchema, required: true },
    source: { type: homeworkItemSourceSchema, required: true },
    content: { type: String, trim: true },
    attachments: { type: [homeworkAttachmentSchema], default: [] },
  },
  { _id: false },
);

const qaidahHomeworkSchema = new Schema<QaidahHomework>(
  {
    book: { type: String, enum: ["qaidah1", "qaidah2"], required: true },
    page: { type: Number, required: true },
    teachingDate: { type: Date, required: true },
    qaidahMarkId: { type: Schema.Types.ObjectId },
    learningObjectiveId: { type: Schema.Types.ObjectId },
    letters: { type: [String] },
    rules: { type: [String] },
    learningObjectives: { type: String, trim: true },
    links: {
      type: [
        {
          title: { type: String, required: true, trim: true },
          url: { type: String, required: true, trim: true },
          description: { type: String, trim: true },
        },
      ],
      default: [],
    },
  },
  { _id: false },
);

const homeworkSubmissionSchema = new Schema<HomeworkSubmission>(
  {
    submitted: { type: Boolean, default: false },
    submittedAt: { type: Date },
    submittedBy: { type: String },
    submittedByName: { type: String, trim: true },
    content: { type: String, trim: true },
    link: { type: String, trim: true },
    audioUrl: { type: String, trim: true },
    attachments: { type: [homeworkAttachmentSchema], default: [] },
    feedback: { type: String, trim: true },
    gradedBy: { type: String },
    gradedByName: { type: String, trim: true },
    gradedAt: { type: Date },
    grade: { type: Number },
    status: {
      type: String,
      enum: ["submitted", "graded", "returned"],
      default: "submitted",
    },
  },
  { _id: false },
);

const mushafMistakeSchema = new Schema<AssignmentMushafMistake>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "madd",
        "holding",
        "memory",
        "ikhfa",
        "tech",
        "other",
        "letter",
        "heavy_letter",
        "no_rounding_lips",
        "heavy_h",
        "light_l",
        "atkee",
      ],
      required: true,
    },
    page: { type: Number, required: true },
    surah: { type: Number, required: true },
    ayah: { type: Number, required: true },
    wordIndex: { type: Number, required: true },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    note: { type: String, trim: true },
    audioUrl: { type: String, trim: true },
    workflowStep: { type: String, enum: ["sabq", "sabqi", "manzil"], required: true },
    markedBy: { type: String, required: true },
    markedByName: { type: String, required: true, trim: true },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

// Main Assignment Schema
const assignmentSchema = new Schema<AssignmentDocument>(
  {
    // Student Information
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    studentName: { type: String, required: true, trim: true },

    // Assignment Creator
    assignedBy: { type: String, required: true, index: true }, // User ID
    assignedByName: { type: String, required: true, trim: true },
    assignedByRole: {
      type: String,
      enum: ["admin", "super_admin", "teacher"],
      required: true,
    },

    // Source Tracking
    weeklyEvaluationId: { type: Schema.Types.ObjectId, ref: "WeeklyEvaluation" },
    fromTicketId: { type: Schema.Types.ObjectId, ref: "Ticket" },
    fromRecitationReviewId: { type: Schema.Types.ObjectId, ref: "RecitationReview" },

    // Status
    status: {
      type: String,
      enum: ["active", "in_progress", "listened", "needs_revision", "completed", "archived"],
      default: "active",
    },
    completedAt: { type: Date },

    // Classwork Structure
    classwork: {
      sabq: { type: [classworkPhaseSchema], default: [] },
      sabqi: { type: [classworkPhaseSchema], default: [] },
      manzil: { type: [classworkPhaseSchema], default: [] },
    },

    // Homework Structure
    homework: {
      enabled: { type: Boolean, default: false },
      // Legacy fields
      content: { type: String, trim: true },
      link: { type: String, trim: true },
      // PDF Support
      pdfId: { type: Schema.Types.ObjectId, ref: "PDF" },
      pdfAnnotations: { type: Schema.Types.Mixed },
      // Structured homework items
      items: { type: [homeworkItemSchema], default: [] },
      notes: { type: String, trim: true },
      // Qaidah-specific homework
      qaidahHomework: { type: qaidahHomeworkSchema },
      // Submission
      submission: { type: homeworkSubmissionSchema },
    },

    // Additional Fields
    comment: { type: String, trim: true },
    mushafMistakes: { type: [mushafMistakeSchema], default: [] },
  },
  { timestamps: true },
);

// Indexes
assignmentSchema.index({ studentId: 1, createdAt: -1 });
assignmentSchema.index({ assignedBy: 1, createdAt: -1 });
assignmentSchema.index({ status: 1, createdAt: -1 });
assignmentSchema.index({ fromTicketId: 1 });

const AssignmentModel =
  (mongoose.models.Assignment as Model<AssignmentDocument>) ||
  mongoose.model<AssignmentDocument>("Assignment", assignmentSchema);

export default AssignmentModel;
