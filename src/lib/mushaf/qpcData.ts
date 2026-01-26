export interface WordPosition {
  wordIndex: number;
  surah: number;
  ayah: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text: string;
  lineNumber?: number;
}

export interface PageWordData {
  page: number;
  words: WordPosition[];
}

// In-memory cache for loaded pages
const pageDataCache = new Map<number, PageWordData>();
const loadingPages = new Set<number>();

// QPC API endpoint (adjust based on your data source)
const QPC_API_BASE = process.env.NEXT_PUBLIC_QPC_API_URL || "/api/qpc";

/**
 * Load word position data for a specific page
 * In production, this would fetch from QPC API or load from JSON files
 */
export async function loadPageData(page: number): Promise<PageWordData> {
  // Check cache first
  if (pageDataCache.has(page)) {
    return pageDataCache.get(page)!;
  }

  // Prevent duplicate requests
  if (loadingPages.has(page)) {
    // Wait for existing request
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (pageDataCache.has(page)) {
          clearInterval(checkInterval);
          resolve(pageDataCache.get(page)!);
        }
      }, 100);
    });
  }

  loadingPages.add(page);

  try {
    // Option 1: Load from API (QPC data from public/data folder)
    const response = await fetch(`${QPC_API_BASE}/pages/${page}`);
    
    if (response.ok) {
      const data: PageWordData = await response.json();
      pageDataCache.set(page, data);
      loadingPages.delete(page);
      return data;
    }

    // Option 2: Generate placeholder data (for development)
    // Note: In production, use the API route /api/qpc/page/[pageNumber]
    console.warn(`QPC data not found for page ${page} via API. Using placeholder data.`);
    const placeholderData: PageWordData = {
      page,
      words: generatePlaceholderWords(page),
    };
    pageDataCache.set(page, placeholderData);
    loadingPages.delete(page);
    return placeholderData;
  } catch (error) {
    console.error(`Error loading QPC data for page ${page}:`, error);
    loadingPages.delete(page);
    
    // Return placeholder data on error
    const placeholderData: PageWordData = {
      page,
      words: generatePlaceholderWords(page),
    };
    pageDataCache.set(page, placeholderData);
    return placeholderData;
  }
}

/**
 * Generate placeholder word positions (for development/testing)
 * In production, this should not be used
 */
function generatePlaceholderWords(page: number): WordPosition[] {
  // This is a placeholder - in production, use actual QPC data
  const words: WordPosition[] = [];
  const wordsPerPage = 200; // Approximate words per page
  
  for (let i = 0; i < wordsPerPage; i++) {
    words.push({
      wordIndex: i,
      surah: Math.floor(page / 5) + 1,
      ayah: Math.floor(i / 10) + 1,
      position: {
        x: (i % 20) * 30 + 50,
        y: Math.floor(i / 20) * 40 + 100,
        width: 25,
        height: 30,
      },
      text: `word${i}`,
      lineNumber: Math.floor(i / 20) + 1,
    });
  }
  
  return words;
}

/**
 * Preload adjacent pages for better performance
 */
export async function preloadAdjacentPages(currentPage: number): Promise<void> {
  const pagesToLoad = [
    currentPage - 1,
    currentPage + 1,
    currentPage - 2,
    currentPage + 2,
  ].filter((page) => page >= 1 && page <= 604 && !pageDataCache.has(page));

  await Promise.all(pagesToLoad.map((page) => loadPageData(page).catch(() => {})));
}

/**
 * Get word positions for a specific page (synchronous, from cache)
 */
export function getPageWords(page: number): WordPosition[] {
  const pageData = pageDataCache.get(page);
  return pageData?.words || [];
}

/**
 * Get word at specific position on page
 */
export function getWordAtPosition(
  page: number,
  x: number,
  y: number,
): WordPosition | undefined {
  const words = getPageWords(page);
  return words.find(
    (word) =>
      x >= word.position.x &&
      x <= word.position.x + word.position.width &&
      y >= word.position.y &&
      y <= word.position.y + word.position.height,
  );
}

/**
 * Clear cache (useful for memory management)
 */
export function clearCache(): void {
  pageDataCache.clear();
  loadingPages.clear();
}

/**
 * Clear cache for specific page
 */
export function clearPageCache(page: number): void {
  pageDataCache.delete(page);
  loadingPages.delete(page);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { cachedPages: number; loadingPages: number } {
  return {
    cachedPages: pageDataCache.size,
    loadingPages: loadingPages.size,
  };
}
