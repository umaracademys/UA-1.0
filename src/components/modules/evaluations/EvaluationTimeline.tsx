"use client";

import { format } from "date-fns";
import { StarRating } from "./StarRating";

type EvaluationTimelineProps = {
  evaluations: any[];
};

export function EvaluationTimeline({ evaluations }: EvaluationTimelineProps) {
  if (evaluations.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        No evaluations to display
      </div>
    );
  }

  const sortedEvaluations = [...evaluations].sort((a, b) => {
    const dateA = new Date(a.weekStartDate || a.createdAt).getTime();
    const dateB = new Date(b.weekStartDate || b.createdAt).getTime();
    return dateB - dateA;
  });

  const calculateAverageRating = (evaluation: any) => {
    if (!evaluation.categories || evaluation.categories.length === 0) return 0;
    const sum = evaluation.categories.reduce((acc: number, cat: any) => acc + (cat.rating || 0), 0);
    return sum / evaluation.categories.length;
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-neutral-900">Evaluation Timeline</h2>
      <div className="space-y-4">
        {sortedEvaluations.map((evaluation, index) => {
          const averageRating = calculateAverageRating(evaluation);
          return (
            <div
              key={evaluation._id}
              className="flex items-start gap-4 border-l-2 border-indigo-200 pl-4"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-900">
                    Week of {format(new Date(evaluation.weekStartDate || evaluation.createdAt), "MMM d, yyyy")}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      evaluation.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : evaluation.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : evaluation.status === "submitted"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {evaluation.status}
                  </span>
                </div>
                <div className="mt-2">
                  <StarRating rating={averageRating} readOnly size="sm" showValue />
                </div>
                {evaluation.overallComments && (
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-600">
                    {evaluation.overallComments}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
