import mongoose, { Model, Schema, Types } from "mongoose";

export type SubmissionStatus = "pending" | "graded" | "late";

export interface SubmissionAttachment {
  filename: string;
  url: string;
  uploadedAt: Date;
}

export interface SubmissionDocument extends mongoose.Document {
  assignmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  content?: string;
  attachments: SubmissionAttachment[];
  submittedAt?: Date;
  grade?: number;
  feedback?: string;
  teacherNotes?: string;
  gradedAt?: Date;
  gradedBy?: Types.ObjectId;
  status: SubmissionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<SubmissionAttachment>(
  {
    filename: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const submissionSchema = new Schema<SubmissionDocument>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: "Assignment", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    content: { type: String, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    submittedAt: { type: Date, default: Date.now },
    grade: { type: Number, min: 0 },
    feedback: { type: String, trim: true },
    teacherNotes: { type: String, trim: true },
    gradedAt: { type: Date },
    gradedBy: { type: Schema.Types.ObjectId, ref: "Teacher" },
    status: { type: String, enum: ["pending", "graded", "late"], default: "pending" },
  },
  { timestamps: true },
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ studentId: 1, status: 1 });

const SubmissionModel =
  (mongoose.models.Submission as Model<SubmissionDocument>) ||
  mongoose.model<SubmissionDocument>("Submission", submissionSchema);

export default SubmissionModel;
