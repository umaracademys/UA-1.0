"use client";

import { useMemo } from "react";
import { BookOpen, AlertCircle, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Statistics = {
  total: number;
  byWorkflowStep: {
    sabq: number;
    sabqi: number;
    manzil: number;
  };
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  resolved: number;
  unresolved: number;
  repeatOffenders: number;
  trend: Array<{ date: string; count: number }>;
  mostCommonTypes: Array<{ type: string; count: number }>;
};

type PersonalMushafStatsProps = {
  statistics: Statistics | null;
  loading?: boolean;
};

const COLORS = ["#2E4D32", "#8b5cf6", "#C49636", "#f59e0b", "#ef4444", "#6b7280"];

export function PersonalMushafStats({ statistics, loading = false }: PersonalMushafStatsProps) {
  const chartData = useMemo(() => {
    if (!statistics) return [];

    return statistics.trend.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      mistakes: item.count,
    }));
  }, [statistics]);

  const categoryData = useMemo(() => {
    if (!statistics) return [];

    return Object.entries(statistics.byCategory).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [statistics]);

  const typeData = useMemo(() => {
    if (!statistics) return [];

    return statistics.mostCommonTypes.slice(0, 10).map((item) => ({
      name: item.type,
      count: item.count,
    }));
  }, [statistics]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
    );
  }

  if (!statistics) {
    return <div className="text-center text-neutral-500">No statistics available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Total Mistakes</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{statistics.total}</p>
            </div>
            <div className="rounded-full bg-red-100 p-3 text-red-700">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Resolved</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{statistics.resolved}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 text-green-700">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Unresolved</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{statistics.unresolved}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 text-yellow-700">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Repeat Offenders</p>
              <p className="mt-1 text-2xl font-bold text-purple-600">{statistics.repeatOffenders}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 text-purple-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Step Breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-neutral-700">Sabq</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{statistics.byWorkflowStep.sabq}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-neutral-700">Sabqi</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{statistics.byWorkflowStep.sabqi}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-neutral-700">Manzil</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{statistics.byWorkflowStep.manzil}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mistakes Over Time */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold text-neutral-900">Mistakes Over Time (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="mistakes" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Mistakes by Category */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold text-neutral-900">Mistakes by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Most Common Types */}
      {typeData.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold text-neutral-900">Most Common Mistake Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
