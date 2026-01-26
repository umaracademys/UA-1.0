"use client";

import { useState } from "react";
import { FileText, Download, Eye, Calendar, Users } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

type ReportType =
  | "student_performance"
  | "teacher_activity"
  | "attendance"
  | "assignment"
  | "evaluation"
  | "system_usage";

type ReportGeneratorProps = {
  onGenerate?: (reportType: ReportType, filters: any) => Promise<any>;
};

const reportTypes: Array<{
  id: ReportType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "student_performance",
    name: "Student Performance Report",
    description: "Comprehensive report on student academic performance",
    icon: FileText,
  },
  {
    id: "teacher_activity",
    name: "Teacher Activity Report",
    description: "Overview of teacher activities and productivity",
    icon: Users,
  },
  {
    id: "attendance",
    name: "Attendance Report",
    description: "Detailed attendance records and statistics",
    icon: Calendar,
  },
  {
    id: "assignment",
    name: "Assignment Completion Report",
    description: "Assignment submission and completion statistics",
    icon: FileText,
  },
  {
    id: "evaluation",
    name: "Evaluation Summary Report",
    description: "Weekly evaluation summaries and trends",
    icon: FileText,
  },
  {
    id: "system_usage",
    name: "System Usage Report",
    description: "Overall system usage and module statistics",
    icon: FileText,
  },
];

export function ReportGenerator({ onGenerate }: ReportGeneratorProps) {
  const [selectedReportType, setSelectedReportType] = useState<ReportType | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleGenerate = async () => {
    if (!selectedReportType) {
      toast.error("Please select a report type");
      return;
    }

    setIsGenerating(true);
    try {
      const filters = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      };

      if (onGenerate) {
        const data = await onGenerate(selectedReportType, filters);
        setReportData(data);
        toast.success("Report generated successfully");
      } else {
        // Default API call
        const response = await axios.post(
          `/api/reports/${selectedReportType}`,
          filters,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setReportData(response.data.report);
        toast.success("Report generated successfully");
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    if (!reportData) {
      toast.error("Please generate a report first");
      return;
    }

    try {
      const response = await axios.post(
        `/api/reports/export`,
        {
          reportType: selectedReportType,
          format,
          data: reportData,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: format === "csv" ? "blob" : "json",
        },
      );

      if (format === "csv") {
        const blob = new Blob([response.data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedReportType}_${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Handle Excel/PDF
        toast.success(`${format.toUpperCase()} export initiated`);
      }
    } catch (error) {
      toast.error(`Failed to export ${format.toUpperCase()}`);
    }
  };

  const selectedReport = reportTypes.find((r) => r.id === selectedReportType);

  return (
    <div className="space-y-6">
      {/* Report Type Selection */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Select Report Type</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReportType(report.id)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedReportType === report.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-neutral-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-indigo-600" />
                  <span className="font-semibold text-neutral-900">{report.name}</span>
                </div>
                <p className="text-xs text-neutral-600">{report.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      {selectedReportType && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Report Filters</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Date Range */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate Report"}
            </button>
            {reportData && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport("csv")}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <Download className="h-4 w-4" />
                  Excel
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Preview */}
      {reportData && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Report Preview</h3>
          <div className="space-y-4">
            {/* Summary */}
            {reportData.summary && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <h4 className="mb-3 text-sm font-semibold text-neutral-900">Summary</h4>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {Object.entries(reportData.summary).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs font-medium text-neutral-600">{key}</p>
                      <p className="text-lg font-bold text-neutral-900">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Data */}
            {reportData.students && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-neutral-900">Student Details</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Total Assignments</th>
                        <th className="px-3 py-2 text-left">Completed</th>
                        <th className="px-3 py-2 text-left">Average Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {reportData.students.slice(0, 10).map((student: any) => (
                        <tr key={student.studentId}>
                          <td className="px-3 py-2">{student.name}</td>
                          <td className="px-3 py-2">{student.totalAssignments}</td>
                          <td className="px-3 py-2">{student.completedAssignments}</td>
                          <td className="px-3 py-2">{student.averageGrade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
