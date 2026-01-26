"use client";

import { useState, useEffect } from "react";
import { User, Download, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { InteractiveMushaf } from "./InteractiveMushaf";
import { PersonalMushafStats } from "./PersonalMushafStats";
import { MistakeFilterPanel } from "./MistakeFilterPanel";
import { MistakeTimeline } from "./MistakeTimeline";
import { MistakeDetailCard } from "./MistakeDetailCard";
import { RepeatMistakesPanel } from "./RepeatMistakesPanel";
import { ExportMushafReport } from "./ExportMushafReport";
import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";

type PersonalMushafViewProps = {
  studentId: string;
  mode: "student" | "teacher" | "admin";
  studentName?: string;
};

export function PersonalMushafView({ studentId, mode, studentName }: PersonalMushafViewProps) {
  const [personalMushaf, setPersonalMushaf] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [mistakes, setMistakes] = useState<PersonalMushafMistake[]>([]);
  const [filteredMistakes, setFilteredMistakes] = useState<PersonalMushafMistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMistake, setSelectedMistake] = useState<PersonalMushafMistake | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMushaf, setShowMushaf] = useState(false);

  useEffect(() => {
    fetchPersonalMushaf();
    fetchStatistics();
  }, [studentId]);

  const fetchPersonalMushaf = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students/${studentId}/personal-mushaf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setPersonalMushaf(result.personalMushaf);
        setMistakes(result.personalMushaf?.mistakes || []);
        setFilteredMistakes(result.personalMushaf?.mistakes || []);
      } else {
        toast.error(result.message || "Failed to load Personal Mushaf");
      }
    } catch (error) {
      toast.error("Failed to load Personal Mushaf");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students/${studentId}/personal-mushaf/statistics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setStatistics(result.statistics);
      }
    } catch (error) {
      console.error("Failed to load statistics");
    }
  };

  const handleFilterChange = async (filters: any) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students/${studentId}/personal-mushaf/filter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(filters),
      });

      const result = await response.json();
      if (response.ok) {
        setFilteredMistakes(result.mistakes || []);
        if (result.statistics) {
          setStatistics(result.statistics);
        }
      }
    } catch (error) {
      toast.error("Failed to apply filters");
    }
  };

  const handleResolveMistake = async (mistakeId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/students/${studentId}/personal-mushaf/mistakes/${mistakeId}/resolve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();
      if (response.ok) {
        toast.success("Mistake resolved successfully");
        fetchPersonalMushaf();
        fetchStatistics();
        setSelectedMistake(null);
      } else {
        toast.error(result.message || "Failed to resolve mistake");
      }
    } catch (error) {
      toast.error("Failed to resolve mistake");
    }
  };

  const handleNavigateToPage = (page: number) => {
    setCurrentPage(page);
    setShowMushaf(true);
  };

  const availableCategories = Array.from(new Set(mistakes.map((m) => m.category)));
  const availableTypes = Array.from(new Set(mistakes.map((m) => m.type)));

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-indigo-600 mx-auto" />
          <p className="text-neutral-600">Loading Personal Mushaf...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-100 p-2 text-indigo-700">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-900">
                {studentName || "Personal Mushaf"}
              </h1>
              <p className="text-sm text-neutral-600">View and manage recitation mistakes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(mode === "teacher" || mode === "admin") && (
              <button
                onClick={() => setShowMushaf(true)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Mistake
              </button>
            )}
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Filters */}
        <div className="w-64 overflow-y-auto border-r border-neutral-200">
          <MistakeFilterPanel
            onFilterChange={handleFilterChange}
            availableCategories={availableCategories}
            availableTypes={availableTypes}
          />
        </div>

        {/* Center - Mushaf or Stats */}
        <div className="flex-1 overflow-y-auto">
          {showMushaf ? (
            <div className="h-full">
              <InteractiveMushaf
                mode={mode === "student" ? "viewing" : "marking"}
                studentId={studentId}
                showHistoricalMistakes={true}
              />
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {/* Statistics */}
              <PersonalMushafStats statistics={statistics} loading={false} />

              {/* Repeat Offenders */}
              {mistakes.filter((m) => m.timeline.repeatCount >= 3).length > 0 && (
                <div className="rounded-lg border border-neutral-200 bg-white p-6">
                  <h2 className="mb-4 text-lg font-semibold text-neutral-900">Repeat Offenders</h2>
                  <RepeatMistakesPanel
                    mistakes={filteredMistakes}
                    onMistakeClick={setSelectedMistake}
                    onNavigateToPage={handleNavigateToPage}
                  />
                </div>
              )}

              {/* Timeline */}
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-neutral-900">Mistake Timeline</h2>
                <MistakeTimeline
                  mistakes={filteredMistakes}
                  onMistakeClick={setSelectedMistake}
                  onNavigateToPage={handleNavigateToPage}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Mistake Details */}
        {selectedMistake && (
          <div className="w-80 overflow-y-auto border-l border-neutral-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">Mistake Details</h3>
              <button
                onClick={() => setSelectedMistake(null)}
                className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <MistakeDetailCard
              mistake={selectedMistake}
              onNavigateToPage={handleNavigateToPage}
              onResolve={handleResolveMistake}
              canResolve={mode === "teacher" || mode === "admin"}
            />
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportMushafReport
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          studentId={studentId}
          studentName={studentName}
          mistakes={filteredMistakes}
          statistics={statistics}
        />
      )}
    </div>
  );
}
