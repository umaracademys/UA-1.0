"use client";

import { useState } from "react";
import { X, Download } from "lucide-react";
import { Dialog } from "@headlessui/react";
import toast from "react-hot-toast";
import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";

type ExportMushafReportProps = {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName?: string;
  mistakes: PersonalMushafMistake[];
  statistics: any;
};

export function ExportMushafReport({
  isOpen,
  onClose,
  studentId,
  studentName,
  mistakes,
  statistics,
}: ExportMushafReportProps) {
  const [format, setFormat] = useState<"pdf" | "excel" | "json">("pdf");
  const [include, setInclude] = useState<"all" | "filtered" | "statistics">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // In production, this would call an API endpoint to generate the report
      // For now, we'll create a JSON export as a fallback
      if (format === "json") {
        const data = {
          studentId,
          studentName,
          exportDate: new Date().toISOString(),
          statistics,
          mistakes: include === "all" ? mistakes : mistakes,
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `personal-mushaf-${studentId}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Report exported successfully");
        onClose();
      } else {
        toast.error(`${format.toUpperCase()} export not yet implemented. Please use JSON format.`);
      }
    } catch (error) {
      toast.error("Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">Export Report</Dialog.Title>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {/* Format Selection */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Format</label>
                <div className="flex gap-3">
                  {(["pdf", "excel", "json"] as const).map((fmt) => (
                    <label key={fmt} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="format"
                        value={fmt}
                        checked={format === fmt}
                        onChange={() => setFormat(fmt)}
                        className="border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-neutral-700 uppercase">{fmt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Include Selection */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Include</label>
                <div className="space-y-2">
                  {(["all", "filtered", "statistics"] as const).map((inc) => (
                    <label key={inc} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="include"
                        value={inc}
                        checked={include === inc}
                        onChange={() => setInclude(inc)}
                        className="border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-neutral-700 capitalize">
                        {inc === "all" ? "All Mistakes" : inc === "filtered" ? "Filtered Mistakes" : "Statistics Only"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Date Range (Optional)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {exporting ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
