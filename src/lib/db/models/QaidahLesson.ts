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

export interface IQaidahLesson extends Document {
  lessonNumber: number;
  title: string;
  arabicTitle: string;
  category:
    | "Letters"
    | "Harakat"
    | "Tanween"
    | "Sukoon"
    | "Shaddah"
    | "Madd"
    | "Advanced";
  content: string;
  examples: string[];
  audioUrl: string;
  videoUrl?: string;
  practiceWords: string[];
  objectives: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QaidahLessonSchema = new Schema<IQaidahLesson>(
  {
    lessonNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    arabicTitle: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Letters", "Harakat", "Tanween", "Sukoon", "Shaddah", "Madd", "Advanced"],
    },
    content: {
      type: String,
      required: true,
    },
    examples: [
      {
        type: String,
        trim: true,
      },
    ],
    audioUrl: {
      type: String,
      required: true,
    },
    videoUrl: {
      type: String,
    },
    practiceWords: [
      {
        type: String,
        trim: true,
      },
    ],
    objectives: [
      {
        type: String,
        trim: true,
      },
    ],
    difficulty: {
      type: String,
      required: true,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
QaidahLessonSchema.index({ lessonNumber: 1 });
QaidahLessonSchema.index({ category: 1 });
QaidahLessonSchema.index({ difficulty: 1 });
QaidahLessonSchema.index({ order: 1 });
QaidahLessonSchema.index({ isActive: 1 });

const QaidahLessonModel: Model<IQaidahLesson> =
  mongoose.models.QaidahLesson || mongoose.model<IQaidahLesson>("QaidahLesson", QaidahLessonSchema);

export default QaidahLessonModel;
