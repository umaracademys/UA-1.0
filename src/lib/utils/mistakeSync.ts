import { Types } from "mongoose";
import TicketModel, { type TicketMistake } from "@/lib/db/models/Ticket";
import PersonalMushafModel from "@/lib/db/models/PersonalMushaf";
import StudentModel from "@/lib/db/models/Student";
import UserModel from "@/lib/db/models/User";
import { bulkAddMistakesToPersonalMushaf, type MistakeData } from "./personalMushaf";

export interface SyncReport {
  ticketId: string;
  studentId: string;
  mistakesProcessed: number;
  mistakesAdded: number;
  mistakesUpdated: number;
  duplicates: number;
  errors: string[];
}

/**
 * Synchronize mistakes from approved ticket to student's Personal Mushaf
 */
export async function syncTicketMistakesToPersonalMushaf(
  ticketId: string | Types.ObjectId,
): Promise<SyncReport> {
  const report: SyncReport = {
    ticketId: ticketId.toString(),
    studentId: "",
    mistakesProcessed: 0,
    mistakesAdded: 0,
    mistakesUpdated: 0,
    duplicates: 0,
    errors: [],
  };

  try {
    const ticket = await TicketModel.findById(ticketId)
      .populate("studentId", "userId")
      .populate("teacherId", "userId");

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (ticket.status !== "approved") {
      throw new Error("Ticket must be approved before syncing mistakes");
    }

    const student = await StudentModel.findById(ticket.studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    report.studentId = student._id.toString();

    if (!ticket.mistakes || ticket.mistakes.length === 0) {
      return report;
    }

    // Convert ticket mistakes to Personal Mushaf format
    const mistakesData: MistakeData[] = ticket.mistakes.map((mistake: TicketMistake) => {
      const teacher = ticket.teacherId && typeof ticket.teacherId === "object" && "userId" in ticket.teacherId
        ? ticket.teacherId.userId
        : null;

      return {
        type: mistake.type,
        category: mistake.category as any,
        page: mistake.page,
        surah: mistake.surah,
        ayah: mistake.ayah,
        wordIndex: mistake.wordIndex,
        letterIndex: mistake.letterIndex,
        position: mistake.position,
        tajweedData: mistake.tajweedData as any,
        note: mistake.note,
        audioUrl: mistake.audioUrl,
        workflowStep: ticket.workflowStep,
        markedBy: teacher ? (teacher as any)._id : undefined,
        markedByName: teacher ? (teacher as any).fullName : undefined,
      };
    });

    report.mistakesProcessed = mistakesData.length;

    // Bulk add mistakes
    const result = await bulkAddMistakesToPersonalMushaf(
      student._id,
      mistakesData,
      ticket._id,
    );

    report.mistakesAdded = result.added;
    report.mistakesUpdated = result.updated;
    report.duplicates = result.duplicates;

    return report;
  } catch (error) {
    report.errors.push((error as Error).message);
    throw error;
  }
}

export interface DisplayMistake {
  id: string;
  type: string;
  category: string;
  page?: number;
  surah?: number;
  ayah?: number;
  wordIndex?: number;
  letterIndex?: number;
  position?: { x: number; y: number };
  note?: string;
  audioUrl?: string;
  workflowStep: string;
  recency: "today" | "recent" | "historical";
  repeatCount: number;
  resolved: boolean;
  lastMarkedAt: Date;
  firstMarkedAt: Date;
  ticketId?: string;
  markedByName?: string;
}

export interface DisplayFilters {
  workflowStep?: "sabq" | "sabqi" | "manzil" | "all";
  page?: number;
  date?: string; // YYYY-MM-DD
  recency?: "today" | "recent" | "historical";
  type?: string;
  category?: string;
  resolved?: boolean;
}

/**
 * Get Personal Mushaf mistakes formatted for display
 */
export async function getPersonalMushafForDisplay(
  studentId: string | Types.ObjectId,
  filters?: DisplayFilters,
): Promise<{
  mistakes: DisplayMistake[];
  statistics: {
    total: number;
    byWorkflowStep: Record<string, number>;
    byCategory: Record<string, number>;
    resolved: number;
    unresolved: number;
  };
}> {
  const student = await StudentModel.findById(studentId);
  if (!student) {
    throw new Error("Student not found");
  }

  const personalMushaf = await PersonalMushafModel.findOne({ studentId: student._id });
  if (!personalMushaf) {
    return {
      mistakes: [],
      statistics: {
        total: 0,
        byWorkflowStep: {},
        byCategory: {},
        resolved: 0,
        unresolved: 0,
      },
    };
  }

  let mistakes = [...personalMushaf.mistakes];

  // Apply filters
  if (filters) {
    if (filters.workflowStep && filters.workflowStep !== "all") {
      mistakes = mistakes.filter((m) => m.workflowStep === filters.workflowStep);
    }

    if (filters.page) {
      mistakes = mistakes.filter((m) => m.page === filters.page);
    }

    if (filters.date) {
      const filterDate = new Date(filters.date).toDateString();
      mistakes = mistakes.filter((m) => {
        if (!m.timeline.lastMarkedAt) return false;
        return new Date(m.timeline.lastMarkedAt).toDateString() === filterDate;
      });
    }

    if (filters.recency) {
      const now = Date.now();
      const today = new Date().toDateString();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      mistakes = mistakes.filter((m) => {
        if (!m.timeline.lastMarkedAt) return filters.recency === "historical";

        const mistakeDate = new Date(m.timeline.lastMarkedAt).toDateString();
        const mistakeTime = new Date(m.timeline.lastMarkedAt).getTime();

        switch (filters.recency) {
          case "today":
            return mistakeDate === today;
          case "recent":
            return mistakeTime >= sevenDaysAgo && mistakeDate !== today;
          case "historical":
            return mistakeTime < sevenDaysAgo;
          default:
            return true;
        }
      });
    }

    if (filters.type) {
      mistakes = mistakes.filter((m) => m.type === filters.type);
    }

    if (filters.category) {
      mistakes = mistakes.filter((m) => m.category === filters.category);
    }

    if (filters.resolved !== undefined) {
      mistakes = mistakes.filter((m) => m.timeline.resolved === filters.resolved);
    }
  }

  // Format mistakes for display
  const formattedMistakes: DisplayMistake[] = mistakes.map((mistake) => {
    const now = Date.now();
    const today = new Date().toDateString();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    let recency: "today" | "recent" | "historical" = "historical";
    if (mistake.timeline.lastMarkedAt) {
      const mistakeDate = new Date(mistake.timeline.lastMarkedAt).toDateString();
      const mistakeTime = new Date(mistake.timeline.lastMarkedAt).getTime();

      if (mistakeDate === today) {
        recency = "today";
      } else if (mistakeTime >= sevenDaysAgo) {
        recency = "recent";
      }
    }

    return {
      id: mistake.id,
      type: mistake.type,
      category: mistake.category,
      page: mistake.page,
      surah: mistake.surah,
      ayah: mistake.ayah,
      wordIndex: mistake.wordIndex,
      letterIndex: mistake.letterIndex,
      position: mistake.position,
      note: mistake.note,
      audioUrl: mistake.audioUrl,
      workflowStep: mistake.workflowStep,
      recency,
      repeatCount: mistake.timeline.repeatCount,
      resolved: mistake.timeline.resolved,
      lastMarkedAt: mistake.timeline.lastMarkedAt,
      firstMarkedAt: mistake.timeline.firstMarkedAt,
      ticketId: mistake.ticketId?.toString(),
      markedByName: mistake.markedByName,
    };
  });

  // Calculate statistics
  const statistics = {
    total: formattedMistakes.length,
    byWorkflowStep: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    resolved: 0,
    unresolved: 0,
  };

  formattedMistakes.forEach((mistake) => {
    statistics.byWorkflowStep[mistake.workflowStep] =
      (statistics.byWorkflowStep[mistake.workflowStep] || 0) + 1;
    statistics.byCategory[mistake.category] = (statistics.byCategory[mistake.category] || 0) + 1;

    if (mistake.resolved) {
      statistics.resolved++;
    } else {
      statistics.unresolved++;
    }
  });

  return {
    mistakes: formattedMistakes,
    statistics,
  };
}
