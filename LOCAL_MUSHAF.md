# Local Mushaf – Offline Usage

This document describes how the Interactive Mushaf uses **local** SQLite databases and fonts so that **no external Mushaf API requests** are made. All page layout, word positions, and text come from files under `public/data/Mushaf files/` (and optional fallbacks).

---

## 1. Assets Used

### SQLite databases (in `public/data/Mushaf files/`)

| File | Purpose |
|------|--------|
| **qpc-hafs-tajweed.db** | Main word-by-word data: `words (id, location, surah, ayah, word, text)`. Text includes Tajweed markup (`<rule ...>...</rule>`); the API strips it for display. |
| **qpc-v4-tajweed-15-lines.db** | 15-line page layout: `pages (page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number)`. Used for line-based positioning. |

### Fonts

| Asset | Purpose |
|-------|--------|
| **QPC V1 Font.ttf/** | One `.ttf` per page (e.g. `p4.ttf`, `p16.ttf`, `p604.ttf`). Loaded dynamically for the current page in the Mushaf UI. Font family: `QPC V1`. |
| **surah_names.woff** | Arabic surah headers. Loaded once in CSS. Font family: `Surah Names`. |

### Fallbacks (when local DBs are missing)

- **Words**: `public/data/qpc-hafs-word-by-word.json` or `public/data/words/word_by_word.json`
- **Layout**: `public/data/layouts/qpc-v1-15-lines.db` (legacy 15-line layout)

---

## 2. Data Flow

1. **Page request**  
   Client requests page data via **local** API: `GET /api/qpc/page/[pageNumber]`.

2. **Server (API route)**  
   - Tries **qpc-hafs-tajweed.db** first: `getWordsFromLocalDb(pageNumber)`.
   - If words are returned, uses **qpc-v4-tajweed-15-lines.db** for layout: `getLayoutFromLocalDb(pageNumber)`.
   - If local DB returns no words, falls back to JSON word data + legacy layout DB.
   - Word text from the DB is passed through `stripTajweedMarkup()` so the UI gets plain Arabic for display.

3. **Client (Mushaf UI)**  
   - Renders words and lines from the API response (same shape as before).
   - Loads **QPC V1** font for the current page: injects a `<style>` with `@font-face` for `/data/Mushaf files/QPC V1 Font.ttf/p{N}.ttf`.
   - Uses **Surah Names** for surah headers (defined in `globals.css`).

No external CDNs or APIs are called for Mushaf text or layout.

---

## 3. What Stays the Same

- **Ticket logic**: Start / Pause / Resume, heartbeat (~45s), Submit / approve / reject, assignment sync – unchanged.
- **Mistake marking**: Word/letter-level, types, notes, remove mistake – unchanged.
- **Personal Mushaf**: `/api/students/:id/personal-mushaf` for historical mistakes; overlay on current session – unchanged.
- **Range selection**: Ayah range (start/end), range locked when ticket is active – unchanged.
- **Zoom**: 0.8–1.4 – unchanged.
- **Mushaf position**: Last page/surah/ayah saved and restored per student – unchanged.

---

## 4. File Layout (summary)

```
public/data/
├── Mushaf files/
│   ├── qpc-hafs-tajweed.db      # Words (primary)
│   ├── qpc-v4-tajweed-15-lines.db # Layout (primary)
│   ├── surah_names.woff         # Surah headers font
│   └── QPC V1 Font.ttf/         # p4.ttf, p10.ttf, ... p604.ttf
├── qpc-hafs-word-by-word.json   # Fallback words
├── words/word_by_word.json      # Fallback words
└── layouts/
    └── qpc-v1-15-lines.db        # Fallback layout
```

---

## 5. Offline / Build

- **Dev**: Run `npm run dev` (or your dev command). Mushaf data is read from the local DBs and JSON; no external Mushaf API is used.
- **Production**: After `npm run build` and `npm start`, the same API routes serve from the same local files. Ensure `public/data/Mushaf files/` (and any fallback files) are included in the deployed app so the server can read them.
- **Fully offline**: As long as the app is served (e.g. from localhost or your server), the Mushaf works without internet for text/layout. Page *images* (if used) can still be local or from your own API; see MUSHAF_UPGRADE.md for image handling.

---

## 6. Acceptance Checklist

- [ ] All pages render from local SQLite (or JSON fallback) without external Mushaf API calls.
- [ ] Word-by-word and letter-level Tajweed marking work.
- [ ] Range selection, zoom, and mistakes overlay work.
- [ ] Timer, Pause/Resume, and session persistence work as before.
- [ ] Ticket submit → assignment sync unchanged.
- [ ] No external Mushaf API requests in the network tab.
- [ ] Performance is acceptable; prefetch/caching optional.

---

## 7. Optional: Separate Package

The repo currently uses a single Next.js app; there is no `@umar-academy/mushaf` package yet. If you introduce a separate package (e.g. under `packages/mushaf`):

- Move the local DB read logic and font paths into that package.
- Build the package so that SQLite files and fonts are included in `dist/` (or the path your app expects).
- The main app would then call the package’s `fetchPageLines` / `fetchPage15Lines` (or equivalent) instead of (or in addition to) the current `/api/qpc/page/[pageNumber]` route. The behavior described in this document (local-only, no external API) would remain the same.
