import mongoose, { Schema, Document, Model } from "mongoose";
import { Types } from "mongoose";

export interface ICompletedLesson {
  lessonId: Types.ObjectId;
  lessonNumber: number;
  completedAt: Date;
  score: number; // 0-100
  attempts: number;
  teacherFeedback?: string;
  approved: boolean;
}

export interface IStudentQaidahProgress extends Document {
  studentId: Types.ObjectId;
  currentLesson: number;
  completedLessons: ICompletedLesson[];
  totalScore: number;
  lastAccessedAt: Date;
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CompletedLessonSchema = new Schema<ICompletedLesson>(
  {
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: "QaidahLesson",
      required: true,
    },
    lessonNumber: {
      type: Number,
      required: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    attempts: {
      type: Number,
      default: 1,
      min: 1,
    },
    teacherFeedback: {
      type: String,
      trim: true,
    },
    approved: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const StudentQaidahProgressSchema = new Schema<IStudentQaidahProgress>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
    },
    currentLesson: {
      type: Number,
      required: true,
      default: 1,
    },
    completedLessons: [CompletedLessonSchema],
    totalScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
StudentQaidahProgressSchema.index({ studentId: 1 });
StudentQaidahProgressSchema.index({ currentLesson: 1 });

// Methods
StudentQaidahProgressSchema.methods.completeLesson = function (
  lessonId: Types.ObjectId,
  lessonNumber: number,
  score: number,
  approved: boolean = false,
  teacherFeedback?: string,
) {
  // Check if lesson already completed
  const existingIndex = this.completedLessons.findIndex(
    (lesson: ICompletedLesson) => lesson.lessonId.toString() === lessonId.toString(),
  );

  if (existingIndex >= 0) {
    // Update existing completion
    this.completedLessons[existingIndex].score = score;
    this.completedLessons[existingIndex].attempts += 1;
    this.completedLessons[existingIndex].completedAt = new Date();
    this.completedLessons[existingIndex].approved = approved;
    if (teacherFeedback) {
      this.completedLessons[existingIndex].teacherFeedback = teacherFeedback;
    }
  } else {
    // Add new completion
    this.completedLessons.push({
      lessonId,
      lessonNumber,
      completedAt: new Date(),
      score,
      attempts: 1,
      teacherFeedback,
      approved,
    });
  }

  // Update total score
  const totalScore =
    this.completedLessons.reduce((sum: number, lesson: ICompletedLesson) => sum + lesson.score, 0) /
    this.completedLessons.length;
  this.totalScore = Math.round(totalScore);

  // Update current lesson if approved
  if (approved && lessonNumber >= this.currentLesson) {
    this.currentLesson = lessonNumber + 1;
  }

  this.lastAccessedAt = new Date();
  return this.save();
};

const StudentQaidahProgressModel: Model<IStudentQaidahProgress> =
  mongoose.models.StudentQaidahProgress ||
  mongoose.model<IStudentQaidahProgress>("StudentQaidahProgress", StudentQaidahProgressSchema);

export default StudentQaidahProgressModel;
