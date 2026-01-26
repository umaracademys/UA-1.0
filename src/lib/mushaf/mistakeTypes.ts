export type MistakeCategory = "tajweed" | "letter" | "stop" | "memory" | "other" | "atkees";

export interface MistakeType {
  value: string;
  label: string;
  category: MistakeCategory;
  description?: string;
}

export const MISTAKE_TYPES: MistakeType[] = [
  // Regular Mistakes
  {
    value: "memory",
    label: "Memory Error",
    category: "memory",
    description: "Student forgot or incorrectly recalled the text",
  },
  {
    value: "wrong_letter",
    label: "Wrong Letter",
    category: "letter",
    description: "Incorrect letter pronunciation",
  },
  {
    value: "missing_letter",
    label: "Missing Letter",
    category: "letter",
    description: "Letter was omitted from recitation",
  },
  {
    value: "extra_letter",
    label: "Extra Letter",
    category: "letter",
    description: "Letter was added incorrectly",
  },
  {
    value: "wrong_stop",
    label: "Wrong Stop",
    category: "stop",
    description: "Incorrect stopping point",
  },
  {
    value: "missing_stop",
    label: "Missing Stop",
    category: "stop",
    description: "Required stop was omitted",
  },
  {
    value: "repetition",
    label: "Repetition (Atkees)",
    category: "atkees",
    description: "Student repeated a word or phrase",
  },

  // Tajweed Mistakes
  {
    value: "madd",
    label: "Madd (Stretch)",
    category: "tajweed",
    description: "Incorrect elongation of sound",
  },
  {
    value: "ikhfa",
    label: "Ikhfa (Hiding)",
    category: "tajweed",
    description: "Incorrect hiding of noon sakinah or tanween",
  },
  {
    value: "tech",
    label: "Tech",
    category: "tajweed",
    description: "Technical tajweed error",
  },
  {
    value: "heavy_letter",
    label: "Heavy Letter",
    category: "tajweed",
    description: "Letter should be pronounced with heaviness (tafkhim)",
  },
  {
    value: "no_rounding_lips",
    label: "No Rounding of Lips",
    category: "tajweed",
    description: "Lips should be rounded for proper pronunciation",
  },
  {
    value: "heavy_h",
    label: "Heavy H",
    category: "tajweed",
    description: "Heavy ha (ه) pronunciation error",
  },
  {
    value: "light_l",
    label: "Light L",
    category: "tajweed",
    description: "Light lam (ل) pronunciation error",
  },
  {
    value: "idgham",
    label: "Idgham (Merging)",
    category: "tajweed",
    description: "Incorrect merging of letters",
  },
  {
    value: "iqlab",
    label: "Iqlab (Conversion)",
    category: "tajweed",
    description: "Incorrect conversion of noon sakinah to meem",
  },
  {
    value: "qalqalah",
    label: "Qalqalah (Echo)",
    category: "tajweed",
    description: "Incorrect echo sound on qalqalah letters",
  },
  {
    value: "makhraj",
    label: "Makhraj (Articulation Point)",
    category: "tajweed",
    description: "Incorrect articulation point",
  },
  {
    value: "ghunna",
    label: "Ghunna (Nasal Sound)",
    category: "tajweed",
    description: "Incorrect nasal sound",
  },
  {
    value: "shaddah",
    label: "Shaddah (Emphasis)",
    category: "tajweed",
    description: "Incorrect emphasis on letter",
  },
  {
    value: "other",
    label: "Other",
    category: "other",
    description: "Other types of mistakes",
  },
];

export const MISTAKE_CATEGORIES: Record<MistakeCategory, { label: string; description: string }> = {
  tajweed: {
    label: "Tajweed",
    description: "Rules of proper Quranic recitation",
  },
  letter: {
    label: "Letter",
    description: "Letter pronunciation errors",
  },
  stop: {
    label: "Stop",
    description: "Stopping point errors",
  },
  memory: {
    label: "Memory",
    description: "Memory-related errors",
  },
  atkees: {
    label: "Atkees",
    description: "Repetition errors",
  },
  other: {
    label: "Other",
    description: "Other types of mistakes",
  },
};

export function getMistakeType(value: string): MistakeType | undefined {
  return MISTAKE_TYPES.find((type) => type.value === value);
}

export function getMistakesByCategory(category: MistakeCategory): MistakeType[] {
  return MISTAKE_TYPES.filter((type) => type.category === category);
}
