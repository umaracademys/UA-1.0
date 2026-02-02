/**
 * Local Mushaf data: single source from public/data/Mushaf files/.
 * - Preferred: qpc-v1-15-lines.db (page structure) + qpc-v1-glyph-codes-wbw.db (word glyphs).
 * - Fallback: qpc-v4.json and qpc-nastaleeq-15-lines.db.
 * No external APIs; all data from local files.
 */

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { SURAHS, getSurahByPage } from "@/lib/mushaf/surahData";

/** Base dir: public/data/Mushaf files */
const MUSHAF_FILES_DIR = path.join(process.cwd(), "public", "data", "Mushaf files");

/** V1: layout — public/data/Mushaf files/qpc-v1-15-lines.db (table: pages) */
const V1_LAYOUT_DB_PATH = path.join(MUSHAF_FILES_DIR, "qpc-v1-15-lines.db");

/** V1: words/glyphs — public/data/Mushaf files/qpc-v1-glyph-codes-wbw.db (table: words) */
const V1_GLYPH_DB_PATH = path.join(MUSHAF_FILES_DIR, "qpc-v1-glyph-codes-wbw.db");

/** qpc-v4.json: fallback word source when V1 not available */
export const QPC_V4_JSON_PATH = path.join(MUSHAF_FILES_DIR, "qpc-v4.json");

/** Words DB: public/data/Mushaf files/qpc-hafs-tajweed.db (table: words) — legacy */
export const WORDS_DB_PATH = path.join(MUSHAF_FILES_DIR, "qpc-hafs-tajweed.db");

/** Layout DB: public/data/Mushaf files/qpc-nastaleeq-15-lines.db (table: pages) — fallback */
const LAYOUT_15_DB_PATH = path.join(MUSHAF_FILES_DIR, "qpc-nastaleeq-15-lines.db");

const TOTAL_PAGES = 604;

/** Word entry from qpc-v4.json (normalized) */
export interface QpcV4Word {
  id?: number;
  surah: string;
  ayah: string;
  word: string;
  location: string;
  text: string;
}

type RawEntry = { id?: number; surah?: string; ayah?: string; word?: string; location?: string; text?: string };

let qpcV4Cache: QpcV4Word[] | null = null;

