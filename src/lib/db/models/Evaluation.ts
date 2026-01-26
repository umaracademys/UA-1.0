import mongoose, { Model, Schema, Types } from "mongoose";

export type EvaluationStatus = "draft" | "submitted" | "approved" | "rejected";

export interface EvaluationCategory {
  name: string;
  rating: number;
  comments?: string;
}

export interface EvaluationDocument extends mongoose.Document {
  studentId: Types.ObjectId;
  teacherId: Types.ObjectId;
  weekStartDate: Date;
  categories: EvaluationCategory[];
  overallComments?: string;
  status: EvaluationStatus;
  submittedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewNotes?: string;
  reviewedAt?: Date;
  homeworkAssigned?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<EvaluationCategory>(
  {
    name: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comments: { type: String, trim: true },
  },
  { _id: false },
);

const evaluationSchema = new Schema<EvaluationDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    weekStartDate: { type: Date, required: true },
    categories: { type: [categorySchema], default: [] },
    overallComments: { type: String, trim: true },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
    },
    submittedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewNotes: { type: String, trim: true },
    reviewedAt: { type: Date },
    homeworkAssigned: { type: Schema.Types.ObjectId, ref: "Assignment" },
  },
  { timestamps: true },
);

evaluationSchema.index({ studentId: 1, weekStartDate: -1 });
evaluationSchema.index({ teacherId: 1, weekStartDate: -1 });

const EvaluationModel =
  (mongoose.models.Evaluation as Model<EvaluationDocument>) ||
  mongoose.model<EvaluationDocument>("Evaluation", evaluationSchema);

export default EvaluationModel;
