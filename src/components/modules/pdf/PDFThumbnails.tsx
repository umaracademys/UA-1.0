"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

type PDFThumbnailsProps = {
  file: string | File | null;
  currentPage: number;
  totalPages: number;
  annotations?: Array<{ page: number }>;
  onPageClick: (page: number) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function PDFThumbnails({
  file,
  currentPage,
  totalPages,
  annotations = [],
  onPageClick,
  collapsed = false,
  onToggleCollapse,
}: PDFThumbnailsProps) {
  const [numPages, setNumPages] = useState(totalPages);

  const pagesWithAnnotations = new Set(annotations.map((ann) => ann.page));

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="fixed left-0 top-1/2 z-10 -translate-y-1/2 rounded-r-lg border border-neutral-200 bg-white p-2 shadow-lg"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="flex h-full w-48 flex-col border-r border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-2">
        <h3 className="text-sm font-semibold text-neutral-900">Pages</h3>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="rounded-lg p-1 hover:bg-neutral-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {file && (
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div className="text-center text-sm text-neutral-500">Loading...</div>}
            error={
              <div className="text-center text-sm text-red-600">Failed to load PDF</div>
            }
          >
            {Array.from(new Array(numPages), (el, index) => {
              const pageNumber = index + 1;
              const hasAnnotations = pagesWithAnnotations.has(pageNumber);
              const isCurrentPage = pageNumber === currentPage;

              return (
                <button
                  key={`page_${pageNumber}`}
                  onClick={() => onPageClick(pageNumber)}
                  className={`mb-2 w-full rounded-lg border-2 p-1 transition-colors ${
                    isCurrentPage
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <div className="relative">
                    <Page
                      pageNumber={pageNumber}
                      width={150}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                    {hasAnnotations && (
                      <div className="absolute right-1 top-1 h-2 w-2 rounded-full bg-yellow-400" />
                    )}
                  </div>
                  <p className="mt-1 text-center text-xs text-neutral-600">{pageNumber}</p>
                </button>
              );
            })}
          </Document>
        )}
      </div>
    </div>
  );
}
