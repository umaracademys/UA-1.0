/**
 * Portal → 1.0 Ticket Mapping Validation Script
 *
 * Takes a sample JSON object from the Portal Ticket schema and maps it to the
 * 1.0 Ticket schema. Flags any fields that return undefined or fail validation.
 *
 * Usage: npx ts-node scripts/validate-portal-ticket-mapping.ts
 * Or:    npx tsx scripts/validate-portal-ticket-mapping.ts
 *
 * You can pass a JSON file path as argument to validate a specific sample:
 *   npx tsx scripts/validate-portal-ticket-mapping.ts path/to/sample-ticket.json
 */

import * as fs from "fs";
import * as path from "path";

// ─── Portal Ticket Schema (from umar-academy-portal/backend/server.js) ───
interface PortalTicketMistake {
  id?: string;
  type?: string;
  page?: number;
  surah?: number;
  ayah?: number;
  wordIndex?: number;
  wordText?: string;
  position?: { x: number; y: number };
  note?: string;
  audioUrl?: string;
  timestamp?: string | Date;
}

interface PortalRecitationRange {
  surahNumber?: number;
  surahName?: string;
  endSurahNumber?: number;
  endSurahName?: string;
  juzNumber?: number;
  startAyahNumber?: number;
  startAyahText?: string;
  endAyahNumber?: number;
  endAyahText?: string;
}

interface PortalSabqEntry {
  id?: string;
  recitationRange?: PortalRecitationRange;
  mistakes?: PortalTicketMistake[];
  mistakeCount?: number | "weak";
  atkees?: number;
  tajweedIssues?: Array<{ type?: string; surahName?: string; wordText?: string; note?: string }>;
  adminComment?: string;
}

