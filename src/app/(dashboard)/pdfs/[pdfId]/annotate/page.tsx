"use client";

export const dynamic = "force-dynamic";

import { PDFViewer } from "@/components/modules/pdf/PDFViewer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { use } from "react";

export default function PDFAnnotatePage({ params }: { params: Promise<{ pdfId: string }> }) {
  const { pdfId } = use(params);
  return (
    <PermissionGuard permission="pdf.annotate">
      <div className="h-screen flex flex-col">
        <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2">
          <Link
            href={`/pdfs/${pdfId}`}
            className="flex items-center gap-2 rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to View</span>
          </Link>
        </div>
        <div className="flex-1 overflow-hidden">
          <PDFViewer pdfId={pdfId} mode="annotate" />
        </div>
      </div>
    </PermissionGuard>
  );
}
