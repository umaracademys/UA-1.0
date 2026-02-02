import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/utils/jwt";
import { saveFile } from "@/lib/utils/fileUpload";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload - Upload file for homework attachments
 * Accepts: multipart/form-data with "file" field
 * Allowed: PDF, JPEG, PNG, audio (from fileUpload ALLOWED_FILE_TYPES)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Use form field 'file'." },
        { status: 400 }
      );
    }

    const result = await saveFile(file, "homework");

    return NextResponse.json({
      success: true,
      url: result.url,
      filename: result.filename,
      uploadedAt: result.uploadedAt,
    });
  } catch (error) {
    console.error("File upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
