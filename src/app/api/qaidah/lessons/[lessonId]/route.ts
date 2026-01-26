import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import QaidahLessonModel from "@/lib/db/models/QaidahLesson";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";
import { Types } from "mongoose";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    const { lessonId } = await params;

    const lesson = await QaidahLessonModel.findById(lessonId).lean();

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Check access for students
    if (decoded.role === "student" && !lesson.isActive) {
      return NextResponse.json({ error: "Lesson not available" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      lesson,
    });
  } catch (error) {
    console.error("Error fetching Qaidah lesson:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson", message: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    // Check permission
    if (!checkAPIPermission(decoded.role, "qaidah.manage", decoded.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { lessonId } = await params;
    const body = await req.json();

    const lesson = await QaidahLessonModel.findById(lessonId);

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Update fields
    Object.keys(body).forEach((key) => {
      if (key !== "_id" && key !== "createdAt" && key !== "updatedAt") {
        (lesson as any)[key] = body[key];
      }
    });

    await lesson.save();

    return NextResponse.json({
      success: true,
      message: "Lesson updated successfully",
      lesson,
    });
  } catch (error) {
    console.error("Error updating Qaidah lesson:", error);
    return NextResponse.json(
      { error: "Failed to update lesson", message: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    await connectToDatabase();

    // Check permission
    if (!checkAPIPermission(decoded.role, "qaidah.manage", decoded.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { lessonId } = await params;

    const lesson = await QaidahLessonModel.findByIdAndDelete(lessonId);

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Lesson deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Qaidah lesson:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson", message: (error as Error).message },
      { status: 500 },
    );
  }
}
