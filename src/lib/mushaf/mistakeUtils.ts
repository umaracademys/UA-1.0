import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";

export type MistakeRecency = "today" | "recent" | "old";

export interface FormattedMistake {
  id: string;
  type: string;
  category: string;
  page?: number;
  surah?: number;
  ayah?: number;
  note?: string;
  recency: MistakeRecency;
  displayText: string;
  color: string;
}

export interface GroupedMistakes {
  today: PersonalMushafMistake[];
  recent: PersonalMushafMistake[];
  old: PersonalMushafMistake[];
}

/**
 * Classify mistake recency based on last marked date
 */
export function classifyMistakeRecency(lastMarkedAt: Date): MistakeRecency {
  const now = Date.now();
  const mistakeTime = lastMarkedAt.getTime();
  const today = new Date().toDateString();
  const mistakeDate = lastMarkedAt.toDateString();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  if (mistakeDate === today) {
    return "today";
  } else if (mistakeTime >= sevenDaysAgo) {
    return "recent";
  } else {
    return "old";
  }
}

/**
 * Get color for mistake based on type and recency
 */
export function getMistakeColor(type: string, recency: MistakeRecency): string {
  // Tajweed mistakes: gray border
  if (type === "tajweed" || type.includes("tajweed")) {
    return "#6b7280"; // gray-500
  }

  // Atkees: yellow
  if (type === "atkees" || type === "repetition") {
    switch (recency) {
      case "today":
        return "#fbbf24"; // yellow-400
      case "recent":
        return "#f59e0b"; // yellow-500
      default:
        return "#d97706"; // yellow-600
    }
  }

  // Regular mistakes: red with varying intensity
  switch (recency) {
    case "today":
      return "#ef4444"; // red-500 (strong)
    case "recent":
      return "#dc2626"; // red-600 (medium)
    default:
      return "#b91c1c"; // red-700 (faint)
  }
}

/**
 * Format mistake for display
 */
export function formatMistakeForDisplay(mistake: PersonalMushafMistake): FormattedMistake {
  const recency = mistake.timeline.lastMarkedAt
    ? classifyMistakeRecency(new Date(mistake.timeline.lastMarkedAt))
    : "old";

  const color = getMistakeColor(mistake.category, recency);

  let displayText = mistake.type;
  if (mistake.page) {
    displayText += ` (Page ${mistake.page}`;
    if (mistake.surah && mistake.ayah) {
      displayText += `, S${mistake.surah}:${mistake.ayah}`;
    }
    displayText += ")";
  }

  return {
    id: mistake.id,
    type: mistake.type,
    category: mistake.category,
    page: mistake.page,
    surah: mistake.surah,
    ayah: mistake.ayah,
    note: mistake.note,
    recency,
    displayText,
    color,
  };
}

/**
 * Group mistakes by recency
 */
export function groupMistakesByRecency(mistakes: PersonalMushafMistake[]): GroupedMistakes {
  const grouped: GroupedMistakes = {
    today: [],
    recent: [],
    old: [],
  };

  mistakes.forEach((mistake) => {
    if (mistake.timeline.lastMarkedAt) {
      const recency = classifyMistakeRecency(new Date(mistake.timeline.lastMarkedAt));
      grouped[recency].push(mistake);
    } else {
      grouped.old.push(mistake);
    }
  });

  return grouped;
}

/**
 * Check if a mistake is a duplicate of existing mistakes
 */
export function checkForDuplicateMistake(
  newMistake: Omit<PersonalMushafMistake, "id" | "timeline">,
  existingMistakes: PersonalMushafMistake[],
): boolean {
  return existingMistakes.some((existing) => {
    // Check if same type, category, page, and position
    if (
      existing.type === newMistake.type &&
      existing.category === newMistake.category &&
      existing.page === newMistake.page &&
      existing.wordIndex === newMistake.wordIndex &&
      existing.letterIndex === newMistake.letterIndex
    ) {
      // Check if position is similar (within 10 pixels)
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
  });
}

/**
 * Get mistake statistics
 */
export function getMistakeStatistics(mistakes: PersonalMushafMistake[]): {
  total: number;
  byCategory: Record<string, number>;
  byRecency: Record<MistakeRecency, number>;
  byWorkflowStep: Record<string, number>;
} {
  const stats = {
    total: mistakes.length,
    byCategory: {} as Record<string, number>,
    byRecency: {
      today: 0,
      recent: 0,
      old: 0,
    } as Record<MistakeRecency, number>,
    byWorkflowStep: {} as Record<string, number>,
  };

  mistakes.forEach((mistake) => {
    // Count by category
    stats.byCategory[mistake.category] = (stats.byCategory[mistake.category] || 0) + 1;

    // Count by recency
    if (mistake.timeline.lastMarkedAt) {
      const recency = classifyMistakeRecency(new Date(mistake.timeline.lastMarkedAt));
      stats.byRecency[recency]++;
    } else {
      stats.byRecency.old++;
    }

    // Count by workflow step
    stats.byWorkflowStep[mistake.workflowStep] =
      (stats.byWorkflowStep[mistake.workflowStep] || 0) + 1;
  });

  return stats;
}

/**
 * Filter mistakes by various criteria
 */
export function filterMistakes(
  mistakes: PersonalMushafMistake[],
  filters: {
    category?: string;
    type?: string;
    workflowStep?: string;
    recency?: MistakeRecency;
    page?: number;
    surah?: number;
  },
): PersonalMushafMistake[] {
  return mistakes.filter((mistake) => {
    if (filters.category && mistake.category !== filters.category) return false;
    if (filters.type && mistake.type !== filters.type) return false;
    if (filters.workflowStep && mistake.workflowStep !== filters.workflowStep) return false;
    if (filters.page && mistake.page !== filters.page) return false;
    if (filters.surah && mistake.surah !== filters.surah) return false;

    if (filters.recency && mistake.timeline.lastMarkedAt) {
      const recency = classifyMistakeRecency(new Date(mistake.timeline.lastMarkedAt));
      if (recency !== filters.recency) return false;
    }

    return true;
  });
}
