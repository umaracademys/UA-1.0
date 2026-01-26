export interface TajweedRule {
  id: string;
  name: string;
  harakah?: number; // For madd types
  letters?: string[]; // For rules that apply to specific letters
  condition?: string; // Additional condition description
  description?: string;
}

export interface TajweedExplanation {
  title: string;
  description: string;
  commonMistakes: string[];
  correctPractice: string;
}

export const TAJWEED_RULES: Record<string, TajweedRule[]> = {
  madd: [
    { id: "madd_tabee", name: "Madd Tabee (Natural Madd)", harakah: 2, description: "Natural elongation, 2 harakah" },
    { id: "madd_munfasil", name: "Madd Munfasil (Separate Madd)", harakah: 4, description: "Separate madd, 4 harakah" },
    { id: "madd_muttasil", name: "Madd Muttasil (Connected Madd)", harakah: 4, description: "Connected madd, 4 harakah" },
    { id: "madd_lazim", name: "Madd Lazim (Necessary Madd)", harakah: 6, description: "Necessary madd, 6 harakah" },
    { id: "madd_arid", name: "Madd Arid (Temporary Madd)", harakah: 4, description: "Temporary madd, 4 harakah" },
    { id: "madd_badal", name: "Madd Badal (Substitute Madd)", harakah: 2, description: "Substitute madd, 2 harakah" },
    { id: "madd_lin", name: "Madd Lin (Soft Madd)", harakah: 2, description: "Soft madd, 2 harakah" },
    { id: "madd_farq", name: "Madd Farq (Distinguishing Madd)", harakah: 4, description: "Distinguishing madd, 4 harakah" },
  ],
  idgham: [
    {
      id: "idgham_ghunnah",
      name: "Idgham with Ghunnah",
      letters: ["ي", "ن", "م", "و"],
      description: "Merging with nasal sound (ghunnah) - 2 harakah",
    },
    {
      id: "idgham_no_ghunnah",
      name: "Idgham without Ghunnah",
      letters: ["ل", "ر"],
      description: "Merging without nasal sound",
    },
    {
      id: "idgham_mutajanisayn",
      name: "Idgham Mutajanisayn (Similar Letters)",
      description: "Merging of similar letters",
    },
    {
      id: "idgham_mutaqaribayn",
      name: "Idgham Mutaqaribayn (Close Letters)",
      description: "Merging of close letters",
    },
  ],
  ikhfa: [
    {
      id: "ikhfa_haqiqi",
      name: "Ikhfa Haqiqi (True Hiding)",
      letters: ["ت", "ث", "ج", "د", "ذ", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ف", "ق", "ك"],
      description: "True hiding with nasal sound - 2 harakah",
    },
    {
      id: "ikhfa_shafawi",
      name: "Ikhfa Shafawi (Labial Hiding)",
      description: "Hiding of meem sakinah before ب",
    },
  ],
  iqlab: [
    {
      id: "iqlab_ba",
      name: "Iqlab (Conversion to Meem)",
      letters: ["ب"],
      description: "Conversion of noon sakinah/tanween to meem before ب with ghunnah - 2 harakah",
    },
  ],
  qalqalah: [
    {
      id: "qalqalah_sughra",
      name: "Qalqalah Sughra (Minor Echo)",
      letters: ["ق", "ط", "ب", "ج", "د"],
      condition: "middle of word",
      description: "Echo sound when letter has sukoon in middle of word",
    },
    {
      id: "qalqalah_kubra",
      name: "Qalqalah Kubra (Major Echo)",
      letters: ["ق", "ط", "ب", "ج", "د"],
      condition: "end of word",
      description: "Echo sound when stopping on the letter at end of word",
    },
  ],
  ghunnah: [
    {
      id: "ghunnah_mutlaqah",
      name: "Ghunnah Mutlaqah (Absolute Nasal)",
      description: "Nasal sound on noon and meem - 2 harakah",
    },
    {
      id: "ghunnah_mushaddadah",
      name: "Ghunnah Mushaddadah (Emphasized Nasal)",
      description: "Stronger nasal sound when letter has shaddah - 2 harakah",
    },
  ],
  makhraj: [
    {
      id: "makhraj_jawf",
      name: "Makhraj Jawf (Oral Cavity)",
      letters: ["ا", "و", "ي"],
      description: "Letters from the oral cavity",
    },
    {
      id: "makhraj_halq",
      name: "Makhraj Halq (Throat)",
      letters: ["ء", "ه", "ع", "ح", "غ", "خ"],
      description: "Letters from the throat",
    },
    {
      id: "makhraj_lisan",
      name: "Makhraj Lisan (Tongue)",
      letters: ["ق", "ك", "ج", "ش", "ي", "ض", "ل", "ن", "ر", "ط", "د", "ت", "ظ", "ذ", "ث", "ص", "ز", "س"],
      description: "Letters from the tongue",
    },
    {
      id: "makhraj_shafatain",
      name: "Makhraj Shafatain (Lips)",
      letters: ["ب", "م", "و", "ف"],
      description: "Letters from the lips",
    },
    {
      id: "makhraj_khayshum",
      name: "Makhraj Khayshum (Nasal Passage)",
      letters: ["ن", "م"],
      description: "Letters from the nasal passage",
    },
  ],
  shaddah: [
    {
      id: "shaddah_regular",
      name: "Shaddah (Emphasis)",
      description: "Doubling of letter with emphasis - first with sukoon, second with vowel",
    },
  ],
  heavy_letter: [
    {
      id: "tafkhim_regular",
      name: "Tafkhim (Heaviness)",
      letters: ["خ", "ص", "ض", "ط", "ظ", "غ", "ق"],
      description: "Heavy pronunciation with full mouth opening",
    },
  ],
  light_l: [
    {
      id: "tarqeeq_lam",
      name: "Tarqeeq Lam (Light Lam)",
      description: "Light pronunciation of lam in Allah when preceded by kasrah",
    },
  ],
  heavy_h: [
    {
      id: "tafkhim_ha",
      name: "Tafkhim Ha (Heavy Ha)",
      description: "Heavy pronunciation of ha (ه) in specific contexts",
    },
  ],
  no_rounding_lips: [
    {
      id: "rounding_required",
      name: "Lip Rounding Required",
      letters: ["و", "م", "ب"],
      description: "Lips must be rounded for proper pronunciation",
    },
  ],
  tech: [
    {
      id: "tech_general",
      name: "Technical Tajweed Error",
      description: "General technical tajweed error",
    },
  ],
};

export const TAJWEED_EXPLANATIONS: Record<string, TajweedExplanation> = {
  madd: {
    title: "Madd (Elongation/Stretching)",
    description: "Lengthening the sound of a letter beyond its normal duration.",
    commonMistakes: ["Not holding long enough", "Holding too long", "Inconsistent duration", "Confusing different madd types"],
    correctPractice: "Count harakah mentally while reciting. Natural madd (Madd Tabee) is 2 harakah, secondary madd can be 4 or 6 harakah.",
  },
  idgham: {
    title: "Idgham (Assimilation/Merging)",
    description: "Merging of noon sakinah or tanween with the following letter.",
    commonMistakes: ["Not merging sounds properly", "Pronouncing noon separately", "Incorrect ghunnah duration", "Confusing with and without ghunnah"],
    correctPractice: "The noon sound merges completely. Idgham with ghunnah (ي، ن، م، و) requires 2 harakah nasal sound. Idgham without ghunnah (ل، ر) has no nasal sound.",
  },
  ikhfa: {
    title: "Ikhfa (Concealment/Hiding)",
    description: "Hiding the sound of noon sakinah or tanween when followed by certain letters.",
    commonMistakes: ["Fully pronouncing the noon", "Not creating nasal sound", "Confusing with idgham", "Incorrect tongue position"],
    correctPractice: "The noon sound should be partially hidden with a nasal sound (ghunnah) lasting 2 harakah. The tongue should not touch the roof of the mouth.",
  },
  iqlab: {
    title: "Iqlab (Conversion)",
    description: "Conversion of noon sakinah or tanween to meem sound when followed by ب.",
    commonMistakes: ["Not converting to meem", "Pronouncing as noon", "Missing the ghunnah", "Incorrect duration"],
    correctPractice: "The noon sound is converted to a meem sound with ghunnah (nasal sound) lasting 2 harakah when followed by ب.",
  },
  qalqalah: {
    title: "Qalqalah (Echo)",
    description: "Echo sound produced on certain letters (ق، ط، ب، ج، د) when they have sukoon or are at the end of a word.",
    commonMistakes: ["Not producing echo sound", "Echo too weak or too strong", "Confusing with regular pronunciation", "Incorrect letter emphasis"],
    correctPractice: "The echo sound should be clear and distinct. Qalqalah Sughra (minor) occurs in the middle of a word, Qalqalah Kubra (major) occurs at the end when stopping.",
  },
  ghunnah: {
    title: "Ghunnah (Nasal Sound)",
    description: "Nasal sound produced through the nose, typically associated with noon (ن) and meem (م).",
    commonMistakes: ["Not producing nasal sound", "Nasal sound too weak or too strong", "Incorrect duration", "Missing in required positions"],
    correctPractice: "The nasal sound should be clear and consistent, typically lasting 2 harakah. Required in idgham, ikhfa, and iqlab.",
  },
  makhraj: {
    title: "Makhraj (Articulation Point)",
    description: "The point of articulation where a letter is pronounced. Each Arabic letter has a specific makhraj.",
    commonMistakes: ["Pronouncing from wrong articulation point", "Mixing up similar-sounding letters", "Not using proper tongue position", "Incorrect mouth shape"],
    correctPractice: "Each letter must be pronounced from its correct articulation point. Practice with a teacher to ensure proper placement.",
  },
  shaddah: {
    title: "Shaddah (Emphasis/Doubling)",
    description: "Indicates that a letter should be doubled, with emphasis on the first occurrence.",
    commonMistakes: ["Not doubling the letter", "Weak emphasis", "Pronouncing as single letter", "Incorrect vowel on second letter"],
    correctPractice: "The letter with shaddah should be pronounced twice: once with sukoon and once with the vowel. The emphasis should be clear.",
  },
  heavy_letter: {
    title: "Heavy Letter (Tafkhim)",
    description: "Certain letters should be pronounced with heaviness (tafkhim), giving them a full, deep sound.",
    commonMistakes: ["Pronouncing heavy letters lightly", "Not opening mouth enough", "Lack of resonance", "Inconsistent heaviness"],
    correctPractice: "Heavy letters (خ، ص، ض، ط، ظ، غ، ق) should be pronounced with fullness and depth. The mouth should be open, and the sound should resonate.",
  },
  light_l: {
    title: "Light Lam (ل)",
    description: "The letter lam (ل) in the name of Allah (الله) should be pronounced lightly when preceded by a kasrah.",
    commonMistakes: ["Pronouncing lam heavily", "Not distinguishing from heavy lam", "Incorrect pronunciation", "Missing the light sound"],
    correctPractice: "The lam should be pronounced lightly (tarqeeq) when it comes after a kasrah in the word Allah.",
  },
  heavy_h: {
    title: "Heavy H (ه)",
    description: "The letter ha (ه) should be pronounced with heaviness in certain contexts.",
    commonMistakes: ["Pronouncing ha too lightly", "Not using proper breath", "Incorrect articulation", "Missing heaviness"],
    correctPractice: "The ha should have a full, heavy sound in specific positions. Practice with a teacher for proper pronunciation.",
  },
  no_rounding_lips: {
    title: "No Rounding of Lips",
    description: "Certain letters require the lips to be rounded for proper pronunciation.",
    commonMistakes: ["Not rounding lips", "Insufficient rounding", "Affecting sound quality", "Inconsistent rounding"],
    correctPractice: "The lips should be properly rounded when pronouncing letters that require it, such as و (waw) and م (meem).",
  },
  tech: {
    title: "Technical Tajweed",
    description: "Technical tajweed errors that don't fit into other specific categories.",
    commonMistakes: ["Various technical issues", "Complex rule violations", "Combination errors"],
    correctPractice: "Technical errors require specific attention and practice with a qualified teacher.",
  },
};

// Helper function to get rules for a specific mistake type
export function getTajweedRulesForType(mistakeType: string): TajweedRule[] {
  return TAJWEED_RULES[mistakeType] || [];
}

// Helper function to get explanation for a specific mistake type
export function getTajweedExplanationForType(mistakeType: string): TajweedExplanation | undefined {
  return TAJWEED_EXPLANATIONS[mistakeType];
}

// List of Tajweed mistake types
export const TAJWEED_TYPES = [
  "madd",
  "idgham",
  "ikhfa",
  "iqlab",
  "qalqalah",
  "ghunnah",
  "makhraj",
  "shaddah",
  "heavy_letter",
  "light_l",
  "heavy_h",
  "no_rounding_lips",
  "tech",
];

// Mistake types that require stretch count (harakah)
export const MADD_TYPES = ["madd"];

// Mistake types that require hold/ghunnah
export const HOLD_REQUIRED_TYPES = ["idgham", "iqlab", "ikhfa", "ghunnah"];

// Mistake types that can have focus letters
export const FOCUS_LETTERS_TYPES = ["idgham", "ikhfa", "iqlab", "qalqalah", "makhraj", "heavy_letter", "no_rounding_lips"];
