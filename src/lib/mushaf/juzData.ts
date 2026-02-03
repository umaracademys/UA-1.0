export interface JuzData {
  id: number;
  startPage: number;
  endPage: number;
  startSurah: number;
  startAyah: number;
}

export const JUZ_DATA: JuzData[] = [
  { id: 1, startPage: 1, endPage: 21, startSurah: 1, startAyah: 1 },
  { id: 2, startPage: 22, endPage: 41, startSurah: 2, startAyah: 142 },
  { id: 3, startPage: 42, endPage: 61, startSurah: 2, startAyah: 253 },
  { id: 4, startPage: 62, endPage: 81, startSurah: 3, startAyah: 93 },
  { id: 5, startPage: 82, endPage: 101, startSurah: 4, startAyah: 24 },
  { id: 6, startPage: 102, endPage: 121, startSurah: 4, startAyah: 148 },
  { id: 7, startPage: 122, endPage: 141, startSurah: 5, startAyah: 82 },
  { id: 8, startPage: 142, endPage: 161, startSurah: 6, startAyah: 111 },
  { id: 9, startPage: 162, endPage: 181, startSurah: 7, startAyah: 88 },
  { id: 10, startPage: 182, endPage: 201, startSurah: 8, startAyah: 41 },
  { id: 11, startPage: 202, endPage: 221, startSurah: 9, startAyah: 93 },
  { id: 12, startPage: 222, endPage: 241, startSurah: 11, startAyah: 6 },
  { id: 13, startPage: 242, endPage: 261, startSurah: 12, startAyah: 53 },
  { id: 14, startPage: 262, endPage: 281, startSurah: 15, startAyah: 1 },
  { id: 15, startPage: 282, endPage: 301, startSurah: 17, startAyah: 1 },
  { id: 16, startPage: 302, endPage: 321, startSurah: 18, startAyah: 75 },
  { id: 17, startPage: 322, endPage: 341, startSurah: 21, startAyah: 1 },
  { id: 18, startPage: 342, endPage: 361, startSurah: 23, startAyah: 1 },
  { id: 19, startPage: 362, endPage: 381, startSurah: 25, startAyah: 21 },
  { id: 20, startPage: 382, endPage: 401, startSurah: 27, startAyah: 56 },
  { id: 21, startPage: 402, endPage: 421, startSurah: 29, startAyah: 46 },
  { id: 22, startPage: 422, endPage: 441, startSurah: 33, startAyah: 31 },
  { id: 23, startPage: 442, endPage: 461, startSurah: 36, startAyah: 28 },
  { id: 24, startPage: 462, endPage: 481, startSurah: 39, startAyah: 32 },
  { id: 25, startPage: 482, endPage: 501, startSurah: 41, startAyah: 47 },
  { id: 26, startPage: 502, endPage: 521, startSurah: 46, startAyah: 1 },
  { id: 27, startPage: 522, endPage: 541, startSurah: 51, startAyah: 31 },
  { id: 28, startPage: 542, endPage: 561, startSurah: 58, startAyah: 1 },
  { id: 29, startPage: 562, endPage: 581, startSurah: 67, startAyah: 1 },
  { id: 30, startPage: 582, endPage: 604, startSurah: 78, startAyah: 1 },
];

/** Juz number (1–30) → starting surah and ayah. Use when ticket has juzNumber but no ayahRange. */
export const JUZ_MAPPING: Record<number, { surah: number; ayah: number }> = Object.fromEntries(
  JUZ_DATA.map((j) => [j.id, { surah: j.startSurah, ayah: j.startAyah }])
) as Record<number, { surah: number; ayah: number }>;

export function getJuzByPage(page: number): JuzData | undefined {
  return JUZ_DATA.find((juz) => page >= juz.startPage && page <= juz.endPage);
}

export function getJuzById(id: number): JuzData | undefined {
  return JUZ_DATA.find((juz) => juz.id === id);
}

/** Returns the Mushaf page number containing the given surah:ayah. */
export function getPageForSurahAyah(surah: number, ayah: number): number {
  for (let i = JUZ_DATA.length - 1; i >= 0; i--) {
    const j = JUZ_DATA[i];
    if (j.startSurah < surah || (j.startSurah === surah && j.startAyah <= ayah)) {
      return j.startPage;
    }
  }
  return 1;
}
