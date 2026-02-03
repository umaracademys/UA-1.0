"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NavigationControls } from "./NavigationControls";
import { MushafPage } from "./MushafPage";
import { SurahIndex } from "./SurahIndex";
import { JuzIndex } from "./JuzIndex";
import { MistakeCounter } from "./MistakeCounter";
import { MistakesList } from "./MistakesList";
import { MarkMistakeModal } from "./MarkMistakeModal";
import { ShortcutsHelpModal } from "./ShortcutsHelpModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSwipeGestures } from "@/hooks/useSwipeGestures";
import type { PersonalMushafMistake } from "@/lib/db/models/PersonalMushaf";
import type { WorkflowStep } from "@/lib/db/models/PersonalMushaf";
import { getSurahById } from "@/lib/mushaf/surahData";
import { getPageForSurahAyah } from "@/lib/mushaf/juzData";
import toast from "react-hot-toast";

/** Ayah range (from → to) locked when ticket is in progress. */
export type AyahRange = {
  fromSurah: number;
  fromAyah: number;
  toSurah: number;
  toAyah: number;
};

type InteractiveMushafProps = {
  mode: "marking" | "viewing";
  studentId?: string;
  ticketId?: string;
  /** When set (e.g. from active ticket), listening range is fixed. */
  ayahRange?: AyahRange | null;
  /** When true, ayah range cannot be changed (session locked). */
  rangeLocked?: boolean;
  showHistoricalMistakes?: boolean;
  onMistakeMarked?: (mistake: PersonalMushafMistake) => void;
};

// Calculate Juz from page number
const getJuzFromPage = (page: number): number => {
  if (page <= 21) return 1;
  if (page <= 41) return 2;
  if (page <= 61) return 3;
  if (page <= 81) return 4;
  if (page <= 101) return 5;
  if (page <= 121) return 6;
  if (page <= 141) return 7;
  if (page <= 161) return 8;
  if (page <= 181) return 9;
  if (page <= 201) return 10;
  if (page <= 221) return 11;
  if (page <= 241) return 12;
  if (page <= 261) return 13;
  if (page <= 281) return 14;
  if (page <= 301) return 15;
  if (page <= 321) return 16;
  if (page <= 341) return 17;
  if (page <= 361) return 18;
  if (page <= 381) return 19;
  if (page <= 401) return 20;
  if (page <= 421) return 21;
  if (page <= 441) return 22;
  if (page <= 461) return 23;
  if (page <= 481) return 24;
  if (page <= 501) return 25;
  if (page <= 521) return 26;
  if (page <= 541) return 27;
  if (page <= 561) return 28;
  if (page <= 581) return 29;
  return 30;
};

