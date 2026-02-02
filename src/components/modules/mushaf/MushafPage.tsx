"use client";

import { useState, useEffect, useRef } from "react";
import { MistakeHighlight } from "./MistakeHighlight";
import { LineRenderer } from "./LineRenderer";
import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";
import type { PageLayout } from "@/lib/mushaf/qpcLineLayout";

type WordPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
  wordIndex: number;
  letterIndex?: number;
  text?: string;
  surah?: number;
  ayah?: number;
};

type MushafPageProps = {
  pageNumber: number;
  zoom?: number;
  mistakes: PersonalMushafMistake[];
  historicalMistakes: PersonalMushafMistake[];
  showHistoricalMistakes: boolean;
  onWordClick?: (
    page: number,
    wordIndex: number,
    letterIndex?: number,
    position?: { x: number; y: number },
    wordText?: string,
    selectedLetter?: string,
    surah?: number,
    ayah?: number,
  ) => void;
  onMistakeClick?: (mistake: PersonalMushafMistake) => void;
};

import { SURAHS, getSurahById, getSurahByPage } from "@/lib/mushaf/surahData";

type LayoutMetaLine = { line_number: number; line_type: string; surah_number?: number };

/** Font path: /data/Mushaf%20files/QPC%20V1%20Font.woff/p${pageNumber}.woff — @font-face named exactly 'QPC V1' */
const QPC_PAGE_FONT_URL = (n: number) => `/data/Mushaf%20files/QPC%20V1%20Font.woff/p${n}.woff`;
const QPC_FONT_FAMILY = "QPC V1";

/**
 * Calculate which letter was clicked within a word
 * @param wordText - The Arabic word text
 * @param wordX - X position of the word
 * @param wordWidth - Width of the word
 * @param clickX - X position of the click relative to the SVG
 * @returns letterIndex (0-based) or -1 if click is outside word bounds
 */
const getLetterAtPosition = (
  wordText: string,
  wordX: number,
  wordWidth: number,
  clickX: number,
): number => {
  if (!wordText || wordText.length === 0) return -1;
  
  // Calculate relative position within the word (0 to 1)
  const relativeX = (clickX - wordX) / wordWidth;
  
  // Clamp to word boundaries
  if (relativeX < 0 || relativeX > 1) return -1;
  
  // Extract actual letters (handles diacritics properly)
  const letters = extractLetters(wordText);
  const letterCount = letters.length;
  
  if (letterCount === 0) return -1;
  
  // For Arabic text, letters are distributed across the word width
  // Calculate which letter was clicked based on relative position
  const letterWidth = wordWidth / letterCount;
  const letterIndex = Math.floor((clickX - wordX) / letterWidth);
  
  // Ensure letterIndex is within bounds
  return Math.max(0, Math.min(letterIndex, letterCount - 1));
};

/**
 * Extract individual Arabic letters from a word
 * Handles Arabic diacritics and combining characters
 * Returns array of letter strings with their diacritics
 */
const extractLetters = (word: string): string[] => {
  if (!word) return [];
  
  const letters: string[] = [];
  let i = 0;
  
  while (i < word.length) {
    const char = word[i];
    let letter = char;
    i++;
    
    // Check for combining diacritics (harakat, tanween, etc.)
    // These are combining marks that follow the base letter
    while (i < word.length) {
      const nextChar = word[i];
      const code = nextChar.charCodeAt(0);
      
      // Arabic diacritics range: U+064B to U+065F, U+0670
      // Also check for shaddah (U+0651) and sukoon (U+0652)
      if (
        (code >= 0x064b && code <= 0x065f) ||
        code === 0x0670 ||
        code === 0x0651 || // Shaddah
        code === 0x0652 || // Sukoon
        code === 0x0640 // Tatweel (elongation mark)
      ) {
        letter += nextChar;
        i++;
      } else {
        break;
      }
    }
    
    letters.push(letter);
  }
  
  // Fallback: if no letters extracted, split by character
  if (letters.length === 0) {
    return word.split('');
  }
  
  return letters;
};

