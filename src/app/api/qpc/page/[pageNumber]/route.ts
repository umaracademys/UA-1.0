import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { SURAHS, getSurahByPage } from "@/lib/mushaf/surahData";
import { getJuzByPage } from "@/lib/mushaf/juzData";

// Load QPC word-by-word data from public/data folder
let qpcWordsCache: Record<string, any> | null = null;
let qpcWordsLoading: Promise<Record<string, any>> | null = null;

async function loadQPCWords(): Promise<Record<string, any>> {
  // If already cached, return immediately
  if (qpcWordsCache) {
    console.log(`[loadQPCWords] Using cached data (${Object.keys(qpcWordsCache).length} words)`);
    return qpcWordsCache;
  }
  
  // If already loading, wait for that promise
  if (qpcWordsLoading) {
    console.log(`[loadQPCWords] Already loading, waiting for existing load...`);
    return qpcWordsLoading;
  }

  // Create loading promise
  qpcWordsLoading = (async () => {
    const startTime = Date.now();
    try {
      const filePath = path.join(process.cwd(), "public", "data", "qpc-hafs-word-by-word.json");
      console.log(`[loadQPCWords] Loading from: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        console.error(`[loadQPCWords] File does not exist: ${filePath}`);
        // Try alternative path
        const altPath = path.join(process.cwd(), "public", "data", "words", "word_by_word.json");
        if (fs.existsSync(altPath)) {
          console.log(`[loadQPCWords] Using alternative path: ${altPath}`);
          try {
            const fileContent = fs.readFileSync(altPath, "utf-8");
            console.log(`[loadQPCWords] File read (${(fileContent.length / 1024 / 1024).toFixed(2)} MB), parsing JSON...`);
            qpcWordsCache = JSON.parse(fileContent);
            const duration = Date.now() - startTime;
            console.log(`[loadQPCWords] ✓ Successfully loaded ${qpcWordsCache ? Object.keys(qpcWordsCache).length : 0} words in ${duration}ms`);
            qpcWordsLoading = null; // Clear loading promise
            return qpcWordsCache!;
          } catch (parseError: any) {
            console.error(`[loadQPCWords] JSON parse error:`, parseError.message);
            qpcWordsLoading = null;
            return {};
          }
        }
        qpcWordsLoading = null;
        return {};
      }
      
      console.log(`[loadQPCWords] Reading file...`);
      const fileStats = fs.statSync(filePath);
      console.log(`[loadQPCWords] File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
      
      const fileContent = fs.readFileSync(filePath, "utf-8");
      console.log(`[loadQPCWords] File read (${(fileContent.length / 1024 / 1024).toFixed(2)} MB), parsing JSON...`);
      
      // Parse with timeout protection
      qpcWordsCache = JSON.parse(fileContent);
      const duration = Date.now() - startTime;
      console.log(`[loadQPCWords] ✓ Successfully loaded ${qpcWordsCache ? Object.keys(qpcWordsCache).length : 0} words in ${duration}ms`);
      qpcWordsLoading = null; // Clear loading promise
      return qpcWordsCache!;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[loadQPCWords] ✗ Error after ${duration}ms:`, error.message || error);
      // Try alternative path
      try {
        const altPath = path.join(process.cwd(), "public", "data", "words", "word_by_word.json");
        if (fs.existsSync(altPath)) {
          console.log(`[loadQPCWords] Trying alternative path: ${altPath}`);
          const fileContent = fs.readFileSync(altPath, "utf-8");
          qpcWordsCache = JSON.parse(fileContent);
          const duration2 = Date.now() - startTime;
          console.log(`[loadQPCWords] ✓ Successfully loaded from alternative path: ${qpcWordsCache ? Object.keys(qpcWordsCache).length : 0} words in ${duration2}ms`);
          qpcWordsLoading = null;
          return qpcWordsCache!;
        }
      } catch (altError: any) {
        console.error(`[loadQPCWords] Alternative path also failed:`, altError.message || altError);
      }
      qpcWordsLoading = null;
      return {};
    }
  })();
  
  return qpcWordsLoading;
}

// Map of page numbers to word ranges using surah data
// This is approximate - accurate positions would come from the layout database
function getWordsForPage(page: number, allWords: Record<string, any>): any[] {
  const words: any[] = [];
  
  // Special handling for page 1
  if (page === 1) {
    console.log(`[getWordsForPage] Processing page 1...`);
    let surah1Count = 0;
    let surah2Count = 0;
    
    for (const [location, wordData] of Object.entries(allWords)) {
      const parts = location.split(":");
      if (parts.length !== 3) {
        console.warn(`[getWordsForPage] Invalid location format: ${location}`);
        continue;
      }
      
      const surah = parseInt(parts[0], 10);
      const ayah = parseInt(parts[1], 10);
      
      if (isNaN(surah) || isNaN(ayah)) {
        console.warn(`[getWordsForPage] Invalid surah/ayah in location: ${location}`);
        continue;
      }
      
      // Page 1 contains all of Surah 1 (Al-Fatihah - 7 verses) and first part of Surah 2
      if (surah === 1) {
        // All of Al-Fatihah is on page 1
        words.push({
          ...wordData,
          location,
          wordIndex: parseInt(wordData.id) || 0,
          surah: parseInt(wordData.surah) || surah,
          ayah: parseInt(wordData.ayah) || ayah,
          word: parseInt(wordData.word) || 0,
        });
        surah1Count++;
      } else if (surah === 2 && ayah <= 5) {
        // First 5 ayahs of Al-Baqarah are on page 1
        words.push({
          ...wordData,
          location,
          wordIndex: parseInt(wordData.id) || 0,
          surah: parseInt(wordData.surah) || surah,
          ayah: parseInt(wordData.ayah) || ayah,
          word: parseInt(wordData.word) || 0,
        });
        surah2Count++;
      }
    }
    
    console.log(`[getWordsForPage] Page 1: Found ${surah1Count} words from Surah 1, ${surah2Count} words from Surah 2 (ayahs 1-5)`);
  } else {
    // For other pages, use surah start page logic
    const currentSurah = getSurahByPage(page);
    const nextSurah = SURAHS.find((s) => s.startPage > page);
    
    if (!currentSurah) {
      return words;
    }
    
    const startSurah = currentSurah.id;
    const endSurah = nextSurah ? nextSurah.id - 1 : 114;
    
    for (const [location, wordData] of Object.entries(allWords)) {
      const [surah, ayah] = location.split(":").map(Number);
      
      if (surah < startSurah || surah > endSurah) {
        continue;
      }
      
      // Include all words from surahs on this page
      words.push({
        ...wordData,
        location,
        wordIndex: parseInt(wordData.id) || 0,
        surah: parseInt(wordData.surah) || surah,
        ayah: parseInt(wordData.ayah) || ayah,
        word: parseInt(wordData.word) || 0,
      });
    }
  }
  
  // Sort by surah, ayah, word
  words.sort((a, b) => {
    if (a.surah !== b.surah) return a.surah - b.surah;
    if (a.ayah !== b.ayah) return a.ayah - b.ayah;
    return a.word - b.word;
  });
  
  return words;
}

export async function GET(
  request: Request,
  context: { params: { pageNumber: string } }
) {
  const startTime = Date.now();
  const MAX_RESPONSE_TIME = 30000; // 30 seconds max
  
  try {
    console.log(`[QPC API] ===== GET request for page: ${context.params.pageNumber} =====`);
    const pageNumber = parseInt(context.params.pageNumber, 10);
    console.log(`[QPC API] Parsed page number: ${pageNumber}`);
    
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > 604) {
      console.error(`[QPC API] Invalid page number: ${pageNumber}`);
      return NextResponse.json(
        { error: "Invalid page number. Must be between 1 and 604." },
        { status: 400 }
      );
    }

    console.log(`[QPC API] Loading QPC words...`);
    const loadStartTime = Date.now();
    
    // Add timeout for word loading
    const loadWordsPromise = loadQPCWords();
    const timeoutPromise = new Promise<Record<string, any>>((_, reject) => {
      setTimeout(() => reject(new Error('Word loading timeout')), 15000); // 15 second timeout
    });
    
    let allWords: Record<string, any>;
    try {
      allWords = await Promise.race([loadWordsPromise, timeoutPromise]);
    } catch (loadError: any) {
      console.error(`[QPC API] Error loading words:`, loadError.message);
      return NextResponse.json(
        { error: "Failed to load QPC word data", page: pageNumber, words: [] },
        { status: 500 }
      );
    }
    
    const loadDuration = Date.now() - loadStartTime;
    console.log(`[QPC API] QPC words loaded in ${loadDuration}ms`);
    console.log(`[QPC API] Loaded ${Object.keys(allWords).length} total words from QPC data`);
    
    if (Object.keys(allWords).length === 0) {
      console.error(`[QPC API] ERROR: No words loaded from QPC data file`);
      return NextResponse.json(
        { error: "QPC data file is empty or not found", page: pageNumber, words: [] },
        { status: 500 }
      );
    }
    
    // Debug: Check if we have words for page 1
    if (pageNumber === 1) {
      const surah1Keys = Object.keys(allWords).filter(k => k.startsWith('1:'));
      const surah2Keys = Object.keys(allWords).filter(k => k.startsWith('2:') && parseInt(k.split(':')[1]) <= 5);
      console.log(`[QPC API] Debug for page 1: Found ${surah1Keys.length} keys for Surah 1, ${surah2Keys.length} keys for Surah 2 (ayahs 1-5)`);
      console.log(`[QPC API] Sample Surah 1 keys:`, surah1Keys.slice(0, 3));
      console.log(`[QPC API] Sample Surah 2 keys:`, surah2Keys.slice(0, 3));
    }
    
    let pageWords = getWordsForPage(pageNumber, allWords);
    console.log(`[QPC API] Found ${pageWords.length} words for page ${pageNumber}`);
    
    // Fallback: If getWordsForPage returns 0, try direct filtering
    if (pageWords.length === 0 && pageNumber === 1) {
      console.log(`[QPC API] Fallback: Attempting direct filter for page 1...`);
      const directWords: any[] = [];
      for (const [location, wordData] of Object.entries(allWords)) {
        const parts = location.split(":");
        if (parts.length === 3) {
          const surah = parseInt(parts[0], 10);
          const ayah = parseInt(parts[1], 10);
          if (!isNaN(surah) && !isNaN(ayah)) {
            if (surah === 1 || (surah === 2 && ayah <= 5)) {
              directWords.push({
                ...wordData,
                location,
                wordIndex: parseInt(wordData.id) || 0,
                surah: parseInt(wordData.surah) || surah,
                ayah: parseInt(wordData.ayah) || ayah,
                word: parseInt(wordData.word) || 0,
              });
            }
          }
        }
      }
      console.log(`[QPC API] Fallback: Direct filter found ${directWords.length} words`);
      if (directWords.length > 0) {
        // Sort and use direct words
        directWords.sort((a, b) => {
          if (a.surah !== b.surah) return a.surah - b.surah;
          if (a.ayah !== b.ayah) return a.ayah - b.ayah;
          return a.word - b.word;
        });
        pageWords = directWords;
        console.log(`[QPC API] Using fallback words: ${pageWords.length} words`);
      }
    }
    
    if (pageWords.length === 0) {
      console.error(`[QPC API] ERROR: No words found for page ${pageNumber} after all attempts`);
      return NextResponse.json({
        page: pageNumber,
        words: [],
        error: "No words found for this page",
        debug: {
          totalWords: Object.keys(allWords).length,
          sampleKeys: Object.keys(allWords).slice(0, 5),
          page1Surah1Keys: pageNumber === 1 ? Object.keys(allWords).filter(k => k.startsWith('1:')).length : 0,
          page1Surah2Keys: pageNumber === 1 ? Object.keys(allWords).filter(k => k.startsWith('2:') && parseInt(k.split(':')[1]) <= 5).length : 0,
        }
      });
    }
    
    // Try to load layout data from database (with timeout protection)
    let layoutData: any[] = [];
    try {
      const dbPath = path.join(process.cwd(), "public", "data", "layouts", "qpc-v1-15-lines.db");
      if (fs.existsSync(dbPath)) {
        console.log(`[QPC API] Loading layout data from database for page ${pageNumber}`);
        const dbStartTime = Date.now();
        
        try {
          const db = new Database(dbPath, { readonly: true });
          layoutData = db.prepare(`
            SELECT * FROM pages 
            WHERE page_number = ?
            ORDER BY line_number
          `).all(pageNumber);
          db.close();
          const dbDuration = Date.now() - dbStartTime;
          console.log(`[QPC API] Loaded ${layoutData.length} lines from layout database in ${dbDuration}ms`);
        } catch (dbError: any) {
          const dbDuration = Date.now() - dbStartTime;
          console.error(`[QPC API] Error querying layout database after ${dbDuration}ms:`, dbError.message);
          console.log("[QPC API] Using estimated positions");
        }
      } else {
        console.log(`[QPC API] Layout database not found at: ${dbPath}`);
      }
    } catch (layoutError: any) {
      console.error(`[QPC API] Layout database error:`, layoutError.message);
      console.log("[QPC API] Using estimated positions");
    }
    
    // Standard Mushaf dimensions (15-line format) - QPC V1 Standard
    const PAGE_WIDTH = 1000;
    const PAGE_HEIGHT = 1414; // Standard Mushaf aspect ratio (A4-like)
    const LINES_PER_PAGE = 15;
    const MARGIN_TOP = 80;
    const MARGIN_BOTTOM = 80;
    const MARGIN_SIDE = 60;
    const LINE_HEIGHT = (PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) / LINES_PER_PAGE;
    
    console.log(`[QPC API] Processing ${pageWords.length} words into positions...`);
    const processStartTime = Date.now();
    
    const wordPositions = pageWords.map((word, index) => {
      // Find which line this word belongs to based on word ID
      // The layout database has first_word_id and last_word_id for each line
      const wordId = parseInt(word.id) || word.wordIndex || index + 1;
      const layoutLine = layoutData.find((l: any) => {
        const firstId = parseInt(l.first_word_id) || 0;
        const lastId = parseInt(l.last_word_id) || 0;
        return wordId >= firstId && wordId <= lastId && l.line_type === 'ayah';
      });
      
      let x = MARGIN_SIDE;
      let y = MARGIN_TOP;
      let width = 60; // Default word width for Arabic text
      let height = LINE_HEIGHT * 0.7; // Word height within line
      let lineNumber = 1;
      
      if (layoutLine) {
        // Use layout line data from database
        lineNumber = parseInt(layoutLine.line_number) || 1;
        y = MARGIN_TOP + (lineNumber - 1) * LINE_HEIGHT + (LINE_HEIGHT * 0.15); // Center vertically in line
        
        // Calculate position within the line
        const firstWordId = parseInt(layoutLine.first_word_id) || 0;
        const lastWordId = parseInt(layoutLine.last_word_id) || 0;
        const wordsInLine = Math.max(lastWordId - firstWordId + 1, 1);
        const wordIndexInLine = wordId - firstWordId;
        
        // RTL layout: words flow from right to left
        const availableWidth = PAGE_WIDTH - (MARGIN_SIDE * 2);
        const avgWordWidth = 60; // Average Arabic word width
        const totalWordsWidth = wordsInLine * avgWordWidth;
        const totalSpacing = availableWidth - totalWordsWidth;
        const spacing = wordsInLine > 1 ? totalSpacing / (wordsInLine - 1) : 0;
        
        // Position from right (RTL)
        const wordX = PAGE_WIDTH - MARGIN_SIDE - (wordIndexInLine * (avgWordWidth + spacing)) - avgWordWidth;
        x = wordX;
        width = avgWordWidth;
      } else {
        // Estimate position based on word order
        // Group words by ayah and line
        const wordsInAyah = pageWords.filter(w => w.surah === word.surah && w.ayah === word.ayah);
        const wordIndexInAyah = wordsInAyah.findIndex(w => w.word === word.word);
        const ayahIndex = Array.from(new Set(pageWords.map(w => `${w.surah}:${w.ayah}`))).indexOf(`${word.surah}:${word.ayah}`);
        
        // Estimate line based on word order (fallback when no layout data)
        const wordsPerLineEstimate = Math.ceil(pageWords.length / LINES_PER_PAGE);
        lineNumber = Math.floor(index / wordsPerLineEstimate) + 1;
        if (lineNumber > LINES_PER_PAGE) lineNumber = LINES_PER_PAGE;
        
        y = MARGIN_TOP + (lineNumber - 1) * LINE_HEIGHT + (LINE_HEIGHT * 0.15);
        
        // Estimate x position (RTL, so start from right)
        const wordsInLine = pageWords.filter((w, idx) => {
          const wLineNumber = Math.floor(idx / wordsPerLineEstimate) + 1;
          return wLineNumber === lineNumber;
        });
        const wordIndexInLine = wordsInLine.findIndex(w => 
          w.surah === word.surah && w.ayah === word.ayah && w.word === word.word
        );
        
        // RTL layout: words flow from right to left
        const wordsPerLine = wordsInLine.length;
        const availableWidth = PAGE_WIDTH - (MARGIN_SIDE * 2);
        const avgWordWidth = 60;
        const totalWordsWidth = wordsPerLine * avgWordWidth;
        const totalSpacing = availableWidth - totalWordsWidth;
        const spacing = wordsPerLine > 1 ? totalSpacing / (wordsPerLine - 1) : 0;
        
        x = PAGE_WIDTH - MARGIN_SIDE - (wordIndexInLine * (avgWordWidth + spacing)) - avgWordWidth;
        width = avgWordWidth;
      }
      
      return {
        wordIndex: index,
        surah: word.surah,
        ayah: word.ayah,
        position: {
          x,
          y,
          width,
          height,
        },
        text: word.text,
        lineNumber,
      };
    });

    // Organize words into lines for proper rendering
    const { organizeWordsIntoLines } = await import("@/lib/mushaf/qpcLineLayout");
    
    // Convert wordPositions to format expected by organizeWordsIntoLines
    const wordsForLayout = wordPositions.map((wp: any) => ({
      surah: wp.surah,
      ayah: wp.ayah,
      wordIndex: wp.wordIndex,
      text: wp.text || "",
      lineNumber: wp.lineNumber || 1,
      position: wp.position
    }));
    
    const pageLayout = organizeWordsIntoLines(pageNumber, wordsForLayout);
    
    const response = {
      page: pageNumber,
      words: wordPositions, // Keep for backward compatibility
      layout: pageLayout, // New line-based layout
    };
    
    const totalDuration = Date.now() - startTime;
    console.log(`[QPC API] ✓ Returning ${wordPositions.length} words in ${pageLayout.lines.length} lines for page ${pageNumber} (total: ${totalDuration}ms)`);
    
    if (wordPositions.length > 0) {
      console.log(`[QPC API] First word: surah=${wordPositions[0].surah}, ayah=${wordPositions[0].ayah}, text=${wordPositions[0].text?.substring(0, 20)}`);
      console.log(`[QPC API] Lines: ${pageLayout.lines.map(l => `Line ${l.lineNumber}: ${l.words.length} words`).join(', ')}`);
    } else {
      console.error(`[QPC API] ✗ ERROR: wordPositions array is empty after processing`);
    }
    
    // Check if we're taking too long
    if (totalDuration > 30000) {
      console.warn(`[QPC API] ⚠ WARNING: Response took ${totalDuration}ms (exceeds 30s)`);
    }
    
    return NextResponse.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[QPC API] Error after ${duration}ms:`, error.message || error);
    console.error(`[QPC API] Error stack:`, error.stack);
    return NextResponse.json(
      { error: "Internal server error", message: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
