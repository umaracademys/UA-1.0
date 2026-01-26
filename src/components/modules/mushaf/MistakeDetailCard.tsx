"use client";

import { format } from "date-fns";
import { MapPin, FileText, Volume2, CheckCircle, XCircle, ExternalLink, History, Zap } from "lucide-react";
import { getTajweedExplanation } from "@/lib/mushaf/tajweedExplanations";
import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";

type MistakeDetailCardProps = {
  mistake: PersonalMushafMistake;
  isHistorical?: boolean;
  onNavigateToPage?: (page: number) => void;
  onResolve?: (mistakeId: string) => void;
  canResolve?: boolean;
};

export function MistakeDetailCard({
  mistake,
  isHistorical = false,
  onNavigateToPage,
  onResolve,
  canResolve = false,
}: MistakeDetailCardProps) {
  const tajweedExplanation = mistake.category === "tajweed" ? getTajweedExplanation(mistake.type) : null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              {mistake.type}
            </span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 capitalize">
              {mistake.category}
            </span>
            {isHistorical ? (
              <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                <History className="h-3 w-3" />
                <span>Historical</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                <Zap className="h-3 w-3" />
                <span>Current Session</span>
              </span>
            )}
            {mistake.timeline.resolved ? (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                <CheckCircle className="h-3 w-3" />
                Resolved
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
                <XCircle className="h-3 w-3" />
                Unresolved
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-neutral-900">Workflow: {mistake.workflowStep}</p>
        </div>
      </div>

      {/* Location Info */}
      <div className="mb-4 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        {mistake.page && (
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <MapPin className="h-4 w-4" />
            <span>Page {mistake.page}</span>
          </div>
        )}
        {mistake.surah && mistake.ayah && (
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <FileText className="h-4 w-4" />
            <span>
              Surah {mistake.surah}, Ayah {mistake.ayah}
            </span>
          </div>
        )}
        {mistake.wordIndex !== undefined && (
          <p className="text-sm text-neutral-600">Word {mistake.wordIndex + 1}</p>
        )}
        {mistake.letterIndex !== undefined && (
          <p className="text-sm text-neutral-600">Letter {mistake.letterIndex + 1}</p>
        )}
      </div>

      {/* Note */}
      {mistake.note && (
        <div className="mb-4">
          <p className="mb-1 text-xs font-medium text-neutral-700">Note</p>
          <p className="text-sm text-neutral-900">{mistake.note}</p>
        </div>
      )}

      {/* Tajweed Explanation */}
      {tajweedExplanation && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="mb-2 text-xs font-semibold text-blue-900">{tajweedExplanation.title}</p>
          <p className="mb-2 text-xs text-blue-800">{tajweedExplanation.description}</p>
          {mistake.tajweedData && (
            <div className="mt-2 space-y-1 text-xs text-blue-700">
              {mistake.tajweedData.tajweedRule && (
                <p>
                  <span className="font-medium">Rule:</span> {mistake.tajweedData.tajweedRule}
                </p>
              )}
              {mistake.tajweedData.teacherNote && (
                <p>
                  <span className="font-medium">Teacher Note:</span> {mistake.tajweedData.teacherNote}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Audio */}
      {mistake.audioUrl && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-neutral-600" />
            <p className="text-xs font-medium text-neutral-700">Audio Explanation</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <audio
              controls
              src={mistake.audioUrl}
              className="w-full h-10"
              preload="metadata"
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      )}

      {/* Timeline Info */}
      <div className="mb-4 space-y-2 border-t border-neutral-200 pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-600">First Marked:</span>
          <span className="font-medium text-neutral-900">
            {format(new Date(mistake.timeline.firstMarkedAt), "MMM dd, yyyy")}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-600">Last Marked:</span>
          <span className="font-medium text-neutral-900">
            {format(new Date(mistake.timeline.lastMarkedAt), "MMM dd, yyyy")}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-600">Repeat Count:</span>
          <span className="font-medium text-neutral-900">{mistake.timeline.repeatCount}</span>
        </div>
        {mistake.markedByName && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-600">Marked By:</span>
            <span className="font-medium text-neutral-900">{mistake.markedByName}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {mistake.page && onNavigateToPage && (
          <button
            onClick={() => onNavigateToPage(mistake.page!)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Navigate to Page
          </button>
        )}
        {canResolve && !mistake.timeline.resolved && onResolve && (
          <button
            onClick={() => onResolve(mistake.id)}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}
