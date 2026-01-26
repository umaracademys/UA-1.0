import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import PDFModel from "@/lib/db/models/PDF";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { readFile } from "fs/promises";
import path from "path";

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

    // Check access for students
    if (user.role === "student") {
      const StudentModel = (await import("@/lib/db/models/Student")).default;
      const student = await StudentModel.findOne({ userId: user._id });
      if (student) {
        const isAssigned =
          pdf.assignedTo.some(
            (id: any) => id.toString() === student._id.toString(),
          ) || pdf.assignedTo.length === 0;
        if (!isAssigned) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      }
    }

    // Read file
    const filePath = path.join(process.cwd(), "public", pdf.filePath);
    const fileBuffer = await readFile(filePath);

    // Increment download count
    await PDFModel.findByIdAndUpdate(params.pdfId, { $inc: { downloads: 1 } });

    // Return file
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.originalFilename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error downloading PDF:", error);
    return NextResponse.json(
      { error: "Failed to download PDF", message: (error as Error).message },
      { status: 500 },
    );
  }
}
