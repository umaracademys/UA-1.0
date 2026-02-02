# Deep Technical Audit: Portal → Umar Academy 1.0

**Source:** Umar Academy Portal (`umar-academy-portal`)  
**Target:** Umar Academy 1.0 (`Umar-Academy-1.0`)  
**Scope:** Tickets, Assignments, Classwork, Homework

---

## Part 1: Schema Extraction (Portal – Complete Field Inventory)

### 1.1 TICKET (Portal)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | |
| `studentId` | String | ✓ | |
| `studentName` | String | ✓ | |
| `type` | enum | ✓ | `sabq` \| `sabqi` \| `manzil` |
| `status` | enum | ✓ | `pending` \| `in_progress` \| `submitted` \| `approved` \| `reassigned` \| `sent_to_assignment` |
| `createdBy` | String | ✓ | Admin ID |
| `createdByName` | String | ✓ | Admin name |
| `adminComment` | String | | |
| `assignedTeacherId` | String | | Teacher ID (sabqi/manzil) |
| `assignedTeacherName` | String | | |
| `teacherNotes` | String | | Admin notes to teacher |
| `teacherComment` | String | | Teacher submission comment |
| `mistakes` | Array | | TicketMistake[] |
| `recitationRange` | Object | | surahNumber, surahName, endSurahNumber, endSurahName, juzNumber, startAyahNumber, startAyahText, endAyahNumber, endAyahText |
| `mistakeCount` | Mixed | | Number 1–20 or `'weak'` |
| `atkees` | Number | | 1–20 |
| `tajweedIssues` | Array | | [{ type, surahName, wordText, note }] |
| `reviewNotes` | String | | |
| `sabqEntries` | Array | | Sabq-specific: [{ id, recitationRange, mistakes, mistakeCount, atkees, tajweedIssues, adminComment }] |
| `homeworkRange` | Object | | RecitationRange for next homework |
| `reassignedFromTeacherId` | String | | |
| `reassignedFromTeacherName` | String | | |
| `reassignedToTeacherId` | String | | |
| `reassignedToTeacherName` | String | | |
| `reassignmentReason` | String | | |
| `previousTeacherComment` | String | | |
| `previousMistakes` | Array | | |
| `sentToAssignmentId` | String | | Assignment ID when converted |
| `sentAt` | Date | | |
| `recordingUrl` | String | | |
| `recordingFormat` | String | | default `'webm'` |
| `recordingDuration` | Number | | seconds |
| `recordingStartedAt` | Date | | |
| `recordingStoppedAt` | Date | | |
| `recitationSessionId` | String | | AI recitation session link |
| `aiMetrics` | Object | | fluencyPercentage, wordsPerMinute, totalMistakes, mistakesByType, reportGenerated, reportGeneratedAt |
| `startedAt` | Date | | |
| `submittedAt` | Date | | |
| `approvedAt` | Date | | |
| `reassignedAt` | Date | | |
| `createdAt` | Date | | |
| `updatedAt` | Date | | |

**TicketMistake:** `id`, `type`, `page`, `surah`, `ayah`, `wordIndex`, `wordText`, `position`, `note`, `audioUrl`, `timestamp`

---

### 1.2 ASSIGNMENT (Portal)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | |
| `studentId` | String | ✓ | |
| `studentName` | String | ✓ | |
| `assignedBy` | String | ✓ | User ID |
| `assignedByName` | String | ✓ | |
| `assignedByRole` | enum | ✓ | `admin` \| `super_admin` \| `teacher` |
| `weeklyEvaluationId` | String | | |
| `fromTicketId` | String | | |
| `fromRecitationReviewId` | String | | |
| `classwork` | Object | ✓ | sabq[], sabqi[], manzil[] (ClassworkPhase[]) |
| `homework` | Object | ✓ | see below |
| `comment` | String | | |
| `mushafMistakes` | Array | | AssignmentMushafMistake[] |
| `status` | enum | ✓ | `active` \| `completed` \| `archived` |
| `completedAt` | Date | | |
| `createdAt` | Date | | |
| `updatedAt` | Date | | |

