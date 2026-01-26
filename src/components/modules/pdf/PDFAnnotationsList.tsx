"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Edit, Trash2, User } from "lucide-react";
import { format } from "date-fns";

type Annotation = {
  _id: string;
  userId: string;
  username: string;
  page: number;
  type: "text" | "highlight" | "drawing";
  content: any;
  color?: string;
  createdAt: Date | string;
};

type PDFAnnotationsListProps = {
  annotations: Annotation[];
  currentUserId?: string;
  onAnnotationClick: (annotation: Annotation) => void;
  onEdit?: (annotation: Annotation) => void;
  onDelete?: (annotationId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function PDFAnnotationsList({
  annotations,
  currentUserId,
  onAnnotationClick,
  onEdit,
  onDelete,
  collapsed = false,
  onToggleCollapse,
}: PDFAnnotationsListProps) {
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set());

  // Group annotations by page
  const annotationsByPage = annotations.reduce((acc, ann) => {
    if (!acc[ann.page]) {
      acc[ann.page] = [];
    }
    acc[ann.page].push(ann);
    return acc;
  }, {} as Record<number, Annotation[]>);

  const togglePage = (page: number) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(page)) {
      newExpanded.delete(page);
    } else {
      newExpanded.add(page);
    }
    setExpandedPages(newExpanded);
  };

  const getAnnotationPreview = (annotation: Annotation): string => {
    if (annotation.type === "text") {
      return annotation.content?.text || "Text annotation";
    } else if (annotation.type === "highlight") {
      return "Highlight annotation";
    } else if (annotation.type === "drawing") {
      return "Drawing annotation";
    }
    return "Annotation";
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="fixed right-0 top-1/2 z-10 -translate-y-1/2 rounded-l-lg border border-neutral-200 bg-white p-2 shadow-lg"
      >
        <ChevronRight className="h-5 w-5 rotate-180" />
      </button>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-l border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-2">
        <h3 className="text-sm font-semibold text-neutral-900">Annotations</h3>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="rounded-lg p-1 hover:bg-neutral-100"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {Object.keys(annotationsByPage).length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">No annotations</div>
        ) : (
          Object.entries(annotationsByPage)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([page, pageAnnotations]) => {
              const pageNum = parseInt(page);
              const isExpanded = expandedPages.has(pageNum);

              return (
                <div key={page} className="mb-2 rounded-lg border border-neutral-200 bg-white">
                  <button
                    onClick={() => togglePage(pageNum)}
                    className="w-full px-3 py-2 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-900">
                        Page {pageNum}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">
                          {pageAnnotations.length}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-neutral-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-neutral-500" />
                        )}
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-neutral-200 px-3 py-2">
                      {pageAnnotations.map((annotation) => {
                        const isOwner = currentUserId && annotation.userId === currentUserId;

                        return (
                          <div
                            key={annotation._id}
                            className="mb-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2 last:mb-0"
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <User className="h-3 w-3 text-neutral-400" />
                              <span className="text-xs font-medium text-neutral-700">
                                {annotation.username}
                              </span>
                              <span
                                className="ml-auto h-3 w-3 rounded-full"
                                style={{ backgroundColor: annotation.color || "#FFEB3B" }}
                              />
                            </div>
                            <p
                              className="mb-1 cursor-pointer text-xs text-neutral-600"
                              onClick={() => onAnnotationClick(annotation)}
                            >
                              {getAnnotationPreview(annotation)}
                            </p>
                            <p className="mb-2 text-xs text-neutral-400">
                              {format(new Date(annotation.createdAt), "MMM dd, h:mm a")}
                            </p>
                            {(isOwner || onDelete) && (
                              <div className="flex items-center gap-2">
                                {onEdit && isOwner && (
                                  <button
                                    onClick={() => onEdit(annotation)}
                                    className="rounded p-1 text-neutral-600 hover:bg-neutral-200"
                                    title="Edit"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                )}
                                {onDelete && (isOwner || !currentUserId) && (
                                  <button
                                    onClick={() => onDelete(annotation._id)}
                                    className="rounded p-1 text-red-600 hover:bg-red-100"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
