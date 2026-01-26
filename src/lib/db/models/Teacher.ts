import mongoose, { Model, Schema, Types } from "mongoose";

import type { EntityStatus } from "@/types";

export interface TeacherDocument extends mongoose.Document {
  userId: Types.ObjectId;
  assignedStudents: Types.ObjectId[];
  specialization?: string;
  joinDate?: Date;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

const teacherSchema = new Schema<TeacherDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedStudents: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    specialization: { type: String, trim: true },
    joinDate: { type: Date },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

const TeacherModel =
  (mongoose.models.Teacher as Model<TeacherDocument>) ||
  mongoose.model<TeacherDocument>("Teacher", teacherSchema);

export default TeacherModel;
