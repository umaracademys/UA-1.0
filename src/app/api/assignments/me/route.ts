import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AssignmentModel from "@/lib/db/models/Assignment";
import StudentModel from "@/lib/db/models/Student";
import UserModel from "@/lib/db/models/User";
import { verifyToken } from "@/lib/utils/jwt";

export const dynamic = "force-dynamic";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

// GET /api/assignments/me - Get assignments for authenticated student
export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (decoded.role !== "student") {
      return NextResponse.json(
        { success: false, message: "This endpoint is only available for students." },
        { status: 403 },
      );
    }

    await connectToDatabase();

    // Find student by userId or email
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Try to find student by userId first
    let student = await StudentModel.findOne({ userId: user._id });

    // If not found, try by email (in case userId format differs)
    if (!student) {
      student = await StudentModel.findOne({}).populate({
        path: "userId",
        match: { email: user.email },
      });
    }

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student profile not found." },
        { status: 404 },
      );
    }

    // Handle multiple ID formats for studentId matching
    const studentIdString = student._id.toString();
    const studentIdObjectId = student._id;

    // Get all assignments for this student
    const assignments = await AssignmentModel.find({
      $or: [
        { studentId: studentIdObjectId },
        { studentId: studentIdString },
        { studentId: new Types.ObjectId(studentIdString) },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: assignments,
      count: assignments.length,
    });
  } catch (error) {
    console.error("Error fetching student assignments:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load assignments." },
      { status: 500 },
    );
  }
}
