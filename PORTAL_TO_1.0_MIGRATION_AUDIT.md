# Portal → Umar Academy 1.0 Migration Audit

## Executive Summary

This document audits the **Tickets**, **Assignments**, **Classwork**, and **Homework** modules in Umar Academy 1.0 for migration from the original Portal. Since the Portal source code was not available, this audit is based on the 1.0 codebase, migration guides, and typical portal patterns. Issues found and fixes applied are documented below.

---

## 1. TICKETS MODULE

### 1.1 Status Flow Comparison

| Portal (Typical) | 1.0 Status | Mapping |
|------------------|------------|---------|
| Open | `pending` | Ticket created, not started |
| Open (in session) | `in-progress` | Teacher listening |
| Pending | `submitted` | Teacher submitted for admin review |
| Pending | `paused` | Session paused, can resume |
| Resolved (approved) | `approved` | Admin approved |
| Resolved (rejected) | `rejected` | Admin rejected |
| Closed | `closed` | Final state |

**1.0 Ticket Status Enum:** `pending` | `in-progress` | `paused` | `submitted` | `approved` | `rejected` | `closed`

### 1.2 Ticket Data Structure (1.0)

```typescript
{
  studentId: ObjectId,
  teacherId?: ObjectId,
  workflowStep: "sabq" | "sabqi" | "manzil",
  status: TicketStatus,
  notes?: string,
  audioUrl?: string,
  mistakes: TicketMistake[],
  reviewedBy?: ObjectId,
  reviewNotes?: string,
  reviewedAt?: Date,
  homeworkAssigned?: ObjectId,
  ayahRange?: { fromSurah, fromAyah, toSurah, toAyah },
  rangeLocked?: boolean,
  assignmentId?: ObjectId,
  lastHeartbeatAt?: Date,
  startedAt?: Date,
  submittedAt?: Date,
  listeningDurationSeconds?: number,
  sessionNotes?: string,
  createdAt, updatedAt
}
```

### 1.3 Ticket API Endpoints (1.0)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List tickets (filter by workflowStep, status, studentId, teacherId) |
| POST | `/api/tickets` | Create ticket |
| GET | `/api/tickets/pending-review` | Tickets awaiting admin review |
| GET | `/api/tickets/[ticketId]` | Get single ticket |
| POST | `/api/tickets/[ticketId]/start` | Start listening session |
| POST | `/api/tickets/[ticketId]/pause` | Pause session |
| POST | `/api/tickets/[ticketId]/resume` | Resume session |
| POST | `/api/tickets/[ticketId]/heartbeat` | Keep session alive |
| POST | `/api/tickets/[ticketId]/submit-for-review` | Submit for admin review |
| POST | `/api/tickets/[ticketId]/approve` | Admin approve |
| POST | `/api/tickets/[ticketId]/reject` | Admin reject |
| POST | `/api/tickets/[ticketId]/add-mistake` | Add mistake during session |
| GET/POST | `/api/tickets/[ticketId]/mistakes` | Mistake CRUD |

### 1.4 Ticket Issues Found

- **None critical.** Status flow is correctly implemented. Approval creates assignments; rejection sets linked assignment to `needs_revision`.

---

## 2. ASSIGNMENTS MODULE

### 2.1 Assignment Status Flow

| 1.0 Status | Description |
|------------|-------------|
| `active` | Assigned, not started |
| `in_progress` | Teacher/student working |
| `listened` | Linked ticket was submitted |
| `needs_revision` | Ticket rejected or re-do needed |
| `completed` | Done (ticket approved or marked complete) |
| `archived` | Archived |

**BUG FIXED:** The `/api/assignments/[id]/submit` route was setting status to `"submitted"` (not in enum). Changed to `"in_progress"`.

**BUG FIXED:** The `/api/submissions/[id]/grade` route was setting assignment status to `"graded"` (not in enum). Changed to `"completed"`.

### 2.2 Assignment Data Structure (1.0)

- **Classwork:** `sabq`, `sabqi`, `manzil` phases with `ClassworkPhase[]`
- **Homework:** `enabled`, `content`, `link`, `pdfId`, `items[]`, `qaidahHomework`, `submission`
- **Source tracking:** `fromTicketId`, `weeklyEvaluationId`, `fromRecitationReviewId`

