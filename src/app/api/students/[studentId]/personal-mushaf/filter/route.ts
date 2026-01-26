import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import PersonalMushafModel from "@/lib/db/models/PersonalMushaf";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";
import { filterMistakesByRecency, calculateMistakeStatistics } from "@/lib/utils/personalMushaf";
import type { WorkflowStep } from "@/lib/db/models/PersonalMushaf";

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
    await connectToDatabase();

    const { studentId } = context.params;
    if (!Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ success: false, message: "Invalid student ID." }, { status: 400 });
    }

    const student = await StudentModel.findById(studentId);
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    // Check access permissions
    if (decoded.role === "student") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      const studentProfile = await StudentModel.findOne({ userId: user._id });
      if (!studentProfile || studentProfile._id.toString() !== studentId) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role === "teacher") {
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      const teacher = await TeacherModel.findOne({ userId: user._id });
      if (!teacher || !teacher.assignedStudents.some((id) => id.toString() === studentId)) {
        return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
      }
    } else if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as {
      workflowStep?: WorkflowStep | "all";
      page?: number;
      date?: string;
      recency?: "today" | "recent" | "historical";
      type?: string;
      category?: string;
    };

    // Get Personal Mushaf
    const personalMushaf = await PersonalMushafModel.findOne({
      studentId: new Types.ObjectId(studentId),
    });

    if (!personalMushaf || !personalMushaf.mistakes || personalMushaf.mistakes.length === 0) {
      return NextResponse.json({
        success: true,
        mistakes: [],
        statistics: {
          total: 0,
          byWorkflowStep: {},
          byCategory: {},
          byType: {},
          resolved: 0,
          unresolved: 0,
          repeatOffenders: 0,
        },
      });
    }

    let filteredMistakes = [...personalMushaf.mistakes];

    // Apply filters
    if (body.workflowStep && body.workflowStep !== "all") {
      filteredMistakes = filteredMistakes.filter((m) => m.workflowStep === body.workflowStep);
    }

    if (body.page) {
      filteredMistakes = filteredMistakes.filter((m) => m.page === body.page);
    }

    if (body.date) {
      const filterDate = new Date(body.date).toDateString();
      filteredMistakes = filteredMistakes.filter((m) => {
        if (!m.timeline.lastMarkedAt) return false;
        return new Date(m.timeline.lastMarkedAt).toDateString() === filterDate;
      });
    }

    if (body.recency) {
      filteredMistakes = filterMistakesByRecency(filteredMistakes, body.recency);
    }

    if (body.type) {
      filteredMistakes = filteredMistakes.filter((m) => m.type === body.type);
    }

    if (body.category) {
      filteredMistakes = filteredMistakes.filter((m) => m.category === body.category);
    }

    // Calculate statistics for filtered mistakes
    const statistics = calculateMistakeStatistics(filteredMistakes);

    return NextResponse.json({
      success: true,
      mistakes: filteredMistakes,
      statistics,
    });
  } catch (error) {
    console.error("Error filtering Personal Mushaf:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to filter mistakes." },
      { status: 500 },
    );
  }
}
