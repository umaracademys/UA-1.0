"use client";

import { ReportGenerator } from "@/components/dashboard/admin/ReportGenerator";
import { FileText, Calendar, Save } from "lucide-react";
import axios from "axios";

export default function AdminReportsPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleGenerateReport = async (reportType: string, filters: any) => {
    // This would call the actual API endpoint
    // For now, return mock data structure
    const response = await axios.post(
      `/api/reports/${reportType}`,
      filters,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data.report;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Generate comprehensive reports and export data
          </p>
        </div>
      </div>

      {/* Report Generator */}
      <ReportGenerator onGenerate={handleGenerateReport} />

      {/* Saved Reports Section */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Saved Reports</h2>
          <button className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            <Save className="h-4 w-4" />
            Schedule Report
          </button>
        </div>
        <div className="py-8 text-center text-sm text-neutral-500">
          No saved reports yet. Generate a report to save it.
        </div>
      </div>
    </div>
  );
}
