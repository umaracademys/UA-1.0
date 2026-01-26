import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import PDFModel from "@/lib/db/models/PDF";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { deletePDFFile } from "@/lib/utils/pdfProcessor";
import { Types } from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: { pdfId: string } },
) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pdf = await PDFModel.findById(params.pdfId)
      .populate("uploadedBy", "fullName email")
      .populate("assignedTo", "userId")
      .lean();

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Check access for students
    if (user.role === "student") {
      const StudentModel = (await import("@/lib/db/models/Student")).default;
      const student = await StudentModel.findOne({ userId: user._id });
      if (student) {
        const isAssigned =
          pdf.assignedTo.some(
            (id: any) => id._id?.toString() === student._id.toString(),
          ) || pdf.assignedTo.length === 0;
        if (!isAssigned) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      }
    }

    // Increment view count
    await PDFModel.findByIdAndUpdate(params.pdfId, { $inc: { views: 1 } });

    return NextResponse.json({
      success: true,
      pdf: {
        ...pdf,
        views: (pdf.views || 0) + 1,
      },
    });
  } catch (error) {
    console.error("Error fetching PDF:", error);
    return NextResponse.json(
      { error: "Failed to fetch PDF", message: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { pdfId: string } },
) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pdf = await PDFModel.findById(params.pdfId);

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Check permission or ownership
    const isOwner = pdf.uploadedBy.toString() === user._id.toString();
    const { hasPermission } = await import("@/lib/utils/permissions");
    const hasManagePermission = hasPermission(user.role, "pdf.manage_library");

    if (!isOwner && !hasManagePermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, category, description, assignedTo } = body;

    // Update fields
    if (title) pdf.title = title;
    if (category) pdf.category = category;
    if (description !== undefined) pdf.description = description;
    if (assignedTo !== undefined) {
      pdf.assignedTo = Array.isArray(assignedTo)
        ? assignedTo.map((id: string) => new Types.ObjectId(id))
        : [];
    }

    await pdf.save();

    const populatedPdf = await PDFModel.findById(pdf._id)
      .populate("uploadedBy", "fullName email")
      .populate("assignedTo", "userId")
      .lean();

    return NextResponse.json({
      success: true,
      message: "PDF updated successfully",
      pdf: populatedPdf,
    });
  } catch (error) {
    console.error("Error updating PDF:", error);
    return NextResponse.json(
      { error: "Failed to update PDF", message: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { pdfId: string } },
) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const { hasPermission } = await import("@/lib/utils/permissions");
    if (!hasPermission(user.role, "pdf.manage_library")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdf = await PDFModel.findById(params.pdfId);

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Delete file
    try {
      await deletePDFFile(pdf.filePath);
    } catch (error) {
      console.error("Failed to delete PDF file:", error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete database record
    await PDFModel.findByIdAndDelete(params.pdfId);

    return NextResponse.json({
      success: true,
      message: "PDF deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting PDF:", error);
    return NextResponse.json(
      { error: "Failed to delete PDF", message: (error as Error).message },
      { status: 500 },
    );
  }
}
