"use client";

import type { LineData, WordPosition } from "@/lib/mushaf/qpcLineLayout";
import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";

/** V1 layout line types from qpc-v1-15-lines.db */
export type LineType = "surah_name" | "basmallah" | "ayah";

interface LineRendererProps {
  line: LineData;
  pageNumber: number;
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
  /** When surah_name or basmallah, render centered header with 'Surah Names' font */
  lineType?: LineType;
  /** Text for surah_name or basmallah lines */
  headerText?: string;
}

/** QPC V1 — @font-face named exactly 'QPC V1', path /data/Mushaf%20files/QPC%20V1%20Font.woff/p{N}.woff */
const QPC_FONT_FAMILY = "'QPC V1', var(--font-amiri), 'Amiri Quran', serif";

/** Surah Names — /data/Mushaf%20files/surah_names.woff; fallback if 404 */
const SURAH_NAMES_FONT = "'Surah Names', var(--font-amiri), 'Amiri Quran', serif";

const BISMILLAH_TEXT = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

/**
 * 15-line grid: flex: 1 on each line. Ayah lines: display flex, row-reverse, justify-content space-between (full justification).
 * Header lines (surah_name / basmallah): justify-content center, Surah Names font.
 * onClick/onMouseDown on word spans for mistake marking.
 */
export function LineRenderer({
  line,
  pageNumber,
  pageWidth,
  mistakes,
  onWordClick,
  hoveredWord,
  setHoveredWord,
  lineType = "ayah",
  headerText,
}: LineRendererProps) {
  const isHeaderLine = lineType === "surah_name" || lineType === "basmallah";
  const displayText = isHeaderLine ? (lineType === "basmallah" ? BISMILLAH_TEXT : (headerText ?? "")) : null;

  if (isHeaderLine && displayText !== null) {
    return (
      <div
        className="mushaf-line mushaf-line-header"
        role="row"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0,
          width: "100%",
          margin: 0,
          direction: "rtl",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: SURAH_NAMES_FONT,
            fontSize: "3.2vh",
            lineHeight: 1,
            color: "#3d3529",
            fontWeight: "bold",
          }}
        >
          {displayText}
        </span>
      </div>
    );
  }

  const sortedWords = [...line.words].sort((a, b) => {
    if (a.surah !== b.surah) return b.surah - a.surah;
    if (a.ayah !== b.ayah) return b.ayah - a.ayah;
    return b.wordIndex - a.wordIndex;
  });

  return (
    <div
      className="mushaf-line"
      role="row"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "row-reverse",
        flexWrap: "nowrap",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 0,
        width: "100%",
        margin: 0,
        overflow: "visible",
        gap: 0,
        direction: "rtl",
        textAlign: "right",
        whiteSpace: "nowrap",
      }}
    >
      {sortedWords.map((word, wordIndex) => {
        const wordMistakes = mistakes.filter(
          (m) =>
            m.page === word.page &&
            m.wordIndex === word.wordIndex &&
            m.surah === word.surah &&
            m.ayah === word.ayah
        );
        return (
          <span
            key={`page-${pageNumber}-word-${word.surah}-${word.ayah}-${word.wordIndex}`}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              paddingLeft: 4,
              paddingRight: 4,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {/* Mistake highlight behind text */}
            {wordMistakes.length > 0 && (
              <span
                className="mistake-highlight"
                style={{
                  position: "absolute",
                  inset: "-2px -4px -2px -4px",
                  borderRadius: 4,
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "2px solid #dc2626",
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              />
            )}
            {/* Interactive: onClick/onMouseDown for mistake marking; golden glow/underline on hover */}
            <span
              role="button"
              tabIndex={0}
              onClick={() =>
                onWordClick?.(word.page, word.wordIndex, undefined, undefined, word.text, undefined, word.surah, word.ayah)
              }
              onMouseDown={() =>
                onWordClick?.(word.page, word.wordIndex, undefined, undefined, word.text, undefined, word.surah, word.ayah)
              }
              onMouseEnter={() => setHoveredWord(word.wordIndex)}
              onMouseLeave={() => setHoveredWord(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onWordClick?.(word.page, word.wordIndex, undefined, undefined, word.text, undefined, word.surah, word.ayah);
                }
              }}
              style={{
                fontFamily: QPC_FONT_FAMILY,
                fontSize: "3.5vh",
                lineHeight: 1,
                position: "relative",
                zIndex: 1,
                cursor: "pointer",
                color: hoveredWord === word.wordIndex ? "#5c4a32" : "#2d261a",
                fontWeight: "normal",
                transition: "color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
                display: "inline-block",
                whiteSpace: "nowrap",
                fontSynthesis: "none",
                background:
                  hoveredWord === word.wordIndex
                    ? "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(197, 160, 89, 0.18), transparent 70%)"
                    : "transparent",
                borderRadius: 4,
                padding: "2px 4px",
                boxShadow:
                  hoveredWord === word.wordIndex
                    ? "0 1px 0 0 rgba(197, 160, 89, 0.5)"
                    : "none",
              }}
              className="mushaf-word quran-text mushaf-word-interactive"
            >
              {word.text || ""}
            </span>
          </span>
        );
      })}
    </div>
  );
}

