"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { EvaluationsList } from "@/components/modules/evaluations/EvaluationsList";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import axios from "axios";
import toast from "react-hot-toast";

export default function AdminEvaluationsPage() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [pendingEvaluations, setPendingEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEvaluations();
      fetchPendingEvaluations();
    }
  }, [user]);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/evaluations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvaluations(response.data.evaluations || []);
    } catch (error) {
      console.error("Failed to fetch evaluations:", error);
      toast.error("Failed to load evaluations");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingEvaluations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/evaluations/pending-review", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingEvaluations(response.data.evaluations || []);
    } catch (error) {
      console.error("Failed to fetch pending evaluations:", error);
    }
  };

  return (
    <PermissionGuard permission="evaluation.review">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Evaluations</h1>
          <p className="mt-1 text-sm text-neutral-600">Review and manage student evaluations</p>
        </div>

        {pendingEvaluations.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h2 className="text-lg font-semibold text-yellow-900">
              Pending Review ({pendingEvaluations.length})
            </h2>
            <p className="text-sm text-yellow-700">
              {pendingEvaluations.length} evaluation(s) awaiting your review
            </p>
          </div>
        )}

        <EvaluationsList
          evaluations={evaluations}
          loading={loading}
          userRole="admin"
          onRefresh={fetchEvaluations}
        />
      </div>
    </PermissionGuard>
  );
}
