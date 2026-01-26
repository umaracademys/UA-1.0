export interface TajweedExplanation {
  title: string;
  description: string;
  examples: string[];
  rules: string;
  commonMistakes?: string[];
}

export const TAJWEED_EXPLANATIONS: Record<string, TajweedExplanation> = {
  madd: {
    title: "Madd (Elongation)",
    description:
      "Madd is the lengthening of a sound. There are different types of madd with varying durations (2, 4, or 6 counts).",
    examples: ["أَآمَنْتُم", "قَالُوا", "الضَّالِّينَ"],
    rules: "Should be held for 2, 4, or 6 counts depending on the type of madd. Natural madd (Madd Asli) is 2 counts, while secondary madd (Madd Far'i) can be 4 or 6 counts.",
    commonMistakes: [
      "Not holding the madd long enough",
      "Holding madd too long",
      "Confusing different types of madd",
    ],
  },
  ikhfa: {
    title: "Ikhfa (Hiding)",
    description:
      "Ikhfa occurs when noon sakinah or tanween is followed by certain letters. The sound should be hidden, not fully pronounced.",
    examples: ["مِنْ بَعْدِ", "أَنْبَأَكُمْ", "كِتَابٌ فِي"],
    rules: "The noon sound should be partially hidden, creating a nasal sound. The tongue should not touch the roof of the mouth.",
    commonMistakes: [
      "Fully pronouncing the noon",
      "Not creating the nasal sound",
      "Confusing with idgham",
    ],
  },
  idgham: {
    title: "Idgham (Merging)",
    description:
      "Idgham occurs when noon sakinah or tanween is followed by certain letters, causing the sounds to merge.",
    examples: ["مِنْ رَبِّهِمْ", "كِتَابٌ مَّا", "مِنْ لَّدُنْ"],
    rules: "The noon sound merges completely with the following letter. There are two types: idgham with ghunnah (nasal sound) and idgham without ghunnah.",
    commonMistakes: [
      "Not merging the sounds properly",
      "Pronouncing the noon separately",
      "Incorrect ghunnah duration",
    ],
  },
  iqlab: {
    title: "Iqlab (Conversion)",
    description:
      "Iqlab occurs when noon sakinah or tanween is followed by the letter ب (ba), converting the sound to meem.",
    examples: ["مِنْ بَعْدِ", "كِتَابٌ بَيْنِ", "أَنْبَأَكُمْ"],
    rules: "The noon sound is converted to a meem sound with ghunnah (nasal sound) when followed by ب.",
    commonMistakes: [
      "Not converting to meem",
      "Pronouncing as noon",
      "Missing the ghunnah",
    ],
  },
  qalqalah: {
    title: "Qalqalah (Echo)",
    description:
      "Qalqalah is an echo sound produced on certain letters (ق, ط, ب, ج, د) when they have sukoon or are at the end of a word.",
    examples: ["يَدْعُ", "يَطْمَعُ", "أَبْ"],
    rules: "The echo sound should be clear and distinct. Qalqalah can be strong (when the letter has sukoon) or light (when stopping on the letter).",
    commonMistakes: [
      "Not producing the echo sound",
      "Echo too weak or too strong",
      "Confusing with regular pronunciation",
    ],
  },
  makhraj: {
    title: "Makhraj (Articulation Point)",
    description:
      "Makhraj refers to the point of articulation where a letter is pronounced. Each Arabic letter has a specific makhraj.",
    examples: ["ب", "ت", "ث", "ج", "ح", "خ"],
    rules: "Each letter must be pronounced from its correct articulation point. Common mistakes include pronouncing letters from the wrong place in the mouth or throat.",
    commonMistakes: [
      "Pronouncing from wrong articulation point",
      "Mixing up similar-sounding letters",
      "Not using proper tongue position",
    ],
  },
  ghunna: {
    title: "Ghunna (Nasal Sound)",
    description:
      "Ghunna is a nasal sound produced through the nose, typically associated with noon (ن) and meem (م).",
    examples: ["مِنْ", "أَنْ", "أَمْ"],
    rules: "The nasal sound should be clear and consistent. It typically lasts for 2 counts. Ghunna is required in idgham, ikhfa, and iqlab.",
    commonMistakes: [
      "Not producing nasal sound",
      "Nasal sound too weak or too strong",
      "Incorrect duration",
    ],
  },
  shaddah: {
    title: "Shaddah (Emphasis)",
    description:
      "Shaddah indicates that a letter should be doubled, with emphasis on the first occurrence.",
    examples: ["الضَّالِّينَ", "الرَّحْمَٰنِ", "مُحَمَّدٌ"],
    rules: "The letter with shaddah should be pronounced twice: once with sukoon and once with the vowel. The emphasis should be clear.",
    commonMistakes: [
      "Not doubling the letter",
      "Weak emphasis",
      "Pronouncing as single letter",
    ],
  },
  heavy_letter: {
    title: "Heavy Letter (Tafkhim)",
    description:
      "Certain letters should be pronounced with heaviness (tafkhim), giving them a full, deep sound.",
    examples: ["خ", "ص", "ض", "ط", "ظ", "غ", "ق"],
    rules: "Heavy letters should be pronounced with fullness and depth. The mouth should be open, and the sound should resonate.",
    commonMistakes: [
      "Pronouncing heavy letters lightly",
      "Not opening mouth enough",
      "Lack of resonance",
    ],
  },
  light_l: {
    title: "Light Lam (ل)",
    description:
      "The letter lam (ل) in the name of Allah (الله) should be pronounced lightly when preceded by a kasrah.",
    examples: ["بِسْمِ اللَّهِ", "فِي اللَّهِ"],
    rules: "The lam should be pronounced lightly (tarqeeq) when it comes after a kasrah in the word Allah.",
    commonMistakes: [
      "Pronouncing lam heavily",
      "Not distinguishing from heavy lam",
      "Incorrect pronunciation",
    ],
  },
  heavy_h: {
    title: "Heavy H (ه)",
    description:
      "The letter ha (ه) should be pronounced with heaviness in certain contexts.",
    examples: ["هُوَ", "هُمْ"],
    rules: "The ha should have a full, heavy sound in specific positions.",
    commonMistakes: [
      "Pronouncing ha too lightly",
      "Not using proper breath",
      "Incorrect articulation",
    ],
  },
  no_rounding_lips: {
    title: "No Rounding of Lips",
    description:
      "Certain letters require the lips to be rounded for proper pronunciation.",
    examples: ["و", "م", "ب"],
    rules: "The lips should be properly rounded when pronouncing letters that require it, such as و (waw) and م (meem).",
    commonMistakes: [
      "Not rounding lips",
      "Insufficient rounding",
      "Affecting sound quality",
    ],
  },
  tech: {
    title: "Technical Tajweed",
    description:
      "Technical tajweed errors that don't fit into other specific categories.",
    examples: ["Various"],
    rules: "Technical errors related to tajweed rules that require specific attention.",
    commonMistakes: ["Various technical issues"],
  },
};

export function getTajweedExplanation(type: string): TajweedExplanation | undefined {
  return TAJWEED_EXPLANATIONS[type];
}