function parseLocation(loc: string): [number, number, number] {
  const parts = loc.split(":").map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function toNormalized(w: RawEntry, location: string): QpcV4Word {
  const [s, a, ww] = parseLocation(location);
  return {
    id: w.id,
    surah: String(w.surah ?? s),
    ayah: String(w.ayah ?? a),
    word: String(w.word ?? ww),
    location,
    text: typeof w.text === "string" ? w.text : "",
  };
}

/**
 * Load and parse qpc-v4.json once; cache result. Single source of truth for word glyphs.
 */
function loadQpcV4Json(): QpcV4Word[] {
  if (qpcV4Cache) return qpcV4Cache;
  if (!fs.existsSync(QPC_V4_JSON_PATH)) return [];
  try {
    const raw = fs.readFileSync(QPC_V4_JSON_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, RawEntry> | RawEntry[];
    let entries: { w: RawEntry; loc: string }[] = [];
    if (Array.isArray(parsed)) {
      entries = parsed.map((w, i) => {
        const loc =
          typeof w.location === "string" && /^\d+:\d+:\d+$/.test(w.location)
            ? w.location
            : `${w.surah ?? 0}:${w.ayah ?? 0}:${w.word ?? i}`;
        return { w, loc };
      });
    } else {
      entries = Object.entries(parsed).map(([k, w]) => ({ w, loc: k }));
    }
    const normalized = entries
      .filter(({ w }) => typeof w.text === "string")
      .map(({ w, loc }) => toNormalized(w, loc))
      .sort((a, b) => {
        const [s1, ay1, w1] = parseLocation(a.location);
        const [s2, ay2, w2] = parseLocation(b.location);
        if (s1 !== s2) return s1 - s2;
        if (ay1 !== ay2) return ay1 - ay2;
        return w1 - w2;
      });
    qpcV4Cache = normalized;
    return normalized;
  } catch (e: unknown) {
    console.error("[localMushafData] qpc-v4.json load failed:", (e as Error)?.message);
    return [];
  }
}

/**
 * Get words for a single page from qpc-v4.json (1–604). Uses fixed ~139 words/page slice.
 */
export function getWordsForPageFromQpcV4(pageNumber: number): QpcV4Word[] {
  const all = loadQpcV4Json();
  if (all.length === 0) return [];
  const perPage = Math.ceil(all.length / TOTAL_PAGES);
  const start = (pageNumber - 1) * perPage;
  const end = Math.min(start + perPage, all.length);
  return all.slice(start, end);
}

/** Total word count from qpc-v4 (after load). */
export function getQpcV4TotalWords(): number {
  return loadQpcV4Json().length;
}

export function isQpcV4Available(): boolean {
  return fs.existsSync(QPC_V4_JSON_PATH);
}

/** V1 layout row (qpc-v1-15-lines.db pages table) */
export interface V1LayoutRow {
  page_number: number;
  line_number: number;
  line_type: string;
  is_centered: number;
  first_word_id: number | null;
  last_word_id: number | null;
  surah_number: number | null;
}

/** V1 word row (qpc-v1-glyph-codes-wbw.db words table) */
export interface V1WordRow {
  id: number;
  location: string;
  surah: number;
  ayah: number;
  word: number;
  text: string;
}

export function isV1Available(): boolean {
  return fs.existsSync(V1_LAYOUT_DB_PATH) && fs.existsSync(V1_GLYPH_DB_PATH);
}

/**
 * Fetch 15-line layout for a page from qpc-v1-15-lines.db (public/data/Mushaf files/).
 */
export function getLayoutFromV1Db(pageNumber: number): V1LayoutRow[] {
  if (!fs.existsSync(V1_LAYOUT_DB_PATH)) return [];
  const db = new Database(V1_LAYOUT_DB_PATH, { readonly: true });
  try {
    const rows = db
      .prepare(
        `SELECT page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number FROM pages
         WHERE page_number = ?
         ORDER BY line_number`
      )
      .all(pageNumber) as (Omit<V1LayoutRow, "first_word_id" | "last_word_id" | "surah_number"> & {
        first_word_id: number | null;
        last_word_id: number | null;
        surah_number: number | null;
      })[];
    return rows.map((r) => ({
      ...r,
      first_word_id: r.first_word_id ?? null,
      last_word_id: r.last_word_id ?? null,
      surah_number: r.surah_number ?? null,
    }));
  } finally {
    db.close();
  }
}

/**
 * Fetch words by id range from qpc-v1-glyph-codes-wbw.db.
 */
export function getWordsByIdRangeFromV1Db(minId: number, maxId: number): V1WordRow[] {
  if (!fs.existsSync(V1_GLYPH_DB_PATH)) return [];
  const db = new Database(V1_GLYPH_DB_PATH, { readonly: true });
  try {
    const rows = db
      .prepare(
        `SELECT id, location, surah, ayah, word, text FROM words
         WHERE id >= ? AND id <= ?
         ORDER BY id`
      )
      .all(minId, maxId) as V1WordRow[];
    return rows;
  } finally {
    db.close();
  }
}

/**
 * Get words for a single page from V1 DBs: layout gives line_number and word id range; glyph db gives text.
 * Returns array of { wordIndex, surah, ayah, text, lineNumber } in page order.
 */
export function getWordsForPageFromV1Db(pageNumber: number): Array<{
  wordIndex: number;
  surah: number;
  ayah: number;
  text: string;
  lineNumber: number;
  id: number;
}> {
  const layoutRows = getLayoutFromV1Db(pageNumber);
  if (layoutRows.length === 0) return [];

  const ayahLines = layoutRows.filter(
    (r) => r.line_type === "ayah" && r.first_word_id != null && r.last_word_id != null
  );
  if (ayahLines.length === 0) return [];

  const minId = Math.min(...ayahLines.map((r) => r.first_word_id!));
  const maxId = Math.max(...ayahLines.map((r) => r.last_word_id!));
  const wordsById = new Map<number, V1WordRow>();
  for (const w of getWordsByIdRangeFromV1Db(minId, maxId)) {
    wordsById.set(w.id, w);
  }

  const result: Array<{
    wordIndex: number;
    surah: number;
    ayah: number;
    text: string;
    lineNumber: number;
    id: number;
  }> = [];
  let wordIndex = 0;
  for (const line of ayahLines) {
    const first = line.first_word_id!;
    const last = line.last_word_id!;
    for (let id = first; id <= last; id++) {
      const row = wordsById.get(id);
      if (row) {
        result.push({
          wordIndex,
          surah: row.surah,
          ayah: row.ayah,
          text: row.text,
          lineNumber: line.line_number,
          id: row.id,
        });
        wordIndex++;
      }
    }
  }
  return result;
}

export interface LocalWordRow {
  id: number;
  location: string;
  surah: number;
  ayah: number;
  word: number;
  text: string;
}

export interface LocalLayoutRow {
  page_number: number;
  line_number: number;
  line_type: string;
  is_centered: number;
  first_word_id: number;
  last_word_id: number;
  surah_number: number;
}

/** Strip Tajweed markup (<rule ...>...</rule>) for plain display; keep inner text. */
export function stripTajweedMarkup(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text.replace(/<rule[^>]*>([^<]*)<\/rule>/g, "$1").trim();
}

function wordsDbExists(): boolean {
  return fs.existsSync(WORDS_DB_PATH);
}

function layout15DbExists(): boolean {
  return fs.existsSync(LAYOUT_15_DB_PATH);
}

/**
 * Fetch words for a page from qpc-hafs-tajweed.db.
 * Prefer layout DB word ID range so only words on this page are returned (~20–30 per page).
 * Fallback: page 1 uses surah/ayah; other pages use surah range (less accurate).
 */
export function getWordsFromLocalDb(pageNumber: number): LocalWordRow[] {
  if (!wordsDbExists()) return [];

  // Prefer layout-based word ID range so we return only words on this page
  const layoutRows = getLayoutFromLocalDb(pageNumber);
  if (layoutRows.length > 0) {
    const minId = Math.min(...layoutRows.map((r) => r.first_word_id));
    const maxId = Math.max(...layoutRows.map((r) => r.last_word_id));
    const db = new Database(WORDS_DB_PATH, { readonly: true });
    try {
      const rows = db
        .prepare(
          `SELECT id, location, surah, ayah, word, text FROM words
           WHERE id >= ? AND id <= ?
           ORDER BY surah, ayah, word`
        )
        .all(minId, maxId) as LocalWordRow[];
      return rows;
    } finally {
      db.close();
    }
  }

  // Fallback: surah/ayah range (exact for page 1 only)
  const db = new Database(WORDS_DB_PATH, { readonly: true });
  try {
    let rows: LocalWordRow[];
    if (pageNumber === 1) {
      rows = db
        .prepare(
          `SELECT id, location, surah, ayah, word, text FROM words
           WHERE (surah = 1) OR (surah = 2 AND ayah <= 5)
           ORDER BY surah, ayah, word`
        )
        .all() as LocalWordRow[];
    } else {
      const currentSurah = getSurahByPage(pageNumber);
      const nextSurah = SURAHS.find((s) => s.startPage > pageNumber);
      if (!currentSurah) return [];
      const startSurah = currentSurah.id;
      const endSurah = nextSurah ? nextSurah.id - 1 : 114;
      rows = db
        .prepare(
          `SELECT id, location, surah, ayah, word, text FROM words
           WHERE surah >= ? AND surah <= ?
           ORDER BY surah, ayah, word`
        )
        .all(startSurah, endSurah) as LocalWordRow[];
    }
    return rows;
  } finally {
    db.close();
  }
}

/**
 * Fetch 15-line layout for a page from qpc-nastaleeq-15-lines.db.
 * Returns line_type and surah_number for every line (page_number 1–604) so headers and Bismallah sync correctly.
 */
export function getLayoutFromLocalDb(pageNumber: number): LocalLayoutRow[] {
  if (!layout15DbExists()) return [];

  const db = new Database(LAYOUT_15_DB_PATH, { readonly: true });
  try {
    const rows = db
      .prepare(
        `SELECT page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number FROM pages
         WHERE page_number = ?
         ORDER BY line_number`
      )
      .all(pageNumber) as LocalLayoutRow[];
    return rows;
  } finally {
    db.close();
  }
}

export function isLocalMushafAvailable(): boolean {
  return wordsDbExists();
}

export function isLocalLayoutAvailable(): boolean {
  return layout15DbExists();
}
