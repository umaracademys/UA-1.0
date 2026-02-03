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

    // Ticket → Assignment sync: when ticket is linked, set assignment to COMPLETED (no second assignment created).
    if (ticket.assignmentId) {
      await AssignmentModel.findByIdAndUpdate(ticket.assignmentId, {
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Get student once for all operations
    const student = await StudentModel.findById(ticket.studentId);

    // Add mistakes to student's Personal Mushaf (from ticket.mistakes or sabqEntries)
    const allTicketMistakes =
      ticket.sabqEntries && ticket.sabqEntries.length > 0
        ? ticket.sabqEntries.flatMap((se) => se.mistakes || [])
        : ticket.mistakes || [];
    if (allTicketMistakes.length > 0 && student) {
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
      for (const mistake of allTicketMistakes) {
        const m = mistake as { type?: string; category?: string; page?: number; surah?: number; ayah?: number; wordIndex?: number; letterIndex?: number; position?: { x: number; y: number }; tajweedData?: unknown; note?: string; audioUrl?: string; timestamp?: Date };
        await personalMushaf.addMistake({
          type: m.type || "other",
          category: (m.category || "other") as "tajweed" | "letter" | "stop" | "memory" | "other",
          page: m.page,
          surah: m.surah,
          ayah: m.ayah,
          wordIndex: m.wordIndex,
          letterIndex: m.letterIndex,
          position: m.position,
          tajweedData: m.tajweedData as any,
          note: m.note,
          audioUrl: m.audioUrl,
          ticketId: ticket._id,
          workflowStep: ticket.workflowStep,
          markedBy: reviewer._id,
          markedByName: reviewer.fullName,
          timestamp: m.timestamp || new Date(),
        });
      }
    }

    // When ticket is linked to an assignment, we already updated it to completed above. Do not create a second assignment.
    // Create assignment from ticket only when ticket is not linked to an existing assignment.
    let homeworkAssignmentId: Types.ObjectId | undefined;
    if (ticket.assignmentId) {
      homeworkAssignmentId = ticket.assignmentId;
    } else if (student) {
      const studentUser = await UserModel.findById(student.userId);
      const reviewerUser = await UserModel.findById(decoded.userId);

      if (studentUser && reviewerUser) {
        const workflowType = ticket.workflowStep as "sabq" | "sabqi" | "manzil";

        // Build classwork: loop through sabqEntries if present, else single entry from ticket
        let sabqEntries: Array<{
          type: "sabq" | "sabqi" | "manzil";
          assignmentRange: string;
          details?: string;
          fromAyah?: number;
          toAyah?: number;
          surahNumber?: number;
          surahName?: string;
          endSurahNumber?: number;
          endSurahName?: string;
          juzNumber?: number;
          startAyahText?: string;
          endAyahText?: string;
          mistakeCount?: number | "weak";
          tajweedIssues?: Array<{ type: string; surahName?: string; wordText?: string; note?: string }>;
          fromTicketId?: string;
          sabqEntryId?: string;
          createdAt: Date;
        }> = [];
        let sabqiEntries: typeof sabqEntries = [];
        let manzilEntries: typeof sabqEntries = [];

        const ticketIdStr = ticket._id.toString();

        if (ticket.sabqEntries && ticket.sabqEntries.length > 0) {
          // Portal: one ClassworkPhase per sabqEntry
          for (const se of ticket.sabqEntries) {
            const rr = se.recitationRange || {};
            const surahNum = rr.surahNumber ?? rr.endSurahNumber;
            const endSurahNum = rr.endSurahNumber ?? rr.surahNumber;
            const fromAyah = rr.startAyahNumber ?? rr.endAyahNumber ?? 0;
            const toAyah = rr.endAyahNumber ?? rr.startAyahNumber ?? 0;
            const surahName = rr.surahName || rr.endSurahName || "";
            const assignmentRange =
              surahNum && toAyah
                ? surahNum === endSurahNum
                  ? `Surah ${surahName || surahNum}, Ayah ${fromAyah}-${toAyah}`
                  : `Surah ${surahName || surahNum}, Ayah ${fromAyah} → ${rr.endSurahName || endSurahNum}, Ayah ${toAyah}`
                : `Surah ${surahName || "N/A"}, Ayah ${fromAyah}-${toAyah}`;

            const entry = {
              type: "sabq" as const,
              assignmentRange,
              details: se.adminComment || body.reviewNotes || "",
              fromAyah,
              toAyah,
              surahNumber: surahNum,
              surahName,
              endSurahNumber: endSurahNum,
              endSurahName: rr.endSurahName || "",
              juzNumber: rr.juzNumber,
              startAyahText: rr.startAyahText,
              endAyahText: rr.endAyahText,
              mistakeCount: se.mistakeCount,
              tajweedIssues: se.tajweedIssues,
              fromTicketId: ticketIdStr,
              sabqEntryId: se.id,
              createdAt: new Date(),
            };
            sabqEntries.push(entry);
          }

          // If homeworkRange exists, add as extra Sabq classwork entry (Portal: "Homework: ...")
          const hr = ticket.homeworkRange;
          if (hr && (hr.surahNumber != null || hr.surahName)) {
            const hSurah = hr.surahNumber ?? hr.endSurahNumber ?? 1;
            const hFrom = hr.startAyahNumber ?? 1;
            const hTo = hr.endAyahNumber ?? hr.startAyahNumber ?? 1;
            const hName = hr.surahName || hr.endSurahName || "";
            sabqEntries.push({
              type: "sabq",
              assignmentRange: `Homework: Surah ${hName || hSurah}, Ayah ${hFrom}-${hTo}`,
              details: body.reviewNotes || "",
              fromAyah: hFrom,
              toAyah: hTo,
              surahNumber: hSurah,
              surahName: hName,
              endSurahNumber: hr.endSurahNumber ?? hr.surahNumber,
              endSurahName: hr.endSurahName || "",
              juzNumber: hr.juzNumber,
              startAyahText: hr.startAyahText,
              endAyahText: hr.endAyahText,
              fromTicketId: `${ticketIdStr}-homework`,
              createdAt: new Date(),
            });
          }
        } else {
          // Fallback: single classwork entry from ticket.mistakes / recitationRange
          const firstMistake = ticket.mistakes?.[0];
          const rr = ticket.recitationRange;
          const surah = firstMistake?.surah ?? rr?.surahNumber ?? rr?.endSurahNumber;
          const ayah = firstMistake?.ayah ?? rr?.startAyahNumber ?? rr?.endAyahNumber;
          const surahName = rr?.surahName || rr?.endSurahName || "";

          const classworkEntry = {
            type: workflowType,
            assignmentRange: `Surah ${surahName || surah || "N/A"}, Ayah ${ayah || "N/A"}`,
            details: body.reviewNotes || "",
            surahNumber: surah,
            surahName,
            fromAyah: ayah,
            toAyah: ayah,
            createdAt: new Date(),
          };
          if (workflowType === "sabq") sabqEntries = [classworkEntry];
          else if (workflowType === "sabqi") sabqiEntries = [classworkEntry];
          else manzilEntries = [classworkEntry];
        }

        const classwork = {
          sabq: sabqEntries,
          sabqi: sabqiEntries,
          manzil: manzilEntries,
        };

        // Build homework: from homeworkRange and/or homeworkAssignmentData
        const homeworkItems: Array<{
          type: "sabq" | "sabqi" | "manzil";
          range: {
            mode: "surah_ayah";
            from: { surah: number; surahName: string; ayah: number };
            to: { surah: number; surahName: string; ayah: number };
          };
          source: { suggestedFrom: "ticket"; ticketIds: string[] };
          content?: string;
        }> = [];

        const hr = ticket.homeworkRange;
        if (hr && (hr.surahNumber != null || hr.surahName)) {
          const fromSurah = hr.surahNumber ?? hr.endSurahNumber ?? 1;
          const toSurah = hr.endSurahNumber ?? hr.surahNumber ?? fromSurah;
          const fromAyah = hr.startAyahNumber ?? 1;
          const toAyah = hr.endAyahNumber ?? hr.startAyahNumber ?? fromAyah;
          const fromName = hr.surahName || "Al-Fatihah";
          const toName = hr.endSurahName || hr.surahName || fromName;
          homeworkItems.push({
            type: "sabq",
            range: {
              mode: "surah_ayah",
              from: { surah: fromSurah, surahName: fromName, ayah: fromAyah },
              to: { surah: toSurah, surahName: toName, ayah: toAyah },
            },
            source: { suggestedFrom: "ticket", ticketIds: [ticketIdStr] },
          });
        }

        if (body.homeworkAssignmentData) {
          const firstRange = ticket.sabqEntries?.[0]?.recitationRange || ticket.recitationRange;
          const s = firstRange?.surahNumber ?? firstRange?.endSurahNumber ?? 1;
          const a = firstRange?.startAyahNumber ?? firstRange?.endAyahNumber ?? 1;
          const sn = firstRange?.surahName || firstRange?.endSurahName || "Al-Fatihah";
          homeworkItems.push({
            type: workflowType,
            range: {
              mode: "surah_ayah",
              from: { surah: s, surahName: sn, ayah: a },
              to: { surah: s, surahName: sn, ayah: a },
            },
            source: { suggestedFrom: "ticket", ticketIds: [ticketIdStr] },
            content: body.homeworkAssignmentData.instructions || body.homeworkAssignmentData.description || "",
          });
        }

        const homework =
          homeworkItems.length > 0
            ? { enabled: true, items: homeworkItems }
            : { enabled: false };

        // Collect mushafMistakes from sabqEntries or ticket.mistakes
        let mushafMistakes: Array<{
          id: string;
          type: string;
          page: number;
          surah: number;
          ayah: number;
          wordIndex: number;
          wordText?: string;
          position: { x: number; y: number };
          note?: string;
          audioUrl?: string;
          workflowStep: string;
          markedBy: string;
          markedByName: string;
          timestamp: Date;
        }> = [];

        if (ticket.sabqEntries && ticket.sabqEntries.length > 0) {
          let idx = 0;
          for (const se of ticket.sabqEntries) {
            for (const m of se.mistakes || []) {
              mushafMistakes.push({
                id: `mistake-${ticket._id}-${idx}`,
                type: (m as any).type || "other",
                page: (m as any).page || 1,
                surah: (m as any).surah ?? se.recitationRange?.surahNumber ?? 1,
                ayah: (m as any).ayah ?? se.recitationRange?.endAyahNumber ?? 1,
                wordIndex: (m as any).wordIndex ?? 0,
                wordText: (m as any).wordText,
                position: (m as any).position || { x: 0, y: 0 },
                note: (m as any).note,
                audioUrl: (m as any).audioUrl,
                workflowStep: "sabq",
                markedBy: reviewerUser._id.toString(),
                markedByName: reviewerUser.fullName,
                timestamp: (m as any).timestamp || new Date(),
              });
              idx++;
            }
          }
        } else {
          const firstMistake = ticket.mistakes?.[0];
          const surah = firstMistake?.surah ?? ticket.recitationRange?.surahNumber ?? 1;
          const ayah = firstMistake?.ayah ?? ticket.recitationRange?.endAyahNumber ?? 1;
          mushafMistakes = (ticket.mistakes || []).map((mistake: any, index: number) => ({
            id: `mistake-${ticket._id}-${index}`,
            type: mistake.type || "other",
            page: mistake.page || 1,
            surah: mistake.surah ?? surah,
            ayah: mistake.ayah ?? ayah,
            wordIndex: mistake.wordIndex ?? 0,
            wordText: mistake.wordText,
            position: mistake.position || { x: 0, y: 0 },
            note: mistake.note,
            audioUrl: mistake.audioUrl,
            workflowStep: workflowType,
            markedBy: reviewerUser._id.toString(),
            markedByName: reviewerUser.fullName,
            timestamp: mistake.timestamp || new Date(),
          }));
        }

        let assignedByRole: "admin" | "super_admin" | "teacher" = "teacher";
        if (reviewerUser.role === "admin") assignedByRole = "admin";
        else if (reviewerUser.role === "super_admin") assignedByRole = "super_admin";

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
