import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import PDFModel from "@/lib/db/models/PDF";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { checkPermission } from "@/lib/middleware/checkPermission";
import { validatePDFFile, extractPDFMetadata, savePDFFile } from "@/lib/utils/pdfProcessor";
import { createNotification } from "@/lib/utils/notifications";
import { Types } from "mongoose";

export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const uploadedBy = searchParams.get("uploadedBy");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const query: any = {};

    // Role-based filtering
    if (user.role === "student") {
      // Students only see PDFs assigned to them
      const StudentModel = (await import("@/lib/db/models/Student")).default;
      const student = await StudentModel.findOne({ userId: user._id });
      if (student) {
        query.$or = [
          { assignedTo: student._id },
          { assignedTo: { $size: 0 } }, // Public PDFs
        ];
      } else {
        query.assignedTo = { $size: 0 }; // Only public PDFs
      }
    }

    // Filters
    if (category) {
      query.category = category;
    }

    if (uploadedBy) {
      query.uploadedBy = new Types.ObjectId(uploadedBy);
    }

    if (dateFrom || dateTo) {
      query.createdAt = {} as { $gte?: Date; $lte?: Date };
      if (dateFrom) {
        (query.createdAt as { $gte?: Date; $lte?: Date }).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        (query.createdAt as { $gte?: Date; $lte?: Date }).$lte = endDate;
      }
    }

    if (search) {
      query.$text = { $search: search };
    }

    const [pdfs, total] = await Promise.all([
      PDFModel.find(query)
        .populate("uploadedBy", "fullName email")
        .populate("assignedTo", "userId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PDFModel.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      pdfs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching PDFs:", error);
    return NextResponse.json(
      { error: "Failed to fetch PDFs", message: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
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
    if (!hasPermission(user.role, "pdf.upload")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const assignedTo = formData.get("assignedTo") as string;

    if (!file || !title || !category) {
      return NextResponse.json(
        { error: "Missing required fields: file, title, category" },
        { status: 400 },
      );
    }

    // Validate PDF file
    const validation = validatePDFFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Extract metadata
    const metadata = await extractPDFMetadata(file);

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filename = `${timestamp}_${sanitizedTitle}.pdf`;

    // Save file
    const { filePath, fileSize } = await savePDFFile(file, filename);

    // Parse assignedTo if provided
    let assignedToArray: Types.ObjectId[] = [];
    if (assignedTo) {
      try {
        const assignedIds = JSON.parse(assignedTo);
        assignedToArray = Array.isArray(assignedIds)
          ? assignedIds.map((id: string) => new Types.ObjectId(id))
          : [];
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Create PDF document
    const pdf = new PDFModel({
      title,
      filename,
      originalFilename: file.name,
      filePath,
      fileSize,
      category,
      description: description || "",
      uploadedBy: user._id,
      assignedTo: assignedToArray,
      pages: metadata.pages,
      annotations: [],
      views: 0,
      downloads: 0,
    });

    await pdf.save();

    // Create notifications for assigned students
    if (assignedToArray.length > 0) {
      for (const studentId of assignedToArray) {
        const StudentModel = (await import("@/lib/db/models/Student")).default;
        const student = await StudentModel.findById(studentId).populate("userId");
        if (student && student.userId) {
          await createNotification({
            userId: (student.userId as any)._id.toString(),
            type: "message",
            title: "New PDF Assigned",
            message: `A new PDF "${title}" has been assigned to you`,
            relatedEntity: {
              type: "pdf",
              id: pdf._id.toString(),
            },
          });
        }
      }
    }

    const populatedPdf = await PDFModel.findById(pdf._id)
      .populate("uploadedBy", "fullName email")
      .populate("assignedTo", "userId")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "PDF uploaded successfully",
        pdf: populatedPdf,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return NextResponse.json(
      { error: "Failed to upload PDF", message: (error as Error).message },
      { status: 500 },
    );
  }
}
