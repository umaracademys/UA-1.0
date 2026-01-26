"use client";

import { useMemo } from "react";
import { StarRating } from "./StarRating";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type EvaluationStatisticsProps = {
  evaluations: any[];
};

export function EvaluationStatistics({ evaluations }: EvaluationStatisticsProps) {
  const stats = useMemo(() => {
    if (evaluations.length === 0) {
      return {
        averageRating: 0,
        totalEvaluations: 0,
        byStatus: { approved: 0, rejected: 0, submitted: 0, draft: 0 },
        categoryAverages: {} as Record<string, number>,
        trend: "stable" as "improving" | "declining" | "stable",
      };
    }

    let totalRating = 0;
    let ratingCount = 0;
    const categoryTotals: Record<string, { sum: number; count: number }> = {};
    const byStatus = { approved: 0, rejected: 0, submitted: 0, draft: 0 };

    evaluations.forEach((evaluation) => {
      const status = evaluation.status as keyof typeof byStatus;
      if (status in byStatus) {
        byStatus[status] = (byStatus[status] || 0) + 1;
      }

      if (evaluation.categories) {
        evaluation.categories.forEach((cat: any) => {
          totalRating += cat.rating || 0;
          ratingCount++;

          if (!categoryTotals[cat.name]) {
            categoryTotals[cat.name] = { sum: 0, count: 0 };
          }
          categoryTotals[cat.name].sum += cat.rating || 0;
          categoryTotals[cat.name].count += 1;
        });
      }
    });

    const categoryAverages: Record<string, number> = {};
    Object.entries(categoryTotals).forEach(([name, data]) => {
      categoryAverages[name] = data.count > 0 ? data.sum / data.count : 0;
    });

    // Calculate trend (compare last 2 evaluations)
    let trend: "improving" | "declining" | "stable" = "stable";
    if (evaluations.length >= 2) {
      const sorted = [...evaluations].sort(
        (a, b) =>
          new Date(b.weekStartDate || b.createdAt).getTime() -
          new Date(a.weekStartDate || a.createdAt).getTime(),
      );
      const recent = sorted.slice(0, 2);
      const recentAvg =
        recent[0].categories?.reduce((acc: number, cat: any) => acc + (cat.rating || 0), 0) /
          (recent[0].categories?.length || 1) || 0;
      const previousAvg =
        recent[1].categories?.reduce((acc: number, cat: any) => acc + (cat.rating || 0), 0) /
          (recent[1].categories?.length || 1) || 0;

      if (recentAvg > previousAvg) trend = "improving";
      else if (recentAvg < previousAvg) trend = "declining";
    }

    return {
      averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
      totalEvaluations: evaluations.length,
      byStatus,
      categoryAverages,
      trend,
    };
  }, [evaluations]);

  const TrendIcon = stats.trend === "improving" ? TrendingUp : stats.trend === "declining" ? TrendingDown : Minus;
  const trendColor =
    stats.trend === "improving"
      ? "text-green-600"
      : stats.trend === "declining"
        ? "text-red-600"
        : "text-neutral-600";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Average Rating */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-xs font-medium text-neutral-500">Average Rating</p>
        <div className="mt-2">
          <StarRating rating={stats.averageRating} readOnly size="lg" showValue />
        </div>
      </div>

      {/* Total Evaluations */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-xs font-medium text-neutral-500">Total Evaluations</p>
        <p className="mt-2 text-3xl font-bold text-neutral-900">{stats.totalEvaluations}</p>
      </div>

      {/* Trend */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-xs font-medium text-neutral-500">Trend</p>
        <div className="mt-2 flex items-center gap-2">
          <TrendIcon className={`h-5 w-5 ${trendColor}`} />
          <p className={`text-sm font-semibold capitalize ${trendColor}`}>{stats.trend}</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-xs font-medium text-neutral-500">Status</p>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-600">Approved:</span>
            <span className="font-medium text-green-600">{stats.byStatus.approved}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">Pending:</span>
            <span className="font-medium text-yellow-600">
              {stats.byStatus.submitted + stats.byStatus.draft}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
