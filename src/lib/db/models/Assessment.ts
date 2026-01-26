import mongoose, { Model, Schema, Types } from "mongoose";

export interface AssessmentDocument extends mongoose.Document {
  studentId: Types.ObjectId;
  teacherId: Types.ObjectId;
  assessmentType: string;
  date: Date;
  score: number;
  maxScore: number;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const assessmentSchema = new Schema<AssessmentDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    assessmentType: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 1 },
    comments: { type: String, trim: true },
  },
  { timestamps: true },
);

assessmentSchema.index({ studentId: 1, date: -1 });
assessmentSchema.index({ teacherId: 1, date: -1 });

const AssessmentModel =
  (mongoose.models.Assessment as Model<AssessmentDocument>) ||
  mongoose.model<AssessmentDocument>("Assessment", assessmentSchema);

export default AssessmentModel;