// Open-source Quran CDN URLs for Mushaf pages
// Using multiple reliable sources for fallback
const getMushafImageUrl = (pageNumber: number, sourceIndex = 0): string => {
  const pageStr = pageNumber.toString().padStart(3, "0");
  
  // Source 0: Local files (preferred if available)
  if (sourceIndex === 0) {
    return `/mushaf-pages/page-${pageStr}.png`;
  }
  
  // Source 1: Proxy API route (most reliable - avoids CORS issues)
  if (sourceIndex === 1) {
    return `/api/mushaf/page/${pageNumber}`;
  }
  
  // Source 2: Direct CDN - Quran.com
  if (sourceIndex === 2) {
    return `https://cdn.quran.com/mushaf/pages/page-${pageStr}.png`;
  }
  
  // Source 3: Alternative CDN format
  if (sourceIndex === 3) {
    return `https://quran.com/api/v4/pages/${pageNumber}/image`;
  }
  
  // Source 4: Using Al-Quran Cloud API (open source) - returns JSON with image URL
  // This will be handled specially in the error handler
  return `https://api.alquran.cloud/v1/page/${pageNumber}/quran-uthmani`;
};

export function MushafPage({
  pageNumber,
  zoom,
  mistakes,
  historicalMistakes,
  showHistoricalMistakes,
  onWordClick,
  onMistakeClick,
}: MushafPageProps) {
  const [wordPositions, setWordPositions] = useState<WordPosition[]>([]);
  const [hoveredWord, setHoveredWord] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [cdnSourceIndex, setCdnSourceIndex] = useState(0);
  const [qpcDataLoaded, setQpcDataLoaded] = useState(false);
  const [isLoadingQPC, setIsLoadingQPC] = useState(false);
  const [pageLayout, setPageLayout] = useState<PageLayout | null>(null);
  const [layoutMeta, setLayoutMeta] = useState<LayoutMetaLine[]>([]);
  const [surahForPage, setSurahForPage] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const qpcFontStyleRef = useRef<HTMLStyleElement | null>(null);
  const loadingRef = useRef(false);
  const loadLoggedForPageRef = useRef<number | null>(null);

  // Page-specific font: @font-face named exactly 'QPC V1', path /data/Mushaf%20files/QPC%20V1%20Font.woff/p${pageNumber}.woff
  useEffect(() => {
    document.querySelectorAll('[id^="qpc-page-font-"]').forEach((el) => el.remove());
    document.querySelectorAll('[id^="qpc-page-font-preload-"]').forEach((el) => el.remove());
    qpcFontStyleRef.current = null;

    const fontPath = QPC_PAGE_FONT_URL(pageNumber);
    const id = `qpc-page-font-${pageNumber}`;

    const preload = document.createElement("link");
    preload.id = `qpc-page-font-preload-${pageNumber}`;
    preload.rel = "preload";
    preload.as = "font";
    preload.type = "font/woff";
    preload.href = fontPath;
    preload.crossOrigin = "anonymous";
    document.head.appendChild(preload);

    const style = document.createElement("style");
    style.id = id;
    style.textContent = `@font-face { font-family: '${QPC_FONT_FAMILY}'; src: url('${fontPath}') format('woff'); font-display: swap; }`;
    document.head.appendChild(style);
    qpcFontStyleRef.current = style;

    return () => {
      preload.remove();
      if (qpcFontStyleRef.current?.parentNode) {
        qpcFontStyleRef.current.parentNode.removeChild(qpcFontStyleRef.current);
      }
      qpcFontStyleRef.current = null;
    };
  }, [pageNumber]);

  useEffect(() => {
    // Clean state: reset all metadata and words so no ghost Surah names or stale data
    setWordPositions([]);
    setPageLayout(null);
    setLayoutMeta([]);
    setSurahForPage(null);
    setQpcDataLoaded(false);
    setIsLoadingQPC(false);
    setImageLoading(true);
    setImageError(false);
    setCdnSourceIndex(1);

    if (loadingRef.current) return;
    loadingRef.current = true;

    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const abortController = new AbortController();

    /* API reads local files only: public/data/Mushaf files/qpc-v1-15-lines.db + qpc-v1-glyph-codes-wbw.db (fallback: qpc-v4) */
    const apiUrl = `/api/qpc/page/${pageNumber}`;
    const loadPageData = async () => {
      setIsLoadingQPC(true);
      try {
        if (loadLoggedForPageRef.current !== pageNumber) {
          loadLoggedForPageRef.current = pageNumber;
          console.log(`[MushafPage] Loading QPC data for page ${pageNumber} — ${apiUrl}`);
        }
        
        const timeout = 8000;
        timeoutId = setTimeout(() => abortController.abort(), timeout);
        
        try {
          const response = await fetch(apiUrl, { signal: abortController.signal });
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
          }
          console.log(`[MushafPage] Response status: ${response.status}, ok: ${response.ok}`);
          
          if (!isMounted) return;
          
          if (response.ok) {
            const data = await response.json();
            console.log(`[MushafPage] Received JSON data:`, {
              hasWords: !!data.words,
              isArray: Array.isArray(data.words),
              length: data.words?.length || 0,
              page: data.page,
              hasError: !!data.error
            });
            
            if (data.error) {
              console.error(`[MushafPage] API returned error:`, data.error);
              if (isMounted) {
                setQpcDataLoaded(false);
                setWordPositions([]);
                setIsLoadingQPC(false); // Reset loading state
              }
              return;
            }
            
            if (data.words && Array.isArray(data.words) && data.words.length > 0) {
              if (abortController.signal.aborted) return;
              console.log(`[MushafPage] ✓ Processing ${data.words.length} words from API...`);
              console.log(`[MushafPage] Layout data:`, data.layout ? `${data.layout.lines.length} lines` : "not available");
              
              const positions = data.words.map((word: any, idx: number) => ({
                x: word.position?.x ?? 0,
                y: word.position?.y ?? 0,
                width: word.position?.width ?? 40,
                height: word.position?.height ?? 30,
                wordIndex: word.wordIndex ?? idx,
                letterIndex: undefined as number | undefined,
                text: word.text ?? "",
                surah: word.surah ?? 0,
                ayah: word.ayah ?? 0,
                lineNumber: word.lineNumber ?? 1,
              }));
              
              console.log(`[MushafPage] ✓ Converted ${positions.length} positions`);
              console.log(`[MushafPage] Setting state: qpcDataLoaded=true, wordPositions.length=${positions.length}`);
              
              if (isMounted && !abortController.signal.aborted) {
                setWordPositions(positions);
                if (data.layoutMeta && Array.isArray(data.layoutMeta)) {
                  setLayoutMeta(data.layoutMeta);
                }
                const apiSurah = data.surahForPage != null ? data.surahForPage : positions[0]?.surah ?? null;
                setSurahForPage(apiSurah);
                if (data.layout && data.layout.lines && data.layout.lines.length > 0) {
                  setPageLayout(data.layout);
                  setQpcDataLoaded(true);
                  console.log(`[MushafPage] Layout stored: ${data.layout.lines.length} lines, surahForPage=${apiSurah}`);
                } else {
                  // Fallback: create layout from words so page isn't left blank when API didn't return layout
                  console.log(`[MushafPage] Creating fallback layout from ${positions.length} words...`);
                  try {
                    const { organizeWordsIntoLines } = await import("@/lib/mushaf/qpcLineLayout");
                    const fallbackLayout = organizeWordsIntoLines(pageNumber, positions.map((p: any) => ({
                      surah: p.surah,
                      ayah: p.ayah,
                      wordIndex: p.wordIndex,
                      text: p.text || "",
                      lineNumber: p.lineNumber || 1,
                      position: p
                    })));
                    if (fallbackLayout && fallbackLayout.lines.length > 0) {
                      setPageLayout(fallbackLayout);
                      console.log(`[MushafPage] ✓ Fallback layout created: ${fallbackLayout.lines.length} lines`);
                    } else {
                      console.warn(`[MushafPage] ✗ Fallback layout failed; will show word count only`);
                    }
                  } catch (layoutError: any) {
                    console.error(`[MushafPage] ✗ Error creating fallback layout:`, layoutError.message);
                  }
                  setQpcDataLoaded(true);
                }
                setIsLoadingQPC(false);
                console.log(`[MushafPage] ✓ State updated: wordPositions.length=${positions.length}`);
              }
            } else {
              console.warn(`[MushafPage] ✗ Invalid words data:`, {
                hasWords: !!data.words,
                isArray: Array.isArray(data.words),
                length: data.words?.length || 0,
                type: typeof data.words,
                dataKeys: data ? Object.keys(data) : []
              });
              if (isMounted) {
                setQpcDataLoaded(false);
                setWordPositions([]);
                setIsLoadingQPC(false); // Reset loading state
              }
            }
          } else {
            const errorText = await response.text();
            console.error(`[MushafPage] ✗ API error ${response.status}:`, errorText.substring(0, 200));
            if (isMounted) {
              setQpcDataLoaded(false);
              setWordPositions([]);
              setIsLoadingQPC(false); // Reset loading state
            }
          }
        } catch (fetchError: any) {
          if (!isMounted) {
            setIsLoadingQPC(false);
            return;
          }
          if (fetchError?.name === "AbortError") {
            setIsLoadingQPC(false);
            return;
          }
          console.error(`[MushafPage] ✗ Fetch error:`, fetchError.message);
          setQpcDataLoaded(false);
          setWordPositions([]);
          setIsLoadingQPC(false);
        }
      } catch (error: any) {
        if (!isMounted) {
          setIsLoadingQPC(false);
          return;
        }
        console.error("[MushafPage] ✗ Error in loadPageData:", error.message || error);
        setQpcDataLoaded(false);
        setWordPositions([]);
        setIsLoadingQPC(false);
      } finally {
        // Always reset loading state
        if (isMounted) {
          setIsLoadingQPC(false);
        }
      }
    };
    
    loadPageData();
    
    // Prefer API (serves CDN or placeholder) to avoid 404s when local files are missing
    setImageSrc(`/api/mushaf/page/${pageNumber}`);
    
    // Cleanup: abort in-flight fetch so only one request can update state; allow next page to load
    return () => {
      isMounted = false;
      loadingRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
      abortController.abort();
      setIsLoadingQPC(false);
    };
  }, [pageNumber]);

  const handleWordClick = (
    wordIndex: number,
    event: React.MouseEvent<SVGRectElement>,
    wordData: WordPosition & { text?: string; surah?: number; ayah?: number },
  ) => {
    setSelectedWord(wordIndex);
    
    // Get click position relative to SVG
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    
    const clickX = event.clientX - svgRect.left;
    const clickY = event.clientY - svgRect.top;
    
    // Calculate letter index if word text is available
    let letterIndex: number | undefined = undefined;
    let selectedLetter: string | undefined = undefined;
    
    if (wordData.text) {
      const calculatedLetterIndex = getLetterAtPosition(
        wordData.text,
        wordData.x,
        wordData.width,
        clickX,
      );
      
      if (calculatedLetterIndex >= 0) {
        letterIndex = calculatedLetterIndex;
        const letters = extractLetters(wordData.text);
        if (letters[letterIndex]) {
          selectedLetter = letters[letterIndex];
        }
      }
    }
    
    onWordClick?.(
      pageNumber,
      wordIndex,
      letterIndex,
      {
        x: clickX,
        y: clickY,
      },
      wordData.text,
      selectedLetter,
      wordData.surah,
      wordData.ayah,
    );
  };

  const allMistakes = showHistoricalMistakes
    ? [...mistakes, ...historicalMistakes]
    : mistakes;

  const pageMistakes = allMistakes.filter((m) => m.page === pageNumber);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !qpcDataLoaded) return;
    const words = wordPositions?.length ?? 0;
    const lines = pageLayout?.lines?.length ?? 0;
    console.log(`[MushafPage] pageNumber=${pageNumber} words=${words} lines=${lines} qpcDataLoaded=true`);
  }, [pageNumber, wordPositions?.length, pageLayout?.lines?.length, qpcDataLoaded]);

  const hasPageLayout = Boolean(pageLayout?.lines?.length);
  const showLoaderOnly = !hasPageLayout && isLoadingQPC;

  return (
    <div
      className="relative overflow-hidden bg-neutral-200"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        padding: 0,
        direction: "rtl",
      }}
      data-mushaf-container
      data-mushaf-root
    >
      <div className="relative flex items-center justify-center" style={{ width: "100%", height: "100%" }}>
        {/* Single loader: only when no pageLayout and loading */}
        {showLoaderOnly ? (
          <div
            className="flex items-center justify-center overflow-hidden rounded-lg"
            style={{
              height: "96vh",
              aspectRatio: "1000 / 1414",
              maxWidth: "95vw",
              maxHeight: "95vh",
              background: "#FBF7EF",
            }}
          >
            <div className="text-center">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#F5F0E8] border-t-[#C5A059] mx-auto" />
              <p className="text-[#5c4a32] text-sm">Loading page {pageNumber}…</p>
            </div>
          </div>
        ) : hasPageLayout ? (
          /* Letterbox page sheet: full container width (no horizontal scroll); vertical scroll allowed */
          <div
            key={`mushaf-page-${pageNumber}`}
            className="relative mushaf-page-paper overflow-hidden"
            style={{
              display: "flex",
              flexDirection: "column",
              height: "98vh",
              width: "auto",
              aspectRatio: "1000 / 1414",
              maxWidth: "100%",
              maxHeight: "98vh",
              background: "#FBF7EF",
              direction: "rtl",
              flexShrink: 0,
              boxShadow: [
                "inset 0 0 40px rgba(0,0,0,0.03)",
                "0 4px 20px rgba(0,0,0,0.08)",
                pageNumber % 2 === 1
                  ? "inset 12px 0 28px -8px rgba(0,0,0,0.06)"
                  : "inset -12px 0 28px -8px rgba(0,0,0,0.06)",
              ].join(", "),
              filter: "sepia(0.06)",
              border: "none",
              borderRadius: 2,
            }}
          >
            {/* Page number; SVG contain so content never clips */}
            <svg
              ref={svgRef}
              viewBox="0 0 1000 1414"
              className="pointer-events-none absolute inset-0 w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <rect width="1000" height="1414" fill="#FBF7EF" />
              <text x="500" y="52" textAnchor="middle" fontSize="16" fontFamily="var(--font-amiri), serif" fill="#5c4a32">
                {pageNumber}
              </text>
            </svg>

            {/* Dynamic line grid: use actual line count from DB (8 for page 1-2, 15 for rest); flex: 1 each */}
            {(() => {
              const layout = pageLayout!;
              const LINES_COUNT = layoutMeta.length > 0 ? layoutMeta.length : 15;
              const wordContainerFont = `'${QPC_FONT_FAMILY}', var(--font-amiri), 'Amiri Quran', serif`;
              const emptyLine: PageLayout["lines"][0] = {
                lineNumber: 0,
                words: [],
                width: 824,
                height: 60,
                y: 0,
              };
              const lineSlots = Array.from({ length: LINES_COUNT }, (_, i) => {
                const lineNumber = i + 1;
                const meta = layoutMeta.find((m) => m.line_number === lineNumber);
                const lineType = (meta?.line_type ?? "ayah") as "surah_name" | "basmallah" | "ayah";
                const line = layout.lines.find((l) => l.lineNumber === lineNumber) ?? { ...emptyLine, lineNumber };
                const headerText =
                  lineType === "surah_name" && meta?.surah_number != null
                    ? getSurahById(meta.surah_number)?.arabicName ?? ""
                    : undefined;
                return { lineNumber, lineType, headerText, line };
              });
              return (
                <div
                  className="mushaf-lines"
                  style={{
                    position: "absolute",
                    inset: 0,
                    padding: "4% 7%",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    rowGap: 0,
                    gap: 0,
                    margin: 0,
                    direction: "rtl",
                    textAlign: "right",
                    fontFamily: wordContainerFont,
                  }}
                >
                    {lineSlots.map((slot, lineIndex) => (
                      <LineRenderer
                        key={`page-${pageNumber}-line-${lineIndex}`}
                        pageNumber={pageNumber}
                        line={slot.line}
                        pageWidth={824}
                        mistakes={allMistakes}
                        onWordClick={onWordClick}
                        hoveredWord={hoveredWord}
                        setHoveredWord={setHoveredWord}
                        lineType={slot.lineType}
                        headerText={slot.headerText}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : !isLoadingQPC && Array.isArray(wordPositions) && wordPositions.length > 0 && !pageLayout ? (
            // Fallback: layout not available
            <div className="relative overflow-hidden shadow-2xl" style={{ width: "1000px", height: "1414px", background: "#FBF7EF", direction: "rtl" }}>
              <div className="p-8 text-center">
                <p className="text-red-600">Layout data not available. Using fallback rendering.</p>
                <p className="text-sm text-gray-500 mt-2">Words: {wordPositions.length}</p>
              </div>
            </div>
          ) : imageError && !qpcDataLoaded ? (
            <div className="flex min-h-[600px] w-full items-center justify-center bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg">
              <div className="text-center p-8">
                <div className="text-6xl mb-4">📖</div>
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">Mushaf Page {pageNumber}</h3>
                <p className="text-sm text-neutral-500 mb-4">
                  Mushaf page images are not available.
                </p>
                <p className="text-xs text-neutral-400">
                  Please upload page images to <code className="bg-neutral-100 px-2 py-1 rounded">/public/mushaf-pages/</code>
                  <br />
                  Format: <code className="bg-neutral-100 px-2 py-1 rounded">page-001.png</code> through <code className="bg-neutral-100 px-2 py-1 rounded">page-604.png</code>
                </p>
              </div>
            </div>
          ) : wordPositions.length === 0 && !imageLoading ? (
            // Show when word data hasn’t loaded yet (e.g. QPC request in progress or failed)
            <div className="flex items-center justify-center h-[800px] bg-neutral-50">
              <div className="text-center">
                <p className="text-neutral-600 mb-2">Loading page {pageNumber}…</p>
                <p className="text-sm text-neutral-500">If the page doesn’t load, open the browser console (F12) to see any errors.</p>
              </div>
            </div>
          ) : (
            <img
              ref={imageRef}
              src={imageSrc}
              alt={`Mushaf page ${pageNumber}`}
              className="max-w-full h-auto"
              crossOrigin="anonymous"
              onLoad={() => {
                setImageLoading(false);
                setImageError(false);
              }}
              onError={async (e) => {
                const target = e.target as HTMLImageElement;
                
                // Try next CDN source
                const nextSourceIndex = cdnSourceIndex + 1;
                
                if (nextSourceIndex <= 4) {
                  // Try next CDN source
                  const nextUrl = getMushafImageUrl(pageNumber, nextSourceIndex);
                  
                  setImageSrc(nextUrl);
                  setCdnSourceIndex(nextSourceIndex);
                  setImageLoading(true);
                  target.src = nextUrl;
                  return;
                }
                
                // All sources failed
                setImageError(true);
                setImageLoading(false);
              }}
              style={{ display: imageLoading ? "none" : "block" }}
            />
          )}

          {/* SVG Overlay only when no pageLayout (image fallback path); unmounted when pageLayout is active */}
          {!hasPageLayout && !imageError && (
            <svg
              ref={svgRef}
              className="absolute inset-0 h-full w-full"
              style={{ pointerEvents: "all" }}
            >
            {/* Word Boundaries (fallback when layout is image-based) */}
            {wordPositions.map((word, index) => (
              <rect
                key={`page-${pageNumber}-word-${index}`}
                x={word.x}
                y={word.y}
                width={word.width}
                height={word.height}
                fill="transparent"
                stroke={hoveredWord === word.wordIndex ? "#3b82f6" : "transparent"}
                strokeWidth={hoveredWord === word.wordIndex ? 2 : 0}
                className="cursor-pointer transition-all hover:stroke-blue-500 hover:stroke-2"
                onClick={(e) => handleWordClick(word.wordIndex, e, word)}
                onMouseEnter={() => setHoveredWord(word.wordIndex)}
                onMouseLeave={() => setHoveredWord(null)}
              />
            ))}

            {/* Historical Mistake Highlights (rendered first with lower opacity) */}
            {showHistoricalMistakes &&
              historicalMistakes.map((mistake, index) => (
                <MistakeHighlight
                  key={`historical-${mistake.id || index}`}
                  mistake={mistake}
                  page={pageNumber}
                  zoom={1}
                  isHistorical={true}
                  onMistakeClick={onMistakeClick}
                />
              ))}

            {/* Current Session Mistake Highlights (rendered on top) */}
            {mistakes.map((mistake, index) => (
              <MistakeHighlight
                key={`current-${mistake.id || index}`}
                mistake={mistake}
                page={pageNumber}
                zoom={1}
                isHistorical={false}
                onMistakeClick={onMistakeClick}
              />
            ))}
            </svg>
          )}
          
          {/* Mistake highlights for text rendering mode */}
          {imageError && qpcDataLoaded && (
            <>
              {showHistoricalMistakes &&
                historicalMistakes.map((mistake, index) => (
                  <MistakeHighlight
                    key={`historical-text-${mistake.id || index}`}
                    mistake={mistake}
                    page={pageNumber}
                    zoom={1}
                    isHistorical={true}
                    onMistakeClick={onMistakeClick}
                  />
                ))}
              {mistakes.map((mistake, index) => (
                <MistakeHighlight
                  key={`current-text-${mistake.id || index}`}
                  mistake={mistake}
                  page={pageNumber}
                  zoom={1}
                  isHistorical={false}
                  onMistakeClick={onMistakeClick}
                />
              ))}
            </>
          )}
      </div>

      {/* Page Number Overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white">
        Page {pageNumber}
      </div>
    </div>
  );
}
