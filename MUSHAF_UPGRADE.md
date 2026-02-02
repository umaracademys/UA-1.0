# Interactive Mushaf – Behavior & Lock Document

This document describes how the Interactive Mushaf and Ticket integration work in Umar Academy 1.0. It is **Mushaf-only** and is the reference for behavior that must not regress. No code changes are implied; this is verification and documentation.

**Data source:** Mushaf page data and layout are served from **local** SQLite and fonts (no external Mushaf API). See **[LOCAL_MUSHAF.md](./LOCAL_MUSHAF.md)** for offline usage, file layout, and acceptance criteria.

---

## 1. What the Interactive Mushaf Does

### Listening workflow

- The teacher opens a ticket for a student and can optionally set a **listening range** (From Surah/Ayah → To Surah/Ayah) before starting.
- When the teacher clicks **Start Ticket**, the ticket status becomes **in-progress**, the range (if provided) is saved and **locked**, and a **listening timer** starts.
- The teacher uses the Mushaf to follow the recitation. The Mushaf shows the current page and can navigate by page, Juz, or Surah. **Ayah range** is locked for the duration of the session so it cannot be changed mid-listening.
- The teacher can **Pause** the ticket (status becomes **paused**); the timer effectively pauses and the range stays locked. **Resume** sets the ticket back to **in-progress** and the timer continues.
- When done, the teacher clicks **Submit for Review**. The ticket status becomes **submitted**, and the submission includes the selected ayah range, all marked mistakes, teacher notes, and session data (e.g. listening duration). A ticket can only be submitted **once**; a second submit attempt returns HTTP 400.

### Mistake marking

- The teacher **clicks a word or letter** on the Mushaf to open the mistake-marking flow.
- They choose a **mistake type** (e.g. Tajweed, Memorization, Letter, Stopping rule, Hesitation) and can add a **note** and optional **audio reference**.
- **Current-session mistakes** appear on the Mushaf with a **strong highlight**. The teacher can **remove** a mistake before submission: if the mistake is stored on the ticket, the app calls the remove API and reloads the ticket; temporary (not-yet-synced) mistakes are removed locally only. After refresh, only server-stored mistakes remain; the list and highlights stay in sync.
- **Past mistakes** (Personal Mushaf / historical overlay) can be shown via the **“Show past mistakes”** checkbox. When enabled, the student’s previous mistakes appear on the Mushaf with a **faded** style so the teacher can see repeating errors while keeping current-session mistakes visually distinct.

### Session persistence

- **Ticket state** is stored on the server. Refreshing the page does **not** end the ticket. When the teacher reopens the same ticket from the list, it is still **in-progress** or **paused** with the same mistakes and range.
- A **heartbeat** is sent to the server every **~45 seconds** while the ticket is in-progress and the panel is open. This keeps the session alive for long listening (e.g. 1+ hour).
- **Mushaf position** (last page, surah, ayah) is saved per student and **restored** when the Mushaf is opened again. So after a refresh or browser crash, the teacher (or student) sees the same page and position. There is no data loss on refresh or crash for ticket state or Mushaf position.

---

## 2. What Never Breaks

These behaviors are locked and must not regress:

- **Refresh safety**  
  Refreshing the browser during a listening session does **not** kill the ticket or reset the Mushaf session. The server is the source of truth for ticket status, mistakes, range, and startedAt. Mushaf position is also persisted and restored.

- **Long sessions (1+ hour)**  
  The heartbeat runs every ~45 seconds while the ticket is in-progress. The teacher can listen for 30–60+ minutes without the ticket expiring or disappearing.

- **No duplicate submissions**  
  A ticket can be submitted only once. If the teacher (or client) tries to submit again, the API returns **HTTP 400** with a message that duplicate submission is not allowed. The UI should not allow a second submit in normal use.

- **Mistakes persist until submission**  
  Mistakes added during the session are stored on the ticket (via the add-mistake API). Removed mistakes are deleted on the server (via the remove-mistake API). After a refresh, the mistake list and highlights match the server; nothing is lost except unsaved local-only state.

- **Mushaf restores position**  
  When the Mushaf is opened for a student, the last page (and surah/ayah when available) is loaded from the server and the view is restored to that position.

---

## 3. Teacher Flow (Step-by-Step)

1. **Open ticket**  
   Teacher goes to Tickets, selects a **pending** ticket for a student, and opens the ticket details.

2. **Select ayah range (optional)**  
   In the details view, the teacher can optionally fill **Listening range**: From Surah, From Ayah, To Surah, To Ayah. Surah must be 1–114, Ayah ≥ 1. If all four are valid and the teacher starts the ticket, this range is sent to the server and locked for the session.

3. **Start listening**  
   Teacher clicks **Start Ticket**. The ticket becomes **in-progress**, the optional range is saved and locked, and the **Listening: m:ss** timer appears in the header. The timer updates every second from **startedAt** and survives refresh.

4. **Mark mistakes**  
   Teacher switches to the **Mushaf** view, follows the recitation, and clicks words/letters to mark mistakes (type, note, optional audio). Current-session mistakes appear with a strong highlight. Teacher can remove a mistake before submit; persisted mistakes are removed via the API and the list is reloaded.

5. **Pause / resume**  
   Teacher can click **Pause** (ticket becomes **paused**; timer effectively paused, range still locked) and later **Resume** (back to **in-progress**). Session and mistakes are preserved.

6. **Submit**  
   Teacher adds any **session notes**, then clicks **Submit for Review**. The ticket becomes **submitted** with ayah range, mistakes, notes, and session data (e.g. duration). Submit is allowed only once; second attempt returns 400.

---

## 4. Assignment Sync Rules

When a ticket is **linked to an assignment** (e.g. started for that assignment):

- **Submit** → The linked assignment’s status is set to **listened**.
- **Approve** (admin) → The linked assignment’s status is set to **completed** (and no second assignment is created).
- **Reject** (admin) → The linked assignment’s status is set to **needs_revision**.

This behavior is unchanged and must not regress. No duplicate assignments are created when a ticket is linked.

---

## 5. Acceptance Checklist

Use this list to confirm that Mushaf and ticket behavior have not regressed:

- [ ] **Timer survives refresh**  
  Start a ticket, wait until the listening timer shows at least 0:01, refresh the page, reopen the same ticket. The timer should still show (or continue from) the correct elapsed time (derived from **startedAt** on the server).

- [ ] **Mushaf restores position**  
  Open the Mushaf for a student, go to a specific page (e.g. 50), close or refresh, then reopen the Mushaf for that student. The same page (and surah/ayah when applicable) should be restored.

- [ ] **Mistakes persist**  
  Add one or more mistakes during a ticket, refresh the page, reopen the ticket and Mushaf. The same mistakes should appear. Remove a mistake, refresh, reopen; that mistake should stay removed.

- [ ] **Ticket submits once**  
  Submit a ticket for review. Try to submit again (e.g. via UI or API). The second attempt must return HTTP 400 (or equivalent) and the ticket must remain submitted with no duplicate submission.

- [ ] **Assignment updates correctly**  
  For a ticket linked to an assignment: after submit, assignment status = **listened**; after admin approve, assignment status = **completed**; after admin reject, assignment status = **needs_revision**. No duplicate assignment is created on approve.

---

*This document is the single source of truth for Interactive Mushaf and ticket integration behavior. For deployment and migration, see UPGRADE_MIGRATION.md.*
