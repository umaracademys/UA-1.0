import { randomUUID } from "crypto";
import mongoose, { Model, Schema, Types } from "mongoose";

export type WorkflowStep = "sabq" | "sabqi" | "manzil";
export type MistakeCategory = "tajweed" | "letter" | "stop" | "memory" | "other" | "atkees";

export interface PersonalMushafMistake {
  id: string;
  type: string;
  category: MistakeCategory;
  page?: number;
  surah?: number;
  ayah?: number;
  wordIndex?: number;
  letterIndex?: number;
  position?: { x: number; y: number };
  tajweedData?: {
    stretchCount?: number;
    holdRequired?: boolean;
    focusLetters?: string[];
    tajweedRule?: string;
    teacherNote?: string;
  };
  timeline: {
    firstMarkedAt: Date;
    lastMarkedAt: Date;
    repeatCount: number;
    resolved: boolean;
    resolvedAt?: Date;
  };
  note?: string;
  audioUrl?: string;
  ticketId?: Types.ObjectId;
  workflowStep: WorkflowStep;
  markedBy?: Types.ObjectId;
  markedByName?: string;
  timestamp?: Date;
}

export interface PersonalMushafDocument extends mongoose.Document {
  studentId: Types.ObjectId;
  studentName: string;
  mistakes: PersonalMushafMistake[];
  createdAt: Date;
  updatedAt: Date;
  addMistake(mistake: Omit<PersonalMushafMistake, "id" | "timeline">): Promise<void>;
  getMistakesByRecency(days: number): PersonalMushafMistake[];
  getMistakesByWorkflowStep(step: WorkflowStep): PersonalMushafMistake[];
  resolveMistake(mistakeId: string): Promise<void>;
}

const mistakeSchema = new Schema<PersonalMushafMistake>(
  {
    id: { type: String, default: () => randomUUID() },
    type: { type: String, required: true, trim: true },
    category: { type: String, enum: ["tajweed", "letter", "stop", "memory", "other"], required: true },
    page: { type: Number },
    surah: { type: Number },
    ayah: { type: Number },
    wordIndex: { type: Number },
    letterIndex: { type: Number },
    position: {
      x: { type: Number },
      y: { type: Number },
    },
    tajweedData: {
      stretchCount: { type: Number },
      holdRequired: { type: Boolean },
      focusLetters: [{ type: String }],
      tajweedRule: { type: String },
      teacherNote: { type: String },
    },
    timeline: {
      firstMarkedAt: { type: Date, default: Date.now },
      lastMarkedAt: { type: Date, default: Date.now },
      repeatCount: { type: Number, default: 1 },
      resolved: { type: Boolean, default: false },
      resolvedAt: { type: Date },
    },
    note: { type: String, trim: true },
    audioUrl: { type: String, trim: true },
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket" },
    workflowStep: { type: String, enum: ["sabq", "sabqi", "manzil"], required: true },
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
    markedByName: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const personalMushafSchema = new Schema<PersonalMushafDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
    studentName: { type: String, required: true, trim: true },
    mistakes: { type: [mistakeSchema], default: [] },
  },
  { timestamps: true },
);

personalMushafSchema.index({ studentId: 1 }, { unique: true });
personalMushafSchema.index({ "mistakes.workflowStep": 1, "mistakes.timeline.lastMarkedAt": -1 });
personalMushafSchema.index({ "mistakes.ticketId": 1 });

const getMistakeFingerprint = (mistake: PersonalMushafMistake) =>
  [
    mistake.type,
    mistake.category,
    mistake.page,
    mistake.surah,
    mistake.ayah,
    mistake.wordIndex,
    mistake.letterIndex,
    mistake.workflowStep,
  ].join("|");

personalMushafSchema.methods.addMistake = async function addMistake(
  mistakeData: Omit<PersonalMushafMistake, "id" | "timeline">,
) {
  const now = new Date();
  const fingerprint = getMistakeFingerprint(mistakeData as PersonalMushafMistake);

  const existing = this.mistakes.find(
    (mistake: PersonalMushafMistake) => getMistakeFingerprint(mistake) === fingerprint,
  );

  if (existing) {
    existing.timeline.repeatCount += 1;
    existing.timeline.lastMarkedAt = now;
    existing.timestamp = now;
    existing.resolved = false;
    existing.timeline.resolved = false;
    existing.timeline.resolvedAt = undefined;
  } else {
    this.mistakes.push({
      ...mistakeData,
      id: randomUUID(),
      timeline: {
        firstMarkedAt: now,
        lastMarkedAt: now,
        repeatCount: 1,
        resolved: false,
      },
      timestamp: now,
    });
  }

  await this.save();
};

personalMushafSchema.methods.getMistakesByRecency = function getMistakesByRecency(days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return this.mistakes.filter(
    (mistake: PersonalMushafMistake) => mistake.timeline.lastMarkedAt.getTime() >= cutoff,
  );
};

personalMushafSchema.methods.getMistakesByWorkflowStep = function getMistakesByWorkflowStep(
  step: WorkflowStep,
) {
  return this.mistakes.filter((mistake: PersonalMushafMistake) => mistake.workflowStep === step);
};

personalMushafSchema.methods.resolveMistake = async function resolveMistake(mistakeId: string) {
  const mistake = this.mistakes.find(
    (entry: PersonalMushafMistake) => entry.id === mistakeId,
  );

  if (mistake) {
    mistake.timeline.resolved = true;
    mistake.timeline.resolvedAt = new Date();
  }

  await this.save();
};

const PersonalMushafModel =
  (mongoose.models.PersonalMushaf as Model<PersonalMushafDocument>) ||
  mongoose.model<PersonalMushafDocument>("PersonalMushaf", personalMushafSchema);

export default PersonalMushafModel;
