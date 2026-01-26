"use client";

import type { LineData, WordPosition } from "@/lib/mushaf/qpcLineLayout";
import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";

interface LineRendererProps {
  line: LineData;
  pageWidth: number;
  mistakes: PersonalMushafMistake[];
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
  hoveredWord: number | null;
  setHoveredWord: (wordIndex: number | null) => void;
}

export function LineRenderer({
  line,
  pageWidth,
  mistakes,
  onWordClick,
  hoveredWord,
  setHoveredWord,
}: LineRendererProps) {
  const MARGIN_SIDE = 80;
  const LINE_WIDTH = pageWidth - (2 * MARGIN_SIDE);
  
  // Calculate word widths based on text length
  const wordWidths = line.words.map(word => {
    // Estimate width: Arabic characters need ~20-25 pixels each at font size 28
    const charCount = word.text.length;
    return Math.max(charCount * 22, 40); // Minimum 40px width
  });
  
  const totalWordsWidth = wordWidths.reduce((sum, w) => sum + w, 0);
  
  // Calculate spacing between words to distribute across the line
  const totalSpacing = LINE_WIDTH - totalWordsWidth;
  const spaceBetweenWords = line.words.length > 1 
    ? totalSpacing / (line.words.length + 1) 
    : totalSpacing / 2;
  
  // Position words from RIGHT to LEFT (Arabic direction)
  let currentX = pageWidth - MARGIN_SIDE - spaceBetweenWords;
  
  return (
    <g>
      {/* Line guide (for debugging in development) */}
      {process.env.NODE_ENV === 'development' && (
        <line
          x1={MARGIN_SIDE}
          y1={line.y}
          x2={pageWidth - MARGIN_SIDE}
          y2={line.y}
          stroke="#eee"
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.5"
        />
      )}
      
      {/* Render words in this line (RIGHT to LEFT) */}
      {line.words.map((word, wordIndex) => {
        const wordWidth = wordWidths[wordIndex];
        const wordY = line.y;
        const wordHeight = line.height;
        
        // Position: word allocated space (right to left)
        const wordRightEdge = currentX;
        const wordLeftEdge = currentX - wordWidth;
        const textCenterX = wordLeftEdge + wordWidth / 2; // Center of allocated space
        
        // Update position for next word (move left)
        currentX = wordLeftEdge - spaceBetweenWords;
        
        // Find mistakes for this word
        const wordMistakes = mistakes.filter(
          m => m.page === word.page && 
               m.wordIndex === word.wordIndex &&
               m.surah === word.surah &&
               m.ayah === word.ayah
        );
        
        // Check if this is the last word of the ayah
        const isLastWordOfAyah = word.isLastWordOfAyah || 
          (wordIndex === line.words.length - 1) ||
          (wordIndex < line.words.length - 1 && 
           line.words[wordIndex + 1].ayah !== word.ayah);
        
        // Vertical alignment: text baseline is at wordY
        // Text typically extends from wordY - 20px (top) to wordY + 8px (bottom) for fontSize 28
        const textTop = wordY - 20;
        const textBottom = wordY + 8;
        const textHeight = textBottom - textTop;
        
        // Calculate clickable area to match actual text width more precisely
        // Arabic text width is typically 15-20px per character at fontSize 28
        const estimatedTextWidth = Math.max(word.text.length * 16, 35);
        const clickableLeftX = textCenterX - estimatedTextWidth / 2;
        const clickableWidth = estimatedTextWidth;
        
        return (
          <g key={`word-${word.page}-${word.surah}-${word.ayah}-${word.wordIndex}`}>
            {/* Mistake highlights BEHIND text - use allocated word space */}
            {wordMistakes.map((mistake, mistakeIndex) => (
              <rect
                key={`mistake-${wordIndex}-${mistakeIndex}-${mistake.page}-${mistake.surah}-${mistake.ayah}`}
                x={wordLeftEdge - 2}
                y={textTop - 2}
                width={wordWidth + 4}
                height={textHeight + 4}
                rx="4"
                fill="rgba(239, 68, 68, 0.2)"
                stroke="#dc2626"
                strokeWidth="2"
              />
            ))}
            
            {/* Invisible clickable area - exactly matches text bounds */}
            <rect
              x={clickableLeftX}
              y={textTop}
              width={clickableWidth}
              height={textHeight}
              fill="transparent"
              className="cursor-pointer"
              onClick={(e) => {
                onWordClick?.(
                  word.page,
                  word.wordIndex,
                  undefined,
                  { x: textCenterX, y: wordY },
                  word.text,
                  undefined,
                  word.surah,
                  word.ayah
                );
              }}
              onMouseEnter={() => setHoveredWord(word.wordIndex)}
              onMouseLeave={() => setHoveredWord(null)}
              style={{
                fill: hoveredWord === word.wordIndex ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                transition: 'fill 0.1s ease',
              }}
            />
            
            {/* The actual Arabic text - centered in allocated space */}
            <text
              x={textCenterX}
              y={wordY}
              textAnchor="middle"
              fontSize="28"
              fontFamily="'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', 'Amiri', serif"
              fill={hoveredWord === word.wordIndex ? "#3b82f6" : "#000"}
              className="quran-text"
              style={{ 
                pointerEvents: 'none', // Let rect handle clicks for precise area
                userSelect: 'none',
                fontWeight: hoveredWord === word.wordIndex ? "bold" : "normal",
              }}
            >
              {word.text}
            </text>
            
            {/* Ayah number marker (at end of ayah) */}
            {isLastWordOfAyah && (
              <AyahMarker
                x={wordLeftEdge - 20}
                y={wordY}
                ayah={word.ayah}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

function AyahMarker({ x, y, ayah }: { x: number; y: number; ayah: number }) {
  // Convert to Arabic-Indic numerals
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const ayahNum = String(ayah)
    .split('')
    .map(digit => {
      const d = parseInt(digit);
      return isNaN(d) ? digit : arabicNumerals[d];
    })
    .join('');
  
  return (
    <g>
      <circle
        cx={x}
        cy={y - 10}
        r="14"
        fill="none"
        stroke="#d4af37"
        strokeWidth="2"
      />
      <text
        x={x}
        y={y - 5}
        textAnchor="middle"
        fontSize="12"
        fontFamily="'Amiri Quran', serif"
        fill="#d4af37"
        fontWeight="bold"
      >
        {ayahNum}
      </text>
    </g>
  );
}
