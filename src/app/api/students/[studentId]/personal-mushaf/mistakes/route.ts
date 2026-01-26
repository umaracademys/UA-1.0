import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import PersonalMushafModel from "@/lib/db/models/PersonalMushaf";
import { verifyToken } from "@/lib/utils/jwt";
import { addMistakeToPersonalMushaf, type MistakeData } from "@/lib/utils/personalMushaf";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function POST(
  request: Request,
  context: { params: { studentId: string } },
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (decoded.role !== "teacher" && decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { studentId } = context.params;
    if (!Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, message: "Invalid student ID." }, { status: 400 });
    }

    // Check teacher access
    if (decoded.role === "teacher") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher || !teacher.assignedStudents.some((id) => id.toString() === studentId)) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    }

    const body = (await request.json()) as {
      mistake: MistakeData;
      ticketId?: string;
    };

    const { mistake, ticketId } = body;

    if (!mistake.type || !mistake.category || !mistake.workflowStep) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 },
      );
    }

    // Get teacher info if applicable
    let teacherId: Types.ObjectId | undefined;
    let teacherName: string | undefined;

    if (decoded.role === "teacher") {
      const user = await UserModel.findById(decoded.userId);
      if (user) {
        teacherId = user._id;
        teacherName = user.fullName;
      }
    }

    const mistakeData: MistakeData = {
      ...mistake,
      markedBy: teacherId,
      markedByName: teacherName,
    };

    // Add mistake to Personal Mushaf
    const addedMistake = await addMistakeToPersonalMushaf(
      studentId,
      mistakeData,
      ticketId ? new Types.ObjectId(ticketId) : undefined,
      teacherId,
    );

    // Get updated Personal Mushaf
    const personalMushaf = await PersonalMushafModel.findOne({
      studentId: new Types.ObjectId(studentId),
    });

    return NextResponse.json({
      success: true,
      message: "Mistake added successfully.",
      mistake: addedMistake,
      personalMushaf,
    });
  } catch (error) {
    console.error("Error adding mistake:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to add mistake." },
      { status: 500 },
    );
  }
}
