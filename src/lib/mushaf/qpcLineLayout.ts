export interface WordPosition {
  page: number;
  surah: number;
  ayah: number;
  wordIndex: number;
  text: string;
  textUthmani: string;
  lineNumber: number; // CRITICAL: Line number (1-15)
  positionInLine: number; // Position within the line
  isLastWordOfAyah?: boolean;
}

export interface LineData {
  lineNumber: number;
  words: WordPosition[];
  width: number;
  height: number;
  y: number; // Y position of the line
}

export interface PageLayout {
  page: number;
  lines: LineData[];
  pageWidth: number;
  pageHeight: number;
}

// Standard Mushaf dimensions (15-line format)
const PAGE_WIDTH = 1000;
const PAGE_HEIGHT = 1414;
const LINES_PER_PAGE = 15;
const MARGIN_TOP = 100;
const MARGIN_BOTTOM = 100;
const MARGIN_SIDE = 80;
const LINE_SPACING = (PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) / (LINES_PER_PAGE - 1);

/**
 * Organize words into lines for proper rendering
 */
export function organizeWordsIntoLines(
  page: number,
  words: Array<{
    surah: number;
    ayah: number;
    wordIndex: number;
    text: string;
    lineNumber?: number;
    position?: { x: number; y: number; width: number; height: number };
  }>
): PageLayout {
  // Group words by line number
  const wordsByLine = new Map<number, WordPosition[]>();
  
  // Track last word of each ayah
  const ayahLastWords = new Map<string, number>();
  words.forEach((word, idx) => {
    const ayahKey = `${word.surah}:${word.ayah}`;
    const currentLast = ayahLastWords.get(ayahKey);
    if (currentLast === undefined || word.wordIndex > currentLast) {
      ayahLastWords.set(ayahKey, word.wordIndex);
    }
  });
  
  words.forEach((word, idx) => {
    const lineNumber = word.lineNumber || Math.floor(idx / Math.ceil(words.length / LINES_PER_PAGE)) + 1;
    const ayahKey = `${word.surah}:${word.ayah}`;
    const isLastWordOfAyah = ayahLastWords.get(ayahKey) === word.wordIndex;
    
    const wordData: WordPosition = {
      page,
      surah: word.surah,
      ayah: word.ayah,
      wordIndex: word.wordIndex,
      text: word.text || "",
      textUthmani: word.text || "",
      lineNumber: Math.min(lineNumber, LINES_PER_PAGE),
      positionInLine: idx,
      isLastWordOfAyah
    };
    
    if (!wordsByLine.has(wordData.lineNumber)) {
      wordsByLine.set(wordData.lineNumber, []);
    }
    wordsByLine.get(wordData.lineNumber)!.push(wordData);
  });
  
  // Create line data with proper positioning
  const lines: LineData[] = [];
  
  for (let lineNum = 1; lineNum <= LINES_PER_PAGE; lineNum++) {
    const lineWords = wordsByLine.get(lineNum) || [];
    
    if (lineWords.length > 0) {
      // Sort words by their original order (surah, ayah, wordIndex)
      lineWords.sort((a, b) => {
        if (a.surah !== b.surah) return a.surah - b.surah;
        if (a.ayah !== b.ayah) return a.ayah - b.ayah;
        return a.wordIndex - b.wordIndex;
      });
      
      // Update positionInLine based on sorted order
      lineWords.forEach((word, idx) => {
        word.positionInLine = idx;
      });
      
      lines.push({
        lineNumber: lineNum,
        words: lineWords,
        width: PAGE_WIDTH - (2 * MARGIN_SIDE),
        height: 60,
        y: MARGIN_TOP + ((lineNum - 1) * LINE_SPACING)
      });
    }
  }
  
  return {
    page,
    lines,
    pageWidth: PAGE_WIDTH,
    pageHeight: PAGE_HEIGHT
  };
}

/**
 * Convert Arabic-Indic numerals
 */
export function convertToArabicNumerals(num: number | string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num)
    .split('')
    .map(digit => {
      const d = parseInt(digit);
      return isNaN(d) ? digit : arabicNumerals[d];
    })
    .join('');
}
