"use client";

import { useRef, useEffect, useState } from "react";

type Annotation = {
  _id: string;
  userId: string;
  username: string;
  page: number;
  type: "text" | "highlight" | "drawing";
  content: any;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  color?: string;
  createdAt: Date | string;
};

type PDFAnnotationLayerProps = {
  pageNumber: number;
  annotations: Annotation[];
  selectedTool: "none" | "text" | "highlight" | "drawing";
  selectedColor: string;
  pageWidth: number;
  pageHeight: number;
  scale: number;
  onAnnotationCreate?: (annotation: Omit<Annotation, "_id" | "userId" | "username" | "createdAt">) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  onAnnotationEdit?: (annotation: Annotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  currentUserId?: string;
};

export function PDFAnnotationLayer({
  pageNumber,
  annotations,
  selectedTool,
  selectedColor,
  pageWidth,
  pageHeight,
  scale,
  onAnnotationCreate,
  onAnnotationClick,
  onAnnotationEdit,
  onAnnotationDelete,
  currentUserId,
}: PDFAnnotationLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPath, setDrawPath] = useState<string>("");
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [endPos, setEndPos] = useState<{ x: number; y: number } | null>(null);
  const [editingText, setEditingText] = useState<{ x: number; y: number; text: string } | null>(null);

  const pageAnnotations = annotations.filter((ann) => ann.page === pageNumber);

  const getRelativePosition = (e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (selectedTool === "none") return;

    const pos = getRelativePosition(e);
    setStartPos(pos);
    setIsDrawing(true);

    if (selectedTool === "drawing") {
      setDrawPath(`M ${pos.x} ${pos.y}`);
    } else if (selectedTool === "text") {
      setEditingText({ x: pos.x, y: pos.y, text: "" });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !startPos) return;

    const pos = getRelativePosition(e);

    if (selectedTool === "drawing") {
      setDrawPath((prev) => `${prev} L ${pos.x} ${pos.y}`);
    } else if (selectedTool === "highlight") {
      setEndPos(pos);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !startPos) return;

    const pos = getRelativePosition(e);
    setEndPos(pos);
    setIsDrawing(false);

    if (selectedTool === "highlight" && endPos) {
      const width = Math.abs(endPos.x - startPos.x);
      const height = Math.abs(endPos.y - startPos.y);
      if (width > 10 && height > 10 && onAnnotationCreate) {
        onAnnotationCreate({
          page: pageNumber,
          type: "highlight",
          content: { text: "" },
          position: {
            x: Math.min(startPos.x, endPos.x),
            y: Math.min(startPos.y, endPos.y),
            width,
            height,
          },
          color: selectedColor,
        });
      }
    } else if (selectedTool === "drawing" && drawPath) {
      if (onAnnotationCreate) {
        onAnnotationCreate({
          page: pageNumber,
          type: "drawing",
          content: { path: drawPath },
          position: {
            x: 0,
            y: 0,
          },
          color: selectedColor,
        });
      }
      setDrawPath("");
    }

    setStartPos(null);
    setEndPos(null);
  };

  const handleTextSubmit = (text: string) => {
    if (editingText && text.trim() && onAnnotationCreate) {
      onAnnotationCreate({
        page: pageNumber,
        type: "text",
        content: { text },
        position: {
          x: editingText.x,
          y: editingText.y,
        },
        color: selectedColor,
      });
    }
    setEditingText(null);
  };

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 cursor-crosshair"
      width={pageWidth * scale}
      height={pageHeight * scale}
      style={{ pointerEvents: selectedTool !== "none" ? "auto" : "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Render existing annotations */}
      {pageAnnotations.map((annotation) => {
        const isOwner = currentUserId && annotation.userId === currentUserId;
        const x = annotation.position.x * scale;
        const y = annotation.position.y * scale;
        const width = (annotation.position.width || 100) * scale;
        const height = (annotation.position.height || 20) * scale;

        if (annotation.type === "highlight") {
          return (
            <rect
              key={annotation._id}
              x={x}
              y={y}
              width={width}
              height={height}
              fill={annotation.color || "#FFEB3B"}
              fillOpacity={0.3}
              stroke={annotation.color || "#FFEB3B"}
              strokeWidth={1}
              className={isOwner ? "cursor-pointer hover:opacity-70" : ""}
              onClick={() => onAnnotationClick?.(annotation)}
            />
          );
        } else if (annotation.type === "text") {
          return (
            <g key={annotation._id}>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="white"
                fillOpacity={0.9}
                stroke={annotation.color || "#FFEB3B"}
                strokeWidth={1}
                className={isOwner ? "cursor-pointer hover:opacity-70" : ""}
                onClick={() => onAnnotationClick?.(annotation)}
              />
              <text
                x={x + 5}
                y={y + 15}
                fontSize={12 * scale}
                fill="#000"
                className={isOwner ? "cursor-pointer" : ""}
                onClick={() => onAnnotationClick?.(annotation)}
              >
                {annotation.content?.text || ""}
              </text>
            </g>
          );
        } else if (annotation.type === "drawing") {
          return (
            <path
              key={annotation._id}
              d={annotation.content?.path || ""}
              fill="none"
              stroke={annotation.color || "#FFEB3B"}
              strokeWidth={2 * scale}
              className={isOwner ? "cursor-pointer hover:opacity-70" : ""}
              onClick={() => onAnnotationClick?.(annotation)}
            />
          );
        }
        return null;
      })}

      {/* Drawing in progress */}
      {isDrawing && selectedTool === "drawing" && drawPath && (
        <path
          d={drawPath}
          fill="none"
          stroke={selectedColor}
          strokeWidth={2 * scale}
        />
      )}

      {/* Highlight selection in progress */}
      {isDrawing && selectedTool === "highlight" && startPos && endPos && (
        <rect
          x={Math.min(startPos.x, endPos.x) * scale}
          y={Math.min(startPos.y, endPos.y) * scale}
          width={Math.abs(endPos.x - startPos.x) * scale}
          height={Math.abs(endPos.y - startPos.y) * scale}
          fill={selectedColor}
          fillOpacity={0.3}
          stroke={selectedColor}
          strokeWidth={1}
        />
      )}
    </svg>
  );
}
