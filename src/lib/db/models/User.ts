import bcrypt from "bcryptjs";
import mongoose, { Model, Schema, Types } from "mongoose";

import type { UserRole } from "@/types";

export interface UserDocument extends mongoose.Document {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  contactNumber?: string;
  isActive: boolean;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  lastLogin?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
  incrementFailedAttempts(): Promise<void>;
  resetFailedAttempts(): Promise<void>;
  isAccountLocked(): boolean;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["super_admin", "admin", "teacher", "student"],
      default: "student",
    },
    fullName: { type: String, required: true, trim: true },
    contactNumber: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    accountLockedUntil: { type: Date },
    lastLogin: { type: Date },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementFailedAttempts = async function incrementFailedAttempts() {
  this.failedLoginAttempts += 1;

  const lockoutThreshold = Number(process.env.LOCKOUT_THRESHOLD ?? "5");
  const lockoutDurationMinutes = Number(process.env.LOCKOUT_DURATION ?? "30");

  if (this.failedLoginAttempts >= lockoutThreshold) {
    this.accountLockedUntil = new Date(Date.now() + lockoutDurationMinutes * 60 * 1000);
  }

  await this.save();
};

userSchema.methods.resetFailedAttempts = async function resetFailedAttempts() {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = undefined;
  await this.save({ validateBeforeSave: true });
};

userSchema.methods.isAccountLocked = function isAccountLocked() {
  if (!this.accountLockedUntil) {
    return false;
  }

  return this.accountLockedUntil.getTime() > Date.now();
};

userSchema.pre("save", async function hashPassword() {
  // Only hash password if it's been modified
  if (!this.isModified("password")) {
    return;
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? "12");
  this.password = await bcrypt.hash(this.password, saltRounds);
  this.passwordChangedAt = new Date();
});

const UserModel =
  (mongoose.models.User as Model<UserDocument>) ||
  mongoose.model<UserDocument>("User", userSchema);

export default UserModel;
