"use client";

import { ChevronLeft, ChevronRight, Download, Printer, Maximize, Minimize, ZoomIn, ZoomOut, Type, Highlighter, PenTool, MousePointer, Palette, X } from "lucide-react";
import { useState } from "react";

type PDFToolbarProps = {
  currentPage: number;
  totalPages: number;
  scale: number;
  isFullscreen: boolean;
  mode: "view" | "annotate";
  selectedTool: "none" | "text" | "highlight" | "drawing";
  onPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;
  onFullscreenToggle: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onToolSelect?: (tool: "none" | "text" | "highlight" | "drawing") => void;
  onColorChange?: (color: string) => void;
  onClearAnnotations?: () => void;
};

const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export function PDFToolbar({
  currentPage,
  totalPages,
  scale,
  isFullscreen,
  mode,
  selectedTool,
  onPageChange,
  onScaleChange,
  onFullscreenToggle,
  onDownload,
  onPrint,
  onToolSelect,
  onColorChange,
  onClearAnnotations,
}: PDFToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#FFEB3B");

  const colors = [
    "#FFEB3B", // Yellow
    "#FF9800", // Orange
    "#F44336", // Red
    "#E91E63", // Pink
    "#9C27B0", // Purple
    "#673AB7", // Deep Purple
    "#3F51B5", // Indigo
    "#2196F3", // Blue
    "#00BCD4", // Cyan
    "#4CAF50", // Green
  ];

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    onColorChange?.(color);
    setShowColorPicker(false);
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={handlePageInput}
            className="w-16 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-center text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <span className="text-sm text-neutral-600">/ {totalPages}</span>
        </div>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onScaleChange(Math.max(0.5, scale - 0.25))}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <select
          value={scale}
          onChange={(e) => onScaleChange(parseFloat(e.target.value))}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {zoomLevels.map((level) => (
            <option key={level} value={level}>
              {Math.round(level * 100)}%
            </option>
          ))}
        </select>
        <button
          onClick={() => onScaleChange(Math.min(3, scale + 0.25))}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          onClick={() => onScaleChange(1)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
        >
          Fit Page
        </button>
      </div>

      {/* Annotation Tools (if annotating) */}
      {mode === "annotate" && onToolSelect && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToolSelect("none")}
            className={`rounded-lg p-2 ${
              selectedTool === "none"
                ? "bg-indigo-100 text-indigo-600"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
            title="Select"
          >
            <MousePointer className="h-5 w-5" />
          </button>
          <button
            onClick={() => onToolSelect("text")}
            className={`rounded-lg p-2 ${
              selectedTool === "text"
                ? "bg-indigo-100 text-indigo-600"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
            title="Text Annotation"
          >
            <Type className="h-5 w-5" />
          </button>
          <button
            onClick={() => onToolSelect("highlight")}
            className={`rounded-lg p-2 ${
              selectedTool === "highlight"
                ? "bg-indigo-100 text-indigo-600"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
            title="Highlight"
          >
            <Highlighter className="h-5 w-5" />
          </button>
          <button
            onClick={() => onToolSelect("drawing")}
            className={`rounded-lg p-2 ${
              selectedTool === "drawing"
                ? "bg-indigo-100 text-indigo-600"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
            title="Drawing"
          >
            <PenTool className="h-5 w-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1 text-sm hover:bg-neutral-50"
              title="Color"
            >
              <Palette className="h-4 w-4" />
              <div
                className="h-4 w-4 rounded border border-neutral-300"
                style={{ backgroundColor: selectedColor }}
              />
            </button>
            {showColorPicker && (
              <div className="absolute right-0 top-full z-10 mt-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
                <div className="grid grid-cols-5 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      className={`h-8 w-8 rounded border-2 ${
                        selectedColor === color ? "border-indigo-500" : "border-neutral-300"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          {onClearAnnotations && (
            <button
              onClick={onClearAnnotations}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100"
              title="Clear All Annotations"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onDownload}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
          title="Download"
        >
          <Download className="h-5 w-5" />
        </button>
        <button
          onClick={onPrint}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
          title="Print"
        >
          <Printer className="h-5 w-5" />
        </button>
        <button
          onClick={onFullscreenToggle}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