**ClassworkPhase:** `type`, `assignmentRange`, `details`, `fromPage`, `toPage`, `fromAyah`, `toAyah`, `surahNumber`, `surahName`, `juzNumber`, `startAyahText`, `endAyahText`, `mistakesSummary`, `mistakeCount`, `atkees`, `mistakes[]`, `tajweedIssues[]`, `teacherReviewComment`, `adminComment`, `fromTicketId`, `sabqEntryId`, `createdAt`

**Homework:** `enabled`, `content`, `link`, `pdfId`, `pdfAnnotations`, `items[]`, `notes`, `qaidahHomework`, `submission` (HomeworkSubmission)

**HomeworkSubmission:** `submitted`, `submittedAt`, `submittedBy`, `submittedByName`, `content`, `link`, `audioUrl`, `attachments[]`, `feedback`, `gradedBy`, `gradedByName`, `gradedAt`, `grade`, `status` (`submitted` \| `graded` \| `returned`)

---

## Part 2: Logic Audit

### 2.1 Ticket Status Flow (Portal)

```
pending → in_progress → submitted → approved → sent_to_assignment
                ↓
           reassigned (back to in_progress with new teacher)
```

- **Open:** `pending` (created), `in_progress` (teacher working)
- **Pending (review):** `submitted`
- **Closed:** `approved` → `sent_to_assignment` when converted to assignment
- **Reassignment:** `reassigned` → teacher changes, status returns to workflow

**Key endpoints:**
- `POST /api/tickets/:id/start` — pending → in_progress
- `POST /api/tickets/:id/submit` — in_progress → submitted
- `POST /api/tickets/:id/submit-sabq` — Sabq: pending → sent_to_assignment (creates assignment directly)
- `POST /api/tickets/:id/approve-send` — submitted → approved → sent_to_assignment
- `POST /api/tickets/:id/reassign` — reassign to different teacher

### 2.2 File Upload (Portal)

| Route | Purpose | Allowed Types | Max Size |
|-------|---------|---------------|----------|
| `/api/audio/upload` or similar | Mistake audio | audio/webm, audio/mpeg, audio/wav | - |
| `/api/pair-teacher-messages/upload` | Message attachments | images, video, audio, PDF, word | - |
| Recording upload | Ticket recordings | - | - |

- No dedicated homework file upload endpoint; attachments stored as URLs (client uploads to one of the above or external).
- Homework submission accepts `attachments: [{ name, url, type }]`.

### 2.3 Classwork Progress (Portal)

- **Tracking:** Classwork is stored in `Assignment.classwork` (sabq, sabqi, manzil arrays).
- **Progress:** No explicit “in_progress” for classwork; assignment `status` (`active` \| `completed` \| `archived`) reflects overall state.
- **Display:** Each phase shows entries with `assignmentRange`, `mistakeCount`, `atkees`, `mistakes`, `tajweedIssues`, `teacherReviewComment`, `startAyahText`, `endAyahText`, etc.

---

## Part 3: Gap Analysis (Portal vs 1.0)

### 3.1 Ticket Gaps

