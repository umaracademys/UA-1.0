"use client";

import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PDFToolbar } from "./PDFToolbar";
import { PDFThumbnails } from "./PDFThumbnails";
import { PDFAnnotationsList } from "./PDFAnnotationsList";
import { PDFAnnotationLayer } from "./PDFAnnotationLayer";
import axios from "axios";
import toast from "react-hot-toast";

// Set up PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

type PDFViewerProps = {
  pdfId: string;
  mode: "view" | "annotate";
  assignmentMode?: boolean;
};

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

export function PDFViewer({ pdfId, mode, assignmentMode = false }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<"none" | "text" | "highlight" | "drawing">("none");
  const [selectedColor, setSelectedColor] = useState<string>("#FFEB3B");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [thumbnailsCollapsed, setThumbnailsCollapsed] = useState(false);
  const [annotationsCollapsed, setAnnotationsCollapsed] = useState(false);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [pageHeight, setPageHeight] = useState<number>(1000);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  useEffect(() => {
    loadPDF();
    loadAnnotations();
  }, [pdfId]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/pdfs/${pdfId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pdf = response.data.pdf;
      setPdfUrl(pdf.filePath);
    } catch (error) {
      toast.error("Failed to load PDF");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnnotations = async () => {
    try {
      const response = await axios.get(`/api/pdfs/${pdfId}/annotations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnotations(response.data.annotations || []);
    } catch (error) {
      console.error("Failed to load annotations:", error);
    }
  };

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleDownload = useCallback(async () => {
    try {
      const response = await axios.get(`/api/pdfs/${pdfId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `pdf-${pdfId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  }, [pdfId, token]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleAnnotationCreate = async (annotation: Omit<Annotation, "_id" | "userId" | "username" | "createdAt">) => {
    try {
      const response = await axios.post(
        `/api/pdfs/${pdfId}/annotations`,
        annotation,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setAnnotations((prev) => [...prev, response.data.annotation]);
      toast.success("Annotation added");
    } catch (error) {
      toast.error("Failed to add annotation");
      console.error(error);
    }
  };

  const handleAnnotationDelete = async (annotationId: string) => {
    try {
      await axios.delete(`/api/pdfs/${pdfId}/annotations/${annotationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnotations((prev) => prev.filter((ann) => ann._id !== annotationId));
      toast.success("Annotation deleted");
    } catch (error) {
      toast.error("Failed to delete annotation");
    }
  };

  const handleClearAnnotations = () => {
    if (!confirm("Are you sure you want to clear all annotations? This cannot be undone.")) {
      return;
    }
    // Clear all annotations
    annotations.forEach((ann) => {
      if (ann.userId === currentUserId) {
        handleAnnotationDelete(ann._id);
      }
    });
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  if (loading || !pdfUrl) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-500">Loading PDF...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-100">
      {/* Toolbar */}
      <PDFToolbar
        currentPage={currentPage}
        totalPages={numPages}
        scale={scale}
        isFullscreen={isFullscreen}
        mode={mode}
        selectedTool={selectedTool}
        onPageChange={handlePageChange}
        onScaleChange={handleScaleChange}
        onFullscreenToggle={handleFullscreenToggle}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onToolSelect={mode === "annotate" ? setSelectedTool : undefined}
        onColorChange={setSelectedColor}
        onClearAnnotations={mode === "annotate" ? handleClearAnnotations : undefined}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnails Sidebar */}
        {!thumbnailsCollapsed && (
          <PDFThumbnails
            file={pdfUrl}
            currentPage={currentPage}
            totalPages={numPages}
            annotations={annotations}
            onPageClick={handlePageChange}
            collapsed={thumbnailsCollapsed}
            onToggleCollapse={() => setThumbnailsCollapsed(true)}
          />
        )}
        {thumbnailsCollapsed && (
          <button
            onClick={() => setThumbnailsCollapsed(false)}
            className="fixed left-0 top-1/2 z-10 -translate-y-1/2 rounded-r-lg border border-neutral-200 bg-white p-2 shadow-lg"
          >
            →
          </button>
        )}

        {/* PDF Canvas */}
        <div className="flex-1 overflow-auto bg-neutral-200 p-4">
          <div className="mx-auto" style={{ width: `${pageWidth * scale}px` }}>
            <div className="relative bg-white shadow-lg">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="p-8 text-center">Loading PDF...</div>}
                error={<div className="p-8 text-center text-red-600">Failed to load PDF</div>}
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  onLoadSuccess={(page) => {
                    setPageWidth(page.width);
                    setPageHeight(page.height);
                  }}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
              {mode === "annotate" && (
                <PDFAnnotationLayer
                  pageNumber={currentPage}
                  annotations={annotations}
                  selectedTool={selectedTool}
                  selectedColor={selectedColor}
                  pageWidth={pageWidth}
                  pageHeight={pageHeight}
                  scale={scale}
                  onAnnotationCreate={handleAnnotationCreate}
                  onAnnotationDelete={handleAnnotationDelete}
                  currentUserId={currentUserId || undefined}
                />
              )}
            </div>
          </div>
        </div>

        {/* Annotations List Sidebar */}
        {mode === "annotate" && !annotationsCollapsed && (
          <PDFAnnotationsList
            annotations={annotations}
            currentUserId={currentUserId || undefined}
            onAnnotationClick={(ann) => handlePageChange(ann.page)}
            onDelete={handleAnnotationDelete}
            collapsed={annotationsCollapsed}
            onToggleCollapse={() => setAnnotationsCollapsed(true)}
          />
        )}
        {mode === "annotate" && annotationsCollapsed && (
          <button
            onClick={() => setAnnotationsCollapsed(false)}
            className="fixed right-0 top-1/2 z-10 -translate-y-1/2 rounded-l-lg border border-neutral-200 bg-white p-2 shadow-lg"
          >
            ←
          </button>
        )}
      </div>
    </div>
  );
}
