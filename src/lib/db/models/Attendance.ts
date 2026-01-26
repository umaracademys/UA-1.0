import mongoose, { Model, Schema, Types } from "mongoose";

export type AttendanceUserType = "teacher" | "student";
export type AttendanceShift = "morning" | "afternoon" | "evening";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceDocument extends mongoose.Document {
  userId: Types.ObjectId;
  userType: AttendanceUserType;
  date: Date;
  shift: AttendanceShift;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: AttendanceStatus;
  notes?: string;
  markedBy?: Types.ObjectId;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<AttendanceDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userType: { type: String, enum: ["teacher", "student"], required: true },
    date: { type: Date, required: true },
    shift: { type: String, enum: ["morning", "afternoon", "evening"], required: true },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      default: "present",
    },
    notes: { type: String, trim: true },
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isPaid: { type: Boolean, default: false },
  },
  { timestamps: true },
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ userType: 1, date: -1 });

const AttendanceModel =
  (mongoose.models.Attendance as Model<AttendanceDocument>) ||
  mongoose.model<AttendanceDocument>("Attendance", attendanceSchema);

export default AttendanceModel;
