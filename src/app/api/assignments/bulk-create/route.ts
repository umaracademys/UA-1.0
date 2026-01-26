import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import AssignmentModel from "@/lib/db/models/Assignment";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import NotificationModel from "@/lib/db/models/Notification";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

export const dynamic = "force-dynamic";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

type BulkAssignmentData = {
  title: string;
  description?: string;
  type: "homework" | "classwork"; // Legacy type field
  assignedTo: string[];
  dueDate?: string;
  instructions?: string;
  classworkType?: "sabq" | "sabqi" | "manzil"; // For classwork assignments
};

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (
      !hasPermission(decoded.role, "assignments.bulk_operations") &&
      !decoded.permissions?.includes("assignments.bulk_operations")
    ) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    // Get teacher profile
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }
    const teacher = await TeacherModel.findOne({ userId: user._id });
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 404 });
    }

    const body = (await request.json()) as { assignments: BulkAssignmentData[] };

    if (!body.assignments || !Array.isArray(body.assignments) || body.assignments.length === 0) {
      return NextResponse.json({ success: false, message: "Assignments array is required." }, { status: 400 });
    }

    if (body.assignments.length > 50) {
      return NextResponse.json({ success: false, message: "Maximum 50 assignments can be created at once." }, { status: 400 });
    }

    const createdAssignments = [];

    for (const assignmentData of body.assignments) {
      const { title, description, type, assignedTo, dueDate, instructions, classworkType } = assignmentData;

      if (!title || !type || !assignedTo || assignedTo.length === 0) {
        continue; // Skip invalid assignments
      }

      // Validate student IDs
      const validStudentIds = assignedTo
        .map((id) => {
          try {
            return new Types.ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Types.ObjectId[];

      if (validStudentIds.length === 0) {
        continue; // Skip if no valid student IDs
      }

      // Get student details for notifications
      const students = await StudentModel.find({ _id: { $in: validStudentIds } })
        .populate("userId", "fullName")
        .lean();

      // Determine assignedByRole
      let assignedByRole: "admin" | "super_admin" | "teacher" = "teacher";
      if (user.role === "admin") {
        assignedByRole = "admin";
      } else if (user.role === "super_admin") {
        assignedByRole = "super_admin";
      }

      // Create a separate assignment for each student
      for (const student of students) {
        if (!student || !student.userId) continue;

        const studentUser = student.userId as any;

        // Build classwork structure
        const classwork = {
          sabq: [] as any[],
          sabqi: [] as any[],
          manzil: [] as any[],
        };

        // Build homework structure
        const homework = {
          enabled: type === "homework",
          content: type === "homework" ? (description || instructions || "") : undefined,
          items: type === "homework" ? [] as any[] : undefined,
        };

        // If it's classwork, add to the appropriate phase
        if (type === "classwork" && classworkType) {
          const classworkEntry = {
            type: classworkType,
            assignmentRange: title,
            details: description || instructions || "",
            createdAt: new Date(),
          };
          if (classworkType === "sabq") {
            classwork.sabq.push(classworkEntry);
          } else if (classworkType === "sabqi") {
            classwork.sabqi.push(classworkEntry);
          } else if (classworkType === "manzil") {
            classwork.manzil.push(classworkEntry);
          }
        }

        // Create assignment for this student
        const assignment = await AssignmentModel.create({
          studentId: student._id,
          studentName: studentUser.fullName || "Unknown",
          assignedBy: user._id.toString(),
          assignedByName: user.fullName,
          assignedByRole,
          classwork,
          homework,
          comment: instructions || description || undefined,
          status: "active",
        });

        // Create notification for this student
        await NotificationModel.create({
          userId: student.userId,
          type: "assignment_submission" as const,
          title: "New Assignment",
          message: `You have been assigned a new ${type}: ${title}`,
          relatedEntity: {
            type: "Assignment",
            id: assignment._id,
          },
        });

        createdAssignments.push(assignment);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdAssignments.length} assignment(s).`,
      assignments: createdAssignments,
      count: createdAssignments.length,
    });
  } catch (error) {
    console.error("Error creating bulk assignments:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to create assignments." },
      { status: 500 },
    );
  }
}
