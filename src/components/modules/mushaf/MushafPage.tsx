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
  zoom: number;
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

import { getPageWords, type WordPosition as QPCWordPosition } from "@/lib/mushaf/qpcData";
import { SURAHS } from "@/lib/mushaf/surahData";

// Convert QPC word positions to component format
const getWordPositions = (page: number): (WordPosition & { text?: string; surah?: number; ayah?: number })[] => {
  const qpcWords = getPageWords(page);
  return qpcWords.map((word) => ({
    x: word.position.x,
    y: word.position.y,
    width: word.position.width,
    height: word.position.height,
    wordIndex: word.wordIndex,
    letterIndex: undefined,
    text: word.text,
    surah: word.surah,
    ayah: word.ayah,
  }));
};

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
  const svgRef = useRef<SVGSVGElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | undefined;
    
    // Reset states when page changes
    setWordPositions([]);
    setQpcDataLoaded(false);
    setPageLayout(null); // Reset layout
    setIsLoadingQPC(false); // Reset loading state
    setImageLoading(true);
    setImageError(false);
    setCdnSourceIndex(0);
    
    // Load word positions for current page
    const loadPageData = async () => {
      if (isLoadingQPC) {
        console.log(`[MushafPage] Already loading, skipping duplicate request`);
        return;
      }
      
      setIsLoadingQPC(true);
      try {
        console.log(`[MushafPage] ===== Loading QPC data for page ${pageNumber} =====`);
        
        // Add timeout to prevent hanging
        const fetchWithTimeout = (url: string, timeout = 8000) => {
          const controller = new AbortController();
          let timeoutHandle: NodeJS.Timeout;
          
          const timeoutPromise = new Promise<Response>((_, reject) => {
            timeoutHandle = setTimeout(() => {
              controller.abort();
              reject(new Error('Request timeout'));
            }, timeout);
          });
          
          return Promise.race([
            fetch(url, { signal: controller.signal }).finally(() => {
              if (timeoutHandle) clearTimeout(timeoutHandle);
            }),
            timeoutPromise
          ]);
        };
        
        // Try to load from QPC API first
        const apiUrl = `/api/qpc/page/${pageNumber}`;
        console.log(`[MushafPage] Fetching from: ${apiUrl}`);
        
        try {
          const response = await fetchWithTimeout(apiUrl, 8000);
          console.log(`[MushafPage] Response status: ${response.status}, ok: ${response.ok}`);
          
          if (!isMounted) {
            console.log(`[MushafPage] Component unmounted before processing response`);
            return;
          }
          
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
              console.log(`[MushafPage] ✓ Processing ${data.words.length} words from API...`);
              console.log(`[MushafPage] Layout data:`, data.layout ? `${data.layout.lines.length} lines` : "not available");
              
              // Convert API response to component format
              const positions = data.words.map((word: any, idx: number) => {
                const pos = {
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
                };
                if (idx === 0) {
                  console.log(`[MushafPage] First word sample:`, pos);
                }
                return pos;
              });
              
              console.log(`[MushafPage] ✓ Converted ${positions.length} positions`);
              console.log(`[MushafPage] Setting state: qpcDataLoaded=true, wordPositions.length=${positions.length}`);
              
              if (isMounted) {
                setWordPositions(positions);
                setQpcDataLoaded(true);
                
                // Store layout data for line-based rendering
                if (data.layout && data.layout.lines && data.layout.lines.length > 0) {
                  setPageLayout(data.layout);
                  console.log(`[MushafPage] Layout stored: ${data.layout.lines.length} lines`);
                } else {
                  // Create fallback layout from words if API didn't provide one
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
                      console.warn(`[MushafPage] ✗ Failed to create fallback layout`);
                    }
                  } catch (layoutError: any) {
                    console.error(`[MushafPage] ✗ Error creating fallback layout:`, layoutError.message);
                  }
                }
                
                setIsLoadingQPC(false); // Reset loading state AFTER setting layout
                console.log(`[MushafPage] ✓ State updated successfully`);
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
    
    // Start with local image, will fallback to CDN if needed
    const pageStr = pageNumber.toString().padStart(3, "0");
    setImageSrc(`/mushaf-pages/page-${pageStr}.png`);
    
    // Cleanup
    return () => {
      isMounted = false;
      setIsLoadingQPC(false); // Reset loading state on unmount
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [pageNumber]); // Only depend on pageNumber to prevent infinite loops

  const handleWordClick = (
    wordIndex: number,
    event: React.MouseEvent<SVGRectElement>,
    wordData: WordPosition & { text?: string; surah?: number; ayah?: number },
  ) => {
    setSelectedWord(wordIndex);
    
    // Get click position relative to SVG
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    
    const clickX = (event.clientX - svgRect.left) / zoom;
    const clickY = (event.clientY - svgRect.top) / zoom;
    
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

  return (
    <div className="relative flex items-start justify-center bg-neutral-100 overflow-auto" style={{ minHeight: "100vh", padding: "20px" }}>
      <div
        className="relative"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "top center",
          transition: "transform 0.2s ease",
          maxWidth: "90vw",
          maxHeight: "85vh",
        }}
      >
        {/* Mushaf Page Image or Text Rendering */}
        <div className="relative">
          {/* Debug info - always show in dev */}
          {process.env.NODE_ENV === "development" && (
            <div className="absolute top-0 left-0 bg-yellow-100 p-2 text-xs z-50 border border-yellow-400 max-w-xs">
              <div className="font-bold">Debug Info:</div>
              <div>qpcDataLoaded: {qpcDataLoaded ? "true" : "false"}</div>
              <div>wordPositions: {Array.isArray(wordPositions) ? wordPositions.length : "NOT ARRAY"}</div>
              <div>imageError: {imageError ? "true" : "false"}</div>
              <div>imageLoading: {imageLoading ? "true" : "false"}</div>
              <div>pageNumber: {pageNumber}</div>
              {Array.isArray(wordPositions) && wordPositions.length > 0 && (
                <div>First word: surah={wordPositions[0]?.surah}, ayah={wordPositions[0]?.ayah}, text={wordPositions[0]?.text?.substring(0, 20)}</div>
              )}
            </div>
          )}
          
          {/* Show loading state - only when actually loading and no data AND no layout */}
          {isLoadingQPC && !pageLayout && wordPositions.length === 0 && !qpcDataLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#fffef9] z-10" style={{ width: "1000px", height: "1414px" }}>
              <div className="text-center">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary mx-auto" />
                <p className="text-neutral-600">Loading page {pageNumber}...</p>
              </div>
            </div>
          ) : null}
          
          {/* Show QPC text rendering if we have data - LINE-BASED RENDERING */}
          {pageLayout && pageLayout.lines && pageLayout.lines.length > 0 ? (
            // Render Quran text using LINE-BASED layout
            <div className="relative bg-[#fffef9] overflow-hidden shadow-2xl" style={{ width: "1000px", height: "1414px", direction: "rtl" }}>
              <svg
                ref={svgRef}
                width="1000"
                height="1414"
                viewBox="0 0 1000 1414"
                style={{ direction: "rtl", display: "block" }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Background */}
                <rect width="1000" height="1414" fill="#fffef9" />
                
                {/* Decorative border */}
                <rect x="30" y="30" width="940" height="1354" fill="none" stroke="#d4af37" strokeWidth="2" rx="8" />
                
                {/* Page number at top */}
                <text
                  x="500"
                  y="60"
                  textAnchor="middle"
                  fontSize="18"
                  fontFamily="'Amiri Quran', serif"
                  fill="#888"
                >
                  {pageNumber}
                </text>
                
                {/* Surah Title Box (if first page of surah) */}
                {(() => {
                  const firstLine = pageLayout.lines[0];
                  if (firstLine && firstLine.words.length > 0) {
                    const firstWord = firstLine.words[0];
                    if (firstWord && firstWord.surah) {
                      const surahData = SURAHS.find((s) => s.id === firstWord.surah);
                      if (surahData && surahData.startPage === pageNumber) {
                        return (
                          <g key="surah-title">
                            <rect
                              x="350"
                              y="70"
                              width="300"
                              height="40"
                              fill="none"
                              stroke="#000"
                              strokeWidth="1.5"
                              rx="4"
                            />
                            <text
                              x="500"
                              y="95"
                              fontSize="20"
                              fontFamily="'Amiri Quran', 'Scheherazade New', serif"
                              fill="#000"
                              textAnchor="middle"
                              fontWeight="bold"
                            >
                              {surahData.arabicName}
                            </text>
                          </g>
                        );
                      }
                    }
                  }
                  return null;
                })()}
                
                {/* Render each LINE using LineRenderer */}
                {pageLayout.lines.map((line) => {
                  // Convert line words to format expected by LineRenderer
                  const lineWords = line.words.map(word => ({
                    ...word,
                    position: {
                      x: 0, // Will be calculated by LineRenderer
                      y: line.y,
                      width: 0, // Will be calculated
                      height: line.height
                    }
                  }));
                  
                  return (
                    <LineRenderer
                      key={`line-${line.lineNumber}`}
                      line={{
                        ...line,
                        words: lineWords
                      }}
                      pageWidth={1000}
                      mistakes={allMistakes}
                      onWordClick={onWordClick}
                      hoveredWord={hoveredWord}
                      setHoveredWord={setHoveredWord}
                    />
                  );
                })}
              </svg>
            </div>
          ) : !isLoadingQPC && Array.isArray(wordPositions) && wordPositions.length > 0 && !pageLayout ? (
            // Fallback: Use old rendering if layout not available
            <div className="relative bg-[#fffef9] overflow-hidden shadow-2xl" style={{ width: "1000px", height: "1414px", direction: "rtl" }}>
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
            // Show loading or error message
            <div className="flex items-center justify-center h-[800px] bg-gray-50">
              <div className="text-center">
                <p className="text-gray-600 mb-2">Loading Quran text...</p>
                <p className="text-sm text-gray-500">If this persists, check the browser console for errors.</p>
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
          {imageLoading && !imageError && (
            <div className="flex min-h-[600px] w-full items-center justify-center bg-neutral-50">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="mt-4 text-sm text-neutral-500">Loading page {pageNumber}...</p>
              </div>
            </div>
          )}

          {/* SVG Overlay for Word Boundaries and Mistakes (only if image is loaded) */}
          {!imageError && (
            <svg
              ref={svgRef}
              className="absolute inset-0 h-full w-full"
              style={{ pointerEvents: "all" }}
            >
            {/* Word Boundaries (if positions available) */}
            {wordPositions.map((word, index) => (
              <rect
                key={index}
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
      </div>

      {/* Page Number Overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white">
        Page {pageNumber}
      </div>
    </div>
  );
}