export function InteractiveMushaf({
  mode,
  studentId,
  ticketId,
  ayahRange: propAyahRange = null,
  rangeLocked = false,
  showHistoricalMistakes: initialShowHistoricalMistakes = false,
  onMistakeMarked,
}: InteractiveMushafProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentJuz, setCurrentJuz] = useState(1);
  const [currentSurah, setCurrentSurah] = useState<number | undefined>();
  const [initialPositionLoaded, setInitialPositionLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [focusMode, setFocusMode] = useState(false);
  const [toolsHidden, setToolsHidden] = useState(false);
  const [currentSessionMistakes, setCurrentSessionMistakes] = useState<PersonalMushafMistake[]>([]);
  const [historicalMistakes, setHistoricalMistakes] = useState<PersonalMushafMistake[]>([]);
  const [showHistoricalMistakes, setShowHistoricalMistakes] = useState(initialShowHistoricalMistakes);
  const [selectedWord, setSelectedWord] = useState<{
    page: number;
    wordIndex: number;
    letterIndex?: number;
    selectedLetter?: string;
    wordText?: string;
    position?: { x: number; y: number };
    surah?: number;
    ayah?: number;
  } | null>(null);
  const [isMarkMistakeOpen, setIsMarkMistakeOpen] = useState(false);
  const [surahIndexCollapsed, setSurahIndexCollapsed] = useState(false);
  const [juzIndexCollapsed, setJuzIndexCollapsed] = useState(false);
  const [mistakeFilter, setMistakeFilter] = useState<"all" | "mistakes" | "atkees" | "tajweed">("all");
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const mushafContainerRef = useRef<HTMLDivElement>(null);
  const initialPinchZoomRef = useRef(1);

  // Update Juz when page changes
  useEffect(() => {
    setCurrentJuz(getJuzFromPage(currentPage));
  }, [currentPage]);

  // When ayahRange is provided (e.g. from active ticket), load the correct Quran page automatically
  useEffect(() => {
    if (!propAyahRange?.fromSurah) return;
    const page = getPageForSurahAyah(propAyahRange.fromSurah, propAyahRange.fromAyah ?? 1);
    if (page >= 1 && page <= 604) {
      setCurrentPage(page);
      setCurrentJuz(getJuzFromPage(page));
      setCurrentSurah(propAyahRange.fromSurah);
    }
  }, [propAyahRange?.fromSurah, propAyahRange?.fromAyah]);

  // Mushaf position memory: load last page/surah/ayah for this student so reload restores exact position. No data loss on browser crash or refresh.
  useEffect(() => {
    if (!studentId || initialPositionLoaded || propAyahRange?.fromSurah) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/students/${studentId}/mushaf-position`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (cancelled || !res.ok || !data.position) return;
        const { lastPage, lastSurah } = data.position;
        if (lastPage != null && lastPage >= 1 && lastPage <= 604) {
          setCurrentPage(lastPage);
          setCurrentJuz(getJuzFromPage(lastPage));
        }
        if (lastSurah != null) setCurrentSurah(lastSurah);
      } catch {
        // Non-blocking
      } finally {
        if (!cancelled) setInitialPositionLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, initialPositionLoaded]);

  // Persist Mushaf position when student navigates (debounced). Ensures last viewed page/surah is saved for next open.
  useEffect(() => {
    if (!studentId || !initialPositionLoaded) return;
    const t = setTimeout(() => {
      const token = localStorage.getItem("token");
      fetch(`/api/students/${studentId}/mushaf-position`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lastPage: currentPage,
          lastSurah: currentSurah ?? undefined,
        }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [studentId, initialPositionLoaded, currentPage, currentSurah]);

  const loadTicketMistakes = async () => {
    if (!ticketId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticketId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.ticket?.mistakes) {
        // Convert ticket mistakes to PersonalMushafMistake format
        const mistakes: PersonalMushafMistake[] = result.ticket.mistakes.map((mistake: any, index: number) => ({
          id: `ticket-${ticketId}-${index}`,
          type: mistake.type,
          category: mistake.category,
          page: mistake.page,
          surah: mistake.surah,
          ayah: mistake.ayah,
          wordIndex: mistake.wordIndex,
          letterIndex: mistake.letterIndex,
          position: mistake.position,
          tajweedData: mistake.tajweedData,
          note: mistake.note,
          audioUrl: mistake.audioUrl,
          workflowStep: result.ticket.workflowStep as WorkflowStep,
          timeline: {
            firstMarkedAt: mistake.timestamp ? new Date(mistake.timestamp) : new Date(),
            lastMarkedAt: mistake.timestamp ? new Date(mistake.timestamp) : new Date(),
            repeatCount: 1,
            resolved: false,
          },
          timestamp: mistake.timestamp ? new Date(mistake.timestamp) : new Date(),
        }));
        setCurrentSessionMistakes(mistakes);
      }
    } catch (error) {
      console.error("Failed to load ticket mistakes", error);
    }
  };

  // Load current session mistakes from ticket
  useEffect(() => {
    if (ticketId) {
      loadTicketMistakes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // Load historical mistakes
  useEffect(() => {
    if (showHistoricalMistakes && studentId) {
      loadHistoricalMistakes();
    }
  }, [studentId, showHistoricalMistakes]);

  const loadHistoricalMistakes = async () => {
    if (!studentId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students/${studentId}/recitation-history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

        const result = await response.json();
        if (response.ok && result.tickets) {
          // Extract mistakes from tickets
          const allMistakes: PersonalMushafMistake[] = [];
          result.tickets.forEach((ticket: any) => {
            if (ticket.mistakes) {
              ticket.mistakes.forEach((mistake: any) => {
                allMistakes.push({
                  ...mistake,
                  workflowStep: ticket.workflowStep,
                  ticketId: ticket._id,
                } as PersonalMushafMistake);
              });
            }
          });
          setHistoricalMistakes(allMistakes);
        } else if (response.ok && result.mistakes) {
          // Direct mistakes array from personal mushaf
          setHistoricalMistakes(result.mistakes || []);
        }
    } catch (error) {
      console.error("Failed to load historical mistakes");
    }
  };

  const navigateToPage = useCallback((page: number) => {
    if (page >= 1 && page <= 604) {
      setCurrentPage(page);
    }
  }, []);

  const navigateToJuz = useCallback((juz: number) => {
    if (juz >= 1 && juz <= 30) {
      const startingPages = [
        1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442,
        462, 482, 502, 522, 542, 562, 582,
      ];
      setCurrentPage(startingPages[juz - 1] || 1);
      setCurrentJuz(juz);
    }
  }, []);

  const navigateToSurah = useCallback((surah: number, page?: number) => {
    const startPage = page ?? getSurahById(surah)?.startPage ?? 1;
    setCurrentPage(Math.min(Math.max(1, startPage), 604));
    setCurrentSurah(surah);
  }, []);

  const handleWordClick = useCallback(
    (
      page: number,
      wordIndex: number,
      letterIndex?: number,
      position?: { x: number; y: number },
      wordText?: string,
      selectedLetter?: string,
      surah?: number,
      ayah?: number,
    ) => {
      if (mode === "marking") {
        setSelectedWord({
          page,
          wordIndex,
          letterIndex,
          selectedLetter,
          wordText,
          position,
          surah,
          ayah,
        });
        setIsMarkMistakeOpen(true);
      }
    },
    [mode],
  );

  const handleMistakeMark = async (mistakeData: any) => {
    try {
      if (mode === "marking" && ticketId) {
        // Add mistake to ticket
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/tickets/${ticketId}/add-mistake`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(mistakeData),
        });

        const result = await response.json();
        if (response.ok) {
          // Reload ticket mistakes to get the updated list
          await loadTicketMistakes();
          
          // Add to current session mistakes array for immediate UI update
          const newMistake: PersonalMushafMistake = {
            id: `temp-${Date.now()}`,
            ...mistakeData,
            category: mistakeData.category as any,
            workflowStep: "sabq" as WorkflowStep, // Would come from ticket
            timeline: {
              firstMarkedAt: new Date(),
              lastMarkedAt: new Date(),
              repeatCount: 1,
              resolved: false,
            },
          };
          setCurrentSessionMistakes([...currentSessionMistakes, newMistake]);
          onMistakeMarked?.(newMistake);
          toast.success("Mistake marked successfully");
        } else {
          throw new Error(result.message || "Failed to mark mistake");
        }
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to mark mistake");
      throw error;
    }
  };

  const handleMistakeClick = useCallback((mistake: PersonalMushafMistake) => {
    if (mistake.page) {
      navigateToPage(mistake.page);
    }
  }, [navigateToPage]);

  const handleRemoveMistake = async (mistakeId: string) => {
    const removed = currentSessionMistakes.find((m) => m.id === mistakeId);
    // If mistake is from ticket (id = ticket-${ticketId}-${index}), remove on server so it persists after refresh.
    const ticketMistakeMatch = ticketId && mistakeId.startsWith(`ticket-${ticketId}-`);
    if (ticketMistakeMatch && ticketId) {
      const indexStr = mistakeId.replace(`ticket-${ticketId}-`, "");
      const index = parseInt(indexStr, 10);
      if (!Number.isNaN(index) && index >= 0) {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`/api/tickets/${ticketId}/mistakes`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ index }),
          });
          if (res.ok) {
            await loadTicketMistakes();
            if (removed) onMistakeMarked?.(removed);
            return;
          }
        } catch {
          // Fall through to local remove
        }
      }
    }
    setCurrentSessionMistakes((prev) => prev.filter((m) => m.id !== mistakeId));
  };

  const zoomIn = () => setZoom(Math.min(zoom + 0.1, 1.4));
  const zoomOut = () => setZoom(Math.max(zoom - 0.1, 0.8));
  const resetZoom = () => setZoom(1);

  const toggleFocusMode = () => setFocusMode(!focusMode);
  const toggleTools = () => setToolsHidden(!toolsHidden);
  const toggleSurahIndex = () => setSurahIndexCollapsed(!surahIndexCollapsed);
  const toggleJuzIndex = () => setJuzIndexCollapsed(!juzIndexCollapsed);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNextPage: () => {
      if (currentPage < 604) {
        navigateToPage(currentPage + 1);
      }
    },
    onPreviousPage: () => {
      if (currentPage > 1) {
        navigateToPage(currentPage - 1);
      }
    },
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onResetZoom: resetZoom,
    onToggleFocus: toggleFocusMode,
    onToggleSurahIndex: toggleSurahIndex,
    onToggleJuzIndex: toggleJuzIndex,
    onToggleHistoricalMistakes: () => setShowHistoricalMistakes(!showHistoricalMistakes),
    onToggleTools: toggleTools,
  });

  // Mobile swipe gestures
  useSwipeGestures(
    mushafContainerRef,
    {
      onSwipeLeft: () => {
        if (currentPage < 604) {
          navigateToPage(currentPage + 1);
        }
      },
      onSwipeRight: () => {
        if (currentPage > 1) {
          navigateToPage(currentPage - 1);
        }
      },
      onDoubleTap: toggleFocusMode,
      onPinchZoom: (scale) => {
        // Scale is relative to initial pinch distance
        // We need to track the initial zoom when pinch starts
        if (initialPinchZoomRef.current === 1) {
          // First pinch event - store current zoom
          initialPinchZoomRef.current = zoom;
        }
        const newZoom = Math.max(0.8, Math.min(1.4, initialPinchZoomRef.current * scale));
        setZoom(newZoom);
      },
      onLongPress: () => {
        // Reset pinch zoom tracking on long press end
        initialPinchZoomRef.current = 1;
      },
    },
    {
      swipeThreshold: 50,
      doubleTapDelay: 300,
    }
  );

  // Reset pinch zoom tracking when zoom changes externally (e.g., via buttons)
  useEffect(() => {
    // Small delay to avoid resetting during pinch
    const timer = setTimeout(() => {
      initialPinchZoomRef.current = 1;
    }, 100);
    return () => clearTimeout(timer);
  }, [zoom]);

  const pageCurrentMistakes = currentSessionMistakes.filter((m) => m.page === currentPage);
  const pageHistoricalMistakes = historicalMistakes.filter((m) => m.page === currentPage);

  const filteredPageCurrentMistakes =
    mistakeFilter === "all"
      ? pageCurrentMistakes
      : pageCurrentMistakes.filter((m) => {
          const category = m.category as string;
          if (mistakeFilter === "mistakes") return category !== "atkees" && category !== "tajweed";
          if (mistakeFilter === "atkees") return category === "atkees";
          if (mistakeFilter === "tajweed") return category === "tajweed";
          return true;
        });

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      {/* Navigation Controls */}
      {!toolsHidden && (
        <NavigationControls
          currentPage={currentPage}
          currentJuz={currentJuz}
          currentSurah={currentSurah}
          zoom={zoom}
          focusMode={focusMode}
          toolsHidden={toolsHidden}
          showHistoricalMistakes={showHistoricalMistakes}
          historicalMistakesCount={pageHistoricalMistakes.length}
          rangeLocked={rangeLocked}
          ayahRange={propAyahRange}
          onPageChange={navigateToPage}
          onJuzChange={navigateToJuz}
          onSurahChange={navigateToSurah}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onToggleFocusMode={toggleFocusMode}
          onToggleTools={toggleTools}
          onToggleHistoricalMistakes={() => setShowHistoricalMistakes(!showHistoricalMistakes)}
          onShowShortcutsHelp={() => setShowShortcutsHelp(true)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Surah/Juz Index */}
        {!toolsHidden && !surahIndexCollapsed && (
          <div className="w-64 border-r border-neutral-200">
            <div className="flex h-full">
              <SurahIndex
                currentSurah={currentSurah}
                currentPage={currentPage}
                onSurahClick={navigateToSurah}
                collapsed={surahIndexCollapsed}
                onToggleCollapse={() => setSurahIndexCollapsed(!surahIndexCollapsed)}
              />
            </div>
          </div>
        )}

        {!toolsHidden && surahIndexCollapsed && (
          <div className="w-12 border-r border-neutral-200">
            <button
              onClick={() => setSurahIndexCollapsed(false)}
              className="h-full w-full p-2 text-neutral-400 hover:bg-neutral-100"
            >
              →
            </button>
          </div>
        )}

        {/* Center - Mushaf Page: vertical scroll only; no horizontal scroll (width stays within container) */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto" style={{ opacity: 1, visibility: "visible" }} ref={mushafContainerRef}>
          <div className={`flex h-full items-center justify-center ${focusMode ? "bg-black" : "bg-neutral-100"}`} style={{ opacity: 1, visibility: "visible" }}>
            <MushafPage
              key={currentPage}
              pageNumber={currentPage}
              zoom={zoom}
              mistakes={filteredPageCurrentMistakes}
              historicalMistakes={showHistoricalMistakes ? pageHistoricalMistakes : []}
              showHistoricalMistakes={showHistoricalMistakes}
              onWordClick={handleWordClick}
              onMistakeClick={handleMistakeClick}
            />
          </div>
        </div>

        {/* Right Sidebar - Mistake Counter and List */}
        {!toolsHidden && (
          <div className="w-80 border-l border-neutral-200">
            <div className="flex h-full flex-col">
              <MistakeCounter
                mistakes={[...pageCurrentMistakes, ...(showHistoricalMistakes ? pageHistoricalMistakes : [])]}
                onFilterChange={setMistakeFilter}
                activeFilter={mistakeFilter}
              />
              <MistakesList
                currentSessionMistakes={currentSessionMistakes}
                historicalMistakes={showHistoricalMistakes ? historicalMistakes : []}
                mode={mode}
                onMistakeClick={handleMistakeClick}
                onRemoveMistake={mode === "marking" ? handleRemoveMistake : undefined}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mark Mistake Modal */}
      {selectedWord && (
        <MarkMistakeModal
          isOpen={isMarkMistakeOpen}
          onClose={() => {
            setIsMarkMistakeOpen(false);
            setSelectedWord(null);
          }}
          page={selectedWord.page}
          wordIndex={selectedWord.wordIndex}
          letterIndex={selectedWord.letterIndex}
          selectedLetter={selectedWord.selectedLetter}
          wordText={selectedWord.wordText}
          position={selectedWord.position}
          surah={selectedWord.surah}
          ayah={selectedWord.ayah}
          onSave={handleMistakeMark}
        />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      <ShortcutsHelpModal isOpen={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />
    </div>
  );
}
