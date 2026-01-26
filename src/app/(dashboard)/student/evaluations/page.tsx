"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { EvaluationsList } from "@/components/modules/evaluations/EvaluationsList";
import { EvaluationTimeline } from "@/components/modules/evaluations/EvaluationTimeline";
import { EvaluationStatistics } from "@/components/modules/evaluations/EvaluationStatistics";
import axios from "axios";
import toast from "react-hot-toast";

export default function StudentEvaluationsPage() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.student?._id) {
      fetchEvaluations();
    }
  }, [user]);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/students/${user?.student?._id}/evaluations`, {
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Evaluations</h1>
        <p className="mt-1 text-sm text-neutral-600">View your weekly evaluation reports</p>
      </div>

      {evaluations.length > 0 && (
        <div className="space-y-6">
          <EvaluationStatistics evaluations={evaluations} />
          <EvaluationTimeline evaluations={evaluations} />
        </div>
      )}

      <EvaluationsList
        evaluations={evaluations}
        loading={loading}
        userRole="student"
        onRefresh={fetchEvaluations}
      />
    </div>
  );
}
