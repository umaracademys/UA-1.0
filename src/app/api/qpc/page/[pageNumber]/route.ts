import { NextResponse } from "next/server";
import {
  getWordsForPageFromV1Db,
  getLayoutFromV1Db,
  isV1Available,
  getWordsForPageFromQpcV4,
  getQpcV4TotalWords,
  getLayoutFromLocalDb,
  isLocalLayoutAvailable,
} from "@/lib/mushaf/localMushafData";

const TOTAL_PAGES = 604;
const PAGE_WIDTH = 1000;
const PAGE_HEIGHT = 1414;
const LINES_PER_PAGE = 15;
const MARGIN_TOP = 80;
const MARGIN_BOTTOM = 80;
const MARGIN_SIDE = 60;
const LINE_HEIGHT = (PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) / LINES_PER_PAGE;

export async function GET(
  request: Request,
  context: { params: { pageNumber: string } }
) {
  const startTime = Date.now();

  try {
    const pageNumber = parseInt(context.params.pageNumber, 10);
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > TOTAL_PAGES) {
      return NextResponse.json({ error: "Invalid page number. Must be between 1 and 604." }, { status: 400 });
    }

    let wordPositions: Array<{
      wordIndex: number;
      surah: number;
      ayah: number;
      position: { x: number; y: number; width: number; height: number };
      text: string;
      lineNumber: number;
    }> = [];
    let layoutMeta: { line_number: number; line_type: string; surah_number: number | null }[] = [];
    let totalWords = 0;
    let source: "v1" | "qpc-v4" = "qpc-v4";

    if (isV1Available()) {
      const layoutRows = getLayoutFromV1Db(pageNumber);
      layoutMeta = layoutRows.map((r) => ({
        line_number: r.line_number,
        line_type: String(r.line_type ?? "ayah"),
        surah_number: r.surah_number ?? null,
      }));
      const pageWords = getWordsForPageFromV1Db(pageNumber);
      if (pageWords.length > 0) {
        source = "v1";
        const availableWidth = PAGE_WIDTH - MARGIN_SIDE * 2;
        const avgWordWidth = 55;
        let index = 0;
        for (const w of pageWords) {
          const wordsInLine = pageWords
            .filter((p) => p.lineNumber === w.lineNumber)
            .sort((a, b) => {
              if (a.surah !== b.surah) return a.surah - b.surah;
              if (a.ayah !== b.ayah) return a.ayah - b.ayah;
              return a.wordIndex - b.wordIndex;
            });
          const idxInLine = wordsInLine.findIndex((p) => p.id === w.id);
          const wordsPerLine = wordsInLine.length;
          const totalWordsWidth = wordsPerLine * avgWordWidth;
          const spacing = wordsPerLine > 1 ? (availableWidth - totalWordsWidth) / (wordsPerLine - 1) : 0;
          const x = PAGE_WIDTH - MARGIN_SIDE - idxInLine * (avgWordWidth + spacing) - avgWordWidth;
          const y = MARGIN_TOP + (w.lineNumber - 1) * LINE_HEIGHT + LINE_HEIGHT * 0.15;
          wordPositions.push({
            wordIndex: index,
            surah: w.surah,
            ayah: w.ayah,
            position: { x, y, width: avgWordWidth, height: LINE_HEIGHT * 0.7 },
            text: w.text,
            lineNumber: w.lineNumber,
          });
          index++;
        }
      }
    }

    if (wordPositions.length === 0) {
      const pageWords = getWordsForPageFromQpcV4(pageNumber);
      totalWords = getQpcV4TotalWords();
      if (pageWords.length === 0) {
        return NextResponse.json({
          page: pageNumber,
          words: [],
          error: "No words found for this page",
          meta: { totalWords, source: "qpc-v4" as const },
        });
      }
      const wordsPerLineEstimate = Math.ceil(pageWords.length / LINES_PER_PAGE);
      wordPositions = pageWords.map((word, index) => {
        const lineNumber = Math.min(Math.floor(index / wordsPerLineEstimate) + 1, LINES_PER_PAGE);
        const wordsInLine = pageWords.filter((_, idx) => {
          const ln = Math.floor(idx / wordsPerLineEstimate) + 1;
          return ln === lineNumber;
        });
        const wordIndexInLine = wordsInLine.findIndex(
          (w) => w.surah === word.surah && w.ayah === word.ayah && w.word === word.word
        );
        const wordsPerLine = wordsInLine.length;
        const availableWidth = PAGE_WIDTH - MARGIN_SIDE * 2;
        const avgWordWidth = 60;
        const totalWordsWidth = wordsPerLine * avgWordWidth;
        const totalSpacing = availableWidth - totalWordsWidth;
        const spacing = wordsPerLine > 1 ? totalSpacing / (wordsPerLine - 1) : 0;
        const x = PAGE_WIDTH - MARGIN_SIDE - wordIndexInLine * (avgWordWidth + spacing) - avgWordWidth;
        const y = MARGIN_TOP + (lineNumber - 1) * LINE_HEIGHT + LINE_HEIGHT * 0.15;
        return {
          wordIndex: index,
          surah: parseInt(word.surah, 10),
          ayah: parseInt(word.ayah, 10),
          position: { x, y, width: avgWordWidth, height: LINE_HEIGHT * 0.7 },
          text: word.text,
          lineNumber,
        };
      });
      if (isLocalLayoutAvailable()) {
        const layoutRows = getLayoutFromLocalDb(pageNumber);
        layoutMeta = layoutRows.map((r) => ({
          line_number: r.line_number,
          line_type: String(r.line_type ?? "ayah"),
          surah_number: r.surah_number ?? null,
        }));
      }
      totalWords = getQpcV4TotalWords();
    }

    const { organizeWordsIntoLines } = await import("@/lib/mushaf/qpcLineLayout");
    const wordsForLayout = wordPositions.map((wp: any) => ({
      surah: wp.surah,
      ayah: wp.ayah,
      wordIndex: wp.wordIndex,
      text: wp.text || "",
      lineNumber: wp.lineNumber || 1,
      position: wp.position,
    }));
    const pageLayout = organizeWordsIntoLines(pageNumber, wordsForLayout);
    const surahForPage = wordPositions.length > 0 ? wordPositions[0].surah : null;

    const response = {
      page: pageNumber,
      words: wordPositions,
      layout: pageLayout,
      layoutMeta,
      surahForPage: surahForPage ?? undefined,
      meta: { totalWords: totalWords || wordPositions.length, source },
    };

    console.log(
      `[QPC API] ✓ ${source} page ${pageNumber}: ${wordPositions.length} words, ${pageLayout.lines.length} lines (${Date.now() - startTime}ms)`
    );
    return NextResponse.json(response);
  } catch (error: any) {
    console.error(`[QPC API] Error:`, error?.message || error);
    return NextResponse.json(
      { error: "Internal server error", message: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
