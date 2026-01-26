"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EvaluationsList } from "@/components/modules/evaluations/EvaluationsList";
import { CreateEvaluationForm } from "@/components/modules/evaluations/CreateEvaluationForm";
import axios from "axios";
import toast from "react-hot-toast";

export default function TeacherEvaluationsPage() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [students, setStudents] = useState<Array<{ _id: string; fullName: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEvaluations();
      fetchStudents();
    }
  }, [user]);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/students", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const studentsList = response.data.data || response.data.students || [];
      setStudents(
        studentsList.map((s: any) => ({
          _id: s._id,
          fullName: s.userId?.fullName || "Unknown",
          email: s.userId?.email || "",
        })),
      );
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/evaluations", {
        headers: { Authorization: `Bearer ${token}` },
        params: { teacherId: user?.teacher?._id },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Evaluations</h1>
          <p className="mt-1 text-sm text-neutral-600">Create and manage student evaluations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Create Evaluation
        </button>
      </div>

      <EvaluationsList
        evaluations={evaluations}
        loading={loading}
        userRole="teacher"
        onRefresh={fetchEvaluations}
      />

      {showCreateModal && (
        <CreateEvaluationForm
          students={students}
          onCancel={() => setShowCreateModal(false)}
          onSubmit={async (data, status) => {
            try {
              const token = localStorage.getItem("token");
              await axios.post("/api/evaluations", data, {
                headers: { Authorization: `Bearer ${token}` },
              });
              toast.success("Evaluation created successfully");
              setShowCreateModal(false);
              fetchEvaluations();
            } catch (error: any) {
              toast.error(error.response?.data?.message || "Failed to create evaluation");
            }
          }}
        />
      )}
    </div>
  );
}
