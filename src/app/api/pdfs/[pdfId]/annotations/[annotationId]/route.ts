import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import PDFModel from "@/lib/db/models/PDF";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { Types } from "mongoose";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { pdfId: string; annotationId: string } },
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

    const annotation = pdf.annotations.find(
      (ann: any) => ann._id.toString() === params.annotationId,
    );

    if (!annotation) {
      return NextResponse.json({ error: "Annotation not found" }, { status: 404 });
    }

    // Check if user owns the annotation or has permission
    const isOwner = annotation.userId.toString() === user._id.toString();
    const { hasPermission } = await import("@/lib/utils/permissions");
    const hasAnnotatePermission = hasPermission(user.role, "pdf.annotate");

    if (!isOwner && !hasAnnotatePermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { content, position, color } = body;

    // Update annotation
    if (content !== undefined) annotation.content = content;
    if (position !== undefined) {
      annotation.position = {
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
      };
    }
    if (color !== undefined) annotation.color = color;

    await pdf.save();

    return NextResponse.json({
      success: true,
      message: "Annotation updated successfully",
      annotation,
    });
  } catch (error) {
    console.error("Error updating annotation:", error);
    return NextResponse.json(
      { error: "Failed to update annotation", message: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { pdfId: string; annotationId: string } },
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

    const annotation = pdf.annotations.find(
      (ann: any) => ann._id.toString() === params.annotationId,
    );

    if (!annotation) {
      return NextResponse.json({ error: "Annotation not found" }, { status: 404 });
    }

    // Check if user owns the annotation or has permission
    const isOwner = annotation.userId.toString() === user._id.toString();
    const { hasPermission } = await import("@/lib/utils/permissions");
    const hasAnnotatePermission = hasPermission(user.role, "pdf.annotate");

    if (!isOwner && !hasAnnotatePermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Remove annotation
    pdf.annotations = pdf.annotations.filter(
      (ann: any) => ann._id.toString() !== params.annotationId,
    );

    await pdf.save();

    return NextResponse.json({
      success: true,
      message: "Annotation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting annotation:", error);
    return NextResponse.json(
      { error: "Failed to delete annotation", message: (error as Error).message },
      { status: 500 },
    );
  }
}