### 2.3 Assignment API Endpoints (1.0)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assignments` | List with filters |
| GET | `/api/assignments/me` | Student's assignments |
| GET | `/api/assignments/student/[studentId]` | Assignments for student |
| POST | `/api/assignments` | Create |
| POST | `/api/assignments/bulk-create` | Bulk create |
| GET | `/api/assignments/[id]` | Get single |
| PUT | `/api/assignments/[id]` | Update |
| POST | `/api/assignments/[id]/submit` | Submit classwork (Submission model) |
| POST | `/api/assignments/[id]/submit-homework` | Submit homework (embedded) |
| POST | `/api/assignments/[id]/grade-homework` | Grade homework |
| GET | `/api/assignments/[id]/submissions` | List submissions |
| GET/POST | `/api/assignments/[id]/pdf-annotations` | PDF annotations |

---

## 3. CLASSWORK MODULE

### 3.1 Classwork vs Homework (1.0)

| Aspect | Classwork | Homework |
|--------|-----------|----------|
| Submit endpoint | `/api/assignments/[id]/submit` | `/api/assignments/[id]/submit-homework` |
| Storage | `Submission` collection | `Assignment.homework.submission` (embedded) |
| File upload | FormData via `saveFiles()` | Attachments as URLs (client uploads first) |
| Grading | `/api/submissions/[id]/grade` | `/api/assignments/[id]/grade-homework` |

### 3.2 Classwork Phase Structure

```typescript
interface ClassworkPhase {
  type: "sabq" | "sabqi" | "manzil" | "revision" | "special_practice";
  assignmentRange: string;
  details?: string;
  fromPage?, toPage?, fromAyah?, toAyah?;
  surahNumber?, surahName?;
  createdAt: Date;
}
```

---

## 4. HOMEWORK MODULE

### 4.1 Homework Submission Structure

```typescript
interface HomeworkSubmission {
  submitted: boolean;
  submittedAt?: Date;
  submittedBy?: string;
  submittedByName?: string;
  content?: string;
  link?: string;
  audioUrl?: string;
  attachments?: { name, url, type, size? }[];
  feedback?: string;
  gradedBy?: string;
  gradedByName?: string;
  gradedAt?: Date;
  grade?: number;  // 0-100 in GradeHomeworkModal
  status?: "submitted" | "graded" | "returned";
}
```

### 4.2 File Upload & Grading

| Feature | Implementation |
|---------|----------------|
| Allowed file types | PDF, JPEG, PNG, audio (webm, mpeg) – from `fileUpload.ts` and `SubmissionForm` |
| Max file size | 10MB (fileUpload default 10MB; audio 5MB) |
| Point/grade system | Homework: 0–100 optional; Submission: `grade` (min 0, no max) |
| Upload endpoint | **GAP:** SubmissionForm calls `/api/upload` for attachments but only `/api/upload/audio` exists. **FIX:** Added `/api/upload` route. |

### 4.3 Homework Item Structure

- **Range modes:** `surah_ayah`, `surah_surah`, `juz_juz`, `multiple_juz`
- **Qaidah:** `qaidah1`, `qaidah2` books with page, letters, rules, links

---

## 5. CODE FIXES APPLIED

1. **`/api/assignments/[id]/submit`** – Status changed from `"submitted"` to `"in_progress"` (valid enum).
2. **`/api/submissions/[id]/grade`** – Assignment status changed from `"graded"` to `"completed"` (valid enum).
3. **`/api/upload/route.ts`** – New route for homework file attachments (PDF, images, audio) so SubmissionForm uploads work.

---

## 6. MISTAKE TYPES ALIGNMENT

Assignment model `MistakeType` enum includes: `madd`, `holding`, `memory`, `ikhfa`, `tech`, `other`, `letter`, `heavy_letter`, `no_rounding_lips`, `heavy_h`, `light_l`, `atkee`.

`mistakeTypes.ts` (UI) has additional values: `wrong_letter`, `missing_letter`, `extra_letter`, `wrong_stop`, `missing_stop`, `repetition`, `idgham`, `iqlab`, `qalqalah`, `makhraj`, `ghunna`, `shaddah`, `hesitation`.

Ensure ticket/assignment mistake `type` values are mapped when migrating; some UI types may need to map to schema enum (e.g. `wrong_letter` → `letter`).

---

## 7. JSON DATA MAPPING SCHEMA (Portal → 1.0)

Use this schema when migrating records from the Portal database to 1.0.

### 7.1 Ticket Mapping

```json
{
  "portal_ticket": {
    "id": "portal_id",
    "studentId": "portal_student_ref",
    "teacherId": "portal_teacher_ref",
    "status": "open|pending|resolved",
    "notes": "string",
    "mistakes": "array",
    "createdAt": "date",
    "updatedAt": "date"
  },
  "mapping": {
    "portal_status_to_1.0": {
      "open": "pending",
      "pending": "submitted",
      "resolved": "approved",
      "resolved_rejected": "rejected"
    },
    "required_1.0_fields": ["studentId", "workflowStep", "status"],
    "workflowStep": "sabq|sabqi|manzil",
    "objectId_mapping": {
      "studentId": "map Portal student ID to 1.0 Student ObjectId",
      "teacherId": "map Portal teacher ID to 1.0 Teacher ObjectId"
    }
  }
}
```

