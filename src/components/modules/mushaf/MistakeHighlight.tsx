"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";

type MistakeHighlightProps = {
  mistake: PersonalMushafMistake;
  page: number;
  zoom: number;
  isHistorical?: boolean;
  onMistakeClick?: (mistake: PersonalMushafMistake) => void;
};

export function MistakeHighlight({ mistake, page, zoom, isHistorical = false, onMistakeClick }: MistakeHighlightProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (mistake.page !== page) return null;

  const position = mistake.position || { x: 0, y: 0 };
  const isToday = mistake.timeline.lastMarkedAt
    ? new Date(mistake.timeline.lastMarkedAt).toDateString() === new Date().toDateString()
    : false;
  const isRecent =
    mistake.timeline.lastMarkedAt &&
    Date.now() - new Date(mistake.timeline.lastMarkedAt).getTime() <= 7 * 24 * 60 * 60 * 1000;

  // Determine color based on type, recency, and whether it's historical
  let fillColor = "";
  let strokeColor = "";
  let opacity = 1;
  let glow = false;

  // Historical mistakes have lower opacity and different styling
  if (isHistorical) {
    const category = mistake.category as string;
    if (category === "tajweed") {
      fillColor = "transparent";
      strokeColor = "#9333ea"; // Purple for historical tajweed
      opacity = 0.4;
    } else if (category === "atkees") {
      fillColor = "#fbbf24";
      strokeColor = "#f59e0b";
      opacity = 0.3;
    } else {
      fillColor = "#ef4444";
      strokeColor = "#dc2626";
      opacity = 0.3;
    }
  } else {
    // Current session mistakes
    const category = mistake.category as string;
    if (category === "tajweed") {
      fillColor = "transparent";
      strokeColor = "#6b7280";
      opacity = 0.8;
    } else if (category === "atkees") {
      fillColor = "#fbbf24";
      strokeColor = "#f59e0b";
      opacity = isToday ? 0.9 : isRecent ? 0.7 : 0.5;
    } else {
      fillColor = "#ef4444";
      strokeColor = "#dc2626";
      opacity = isToday ? 0.9 : isRecent ? 0.7 : 0.5;
      glow = isToday;
    }
  }

  // Check if this is a letter-level mistake
  const isLetterLevel = mistake.letterIndex !== undefined && mistake.letterIndex >= 0;

  // For letter-level mistakes, use smaller, more precise indicators
  const size = isLetterLevel ? 8 * zoom : 20 * zoom;
  const x = position.x * zoom;
  const y = position.y * zoom;

  return (
    <g>
      {isLetterLevel ? (
        // Letter-level: smaller circle or underline
        <>
          <circle
            cx={x}
            cy={y}
            r={size / 2}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1.5}
            opacity={opacity}
            className="cursor-pointer transition-all hover:opacity-100"
            style={{
              filter: glow ? "drop-shadow(0 0 3px rgba(239, 68, 68, 0.8))" : "none",
            }}
            onClick={() => onMistakeClick?.(mistake)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          />
          {/* Underline for letter-level mistakes */}
          <line
            x1={x - size}
            y1={y + size / 2}
            x2={x + size}
            y2={y + size / 2}
            stroke={strokeColor}
            strokeWidth={2}
            opacity={opacity}
            className="cursor-pointer transition-all hover:opacity-100"
            onClick={() => onMistakeClick?.(mistake)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          />
        </>
      ) : (
        // Word-level: larger circle/box
        <circle
          cx={x}
          cy={y}
          r={size / 2}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2}
          opacity={opacity}
          className="cursor-pointer transition-all hover:opacity-100"
          style={{
            filter: glow ? "drop-shadow(0 0 4px rgba(239, 68, 68, 0.8))" : "none",
          }}
          onClick={() => onMistakeClick?.(mistake)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        />
      )}
      {showTooltip && (
        <foreignObject x={x + size} y={y - 30} width="200" height="100">
          <div className="rounded-lg border border-neutral-200 bg-white p-2 text-xs shadow-lg">
            <p className="font-semibold text-neutral-900">{mistake.type}</p>
            <p className="text-neutral-600 capitalize">{mistake.category}</p>
            {isLetterLevel && mistake.letterIndex !== undefined && (
              <p className="text-neutral-500">Letter {mistake.letterIndex + 1}</p>
            )}
            {mistake.note && <p className="mt-1 text-neutral-700">{mistake.note}</p>}
            {mistake.timeline.lastMarkedAt && (
              <p className="mt-1 text-neutral-500">
                {format(new Date(mistake.timeline.lastMarkedAt), "MMM dd, yyyy")}
              </p>
            )}
            {mistake.timeline.repeatCount > 1 && (
              <p className="mt-1 text-neutral-500">Repeated {mistake.timeline.repeatCount} times</p>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
}
