"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Search } from "lucide-react";

type Surah = {
  number: number;
  arabicName: string;
  englishName: string;
  verseCount: number;
  startingPage: number;
};

import { SURAHS as SURAH_DATA, type SurahData } from "@/lib/mushaf/surahData";

const SURAHS: Surah[] = SURAH_DATA.map((surah) => ({
  number: surah.id,
  arabicName: surah.arabicName,
  englishName: surah.englishName,
  verseCount: surah.verseCount,
  startingPage: surah.startPage,
}));

type SurahIndexProps = {
  currentSurah?: number;
  currentPage: number;
  onSurahClick: (surah: number, page: number) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function SurahIndex({
  currentSurah,
  currentPage,
  onSurahClick,
  collapsed = false,
  onToggleCollapse,
}: SurahIndexProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSurahs = SURAHS.filter(
    (surah) =>
      surah.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      surah.arabicName.includes(searchQuery) ||
      surah.number.toString().includes(searchQuery),
  );

  return (
    <div className="h-full border-r border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Surahs</h3>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="flex flex-col">
          {/* Search */}
          <div className="border-b border-neutral-200 p-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search surahs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Surah List */}
          <div className="flex-1 overflow-y-auto">
            {filteredSurahs.map((surah) => {
              const isCurrent = surah.number === currentSurah || (currentPage >= surah.startingPage && currentPage < surah.startingPage + 5);

              return (
                <button
                  key={surah.number}
                  onClick={() => onSurahClick(surah.number, surah.startingPage)}
                  className={`w-full border-b border-neutral-100 px-4 py-3 text-left transition-colors hover:bg-neutral-50 ${
                    isCurrent ? "bg-indigo-50 border-indigo-200" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-500">{surah.number}</span>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{surah.englishName}</p>
                        <p className="text-xs text-neutral-500">{surah.arabicName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500">{surah.verseCount} verses</p>
                      <p className="text-xs text-neutral-400">Page {surah.startingPage}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
