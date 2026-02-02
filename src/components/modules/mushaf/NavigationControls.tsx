"use client";

import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Focus, Eye, EyeOff, Maximize, History, Keyboard } from "lucide-react";

type NavigationControlsProps = {
  currentPage: number;
  currentJuz: number;
  currentSurah?: number;
  zoom: number;
  focusMode: boolean;
  toolsHidden: boolean;
  showHistoricalMistakes?: boolean;
  historicalMistakesCount?: number;
  /** When true, listening range is locked (ticket in progress). */
  rangeLocked?: boolean;
  /** Locked ayah range (from → to). */
  ayahRange?: { fromSurah: number; fromAyah: number; toSurah: number; toAyah: number } | null;
  onPageChange: (page: number) => void;
  onJuzChange: (juz: number) => void;
  onSurahChange: (surah: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleFocusMode: () => void;
  onToggleTools: () => void;
  onToggleHistoricalMistakes?: () => void;
  onShowShortcutsHelp?: () => void;
  onFullscreen?: () => void;
};

const JUZ_PAGES: Record<number, number> = {
  1: 1,
  2: 22,
  3: 42,
  4: 62,
  5: 82,
  6: 102,
  7: 122,
  8: 142,
  9: 162,
  10: 182,
  11: 202,
  12: 222,
  13: 242,
  14: 262,
  15: 282,
  16: 302,
  17: 322,
  18: 342,
  19: 362,
  20: 382,
  21: 402,
  22: 422,
  23: 442,
  24: 462,
  25: 482,
  26: 502,
  27: 522,
  28: 542,
  29: 562,
  30: 582,
};

export function NavigationControls({
  currentPage,
  currentJuz,
  currentSurah,
  zoom,
  focusMode,
  toolsHidden,
  showHistoricalMistakes = true,
  historicalMistakesCount = 0,
  rangeLocked = false,
  ayahRange = null,
  onPageChange,
  onJuzChange,
  onSurahChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFocusMode,
  onToggleTools,
  onToggleHistoricalMistakes,
  onShowShortcutsHelp,
  onFullscreen,
}: NavigationControlsProps) {
  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value, 10);
    if (!isNaN(page) && page >= 1 && page <= 604) {
      onPageChange(page);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < 604) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        {/* Previous/Next Page */}
        <button
          onClick={handlePreviousPage}
          disabled={currentPage <= 1}
          className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Page Number Input */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="1"
            max="604"
            value={currentPage}
            onChange={handlePageInput}
            className="w-20 rounded-md border border-neutral-200 px-2 py-1 text-center text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <span className="text-sm text-neutral-500">/ 604</span>
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPage >= 604}
          className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Juz Selector */}
        <select
          value={currentJuz}
          onChange={(e) => onJuzChange(parseInt(e.target.value, 10))}
          className="ml-4 rounded-md border border-neutral-200 bg-white px-3 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
            <option key={juz} value={juz}>
              Juz {juz}
            </option>
          ))}
        </select>

        {/* Surah Selector */}
        <select
          value={currentSurah || ""}
          onChange={(e) => onSurahChange(parseInt(e.target.value, 10))}
          className="ml-2 rounded-md border border-neutral-200 bg-white px-3 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Select Surah</option>
          {Array.from({ length: 114 }, (_, i) => i + 1).map((surah) => (
            <option key={surah} value={surah}>
              Surah {surah}
            </option>
          ))}
        </select>

        {/* Range locked indicator (ticket session active) */}
        {rangeLocked && ayahRange && (
          <span className="ml-3 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800" title="Listening range locked for this ticket">
            Range: S{ayahRange.fromSurah}:{ayahRange.fromAyah} → S{ayahRange.toSurah}:{ayahRange.toAyah}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1 rounded-md border border-neutral-200 p-1">
          <button
            onClick={onZoomOut}
            disabled={zoom <= 0.8}
            className="rounded p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs text-neutral-600">{Math.round(zoom * 100)}%</span>
          <button
            onClick={onZoomIn}
            disabled={zoom >= 1.4}
            className="rounded p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={onResetZoom}
            className="rounded p-1.5 text-neutral-600 hover:bg-neutral-100"
            aria-label="Reset zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Historical Mistakes Toggle */}
        {onToggleHistoricalMistakes && (
          <button
            onClick={onToggleHistoricalMistakes}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
              showHistoricalMistakes
                ? "border-purple-300 bg-purple-100 text-purple-700"
                : "border-neutral-300 bg-neutral-100 text-neutral-600"
            }`}
            aria-label="Toggle historical mistakes"
          >
            <History className="h-4 w-4" />
            <span className="text-sm">Historical</span>
            {showHistoricalMistakes && historicalMistakesCount > 0 && (
              <span className="rounded-full bg-purple-200 px-2 py-0.5 text-xs font-medium">
                {historicalMistakesCount}
              </span>
            )}
          </button>
        )}

        {/* Keyboard Shortcuts Help */}
        {onShowShortcutsHelp && (
          <button
            onClick={onShowShortcutsHelp}
            className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100"
            aria-label="Show keyboard shortcuts"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="h-5 w-5" />
          </button>
        )}

        {/* Focus Mode Toggle */}
        <button
          onClick={onToggleFocusMode}
          className={`rounded-md p-2 ${
            focusMode ? "bg-indigo-100 text-indigo-700" : "text-neutral-600 hover:bg-neutral-100"
          }`}
          aria-label="Toggle focus mode"
        >
          <Focus className="h-5 w-5" />
        </button>

        {/* Tools Toggle */}
        <button
          onClick={onToggleTools}
          className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100"
          aria-label="Toggle tools"
        >
          {toolsHidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>

        {/* Fullscreen */}
        {onFullscreen && (
          <button
            onClick={onFullscreen}
            className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100"
            aria-label="Fullscreen"
          >
            <Maximize className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
