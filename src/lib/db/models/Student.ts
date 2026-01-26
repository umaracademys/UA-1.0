import mongoose, { Model, Schema, Types } from "mongoose";

import type { EntityStatus, ProgramType, RecitationType } from "@/types";

export interface StudentDocument extends mongoose.Document {
  userId: Types.ObjectId;
  parentName?: string;
  parentContact?: string;
  programType?: ProgramType;
  enrollmentDate?: Date;
  status: EntityStatus;
  assignedTeachers: Types.ObjectId[];
  schedule?: {
    days: string[];
    times: string[];
  };
  siblings: Types.ObjectId[];
  currentSabq?: string;
  currentSabqi?: string;
  currentManzil?: string;
  recitationHistory: Array<{
    date: Date;
    type: RecitationType;
    details: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<StudentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parentName: { type: String, trim: true },
    parentContact: { type: String, trim: true },
    programType: {
      type: String,
      enum: ["Full-Time HQ", "Part-Time HQ", "After School"],
    },
    enrollmentDate: { type: Date },
    status: { type: String, enum: ["active", "inactive", "pending"], default: "pending" },
    assignedTeachers: [{ type: Schema.Types.ObjectId, ref: "Teacher" }],
    schedule: {
      days: [{ type: String }],
      times: [{ type: String }],
    },
    siblings: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    currentSabq: { type: String },
    currentSabqi: { type: String },
    currentManzil: { type: String },
    recitationHistory: [
      {
        date: { type: Date, required: true },
        type: { type: String, enum: ["sabq", "sabqi", "manzil", "other"], required: true },
        details: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

const StudentModel =
  (mongoose.models.Student as Model<StudentDocument>) ||
  mongoose.model<StudentDocument>("Student", studentSchema);

export default StudentModel;