interface PortalTicket {
  _id?: string;
  studentId: string;
  studentName?: string;
  type: "sabq" | "sabqi" | "manzil";
  status: string;
  createdBy?: string;
  createdByName?: string;
  adminComment?: string;
  assignedTeacherId?: string;
  assignedTeacherName?: string;
  teacherNotes?: string;
  teacherComment?: string;
  mistakes?: PortalTicketMistake[];
  recitationRange?: PortalRecitationRange;
  mistakeCount?: number | "weak";
  atkees?: number;
  tajweedIssues?: Array<{ type?: string; surahName?: string; wordText?: string; note?: string }>;
  reviewNotes?: string;
  sabqEntries?: PortalSabqEntry[];
  homeworkRange?: PortalRecitationRange;
  reassignedFromTeacherId?: string;
  reassignedFromTeacherName?: string;
  reassignedToTeacherId?: string;
  reassignedToTeacherName?: string;
  reassignmentReason?: string;
  previousTeacherComment?: string;
  previousMistakes?: PortalTicketMistake[];
  sentToAssignmentId?: string;
  sentAt?: string | Date;
  recordingUrl?: string;
  recordingFormat?: string;
  recordingDuration?: number;
  recordingStartedAt?: string | Date;
  recordingStoppedAt?: string | Date;
  recitationSessionId?: string;
  aiMetrics?: Record<string, unknown>;
  startedAt?: string | Date;
  submittedAt?: string | Date;
  approvedAt?: string | Date;
  reassignedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// ─── 1.0 Ticket Schema (from src/lib/db/models/Ticket.ts) ───
const TICKET_STATUSES = [
  "pending",
  "in-progress",
  "paused",
  "submitted",
  "approved",
  "rejected",
  "reassigned",
  "closed",
] as const;

const WORKFLOW_STEPS = ["sabq", "sabqi", "manzil"] as const;

interface TargetTicketMistake {
  type: string;
  category: string;
  page?: number;
  surah?: number;
  ayah?: number;
  wordIndex?: number;
  letterIndex?: number;
  position?: { x: number; y: number };
  tajweedData?: Record<string, unknown>;
  note?: string;
  audioUrl?: string;
  timestamp?: Date;
}

interface TargetRecitationRange {
  surahName?: string;
  surahNumber?: number;
  endSurahNumber?: number;
  endSurahName?: string;
  juzNumber?: number;
  startAyahNumber?: number;
  startAyahText?: string;
  endAyahNumber?: number;
  endAyahText?: string;
}

interface TargetSabqEntry {
  id?: string;
  recitationRange?: TargetRecitationRange;
  mistakes?: TargetTicketMistake[];
  mistakeCount?: number | "weak";
  atkees?: number;
  tajweedIssues?: Array<{ type: string; surahName?: string; wordText?: string; note?: string }>;
  adminComment?: string;
}

interface TargetTicket {
  studentId: string; // ObjectId as string for validation
  teacherId?: string; // ObjectId
  createdBy?: string; // ObjectId
  createdByName?: string;
  workflowStep: "sabq" | "sabqi" | "manzil";
  status: (typeof TICKET_STATUSES)[number];
  notes?: string;
  audioUrl?: string;
  mistakes: TargetTicketMistake[];
  ayahRange?: { fromSurah: number; fromAyah: number; toSurah: number; toAyah: number };
  assignmentId?: string;
  homeworkAssigned?: string;
  sessionNotes?: string;
  recitationRange?: TargetRecitationRange;
  sabqEntries?: TargetSabqEntry[];
  homeworkRange?: TargetRecitationRange;
  mistakeCount?: number | "weak";
  reassignedFromTeacherId?: string;
  reassignedFromTeacherName?: string;
  reassignedToTeacherId?: string;
  reassignedToTeacherName?: string;
  reassignmentReason?: string;
  previousTeacherComment?: string;
  previousMistakes?: TargetTicketMistake[];
  reassignedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  reviewedAt?: Date;
  lastHeartbeatAt?: Date;
  startedAt?: Date;
  submittedAt?: Date;
  listeningDurationSeconds?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Validation Result ───
interface ValidationFlag {
  path: string;
  issue: "undefined" | "validation_failed" | "type_mismatch" | "mapping_dropped" | "required_defaulted";
  portalValue: unknown;
  targetValue: unknown;
  message: string;
}

// ─── Status Mapping Portal → 1.0 ───
function mapStatus(portalStatus: string): (typeof TICKET_STATUSES)[number] | null {
  const map: Record<string, (typeof TICKET_STATUSES)[number]> = {
    pending: "pending",
    in_progress: "in-progress", // Portal uses underscore
    paused: "paused",
    submitted: "submitted",
    approved: "approved",
    rejected: "rejected",
    reassigned: "reassigned",
    sent_to_assignment: "approved", // Map to approved; homeworkAssigned set separately
    closed: "closed",
  };
  return map[portalStatus] ?? null;
}

// ─── ObjectId validation (24-char hex) ───
function isValidObjectId(s: unknown): boolean {
  if (typeof s !== "string") return false;
  return /^[a-fA-F0-9]{24}$/.test(s);
}

// ─── Map Portal Mistake → 1.0 Mistake ───
function mapMistake(
  m: PortalTicketMistake,
  index: number,
  flags: ValidationFlag[]
): TargetTicketMistake | null {
  const type = m.type ?? "other";
  // 1.0 requires 'category' but Portal doesn't have it — default to 'other'
  const category = "category" in m && (m as any).category ? (m as any).category : "other";

  if (!type || typeof type !== "string") {
    flags.push({
      path: `mistakes[${index}].type`,
      issue: "validation_failed",
      portalValue: m.type,
      targetValue: type,
      message: "Mistake type is required; Portal may omit it.",
    });
  }

  const pos = m.position ?? { x: 0, y: 0 };
  const ts = m.timestamp ? new Date(m.timestamp) : new Date();

  return {
    type: String(type),
    category: String(category),
    page: m.page,
    surah: m.surah,
    ayah: m.ayah,
    wordIndex: m.wordIndex,
    position: pos,
    note: m.note,
    audioUrl: m.audioUrl,
    timestamp: ts,
  };
}

// ─── Map Portal RecitationRange → 1.0 ───
function mapRecitationRange(
  rr: PortalRecitationRange | undefined,
  pathPrefix: string,
  flags: ValidationFlag[]
): TargetRecitationRange | undefined {
  if (!rr || typeof rr !== "object") return undefined;
  return {
    surahName: rr.surahName,
    surahNumber: rr.surahNumber,
    endSurahNumber: rr.endSurahNumber,
    endSurahName: rr.endSurahName,
    juzNumber: rr.juzNumber,
    startAyahNumber: rr.startAyahNumber,
    startAyahText: rr.startAyahText,
    endAyahNumber: rr.endAyahNumber,
    endAyahText: rr.endAyahText,
  };
}

// ─── Map Portal SabqEntry → 1.0 SabqEntry ───
function mapSabqEntry(
  se: PortalSabqEntry,
  idx: number,
  flags: ValidationFlag[]
): TargetSabqEntry {
  const mistakes: TargetTicketMistake[] = [];
  for (let i = 0; i < (se.mistakes?.length ?? 0); i++) {
    const mapped = mapMistake(se.mistakes![i], i, flags);
    if (mapped) mistakes.push(mapped);
  }

  const tajweedIssues = (se.tajweedIssues ?? []).map((t) => ({
    type: t.type ?? "other",
    surahName: t.surahName,
    wordText: t.wordText,
    note: t.note,
  }));

  return {
    id: se.id,
    recitationRange: mapRecitationRange(se.recitationRange, `sabqEntries[${idx}].recitationRange`, flags),
    mistakes: mistakes.length ? mistakes : undefined,
    mistakeCount: se.mistakeCount,
    atkees: se.atkees,
    tajweedIssues: tajweedIssues.length ? tajweedIssues : undefined,
    adminComment: se.adminComment,
  };
}

// ─── Main Mapper: Portal → 1.0 (exported for migration script) ───
export function mapPortalTicketToTarget(portal: PortalTicket): { target: TargetTicket; flags: ValidationFlag[] } {
  const flags: ValidationFlag[] = [];

  // Status mapping
  const status = mapStatus(portal.status);
  if (!status && portal.status) {
    flags.push({
      path: "status",
      issue: "validation_failed",
      portalValue: portal.status,
      targetValue: null,
      message: `Portal status '${portal.status}' has no 1.0 mapping.`,
    });
  }
  const mappedStatus = status ?? "pending";

  // studentId: Portal uses String (could be ObjectId string). 1.0 expects ObjectId.
  const studentId = String(portal.studentId ?? "");
  if (!isValidObjectId(studentId) && studentId) {
    flags.push({
      path: "studentId",
      issue: "validation_failed",
      portalValue: portal.studentId,
      targetValue: studentId,
      message: "studentId must be a 24-char hex ObjectId. Portal may store non-ObjectId during migration.",
    });
  }

  // teacherId: Portal has assignedTeacherId (String)
  const teacherId = portal.assignedTeacherId ?? undefined;
  if (teacherId && !isValidObjectId(teacherId)) {
    flags.push({
      path: "teacherId",
      issue: "validation_failed",
      portalValue: portal.assignedTeacherId,
      targetValue: teacherId,
      message: "assignedTeacherId must be a valid ObjectId when provided.",
    });
  }

  // createdBy: Portal uses String (Admin ID); 1.0 expects ObjectId
  const createdBy = portal.createdBy ?? undefined;
  if (createdBy && !isValidObjectId(createdBy)) {
    flags.push({
      path: "createdBy",
      issue: "validation_failed",
      portalValue: portal.createdBy,
      targetValue: createdBy,
      message: "createdBy must be a valid ObjectId when provided.",
    });
  }

  // workflowStep: Portal uses 'type'
  const workflowStep = portal.type ?? "sabq";
  if (!WORKFLOW_STEPS.includes(workflowStep)) {
    flags.push({
      path: "workflowStep",
      issue: "validation_failed",
      portalValue: portal.type,
      targetValue: workflowStep,
      message: `workflowStep must be one of ${WORKFLOW_STEPS.join(", ")}.`,
    });
  }

  // Mistakes (root-level)
  const mistakes: TargetTicketMistake[] = [];
  for (let i = 0; i < (portal.mistakes?.length ?? 0); i++) {
    const m = mapMistake(portal.mistakes![i], i, flags);
    if (m) mistakes.push(m);
  }

  // sabqEntries
  let sabqEntries: TargetSabqEntry[] | undefined;
  if (portal.sabqEntries && portal.sabqEntries.length > 0) {
    sabqEntries = portal.sabqEntries.map((se, i) => mapSabqEntry(se, i, flags));
  }

  // homeworkAssigned: Portal has sentToAssignmentId
  const homeworkAssigned = portal.sentToAssignmentId;
  if (homeworkAssigned && !isValidObjectId(homeworkAssigned)) {
    flags.push({
      path: "homeworkAssigned",
      issue: "validation_failed",
      portalValue: portal.sentToAssignmentId,
      targetValue: homeworkAssigned,
      message: "sentToAssignmentId must be a valid ObjectId.",
    });
  }

  // recordingUrl → audioUrl (1.0 uses audioUrl for general recording)
  const audioUrl = portal.recordingUrl ?? portal.audioUrl;

  // recording* and aiMetrics: 1.0 does not have these; flag
  if (portal.recordingFormat || portal.recordingDuration || portal.recitationSessionId || portal.aiMetrics) {
    flags.push({
      path: "recording/ai",
      issue: "mapping_dropped",
      portalValue: {
        recordingFormat: portal.recordingFormat,
        recordingDuration: portal.recordingDuration,
        recitationSessionId: portal.recitationSessionId,
        aiMetrics: portal.aiMetrics,
      },
      targetValue: undefined,
      message: "1.0 does not have recordingFormat, recordingDuration, recitationSessionId, aiMetrics.",
    });
  }

  const target: TargetTicket = {
    studentId,
    teacherId: teacherId || undefined,
    createdBy: createdBy || undefined,
    createdByName: portal.createdByName || undefined,
    workflowStep,
    status: mappedStatus,
    notes: portal.teacherNotes || portal.adminComment || undefined,
    audioUrl: audioUrl || undefined,
    mistakes,
    sessionNotes: portal.teacherComment || undefined,
    recitationRange: mapRecitationRange(portal.recitationRange, "recitationRange", flags),
    sabqEntries,
    homeworkRange: mapRecitationRange(portal.homeworkRange, "homeworkRange", flags),
    mistakeCount: portal.mistakeCount,
    reassignedFromTeacherId: portal.reassignedFromTeacherId || undefined,
    reassignedFromTeacherName: portal.reassignedFromTeacherName || undefined,
    reassignedToTeacherId: portal.reassignedToTeacherId || undefined,
    reassignedToTeacherName: portal.reassignedToTeacherName || undefined,
    reassignmentReason: portal.reassignmentReason || undefined,
    previousTeacherComment: portal.previousTeacherComment || undefined,
    previousMistakes: (portal.previousMistakes ?? []).map((m, i) => mapMistake(m, i, flags)).filter(Boolean) as TargetTicketMistake[],
    reassignedAt: portal.reassignedAt ? new Date(portal.reassignedAt) : undefined,
    reviewNotes: portal.reviewNotes || undefined,
    reviewedAt: portal.reviewedAt ? new Date(portal.reviewedAt) : undefined,
    startedAt: portal.startedAt ? new Date(portal.startedAt) : undefined,
    submittedAt: portal.submittedAt ? new Date(portal.submittedAt) : undefined,
    createdAt: portal.createdAt ? new Date(portal.createdAt) : undefined,
    updatedAt: portal.updatedAt ? new Date(portal.updatedAt) : undefined,
  };

  // homeworkAssigned: map from sentToAssignmentId
  if (portal.sentToAssignmentId) {
    (target as any).homeworkAssigned = portal.sentToAssignmentId;
  }

  return { target, flags };
}

// ─── Post-map validation: flag undefined required fields ───
function validateTarget(target: TargetTicket, flags: ValidationFlag[]): void {
  if (!target.studentId) {
    flags.push({
      path: "studentId",
      issue: "undefined",
      portalValue: undefined,
      targetValue: target.studentId,
      message: "studentId is required.",
    });
  }
  if (!target.workflowStep) {
    flags.push({
      path: "workflowStep",
      issue: "undefined",
      portalValue: undefined,
      targetValue: target.workflowStep,
      message: "workflowStep is required.",
    });
  }
  if (!target.status) {
    flags.push({
      path: "status",
      issue: "undefined",
      portalValue: undefined,
      targetValue: target.status,
      message: "status is required.",
    });
  }
  if (!Array.isArray(target.mistakes)) {
    flags.push({
      path: "mistakes",
      issue: "type_mismatch",
      portalValue: target.mistakes,
      targetValue: target.mistakes,
      message: "mistakes must be an array.",
    });
  }
}

// ─── Sample Portal Ticket (for smoke test) ───
const SAMPLE_PORTAL_TICKET: PortalTicket = {
  _id: "507f1f77bcf86cd799439011",
  studentId: "507f1f77bcf86cd799439012",
  studentName: "أحمد محمد",
  type: "sabq",
  status: "submitted",
  createdBy: "507f1f77bcf86cd799439013",
  createdByName: "Admin User",
  adminComment: "Review this Sabq",
  assignedTeacherId: "507f1f77bcf86cd799439014",
  assignedTeacherName: "Teacher One",
  teacherNotes: "Focus on heavy letters",
  teacherComment: "Good progress, 2 mistakes.",
  mistakes: [
    {
      id: "m1",
      type: "heavy_letter",
      page: 2,
      surah: 2,
      ayah: 1,
      wordIndex: 1,
      wordText: "الم",
      position: { x: 10, y: 20 },
      note: "Heavy letter",
      timestamp: "2026-01-21T10:00:00Z",
    },
  ],
  recitationRange: {
    surahNumber: 2,
    surahName: "البقرة",
    endSurahNumber: 2,
    endSurahName: "البقرة",
    juzNumber: 1,
    startAyahNumber: 1,
    endAyahNumber: 5,
    startAyahText: "الم",
    endAyahText: "الَّذِينَ",
  },
  mistakeCount: 2,
  atkees: 3,
  tajweedIssues: [{ type: "heavy_letters", note: "Focus on pronunciation" }],
  reviewNotes: "",
  sabqEntries: [
    {
      id: "se1",
      recitationRange: {
        surahNumber: 2,
        surahName: "البقرة",
        juzNumber: 1,
        startAyahNumber: 1,
        endAyahNumber: 5,
        startAyahText: "الم",
        endAyahText: "الَّذِينَ",
      },
      mistakes: [
        { type: "heavy_letter", surah: 2, ayah: 1, wordIndex: 1, note: "Fix heavy letter" },
      ],
      mistakeCount: 2,
      atkees: 3,
      tajweedIssues: [{ type: "heavy_letters", note: "Practice" }],
      adminComment: "Approved",
    },
  ],
  homeworkRange: {
    surahNumber: 2,
    surahName: "البقرة",
    juzNumber: 1,
    startAyahNumber: 6,
    endAyahNumber: 10,
  },
  reassignedFromTeacherId: undefined,
  reassignedToTeacherId: undefined,
  sentToAssignmentId: undefined,
  startedAt: "2026-01-21T09:00:00Z",
  submittedAt: "2026-01-21T10:30:00Z",
  createdAt: "2026-01-21T08:00:00Z",
  updatedAt: "2026-01-21T10:30:00Z",
};

// ─── Run Validation ───
function runValidation(sample: PortalTicket) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Portal → 1.0 Ticket Mapping Validation (Smoke Test)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const { target, flags } = mapPortalTicketToTarget(sample);
  validateTarget(target, flags);

