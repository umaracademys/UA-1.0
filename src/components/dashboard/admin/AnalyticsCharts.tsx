"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Download, Calendar } from "lucide-react";

type AnalyticsChartsProps = {
  enrollmentData?: any[];
  moduleUsageData?: any[];
  userDistributionData?: any[];
  assignmentData?: any[];
  onExport?: (chartType: string) => void;
};

const COLORS = ["#2E4D32", "#C49636", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function AnalyticsCharts({
  enrollmentData = [],
  moduleUsageData = [],
  userDistributionData = [],
  assignmentData = [],
  onExport,
}: AnalyticsChartsProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Mock data if not provided
  const defaultEnrollmentData = enrollmentData.length > 0 ? enrollmentData : [
    { month: "Jan", students: 45 },
    { month: "Feb", students: 52 },
    { month: "Mar", students: 48 },
    { month: "Apr", students: 61 },
    { month: "May", students: 55 },
    { month: "Jun", students: 68 },
  ];

  const defaultModuleUsage = moduleUsageData.length > 0 ? moduleUsageData : [
    { module: "Assignments", count: 120 },
    { module: "Tickets", count: 85 },
    { module: "Evaluations", count: 60 },
    { module: "Messages", count: 200 },
  ];

  const defaultUserDistribution = userDistributionData.length > 0 ? userDistributionData : [
    { name: "Students", value: 150 },
    { name: "Teachers", value: 25 },
    { name: "Admins", value: 5 },
  ];

  const defaultAssignmentData = assignmentData.length > 0 ? assignmentData : [
    { date: "Week 1", submitted: 45, pending: 15 },
    { date: "Week 2", submitted: 52, pending: 8 },
    { date: "Week 3", submitted: 48, pending: 12 },
    { date: "Week 4", submitted: 61, pending: 9 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">Analytics & Insights</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
            <Calendar className="h-4 w-4 text-neutral-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-none bg-transparent text-sm focus:outline-none"
              placeholder="From"
            />
            <span className="text-neutral-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border-none bg-transparent text-sm focus:outline-none"
              placeholder="To"
            />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Enrollment Trend */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-neutral-900">Student Enrollment Trend</h4>
            {onExport && (
              <button
                onClick={() => onExport("enrollment")}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={defaultEnrollmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="students" stroke="#3b82f6" name="Students" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Module Usage */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-neutral-900">Module Usage</h4>
            {onExport && (
              <button
                onClick={() => onExport("modules")}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={defaultModuleUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="module" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#C49636" name="Usage Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User Distribution */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-neutral-900">User Distribution</h4>
            {onExport && (
              <button
                onClick={() => onExport("users")}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={defaultUserDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {defaultUserDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Assignment Submissions */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-neutral-900">Assignment Submissions</h4>
            {onExport && (
              <button
                onClick={() => onExport("assignments")}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={defaultAssignmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="submitted"
                stackId="1"
                stroke="#C49636"
                fill="#C49636"
                name="Submitted"
              />
              <Area
                type="monotone"
                dataKey="pending"
                stackId="1"
                stroke="#f59e0b"
                fill="#f59e0b"
                name="Pending"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
