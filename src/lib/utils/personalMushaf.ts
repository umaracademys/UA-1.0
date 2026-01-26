import { Types } from "mongoose";
import PersonalMushafModel, { type PersonalMushafMistake, type WorkflowStep } from "@/lib/db/models/PersonalMushaf";
import StudentModel from "@/lib/db/models/Student";
import UserModel from "@/lib/db/models/User";

export interface MistakeData {
  type: string;
  category: "tajweed" | "letter" | "stop" | "memory" | "other" | "atkees";
  page?: number;
  surah?: number;
  ayah?: number;
  wordIndex?: number;
  letterIndex?: number;
  position?: { x: number; y: number };
  tajweedData?: {
    stretchCount?: number;
    holdRequired?: boolean;
    focusLetters?: string[];
    tajweedRule?: string;
    teacherNote?: string;
  };
  note?: string;
  audioUrl?: string;
  workflowStep: WorkflowStep;
  markedBy?: Types.ObjectId;
  markedByName?: string;
}

export interface BulkAddResult {
  added: number;
  updated: number;
  duplicates: number;
}

/**
 * Add mistake to student's Personal Mushaf
 */
export async function addMistakeToPersonalMushaf(
  studentId: string | Types.ObjectId,
  mistakeData: MistakeData,
  ticketId?: string | Types.ObjectId,
  teacherId?: string | Types.ObjectId,
): Promise<PersonalMushafMistake> {
  const student = await StudentModel.findById(studentId);
  if (!student) {
    throw new Error("Student not found");
  }

  // Get or create Personal Mushaf
  let personalMushaf = await PersonalMushafModel.findOne({ studentId: student._id });
  
  if (!personalMushaf) {
    const studentUser = await UserModel.findById(student.userId).select("fullName").lean();
    personalMushaf = await PersonalMushafModel.create({
      studentId: student._id,
      studentName: studentUser?.fullName || "Unknown",
      mistakes: [],
    });
  }

  // Check for duplicate
  const duplicate = checkDuplicateMistake(personalMushaf.mistakes, mistakeData);

  if (duplicate) {
    // Update existing mistake
    duplicate.timeline.repeatCount += 1;
    duplicate.timeline.lastMarkedAt = new Date();
    duplicate.timeline.resolved = false;
    duplicate.timeline.resolvedAt = undefined;
    duplicate.timestamp = new Date();
    
    // Update mistake data if provided
    if (mistakeData.note) duplicate.note = mistakeData.note;
    if (mistakeData.audioUrl) duplicate.audioUrl = mistakeData.audioUrl;
    if (mistakeData.tajweedData) duplicate.tajweedData = mistakeData.tajweedData as any;
    if (mistakeData.markedBy) duplicate.markedBy = mistakeData.markedBy;
    if (mistakeData.markedByName) duplicate.markedByName = mistakeData.markedByName;
    if (ticketId) duplicate.ticketId = ticketId as Types.ObjectId;

    await personalMushaf.save();
    return duplicate;
  } else {
    // Add new mistake
    await personalMushaf.addMistake({
      ...mistakeData,
      ticketId: ticketId as Types.ObjectId | undefined,
      markedBy: mistakeData.markedBy,
      markedByName: mistakeData.markedByName,
      timestamp: new Date(),
    });

    // Reload to get the new mistake
    await personalMushaf.populate("mistakes");
    const newMistake = personalMushaf.mistakes[personalMushaf.mistakes.length - 1];
    return newMistake as PersonalMushafMistake;
  }
}

/**
 * Bulk add mistakes to Personal Mushaf (e.g., when ticket is approved)
 */
export async function bulkAddMistakesToPersonalMushaf(
  studentId: string | Types.ObjectId,
  mistakes: MistakeData[],
  ticketId?: string | Types.ObjectId,
): Promise<BulkAddResult> {
  const result: BulkAddResult = {
    added: 0,
    updated: 0,
    duplicates: 0,
  };

  const student = await StudentModel.findById(studentId);
  if (!student) {
    throw new Error("Student not found");
  }

  // Get or create Personal Mushaf
  let personalMushaf = await PersonalMushafModel.findOne({ studentId: student._id });
  
  if (!personalMushaf) {
    const studentUser = await UserModel.findById(student.userId).select("fullName").lean();
    personalMushaf = await PersonalMushafModel.create({
      studentId: student._id,
      studentName: studentUser?.fullName || "Unknown",
      mistakes: [],
    });
  }

  for (const mistakeData of mistakes) {
    const duplicate = checkDuplicateMistake(personalMushaf.mistakes, mistakeData);

    if (duplicate) {
      // Update existing mistake
      duplicate.timeline.repeatCount += 1;
      duplicate.timeline.lastMarkedAt = new Date();
      duplicate.timeline.resolved = false;
      duplicate.timeline.resolvedAt = undefined;
      duplicate.timestamp = new Date();
      
      if (mistakeData.note) duplicate.note = mistakeData.note;
      if (mistakeData.audioUrl) duplicate.audioUrl = mistakeData.audioUrl;
      if (ticketId) duplicate.ticketId = ticketId as Types.ObjectId;

      result.updated++;
      result.duplicates++;
    } else {
      // Add new mistake
      await personalMushaf.addMistake({
        ...mistakeData,
        ticketId: ticketId as Types.ObjectId | undefined,
        timestamp: new Date(),
      });
      result.added++;
    }
  }

  await personalMushaf.save();
  return result;
}