| Portal Field/Feature | 1.0 Status | Action |
|----------------------|------------|--------|
| `studentName` | ❌ Missing | 1.0 uses populate; add denormalized `studentName` if needed for display |
| `createdBy` / `createdByName` | ⚠️ Different | 1.0 has `teacherId`; Portal has `createdBy` (admin) + `assignedTeacherId` |
| `status: reassigned` | ❌ Missing | 1.0 has `rejected` but not `reassigned` | Add `reassigned` or map to existing status |
| `status: sent_to_assignment` | ⚠️ Different | 1.0 uses `approved` + `homeworkAssigned` | Map `sent_to_assignment` → `approved` with `homeworkAssigned` |
| `recitationRange` (structured) | ⚠️ Different | 1.0 has `ayahRange: { fromSurah, fromAyah, toSurah, toAyah }` | Add `surahName`, `startAyahText`, `endAyahText`, `juzNumber` if needed |
| `sabqEntries[]` | ❌ Missing | 1.0 has single mistakes array | Add `sabqEntries` for multi-entry Sabq |
| `homeworkRange` | ❌ Missing | - | Add for Sabq homework range |
| `reassigned*` fields | ❌ Missing | - | Add for reassignment history |
| `recordingUrl`, `recordingFormat`, `recordingDuration`, etc. | ❌ Missing | - | Add for recording support |
| `recitationSessionId`, `aiMetrics` | ❌ Missing | - | Add if AI features are migrated |
| `POST /tickets/:id/reassign` | ❌ Missing | - | Add reassign endpoint |
| `POST /tickets/:id/submit-sabq` | ⚠️ Different | 1.0 uses approve flow | Implement Sabq-specific submit if needed |
| `POST /tickets/:id/approve-send` | ⚠️ Different | 1.0 has `approve` | Ensure approve creates assignment and links ticket |

### 3.2 Assignment Gaps

| Portal Field/Feature | 1.0 Status | Action |
|----------------------|------------|--------|
| `studentId` as String | 1.0 uses ObjectId | Map during migration |
| `status` | 1.0 adds `in_progress`, `listened`, `needs_revision` | 1.0 is richer; map Portal statuses |
| `program` (index) | ❌ Missing | Portal indexes by program; add if filtering by program |
| ClassworkPhase `juzNumber`, `startAyahText`, `endAyahText` | ⚠️ Partial | 1.0 has some; verify all present |
| ClassworkPhase `mistakes[]` (with wordText) | ⚠️ Check | 1.0 classwork schema |
| ClassworkPhase `tajweedIssues[]` | ❌ Missing in 1.0 | Add to ClassworkPhase |
| Homework `submission.attachments[].size` | ⚠️ Partial | 1.0 has `size` in HomeworkAttachment |
| Assignment `program` field | ❌ Missing | Add if used in Portal |

### 3.3 Classwork Gaps

| Portal Feature | 1.0 Status | Action |
|----------------|------------|--------|
| `juzNumber` in phase | ⚠️ | Add to ClassworkPhase |
| `startAyahText`, `endAyahText` | ⚠️ | Add to ClassworkPhase |
| `mistakesSummary` | ⚠️ | Add or compute |
| `mistakeCount` (Mixed: number \| 'weak') | ⚠️ | Verify 1.0 supports |
| `atkees` | ✓ | Present |
| `tajweedIssues[]` in phase | ❌ | Add to ClassworkPhase schema |
| `teacherReviewComment` | 1.0 has `details` | Map `details` ↔ `teacherReviewComment` |
| `adminComment` | ✓ | Present |
| `fromTicketId`, `sabqEntryId` | ✓ | Present |

### 3.4 Homework Gaps

| Portal Feature | 1.0 Status | Action |
|----------------|------------|--------|
| File upload for attachments | ✓ Fixed | 1.0 has `/api/upload` |
| `attachments[].size` | ✓ | Present |
| Allowed file types | ✓ | PDF, images, audio (incl. webm) |
| Grade 0–100 | ✓ | Same |
| `status`: submitted \| graded \| returned | ✓ | Same |

---

## Part 4: Action Plan (1.0 Implementation)

### 4.1 Database / Model Changes

