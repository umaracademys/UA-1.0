import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export interface QPCWordPosition {
  page: number;
  surah: number;
  ayah: number;
  wordIndex: number;
  text: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  line: number;
  isNewAyah?: boolean;
  isNewSurah?: boolean;
}

export interface QPCPageLayout {
  page: number;
  words: QPCWordPosition[];
  pageWidth: number;
  pageHeight: number;
  lines: number;
}

// Standard Mushaf dimensions (15-line format)
const PAGE_WIDTH = 1000;
const PAGE_HEIGHT = 1414; // Standard Mushaf aspect ratio
const LINES_PER_PAGE = 15;
const MARGIN_TOP = 80;
const MARGIN_BOTTOM = 80;
const MARGIN_SIDE = 60;
const LINE_HEIGHT = (PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) / LINES_PER_PAGE;

let layoutDb: Database.Database | null = null;

function initializeLayoutDb() {
  if (layoutDb) return layoutDb;
  
  try {
    const dbPath = path.join(process.cwd(), "public", "data", "layouts", "qpc-v1-15-lines.db");
    if (fs.existsSync(dbPath)) {
      layoutDb = new Database(dbPath, { readonly: true });
      console.log("[QPC Layout] Database initialized successfully");
      return layoutDb;
    } else {
      console.warn("[QPC Layout] Database not found at:", dbPath);
      return null;
    }
  } catch (error) {
    console.error("[QPC Layout] Error initializing database:", error);
    return null;
  }
}

/**
 * Load QPC layout data for a specific page
 */
export async function loadQPCLayout(page: number): Promise<QPCPageLayout | null> {
  try {
    const db = initializeLayoutDb();
    if (!db) {
      console.warn("[QPC Layout] Database not available, using fallback positioning");
      return null;
    }

    // Query layout data for this page
    const layoutData = db.prepare(`
      SELECT * FROM pages
      WHERE page_number = ?
      ORDER BY line_number, first_word_id
    `).all(page);

    if (!layoutData || layoutData.length === 0) {
      console.warn(`[QPC Layout] No layout data found for page ${page}`);
      return null;
    }

    // Load word text data (qpc-v4.json only)
    const wordDataPath = path.join(process.cwd(), "public", "data", "Mushaf files", "qpc-v4.json");
    if (!fs.existsSync(wordDataPath)) {
      console.warn("[QPC Layout] Word data file not found");
      return null;
    }

    const wordDataContent = fs.readFileSync(wordDataPath, "utf-8");
    const wordData: Record<string, any> = JSON.parse(wordDataContent);

    // Build word positions from layout data
    const words: QPCWordPosition[] = [];
    
    layoutData.forEach((line: any) => {
      const firstWordId = parseInt(line.first_word_id) || 0;
      const lastWordId = parseInt(line.last_word_id) || 0;
      const lineNumber = parseInt(line.line_number) || 1;
      
      // Calculate line Y position
      const lineY = MARGIN_TOP + (lineNumber - 1) * LINE_HEIGHT;
      
      // Find words in this line
      const wordsInLine: any[] = [];
      for (let wordId = firstWordId; wordId <= lastWordId; wordId++) {
        // Find word in word data by ID
        const wordKey = Object.keys(wordData).find(key => {
          const word = wordData[key];
          return parseInt(word.id) === wordId || parseInt(word.wordIndex) === wordId;
        });
        
        if (wordKey) {
          const word = wordData[wordKey];
          const parts = wordKey.split(":");
          if (parts.length === 3) {
            const surah = parseInt(parts[0]);
            const ayah = parseInt(parts[1]);
            const wordNum = parseInt(parts[2]);
            
            // Check if this word is on the requested page
            // (This is approximate - in production, use page mapping)
            wordsInLine.push({
              wordId,
              surah,
              ayah,
              wordNum,
              text: word.text || word.text_uthmani || "",
              wordData: word
            });
          }
        }
      }
      
      // Calculate word positions within the line (RTL)
      const lineWidth = PAGE_WIDTH - (2 * MARGIN_SIDE);
      const wordCount = wordsInLine.length;
      const avgWordWidth = 50; // Approximate word width
      const totalWordsWidth = wordCount * avgWordWidth;
      const spacing = wordCount > 1 ? (lineWidth - totalWordsWidth) / (wordCount - 1) : 0;
      
      // Position words from right to left
      let currentX = PAGE_WIDTH - MARGIN_SIDE;
      
      wordsInLine.forEach((wordInfo, idx) => {
        const wordWidth = avgWordWidth;
        const wordHeight = LINE_HEIGHT * 0.7;
        
        words.push({
          page,
          surah: wordInfo.surah,
          ayah: wordInfo.ayah,
          wordIndex: wordInfo.wordNum || idx,
          text: wordInfo.text,
          position: {
            x: currentX - wordWidth,
            y: lineY,
            width: wordWidth,
            height: wordHeight
          },
          line: lineNumber,
          isNewAyah: idx === 0 && wordInfo.wordNum === 1,
          isNewSurah: idx === 0 && wordInfo.surah && wordInfo.ayah === 1
        });
        
        currentX -= (wordWidth + spacing);
      });
    });

    return {
      page,
      words,
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
      lines: LINES_PER_PAGE
    };
  } catch (error) {
    console.error(`[QPC Layout] Error loading layout for page ${page}:`, error);
    return null;
  }
}

/**
 * Get approximate word positions when database is not available
 */
export function getApproximateWordPositions(
  page: number,
  wordData: Record<string, any>
): QPCWordPosition[] {
  const words: QPCWordPosition[] = [];
  
  // Filter words for this page (approximate)
  const pageWords: any[] = [];
  Object.entries(wordData).forEach(([key, word]) => {
    const parts = key.split(":");
    if (parts.length === 3) {
      const surah = parseInt(parts[0]);
      const ayah = parseInt(parts[1]);
      const wordNum = parseInt(parts[2]);
      
      // Approximate page mapping (this is rough)
      if (page === 1 && (surah === 1 || (surah === 2 && ayah <= 5))) {
        pageWords.push({ surah, ayah, wordNum, text: word.text || word.text_uthmani || "", key });
      }
    }
  });
  
  // Sort by surah, ayah, word
  pageWords.sort((a, b) => {
    if (a.surah !== b.surah) return a.surah - b.surah;
    if (a.ayah !== b.ayah) return a.ayah - b.ayah;
    return a.wordNum - b.wordNum;
  });
  
  // Group by approximate lines (15 words per line)
  const wordsPerLine = Math.ceil(pageWords.length / LINES_PER_PAGE);
  
  pageWords.forEach((wordInfo, index) => {
    const lineNumber = Math.floor(index / wordsPerLine) + 1;
    const wordIndexInLine = index % wordsPerLine;
    const lineY = MARGIN_TOP + (lineNumber - 1) * LINE_HEIGHT;
    const lineWidth = PAGE_WIDTH - (2 * MARGIN_SIDE);
    const wordSpacing = lineWidth / wordsPerLine;
    const wordX = PAGE_WIDTH - MARGIN_SIDE - (wordIndexInLine * wordSpacing) - (wordSpacing / 2);
    
    words.push({
      page,
      surah: wordInfo.surah,
      ayah: wordInfo.ayah,
      wordIndex: wordInfo.wordNum || index,
      text: wordInfo.text,
      position: {
        x: wordX,
        y: lineY,
        width: 50,
        height: LINE_HEIGHT * 0.7
      },
      line: lineNumber,
      isNewAyah: wordInfo.wordNum === 1,
      isNewSurah: wordInfo.surah === 1 && wordInfo.ayah === 1
    });
  });
  
  return words;
}
