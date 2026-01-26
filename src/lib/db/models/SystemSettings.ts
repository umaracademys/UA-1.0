import mongoose, { Model, Schema } from "mongoose";

export interface SystemSettingsDocument extends mongoose.Document {
  key: string;
  value: any;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const systemSettingsSchema = new Schema<SystemSettingsDocument>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const SystemSettingsModel =
  (mongoose.models.SystemSettings as Model<SystemSettingsDocument>) ||
  mongoose.model<SystemSettingsDocument>("SystemSettings", systemSettingsSchema);

export default SystemSettingsModel;
