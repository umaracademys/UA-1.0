# Umar Academy 1.0 – Upgrade & Migration Guide

This document describes the production-grade upgrades to the **Interactive Mushaf**, **Ticket/Listening System**, and **Assignment Module**, and how to deploy them without data loss.

---

## Summary of Changes

### 1. Ticket / Listening System (Critical)

- **Lifecycle**: Tickets now support full states: `pending` (OPEN) → `in-progress` (IN_PROGRESS) ⇄ `paused` (PAUSED) → `submitted` (SUBMITTED) → `approved` (REVIEWED) / `rejected` (REJECTED) / `closed` (CLOSED).
- **Heartbeat**: New `POST /api/tickets/[ticketId]/heartbeat` – teacher client should call every 30–60 seconds during an active session so the ticket never “expires” or is lost after long sessions.
- **Pause / Resume**: New `POST /api/tickets/[ticketId]/pause` and `POST /api/tickets/[ticketId]/resume`. Session timer effectively pauses; range stays locked.
- **Ayah range**: Tickets can store and lock a listening range (`fromSurah`, `fromAyah`, `toSurah`, `toAyah`). Set when starting a ticket (optional body on `POST .../start`). `rangeLocked` is set when ticket is in-progress or paused.
- **Assignment link**: Tickets can be linked to an assignment via `assignmentId`. When submitting, the linked assignment status is set to `listened`; on approve → `completed`, on reject → `needs_revision`.
- **Submission**: Submit-for-review validates that the ticket is in-progress or paused, prevents duplicate submission (`submittedAt` already set), and saves `listeningDurationSeconds` and optional `sessionNotes`.
- **New fields on Ticket**: `ayahRange`, `rangeLocked`, `assignmentId`, `lastHeartbeatAt`, `startedAt`, `submittedAt`, `listeningDurationSeconds`, `sessionNotes`.

### 2. Interactive Mushaf

- **Session continuity**: Last Mushaf position (page, surah, ayah) is stored per student and restored when opening the Mushaf again.
  - **API**: `GET /api/students/[studentId]/mushaf-position` and `PATCH /api/students/[studentId]/mushaf-position`.
- **Student model**: New optional fields `lastMushafPage`, `lastMushafSurah`, `lastMushafAyah`.
- **Range lock**: When a ticket is active (in-progress or paused), the Mushaf UI receives `ayahRange` and `rangeLocked` and shows a “Range locked” indicator; the range cannot be changed during the ticket.
- **Mistake type**: “Hesitation” added as a teacher-selectable mistake type (Tajweed / Memorization slip / Hesitation as requested).

### 3. Assignment Module

- **Assignment types**: In addition to `sabq`, `sabqi`, `manzil`, assignments now support `revision` and `special_practice`.
- **Status flow**: New statuses: `in_progress`, `listened`, `needs_revision` (existing `active`, `completed`, `archived` kept). Flow: ASSIGNED (active) → IN_PROGRESS → LISTENED (when linked ticket is submitted) → COMPLETED (when ticket approved) or NEEDS_REVISION (when ticket rejected).
- **Ticket → Assignment**: When a ticket is created with `assignmentId`, that assignment is updated automatically on ticket submit (→ `listened`), approve (→ `completed`), reject (→ `needs_revision`). Approve no longer creates a second assignment when the ticket is already linked.

---

## Migration Plan (No Data Loss)

1. **Database**
   - All new fields are optional or have defaults. Existing tickets and assignments remain valid.
   - Ticket: new enum values `paused`, `closed` added; existing documents keep `pending`, `in-progress`, `submitted`, `approved`, `rejected`.
   - Assignment: new enum values `in_progress`, `listened`, `needs_revision` added; existing documents keep `active`, `completed`, `archived`.
   - Student: new optional fields `lastMushafPage`, `lastMushafSurah`, `lastMushafAyah`; no backfill required.

2. **APIs**
   - Existing routes unchanged in contract; new optional request body fields and new routes (heartbeat, pause, resume, mushaf-position) are additive.
   - Submit-for-review and approve/reject logic extended; backward compatible.

3. **Frontend**
   - Teacher ticket panel: Start (optional ayah range in body), Pause, Resume, Session notes, Heartbeat (automatic every 45s when ticket in-progress).
   - Teacher tickets page: “Paused” filter and count.
   - Mushaf: loads/saves last position when `studentId` is present; shows range locked when `rangeLocked` and `ayahRange` are set.
   - Assignment create/edit: can use new types `revision` and `special_practice` and new statuses where applicable.

4. **Deploy**
   - Deploy backend (models + routes) first; then frontend. No DB migration script required; Mongoose will accept new fields and enum values.

---

## New API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/tickets/[ticketId]/heartbeat` | Keep ticket session alive (teacher, every 30–60s). |
| POST | `/api/tickets/[ticketId]/pause` | Pause listening session. |
| POST | `/api/tickets/[ticketId]/resume` | Resume paused session. |
| GET  | `/api/students/[studentId]/mushaf-position` | Get last Mushaf page/surah/ayah. |
| PATCH| `/api/students/[studentId]/mushaf-position` | Update last Mushaf position. |
| DELETE | `/api/tickets/[ticketId]/mistakes` | Remove a mistake by index (body: `{ index: number }`). Teacher only; in-progress/paused. |

---

## Behavior Notes (for non-developers)

- **Ticket never disappears**: As long as the teacher keeps the ticket open and the app sends heartbeats (every 45s in the UI), the ticket stays in-progress even for long sessions. Refresh does not kill the ticket; the server stores state.
- **Pause**: Teacher can pause to take a break; range and mistakes stay; resume continues the same ticket.
- **Submit**: Only one submission per ticket; duration and session notes are saved.
- **Mushaf “remembers”**: When a student (or teacher viewing for a student) opens the Mushaf, the last page/surah is restored.
- **Assignment ↔ Ticket**: If a ticket is started for an assignment (assignment selected when starting), that assignment’s status updates automatically when the ticket is submitted or approved/rejected.

---

## Files Touched (for reference)

- **Models**: `Ticket.ts`, `Assignment.ts`, `Student.ts`
- **Ticket APIs**: `route.ts`, `start/route.ts`, `submit-for-review/route.ts`, `approve/route.ts`, `reject/route.ts`, new `heartbeat/route.ts`, `pause/route.ts`, `resume/route.ts`
- **Student API**: new `mushaf-position/route.ts`
- **UI**: `TicketDetailsPanel.tsx`, `TicketCard.tsx`, `InteractiveMushaf.tsx`, `NavigationControls.tsx`, teacher `tickets/page.tsx`, `MarkMistakeModal.tsx`, `mistakeTypes.ts`, `AssignmentCard.tsx`
- **Ticket APIs**: new `mistakes/route.ts` (DELETE – remove mistake by index)

---

## Confirmation Checklist (Production Verification)

Use this checklist to verify the upgrade behaves as specified.

### No ticket loss

- [ ] Heartbeat keeps ticket alive during long sessions
- [ ] Refresh does not kill in-progress ticket

### No duplicate submissions

- [ ] Ticket can only be submitted once
- [ ] Second submit returns HTTP 400

### Assignment syncing

- [ ] Linked ticket submit → assignment becomes listened
- [ ] Ticket approve → assignment becomes completed
- [ ] Ticket reject → assignment becomes needs_revision

### Mushaf & UI

- [ ] Mushaf restores last position
- [ ] Range is locked during active/paused tickets
- [ ] Pause/Resume works without data loss
- [ ] Session notes are saved
- [ ] Assignment cards and lists show correct new statuses
