"use client";

import { PDFViewer } from "@/components/modules/pdf/PDFViewer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function PDFViewerPage({ params }: { params: Promise<{ pdfId: string }> }) {
  const { pdfId } = use(params);

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2">
        <Link
          href="/pdfs"
          className="flex items-center gap-2 rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Library</span>
        </Link>
      </div>
      <div className="flex-1 overflow-hidden">
        <PDFViewer pdfId={pdfId} mode="view" />
      </div>
    </div>
  );
}