  console.log("INPUT (Portal sample):");
  console.log(JSON.stringify(sample, null, 2).slice(0, 800) + "...\n");

  console.log("OUTPUT (1.0 mapped):");
  console.log(JSON.stringify(target, null, 2).slice(0, 1200) + "...\n");

  if (flags.length === 0) {
    console.log("✅ No validation flags. Mapping succeeded.\n");
  } else {
    console.log(`⚠️  ${flags.length} validation flag(s):\n`);
    flags.forEach((f, i) => {
      console.log(`  ${i + 1}. [${f.issue}] ${f.path}`);
      console.log(`     ${f.message}`);
      if (f.portalValue !== undefined) console.log(`     Portal: ${JSON.stringify(f.portalValue)}`);
      if (f.targetValue !== undefined) console.log(`     Target: ${JSON.stringify(f.targetValue)}`);
      console.log("");
    });
  }
}

// ─── Entry Point (only when run directly, not when imported) ───
const isRunDirectly =
  process.argv[1]?.includes("validate-portal-ticket-mapping") ?? false;
if (isRunDirectly) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const filePath = path.resolve(args[0]);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as PortalTicket;
      runValidation(parsed);
    } else {
      console.error("File not found:", filePath);
      process.exit(1);
    }
  } else {
    runValidation(SAMPLE_PORTAL_TICKET);
  }
}
