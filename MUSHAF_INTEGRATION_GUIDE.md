# Quran Mushaf Component Integration Guide

## Overview
This guide explains how to integrate the Quran Mushaf component into another project. The Mushaf displays Quranic text with proper formatting and layout.

## Required Files

### 1. Layout Database (CRITICAL - Fixes Layout)
**File**: `public/data/layouts/qpc-v1-15-lines.db`  
**Type**: SQLite database  
**Size**: ~241 KB  
**Purpose**: Contains line-level layout data for all 604 pages

**Database Structure**:
- Table: `pages`
- Columns: `page_number`, `line_number`, `line_type`, `is_centered`, `first_word_id`, `last_word_id`, `surah_number`

### 2. Word Data File (REQUIRED)
**File**: `public/data/qpc-hafs-word-by-word.json` OR `public/data/words/word_by_word.json`  
**Type**: JSON file  
**Size**: Very large (millions of words)  
**Purpose**: Contains all Arabic words with their surah, ayah, and word_index

**Data Structure**:
```json
{
  "1:1:1": {
    "id": 1,
    "surah": "1",
    "ayah": "1",
    "word": "1",
    "location": "1:1:1",
    "text": "بِسۡمِ"
  },
  ...
}
```

### 3. Glyph Database (OPTIONAL)
**File**: `public/data/glyphs/qpc-v1-glyph-codes-wbw.db`  
**Type**: SQLite database  
**Purpose**: Provides better word rendering and letter-level precision

## Directory Structure

```
{project-root}/
└── public/
    └── data/
        ├── layouts/
        │   └── qpc-v1-15-lines.db          ← REQUIRED
        ├── words/
        │   └── word_by_word.json           ← REQUIRED (or qpc-hafs-word-by-word.json in data/)
        └── glyphs/
            └── qpc-v1-glyph-codes-wbw.db   ← OPTIONAL
```

## API Route Required

The Mushaf component requires an API route at:
```
/api/qpc/page/[pageNumber]
```

**Example Implementation** (Next.js App Router):
```typescript
// src/app/api/qpc/page/[pageNumber]/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

// Load word data
let qpcWordsCache: Record<string, any> | null = null;

async function loadQPCWords(): Promise<Record<string, any>> {
  if (qpcWordsCache) return qpcWordsCache;
  
  const filePath = path.join(process.cwd(), "public", "data", "qpc-hafs-word-by-word.json");
  const fileContent = fs.readFileSync(filePath, "utf-8");
  qpcWordsCache = JSON.parse(fileContent);
  return qpcWordsCache!;
}

export async function GET(
  request: Request,
  context: { params: { pageNumber: string } }
) {
  const pageNumber = parseInt(context.params.pageNumber, 10);
  
  if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
  }

  const allWords = await loadQPCWords();
  
  // Filter words for this page (example for page 1)
  const pageWords = Object.entries(allWords)
    .filter(([location]) => {
      const [surah, ayah] = location.split(":").map(Number);
      if (pageNumber === 1) {
        return surah === 1 || (surah === 2 && ayah <= 5);
      }
      // Add logic for other pages based on surah start pages
      return true;
    })
    .map(([location, wordData]) => ({
      ...wordData,
      surah: parseInt(wordData.surah),
      ayah: parseInt(wordData.ayah),
      word: parseInt(wordData.word),
    }));

  // Load layout data from database
  let layoutData: any[] = [];
  try {
    const dbPath = path.join(process.cwd(), "public", "data", "layouts", "qpc-v1-15-lines.db");
    if (fs.existsSync(dbPath)) {
      const db = new Database(dbPath, { readonly: true });
      layoutData = db.prepare(`
        SELECT * FROM pages 
        WHERE page_number = ?
        ORDER BY line_number
      `).all(pageNumber);
      db.close();
    }
  } catch (error) {
    console.error("Error loading layout:", error);
  }

  // Map words to positions
  const wordPositions = pageWords.map((word, index) => {
    const wordId = parseInt(word.id) || index + 1;
    const layoutLine = layoutData.find((l: any) => {
      const firstId = parseInt(l.first_word_id) || 0;
      const lastId = parseInt(l.last_word_id) || 0;
      return wordId >= firstId && wordId <= lastId && l.line_type === 'ayah';
    });

    // Calculate position (simplified - you'll need proper calculation)
    const lineNumber = layoutLine?.line_number || 1;
    const PAGE_HEIGHT = 800;
    const LINES_PER_PAGE = 15;
    const LINE_HEIGHT = PAGE_HEIGHT / LINES_PER_PAGE;
    const TOP_MARGIN = 50;
    
    return {
      wordIndex: index,
      surah: word.surah,
      ayah: word.ayah,
      position: {
        x: 30 + (index % 20) * 30, // Simplified
        y: TOP_MARGIN + (lineNumber - 1) * LINE_HEIGHT,
        width: 25,
        height: LINE_HEIGHT * 0.8,
      },
      text: word.text,
      lineNumber,
    };
  });

  return NextResponse.json({
    page: pageNumber,
    words: wordPositions,
  });
}
```

## Dependencies

Install required packages:
```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

## Verification Steps

1. **Check Files Exist**:
   ```bash
   ls -lh public/data/layouts/qpc-v1-15-lines.db
   ls -lh public/data/qpc-hafs-word-by-word.json
   ```

2. **Verify File Sizes**:
   - Layout DB: Should be ~241 KB (not 0 bytes)
   - Word JSON: Should be very large (millions of words)

3. **Test API Route**:
   ```bash
   curl http://localhost:3000/api/qpc/page/1
   ```
   Should return JSON with `words` array containing word positions.

4. **Check Browser Console**:
   - Open Developer Tools (F12)
   - Look for errors about missing files
   - Check Network tab for API calls

## Common Issues

### Issue: Layout is Distorted
**Cause**: Missing layout database file  
**Solution**: Copy `qpc-v1-15-lines.db` to `public/data/layouts/`

### Issue: No Words Displaying
**Cause**: Word data file missing or API route not working  
**Solution**: 
1. Verify word JSON file exists
2. Check API route is accessible
3. Check browser console for errors

### Issue: 404 Errors
**Cause**: Files not in `public/` folder  
**Solution**: Ensure all files are in `public/data/` not `src/data/`

### Issue: Database Query Errors
**Cause**: Wrong table name or structure  
**Solution**: The database uses `pages` table, not `lines`. Update queries accordingly.

## File Locations in Source Project

From `umar-academy-portal`:
- `public/data/layouts/qpc-v1-15-lines.db`
- `public/data/qpc-hafs-word-by-word.json`
- `public/data/glyphs/qpc-v1-glyph-codes-wbw.db` (optional)

## Next Steps After Integration

1. Restart development server
2. Clear browser cache
3. Test page navigation (should work for all 604 pages)
4. Verify Arabic text displays correctly
5. Check word positioning matches traditional Mushaf layout

## Support

If issues persist:
1. Check server console logs for `[QPC API]` messages
2. Check browser console for `[MushafPage]` messages
3. Verify all files are in correct locations
4. Ensure API route is properly configured
5. Check file permissions (files should be readable)
