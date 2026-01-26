import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AssignmentModel from "@/lib/db/models/Assignment";
import PDFModel from "@/lib/db/models/PDF";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

// GET /api/assignments/:id/pdf-annotations - Get PDF annotations for assignment
export async function GET(
  request: Request,
  context: { params: { assignmentId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { assignmentId } = context.params;
    if (!Types.ObjectId.isValid(assignmentId)) {
      return NextResponse.json({ success: false, message: "Invalid assignment ID." }, { status: 400 });
    }

    const assignment = await AssignmentModel.findById(assignmentId).lean();
    if (!assignment) {
      return NextResponse.json({ success: false, message: "Assignment not found." }, { status: 404 });
    }

    if (!assignment.homework?.pdfId) {
      return NextResponse.json({ success: false, message: "No PDF attached to this assignment." }, { status: 404 });
    }

    const pdf = await PDFModel.findById(assignment.homework.pdfId).lean();
    if (!pdf) {
      return NextResponse.json({ success: false, message: "PDF not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      annotations: pdf.annotations || [],
      pdf: {
        _id: pdf._id,
        title: pdf.title,
        filename: pdf.filename,
      },
    });
  } catch (error) {
    console.error("Error fetching PDF annotations:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load PDF annotations." },
      { status: 500 },
    );
  }
}

// POST /api/assignments/:id/pdf-annotations - Add PDF annotation for assignment
export async function POST(
  request: Request,
  context: { params: { assignmentId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "pdf.annotate", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { assignmentId } = context.params;
    if (!Types.ObjectId.isValid(assignmentId)) {
      return NextResponse.json({ success: false, message: "Invalid assignment ID." }, { status: 400 });
    }

    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json({ success: false, message: "Assignment not found." }, { status: 404 });
    }

    if (!assignment.homework?.pdfId) {
      return NextResponse.json({ success: false, message: "No PDF attached to this assignment." }, { status: 404 });
    }

    const pdf = await PDFModel.findById(assignment.homework.pdfId);
    if (!pdf) {
      return NextResponse.json({ success: false, message: "PDF not found." }, { status: 404 });
    }

    const body = await request.json();
    const { page, type, content, position, color } = body;

    if (!page || !type || !content || !position) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: page, type, content, position." },
        { status: 400 },
      );
    }

    if (!["text", "highlight", "drawing"].includes(type)) {
      return NextResponse.json({ success: false, message: "Invalid annotation type." }, { status: 400 });
    }

    if (page < 1 || page > pdf.pages) {
      return NextResponse.json({ success: false, message: "Invalid page number." }, { status: 400 });
    }

    const user = await import("@/lib/db/models/User").then((m) => m.default.findById(decoded.userId));
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Add annotation to PDF
    const annotation = {
      _id: new Types.ObjectId(),
      userId: user._id,
      username: user.fullName || user.email,
      page: parseInt(page),
      type,
      content,
      position: {
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
      },
      color: color || "#FFEB3B",
      createdAt: new Date(),
    };

    pdf.annotations.push(annotation);
    await pdf.save();

    // Update assignment's pdfAnnotations reference (optional - for quick access)
    if (!assignment.homework.pdfAnnotations) {
      assignment.homework.pdfAnnotations = {};
    }
    assignment.markModified("homework.pdfAnnotations");
    await assignment.save();

    return NextResponse.json(
      {
        success: true,
        message: "Annotation added successfully.",
        annotation,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error adding PDF annotation:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to add annotation." },
      { status: 500 },
    );
  }
}
