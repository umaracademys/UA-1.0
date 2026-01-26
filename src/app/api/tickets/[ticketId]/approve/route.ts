import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import TicketModel from "@/lib/db/models/Ticket";
import PersonalMushafModel from "@/lib/db/models/PersonalMushaf";
import AssignmentModel from "@/lib/db/models/Assignment";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import NotificationModel from "@/lib/db/models/Notification";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function POST(request: Request, context: { params: { ticketId: string } }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!hasPermission(decoded.role, "tickets.approve") && !decoded.permissions?.includes("tickets.approve")) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const { ticketId } = context.params;
    if (!Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json({ success: false, message: "Invalid ticket ID." }, { status: 400 });
    }

    const ticket = await TicketModel.findById(ticketId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId");
    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      reviewNotes?: string;
      homeworkAssignmentData?: {
        title: string;
        description?: string;
        instructions?: string;
        dueDate?: string;
      };
    };

    // Get reviewer info
    const reviewer = await UserModel.findById(decoded.userId);
    if (!reviewer) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Update ticket
    ticket.status = "approved";
    ticket.reviewedBy = reviewer._id;
    ticket.reviewedAt = new Date();
    if (body.reviewNotes) {
      ticket.reviewNotes = body.reviewNotes;
    }

    // Get student once for all operations
    const student = await StudentModel.findById(ticket.studentId);

    // Add mistakes to student's Personal Mushaf
    if (ticket.mistakes && ticket.mistakes.length > 0 && student) {
      const studentUser = await UserModel.findById(student.userId).select("fullName").lean();
      let personalMushaf = await PersonalMushafModel.findOne({ studentId: student._id });

      if (!personalMushaf) {
        personalMushaf = await PersonalMushafModel.create({
          studentId: student._id,
          studentName: studentUser?.fullName || "Unknown",
          mistakes: [],
        });
      }

      // Add each mistake to Personal Mushaf
      for (const mistake of ticket.mistakes) {
        await personalMushaf.addMistake({
          type: mistake.type,
          category: mistake.category as "tajweed" | "letter" | "stop" | "memory" | "other",
          page: mistake.page,
          surah: mistake.surah,
          ayah: mistake.ayah,
          wordIndex: mistake.wordIndex,
          letterIndex: mistake.letterIndex,
          position: mistake.position,
          tajweedData: mistake.tajweedData as any,
          note: mistake.note,
          audioUrl: mistake.audioUrl,
          ticketId: ticket._id,
          workflowStep: ticket.workflowStep,
          markedBy: reviewer._id,
          markedByName: reviewer.fullName,
          timestamp: mistake.timestamp || new Date(),
        });
      }
    }

    // Create assignment from ticket (new structure)
    let homeworkAssignmentId: Types.ObjectId | undefined;
    if (student) {
      const studentUser = await UserModel.findById(student.userId);
      const reviewerUser = await UserModel.findById(decoded.userId);
      
      if (studentUser && reviewerUser) {
        // Determine workflow step type
        const workflowType = ticket.workflowStep as "sabq" | "sabqi" | "manzil";
        
        // Get surah/ayah from first mistake if available
        const firstMistake = ticket.mistakes && ticket.mistakes.length > 0 ? ticket.mistakes[0] : null;
        const surah = firstMistake?.surah;
        const ayah = firstMistake?.ayah;
        
        // Create classwork entry from ticket
        const classworkEntry = {
          type: workflowType,
          assignmentRange: `Surah ${surah || "N/A"}, Ayah ${ayah || "N/A"}`,
          details: body.reviewNotes || "",
          surahNumber: surah,
          surahName: "", // Ticket model doesn't have surahName
          fromAyah: ayah,
          toAyah: ayah,
          createdAt: new Date(),
        };

        // Create classwork structure
        const classwork = {
          sabq: workflowType === "sabq" ? [classworkEntry] : [],
          sabqi: workflowType === "sabqi" ? [classworkEntry] : [],
          manzil: workflowType === "manzil" ? [classworkEntry] : [],
        };

        // Create homework if provided
        const homework = body.homeworkAssignmentData
          ? {
              enabled: true,
              items: [
                {
                  type: workflowType,
                  range: {
                    mode: "surah_ayah" as const,
                    from: {
                      surah: surah || 1,
                      surahName: "Al-Fatihah", // Ticket model doesn't have surahName
                      ayah: ayah || 1,
                    },
                    to: {
                      surah: surah || 1,
                      surahName: "Al-Fatihah", // Ticket model doesn't have surahName
                      ayah: ayah || 1,
                    },
                  },
                  source: {
                    suggestedFrom: "ticket" as const,
                    ticketIds: [ticketId],
                  },
                  content: body.homeworkAssignmentData.instructions || body.homeworkAssignmentData.description || "",
                },
              ],
            }
          : { enabled: false };

        // Convert ticket mistakes to assignment mistakes
        const mushafMistakes = (ticket.mistakes || []).map((mistake: any, index: number) => ({
          id: `mistake-${ticket._id}-${index}`,
          type: mistake.type || "other",
          page: mistake.page || 1,
          surah: mistake.surah || surah || 1,
          ayah: mistake.ayah || ayah || 1,
          wordIndex: mistake.wordIndex || 0,
          position: mistake.position || { x: 0, y: 0 },
          note: mistake.note || "",
          audioUrl: mistake.audioUrl || "",
          workflowStep: workflowType,
          markedBy: reviewerUser._id.toString(),
          markedByName: reviewerUser.fullName,
          timestamp: mistake.timestamp || new Date(),
        }));

        // Determine assignedByRole
        let assignedByRole: "admin" | "super_admin" | "teacher" = "teacher";
        if (reviewerUser.role === "admin") {
          assignedByRole = "admin";
        } else if (reviewerUser.role === "super_admin") {
          assignedByRole = "super_admin";
        }

        // Create new assignment
        const assignment = await AssignmentModel.create({
          studentId: student._id,
          studentName: studentUser.fullName,
          assignedBy: reviewerUser._id.toString(),
          assignedByName: reviewerUser.fullName,
          assignedByRole,
          fromTicketId: ticket._id,
          classwork,
          homework,
          comment: body.reviewNotes || "",
          mushafMistakes,
          status: "active",
        });

        homeworkAssignmentId = assignment._id;
        ticket.homeworkAssigned = assignment._id;
      }
    }

    await ticket.save();

    // Create notifications
    const teacher = await TeacherModel.findById(ticket.teacherId);

    const notifications = [];

    if (student) {
      notifications.push({
        userId: student.userId,
        type: "recitation_review" as const,
        title: "Recitation Approved",
        message: `Your ${ticket.workflowStep} recitation has been approved.`,
        relatedEntity: {
          type: "Ticket",
          id: ticket._id,
        },
      });
    }

    if (teacher) {
      notifications.push({
        userId: teacher.userId,
        type: "recitation_review" as const,
        title: "Ticket Approved",
        message: `The ${ticket.workflowStep} ticket you reviewed has been approved.`,
        relatedEntity: {
          type: "Ticket",
          id: ticket._id,
        },
      });
    }

    if (notifications.length > 0) {
      await NotificationModel.insertMany(notifications);
    }

    const updatedTicket = await TicketModel.findById(ticketId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId")
      .populate("reviewedBy", "fullName email")
      .populate("homeworkAssigned")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Ticket approved successfully.",
      ticket: updatedTicket,
      homeworkAssignmentId: homeworkAssignmentId?.toString(),
    });
  } catch (error) {
    console.error("Error approving ticket:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to approve ticket." },
      { status: 500 },
    );
  }
}
