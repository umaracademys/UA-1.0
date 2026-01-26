import mongoose, { Schema, Document, Model } from "mongoose";
import { Types } from "mongoose";

export interface IAnnotation {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  username: string;
  page: number;
  type: "text" | "highlight" | "drawing";
  content: any;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  color?: string;
  createdAt: Date;
}

export interface IPDF extends Document {
  title: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  category: string;
  description?: string;
  uploadedBy: Types.ObjectId;
  assignedTo: Types.ObjectId[];
  pages: number;
  annotations: IAnnotation[];
  views: number;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnnotationSchema = new Schema<IAnnotation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    page: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      enum: ["text", "highlight", "drawing"],
      required: true,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number },
      height: { type: Number },
    },
    color: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const PDFSchema = new Schema<IPDF>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Qaidah",
        "Mushaf",
        "Study Material",
        "Assignment",
        "Reference",
        "Other",
      ],
      default: "Other",
    },
    description: {
      type: String,
      trim: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
    pages: {
      type: Number,
      required: true,
      min: 1,
    },
    annotations: [AnnotationSchema],
    views: {
      type: Number,
      default: 0,
    },
    downloads: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
PDFSchema.index({ uploadedBy: 1 });
PDFSchema.index({ category: 1 });
PDFSchema.index({ assignedTo: 1 });
PDFSchema.index({ createdAt: -1 });
PDFSchema.index({ title: "text", description: "text" });

// Methods
PDFSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

PDFSchema.methods.incrementDownloads = function () {
  this.downloads += 1;
  return this.save();
};

PDFSchema.methods.addAnnotation = function (annotation: IAnnotation) {
  this.annotations.push(annotation);
  return this.save();
};

PDFSchema.methods.removeAnnotation = function (annotationId: string) {
  this.annotations = this.annotations.filter(
    (ann: IAnnotation) => ann._id?.toString() !== annotationId,
  );
  return this.save();
};

const PDFModel: Model<IPDF> =
  mongoose.models.PDF || mongoose.model<IPDF>("PDF", PDFSchema);

export default PDFModel;
