import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import PDFModel from "@/lib/db/models/PDF";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
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

    const pdf = await PDFModel.findById(params.pdfId);

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = searchParams.get("page");

    let annotations = pdf.annotations || [];

    // Filter by page if specified
    if (page) {
      const pageNum = parseInt(page);
      annotations = annotations.filter((ann) => ann.page === pageNum);
    }

    return NextResponse.json({
      success: true,
      annotations,
    });
  } catch (error) {
    console.error("Error fetching annotations:", error);
    return NextResponse.json(
      { error: "Failed to fetch annotations", message: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(
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
    if (!hasPermission(user.role, "pdf.annotate")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdf = await PDFModel.findById(params.pdfId);

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const body = await req.json();
    const { page, type, content, position, color } = body;

    if (!page || !type || !content || !position) {
      return NextResponse.json(
        { error: "Missing required fields: page, type, content, position" },
        { status: 400 },
      );
    }

    if (!["text", "highlight", "drawing"].includes(type)) {
      return NextResponse.json({ error: "Invalid annotation type" }, { status: 400 });
    }

    // Validate page number
    if (page < 1 || page > pdf.pages) {
      return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
    }

    // Create annotation
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

    return NextResponse.json(
      {
        success: true,
        message: "Annotation added successfully",
        annotation,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error adding annotation:", error);
    return NextResponse.json(
      { error: "Failed to add annotation", message: (error as Error).message },
      { status: 500 },
    );
  }
}
