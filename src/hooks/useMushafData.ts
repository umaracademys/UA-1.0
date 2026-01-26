"use client";

import { useState, useEffect, useCallback } from "react";
import { loadPageData, preloadAdjacentPages, type PageWordData } from "@/lib/mushaf/qpcData";

export function useMushafData(page: number, preload = true) {
  const [wordData, setWordData] = useState<PageWordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPageDataAsync = useCallback(async (pageNumber: number) => {
    setLoading(true);
    setError(null);

    try {
      const data = await loadPageData(pageNumber);
      setWordData(data);
      setLoading(false);

      // Preload adjacent pages for better performance
      if (preload) {
        preloadAdjacentPages(pageNumber).catch(() => {
          // Silently fail preloading
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load page data");
      setError(error);
      setLoading(false);
      console.error("Error loading mushaf data:", error);
    }
  }, [preload]);

  useEffect(() => {
    loadPageDataAsync(page);
  }, [page, loadPageDataAsync]);

  return { wordData, loading, error, reload: () => loadPageDataAsync(page) };
}
