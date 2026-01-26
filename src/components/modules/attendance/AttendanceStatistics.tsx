"use client";

import { useMemo } from "react";
import { format, subMonths } from "date-fns";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type AttendanceRecord = {
  date: Date | string;
  status: "present" | "absent" | "late" | "excused";
};

type AttendanceStatisticsProps = {
  records: AttendanceRecord[];
  showPaidDays?: boolean;
  paidDays?: number;
  title?: string;
};

const COLORS = {
  present: "#C49636",
  absent: "#ef4444",
  late: "#f59e0b",
  excused: "#3b82f6",
};

export function AttendanceStatistics({
  records,
  showPaidDays = false,
  paidDays = 0,
  title = "Attendance Statistics",
}: AttendanceStatisticsProps) {
  const statistics = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const late = records.filter((r) => r.status === "late").length;
    const excused = records.filter((r) => r.status === "excused").length;
    const attendanceRate = total > 0 ? ((present + excused) / total) * 100 : 0;

    return {
      total,
      present,
      absent,
      late,
      excused,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    };
  }, [records]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const monthlyData: Record<string, { present: number; absent: number; late: number; excused: number }> = {};

    records.forEach((record) => {
      const date = new Date(record.date);
      const monthKey = format(date, "MMM yyyy");

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { present: 0, absent: 0, late: 0, excused: 0 };
      }

      monthlyData[monthKey][record.status]++;
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        ...data,
        total: data.present + data.absent + data.late + data.excused,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [records]);

  // Status distribution for pie chart
  const statusDistribution = [
    { name: "Present", value: statistics.present, color: COLORS.present },
    { name: "Absent", value: statistics.absent, color: COLORS.absent },
    { name: "Late", value: statistics.late, color: COLORS.late },
    { name: "Excused", value: statistics.excused, color: COLORS.excused },
  ].filter((item) => item.value > 0);

  // This month vs last month comparison
  const currentMonth = format(new Date(), "MMM yyyy");
  const lastMonth = format(subMonths(new Date(), 1), "MMM yyyy");
  const currentMonthData = monthlyTrend.find((d) => d.month === currentMonth);
  const lastMonthData = monthlyTrend.find((d) => d.month === lastMonth);

  const comparison = {
    current: {
      total: currentMonthData?.total || 0,
      rate: currentMonthData
        ? ((currentMonthData.present + currentMonthData.excused) / currentMonthData.total) * 100
        : 0,
    },
    last: {
      total: lastMonthData?.total || 0,
      rate: lastMonthData
        ? ((lastMonthData.present + lastMonthData.excused) / lastMonthData.total) * 100
        : 0,
    },
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium text-neutral-600">Total Days</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{statistics.total}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-medium text-green-700">Present</p>
          <p className="mt-1 text-2xl font-bold text-green-900">{statistics.present}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-700">Absent</p>
          <p className="mt-1 text-2xl font-bold text-red-900">{statistics.absent}</p>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs font-medium text-indigo-700">Attendance Rate</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">{statistics.attendanceRate}%</p>
        </div>
      </div>

      {showPaidDays && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium text-blue-700">Paid Days</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">{paidDays}</p>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trend */}
        {monthlyTrend.length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h4 className="mb-4 text-sm font-semibold text-neutral-900">Monthly Trend</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke={COLORS.present} name="Present" />
                <Line type="monotone" dataKey="absent" stroke={COLORS.absent} name="Absent" />
                <Line type="monotone" dataKey="late" stroke={COLORS.late} name="Late" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status Distribution */}
        {statusDistribution.length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h4 className="mb-4 text-sm font-semibold text-neutral-900">Status Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Comparison */}
      {(currentMonthData || lastMonthData) && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h4 className="mb-4 text-sm font-semibold text-neutral-900">Month Comparison</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-neutral-600">{currentMonth}</p>
              <p className="mt-1 text-lg font-bold text-neutral-900">
                {Math.round(comparison.current.rate)}%
              </p>
              <p className="text-xs text-neutral-500">{comparison.current.total} days</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-600">{lastMonth}</p>
              <p className="mt-1 text-lg font-bold text-neutral-900">
                {Math.round(comparison.last.rate)}%
              </p>
              <p className="text-xs text-neutral-500">{comparison.last.total} days</p>
            </div>
          </div>
          {comparison.current.rate > comparison.last.rate && (
            <p className="mt-2 text-xs text-green-600">↑ Improvement</p>
          )}
          {comparison.current.rate < comparison.last.rate && (
            <p className="mt-2 text-xs text-red-600">↓ Decline</p>
          )}
        </div>
      )}
    </div>
  );
}