1. **Ticket model (`Ticket.ts`)**
   - [ ] Add `studentName?: string` (denormalized)
   - [ ] Add `createdBy?: ObjectId`, `createdByName?: string`
   - [ ] Add `reassigned` to status enum (or document mapping)
   - [ ] Add `recitationRange` with full structure (surahName, startAyahText, endAyahText, juzNumber, endSurahNumber, endSurahName)
   - [ ] Add `sabqEntries?: SabqEntry[]`
   - [ ] Add `homeworkRange?: RecitationRange`
   - [ ] Add `reassignedFromTeacherId`, `reassignedToTeacherId`, `reassignmentReason`, `previousTeacherComment`, `previousMistakes`
   - [ ] Add `recordingUrl`, `recordingFormat`, `recordingDuration`, `recordingStartedAt`, `recordingStoppedAt`
   - [ ] Add `recitationSessionId`, `aiMetrics` (optional, for AI features)
   - [ ] Map `sentToAssignmentId` ↔ `homeworkAssigned` / `assignmentId`

2. **Assignment model (`Assignment.ts`)**
   - [ ] Add `program?: string` if used
   - [ ] Extend ClassworkPhase: `juzNumber`, `startAyahText`, `endAyahText`, `mistakesSummary`, `tajweedIssues[]`
   - [ ] Ensure `mistakeCount` accepts number \| `'weak'` (Mixed)

3. **Mistake type enum**
   - [ ] Align Portal mistake types with 1.0 (Portal has extra types, e.g. ghunnah, qalqalah)

### 4.2 API Endpoints to Add

1. **Tickets**
   - [ ] `POST /api/tickets/[ticketId]/reassign` — reassign ticket to another teacher
   - [ ] `POST /api/tickets/[ticketId]/submit-sabq` — Sabq-specific submit (if keeping Sabq flow)

2. **File upload**
   - [x] `POST /api/upload` — general homework attachments (already added)

### 4.3 Functions / Logic to Implement

1. **Ticket reassignment**
   - Reassign ticket to new teacher
   - Set `reassignedFrom*`, `reassignedTo*`, `reassignmentReason`
   - Copy `teacherComment` → `previousTeacherComment`, `mistakes` → `previousMistakes`
   - Set status to `reassigned` or `in_progress`
   - Notify new teacher

2. **Sabq multi-entry handling**
   - When approving Sabq ticket with `sabqEntries[]`, create one classwork entry per Sabq entry
   - Copy `homeworkRange` into assignment homework when present

3. **Status mapping (migration)**
   - `sent_to_assignment` → `approved` + set `homeworkAssigned`
   - `reassigned` → keep or map to `in_progress` with reassignment metadata

### 4.4 Migration Script Requirements

- Map Portal `studentId` (String) → 1.0 Student ObjectId
- Map Portal `assignedTeacherId` / `createdBy` → 1.0 User/Teacher ObjectId
- Map `status: sent_to_assignment` → `approved` + `homeworkAssigned`
- Copy `sabqEntries`, `homeworkRange`, `recitationRange` with full structure
- Copy `reassigned*`, `recording*`, `aiMetrics` if migrating those features
- Map `fromTicketId`, `sentToAssignmentId` to new ObjectIds

---

## Part 5: Summary Table

| Module | Portal Fields Count | 1.0 Coverage | Critical Gaps |
|--------|---------------------|--------------|---------------|
| **Ticket** | 35+ | ~70% | reassigned flow, sabqEntries, homeworkRange, recording, aiMetrics |
| **Assignment** | 15+ | ~90% | program index, full ClassworkPhase fields |
| **Classwork** | 20+ per phase | ~85% | tajweedIssues in phase, juzNumber, start/end ayah text |
| **Homework** | 15+ | ~95% | File upload was missing—fixed |

---

## References

- Portal: `umar-academy-portal/backend/server.js` (lines 6673–6995)
- Portal: `umar-academy-portal/src/types/ticket.ts`, `assignment.ts`
- 1.0: `Umar-Academy-1.0/src/lib/db/models/Ticket.ts`, `Assignment.ts`
- Docs: `TICKET_SYSTEM_FULLSTACK_OVERVIEW.md`, `TICKET_TO_ASSIGNMENT_TRANSFER.md`, `CLASSWORK_DISPLAY_SAMPLE.md`