### 7.2 Assignment Mapping

```json
{
  "portal_assignment": {
    "id": "portal_id",
    "studentIds": ["array for multi-student - 1.0 creates one per student"],
    "title": "string",
    "type": "sabq|sabqi|manzil|revision",
    "content": "string",
    "status": "pending|submitted|graded|overdue",
    "dueDate": "date",
    "attachments": "array",
    "grade": "number",
    "feedback": "string",
    "createdAt": "date"
  },
  "mapping": {
    "portal_status_to_1.0": {
      "pending": "active",
      "submitted": "in_progress",
      "graded": "completed",
      "overdue": "active"
    },
    "1.0_structure": {
      "studentId": "ObjectId (one assignment per student)",
      "studentName": "from Student.userId.fullName",
      "assignedBy": "admin/teacher user ID string",
      "assignedByName": "user fullName",
      "assignedByRole": "admin|super_admin|teacher",
      "status": "active|in_progress|listened|needs_revision|completed|archived",
      "classwork": {
        "sabq": "[ClassworkPhase]",
        "sabqi": "[ClassworkPhase]",
        "manzil": "[ClassworkPhase]"
      },
      "homework": {
        "enabled": "boolean",
        "content": "legacy text",
        "link": "legacy URL",
        "items": "[HomeworkItem]",
        "submission": "HomeworkSubmission when submitted"
      }
    }
  }
}
```

### 7.3 Submission Mapping (Classwork – separate Submission collection)

```json
{
  "portal_submission": {
    "assignmentId": "ref",
    "studentId": "ref",
    "content": "string",
    "attachments": "[{filename, url}]",
    "grade": "number",
    "feedback": "string",
    "submittedAt": "date"
  },
  "mapping": {
    "1.0_Submission": {
      "assignmentId": "ObjectId",
      "studentId": "ObjectId",
      "content": "string",
      "attachments": "[{filename, url, uploadedAt}]",
      "grade": "number min 0",
      "feedback": "string",
      "teacherNotes": "string",
      "submittedAt": "Date",
      "gradedAt": "Date",
      "gradedBy": "Teacher ObjectId",
      "status": "pending|graded|late"
    }
  }
}
```

### 7.4 Homework Submission Mapping (Embedded in Assignment)

```json
{
  "portal_homework_submission": {
    "content": "string",
    "link": "url",
    "audioUrl": "url",
    "attachments": "[{name, url, type}]",
    "grade": "number 0-100",
    "feedback": "string",
    "submittedAt": "date",
    "gradedAt": "date"
  },
  "mapping": {
    "1.0_homework.submission": {
      "submitted": true,
      "submittedAt": "Date",
      "submittedBy": "studentId string",
      "submittedByName": "string",
      "content": "string",
      "link": "string",
      "audioUrl": "string",
      "attachments": "[{name, url, type, size}]",
      "feedback": "string",
      "gradedBy": "userId string",
      "gradedByName": "string",
      "gradedAt": "Date",
      "grade": "number 0-100",
      "status": "submitted|graded|returned"
    }
  }
}
```

### 7.5 Mistake Type Mapping (Ticket/Assignment mistakes)

```json
{
  "portal_mistake_type": "string",
  "1.0_MistakeType_enum": [
    "madd", "holding", "memory", "ikhfa", "tech", "other",
    "letter", "heavy_letter", "no_rounding_lips", "heavy_h", "light_l", "atkee"
  ],
  "fallback_for_unknown": "other",
  "alias_mapping": {
    "wrong_letter": "letter",
    "missing_letter": "letter",
    "extra_letter": "letter",
    "wrong_stop": "other",
    "missing_stop": "other",
    "repetition": "other",
    "idgham": "tajweed",
    "iqlab": "tajweed",
    "qalqalah": "tajweed",
    "makhraj": "tajweed",
    "ghunna": "tajweed",
    "shaddah": "tajweed",
    "hesitation": "other"
  }
}
```

### 7.6 File Type Mapping

```json
{
  "allowed_1.0_types": [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "audio/mpeg"
  ],
  "SubmissionForm_additional": ["audio/webm"],
  "max_size_bytes": 10485760,
  "max_audio_mb": 5
}
```
