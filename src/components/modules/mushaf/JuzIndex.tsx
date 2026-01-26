"use client";

import { ChevronRight, ChevronDown } from "lucide-react";
import { JUZ_DATA as JUZ_DATA_IMPORT } from "@/lib/mushaf/juzData";

type Juz = {
  number: number;
  startingPage: number;
  endingPage: number;
};

const JUZ_DATA: Juz[] = JUZ_DATA_IMPORT.map((juz) => ({
  number: juz.id,
  startingPage: juz.startPage,
  endingPage: juz.endPage,
}));

type JuzIndexProps = {
  currentJuz: number;
  currentPage: number;
  onJuzClick: (juz: number, page: number) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function JuzIndex({
  currentJuz,
  currentPage,
  onJuzClick,
  collapsed = false,
  onToggleCollapse,
}: JuzIndexProps) {
  return (
    <div className="h-full border-r border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Juz</h3>
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
        <div className="flex-1 overflow-y-auto">
          {JUZ_DATA.map((juz) => {
            const isCurrent =
              juz.number === currentJuz || (currentPage >= juz.startingPage && currentPage <= juz.endingPage);

            return (
              <button
                key={juz.number}
                onClick={() => onJuzClick(juz.number, juz.startingPage)}
                className={`w-full border-b border-neutral-100 px-4 py-3 text-left transition-colors hover:bg-neutral-50 ${
                  isCurrent ? "bg-indigo-50 border-indigo-200" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-900">Juz {juz.number}</span>
                  <span className="text-xs text-neutral-500">
                    Pages {juz.startingPage}-{juz.endingPage}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
