"use client";

import { useState } from "react";
import { EvaluationCard } from "./EvaluationCard";
import { EvaluationDetails } from "./EvaluationDetails";
import { useAuth } from "@/contexts/AuthContext";

type EvaluationsListProps = {
  evaluations: any[];
  loading?: boolean;
  userRole: "student" | "teacher" | "admin";
  onRefresh?: () => void;
};

export function EvaluationsList({
  evaluations,
  loading = false,
  userRole,
  onRefresh,
}: EvaluationsListProps) {
  const { user } = useAuth();
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleView = (evaluationId: string) => {
    const evaluation = evaluations.find((e) => e._id === evaluationId);
    if (evaluation) {
      setSelectedEvaluation(evaluation);
      setShowDetails(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-500">Loading evaluations...</div>
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
        <p className="text-sm font-medium text-neutral-900">No evaluations found</p>
        <p className="mt-1 text-sm text-neutral-500">
          {userRole === "student"
            ? "You don't have any evaluations yet."
            : "No evaluations have been created yet."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {evaluations.map((evaluation) => (
          <EvaluationCard
            key={evaluation._id}
            evaluation={evaluation}
            currentUserId={user?.id || user?._id || ""}
            currentUserRole={userRole}
            onView={handleView}
          />
        ))}
      </div>

      {showDetails && selectedEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-900">Evaluation Details</h2>
              <button
                onClick={() => {
                  setShowDetails(false);
                  setSelectedEvaluation(null);
                }}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>
            <EvaluationDetails
              evaluation={selectedEvaluation}
              currentUserId={user?.id || user?._id || ""}
              currentUserRole={userRole}
            />
          </div>
        </div>
      )}
    </>
  );
}