/**
 * Check for duplicate mistake in existing mistakes
 */
export function checkDuplicateMistake(
  existingMistakes: PersonalMushafMistake[],
  newMistake: MistakeData,
): PersonalMushafMistake | null {
  return (
    existingMistakes.find((existing) => {
      // Compare key fields
      if (
        existing.type === newMistake.type &&
        existing.category === newMistake.category &&
        existing.page === newMistake.page &&
        existing.surah === newMistake.surah &&
        existing.ayah === newMistake.ayah &&
        existing.wordIndex === newMistake.wordIndex &&
        existing.letterIndex === newMistake.letterIndex &&
        existing.workflowStep === newMistake.workflowStep
      ) {
        // Check position similarity (within 10 pixels)
        if (existing.position && newMistake.position) {
          const distance = Math.sqrt(
            Math.pow(existing.position.x - newMistake.position.x, 2) +
              Math.pow(existing.position.y - newMistake.position.y, 2),
          );
          return distance < 10;
        }
        return true;
      }
      return false;
    }) || null
  );
}

/**
 * Filter mistakes by recency
 */
export function filterMistakesByRecency(
  mistakes: PersonalMushafMistake[],
  recency: "today" | "recent" | "historical",
): PersonalMushafMistake[] {
  const now = Date.now();
  const today = new Date().toDateString();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  return mistakes.filter((mistake) => {
    if (!mistake.timeline.lastMarkedAt) {
      return recency === "historical";
    }

    const mistakeDate = new Date(mistake.timeline.lastMarkedAt).toDateString();
    const mistakeTime = new Date(mistake.timeline.lastMarkedAt).getTime();

    switch (recency) {
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

/**
 * Group mistakes by date
 */
export function groupMistakesByDate(
  mistakes: PersonalMushafMistake[],
): Record<string, PersonalMushafMistake[]> {
  const grouped: Record<string, PersonalMushafMistake[]> = {};

  mistakes.forEach((mistake) => {
    if (mistake.timeline.lastMarkedAt) {
      const date = new Date(mistake.timeline.lastMarkedAt).toISOString().split("T")[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(mistake);
    }
  });

  return grouped;
}

/**
 * Calculate comprehensive mistake statistics
 */
export function calculateMistakeStatistics(mistakes: PersonalMushafMistake[]): {
  total: number;
  byWorkflowStep: Record<WorkflowStep, number>;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  resolved: number;
  unresolved: number;
  repeatOffenders: number;
  trend: Array<{ date: string; count: number }>;
  mostCommonTypes: Array<{ type: string; count: number }>;
} {
  const stats = {
    total: mistakes.length,
    byWorkflowStep: {
      sabq: 0,
      sabqi: 0,
      manzil: 0,
    } as Record<WorkflowStep, number>,
    byCategory: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    resolved: 0,
    unresolved: 0,
    repeatOffenders: 0,
    trend: [] as Array<{ date: string; count: number }>,
    mostCommonTypes: [] as Array<{ type: string; count: number }>,
  };

  // Calculate trend (last 30 days)
  const trendMap = new Map<string, number>();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  mistakes.forEach((mistake) => {
    // By workflow step
    stats.byWorkflowStep[mistake.workflowStep] =
      (stats.byWorkflowStep[mistake.workflowStep] || 0) + 1;

    // By category
    stats.byCategory[mistake.category] = (stats.byCategory[mistake.category] || 0) + 1;

    // By type
    stats.byType[mistake.type] = (stats.byType[mistake.type] || 0) + 1;

    // Resolved vs unresolved
    if (mistake.timeline.resolved) {
      stats.resolved++;
    } else {
      stats.unresolved++;
    }

    // Repeat offenders
    if (mistake.timeline.repeatCount > 3) {
      stats.repeatOffenders++;
    }

    // Trend data (last 30 days)
    if (mistake.timeline.lastMarkedAt) {
      const mistakeTime = new Date(mistake.timeline.lastMarkedAt).getTime();
      if (mistakeTime >= thirtyDaysAgo) {
        const date = new Date(mistake.timeline.lastMarkedAt).toISOString().split("T")[0];
        trendMap.set(date, (trendMap.get(date) || 0) + 1);
      }
    }
  });

  // Convert trend map to array and sort by date
  stats.trend = Array.from(trendMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Most common types (top 10)
  stats.mostCommonTypes = Object.entries(stats.byType)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return stats;
}
