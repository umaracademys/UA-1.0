/**
 * Bulk Migration Script: Portal → Umar Academy 1.0
 *
 * Connects to both Portal and 1.0 MongoDB instances, fetches tickets and
 * assignments (homework is embedded in assignments), applies the validated
 * mapping logic, and inserts into 1.0.
 *
 * Prerequisites:
 *   - MONGODB_URI: 1.0 database connection string
 *   - MONGODB_URI_PORTAL: Portal database connection string
 *
 * Usage: npx tsx scripts/migrate-portal-to-1-0.ts
 *
 * Note: Homework data is embedded in assignments in the Portal; no separate
 * homework collection exists. All homework is migrated as part of assignments.
 */

import "dotenv/config";
import mongoose, { Types } from "mongoose";
import { MongoClient } from "mongodb";
import TicketModel from "../src/lib/db/models/Ticket";
import AssignmentModel from "../src/lib/db/models/Assignment";
import { mapPortalTicketToTarget } from "./validate-portal-ticket-mapping";

// ─── Types (Portal raw documents) ───
interface PortalTicketDoc {
  _id?: unknown;
  studentId: string;
  studentName?: string;
  type?: string;
  status?: string;
  createdBy?: string;
  createdByName?: string;
  adminComment?: string;
  assignedTeacherId?: string;
  assignedTeacherName?: string;
  teacherNotes?: string;
  teacherComment?: string;
  mistakes?: unknown[];
  recitationRange?: unknown;
  mistakeCount?: number | "weak";
  atkees?: number;
  tajweedIssues?: unknown[];
  reviewNotes?: string;
  sabqEntries?: unknown[];
  homeworkRange?: unknown;
  reassignedFromTeacherId?: string;
  reassignedFromTeacherName?: string;
  reassignedToTeacherId?: string;
  reassignedToTeacherName?: string;
  reassignmentReason?: string;
  previousTeacherComment?: string;
  previousMistakes?: unknown[];
  sentToAssignmentId?: string;
  sentAt?: unknown;
  recordingUrl?: string;
  startedAt?: unknown;
  submittedAt?: unknown;
  approvedAt?: unknown;
  reassignedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
}

interface PortalAssignmentDoc {
  _id?: unknown;
  studentId: string;
  studentName: string;
  assignedBy: string;
  assignedByName: string;
  assignedByRole: string;
  weeklyEvaluationId?: string;
  fromTicketId?: string;
  fromRecitationReviewId?: string;
  classwork?: unknown;
  homework?: unknown;
  comment?: string;
  mushafMistakes?: unknown[];
  status?: string;
  completedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
}

// ─── ID conversion helpers ───
function toObjectId(s: string | undefined): Types.ObjectId | undefined {
  if (!s || typeof s !== "string" || !/^[a-fA-F0-9]{24}$/.test(s)) return undefined;
  return new Types.ObjectId(s);
}

function toObjectIdRequired(s: string | undefined): Types.ObjectId {
  const id = toObjectId(s);
  if (!id) throw new Error(`Invalid ObjectId: ${s}`);
  return id;
}

// ─── Map Portal ticket to 1.0 insert document ───
function mapTicketForInsert(portal: PortalTicketDoc): Record<string, unknown> {
  const { target, flags } = mapPortalTicketToTarget(portal as any);
  const criticalFlags = flags.filter(
    (f) => f.issue === "undefined" || f.issue === "validation_failed"
  );
  if (criticalFlags.length > 0) {
    throw new Error(
      `Ticket mapping failed: ${criticalFlags.map((f) => `${f.path}: ${f.message}`).join("; ")}`
    );
  }

  const doc: Record<string, unknown> = {
    studentId: toObjectIdRequired(target.studentId),
    workflowStep: target.workflowStep,
    status: target.status,
    mistakes: target.mistakes ?? [],
    notes: target.notes,
    audioUrl: target.audioUrl,
    sessionNotes: target.sessionNotes,
    recitationRange: target.recitationRange,
    sabqEntries: target.sabqEntries,
    homeworkRange: target.homeworkRange,
    mistakeCount: target.mistakeCount,
    reassignedFromTeacherName: target.reassignedFromTeacherName,
    reassignedToTeacherName: target.reassignedToTeacherName,
    reassignmentReason: target.reassignmentReason,
    previousTeacherComment: target.previousTeacherComment,
    previousMistakes: target.previousMistakes,
    reviewNotes: target.reviewNotes,
    createdAt: target.createdAt ?? new Date(),
    updatedAt: target.updatedAt ?? new Date(),
  };

  if (target.teacherId) doc.teacherId = toObjectId(target.teacherId);
  if (target.createdBy) doc.createdBy = toObjectId(target.createdBy);
  if (target.createdByName) doc.createdByName = target.createdByName;
  if (target.reassignedFromTeacherId)
    doc.reassignedFromTeacherId = toObjectId(target.reassignedFromTeacherId);
  if (target.reassignedToTeacherId)
    doc.reassignedToTeacherId = toObjectId(target.reassignedToTeacherId);
  if (target.homeworkAssigned) doc.homeworkAssigned = toObjectId(target.homeworkAssigned);
  if (target.reassignedAt) doc.reassignedAt = target.reassignedAt;
  if (target.reviewedAt) doc.reviewedAt = target.reviewedAt;
  if (target.startedAt) doc.startedAt = target.startedAt;
  if (target.submittedAt) doc.submittedAt = target.submittedAt;

  return doc;
}

// ─── Map Portal assignment to 1.0 insert document ───
function mapAssignmentForInsert(portal: PortalAssignmentDoc): Record<string, unknown> {
  const studentId = toObjectIdRequired(portal.studentId);
  const statusMap: Record<string, string> = {
    active: "active",
    completed: "completed",
    archived: "archived",
  };
  const status = statusMap[portal.status ?? "active"] ?? "active";

  const classwork = portal.classwork as {
    sabq?: unknown[];
    sabqi?: unknown[];
    manzil?: unknown[];
  } | undefined;

  const homework = portal.homework as {
    enabled?: boolean;
    content?: string;
    link?: string;
    items?: unknown[];
    notes?: string;
    qaidahHomework?: unknown;
    submission?: unknown;
  } | undefined;

  const doc: Record<string, unknown> = {
    studentId,
    studentName: portal.studentName ?? "Unknown",
    assignedBy: portal.assignedBy,
    assignedByName: portal.assignedByName ?? "Unknown",
    assignedByRole: portal.assignedByRole ?? "teacher",
    classwork: {
      sabq: classwork?.sabq ?? [],
      sabqi: classwork?.sabqi ?? [],
      manzil: classwork?.manzil ?? [],
    },
    homework: {
      enabled: homework?.enabled ?? false,
      content: homework?.content,
      link: homework?.link,
      items: homework?.items ?? [],
      notes: homework?.notes,
      qaidahHomework: homework?.qaidahHomework,
      submission: homework?.submission,
    },
    comment: portal.comment ?? "",
    mushafMistakes: portal.mushafMistakes ?? [],
    status,
    completedAt: portal.completedAt ? new Date(portal.completedAt as string) : undefined,
    createdAt: portal.createdAt ? new Date(portal.createdAt as string) : new Date(),
    updatedAt: portal.updatedAt ? new Date(portal.updatedAt as string) : new Date(),
  };

  if (portal.weeklyEvaluationId)
    doc.weeklyEvaluationId = toObjectId(portal.weeklyEvaluationId);
  if (portal.fromTicketId) doc.fromTicketId = toObjectId(portal.fromTicketId);
  if (portal.fromRecitationReviewId)
    doc.fromRecitationReviewId = toObjectId(portal.fromRecitationReviewId);

  return doc;
}

// ─── Main ───
async function main() {
  const portalUri = process.env.MONGODB_URI_PORTAL;
  const targetUri = process.env.MONGODB_URI;

  if (!portalUri) {
    console.error("❌ MONGODB_URI_PORTAL is required. Set it in .env");
    process.exit(1);
  }
  if (!targetUri) {
    console.error("❌ MONGODB_URI is required. Set it in .env");
    process.exit(1);
  }

  if (portalUri === targetUri) {
    console.warn(
      "⚠️  Portal and 1.0 use the same URI. Ensure they use different databases or run with care."
    );
  }

  const results = {
    tickets: { success: 0, errors: 0, errorsList: [] as string[] },
    assignments: { success: 0, errors: 0, errorsList: [] as string[] },
  };

  let portalClient: MongoClient | null = null;
  let targetConn: typeof mongoose | null = null;

  try {
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  Portal → 1.0 Bulk Migration");
    console.log("═══════════════════════════════════════════════════════════════\n");

    // Connect to Portal (read-only)
    console.log("Connecting to Portal MongoDB...");
    portalClient = new MongoClient(portalUri);
    await portalClient.connect();
    const portalDb = portalClient.db();
    console.log("✓ Connected to Portal\n");

    // Connect to 1.0 (write)
    console.log("Connecting to 1.0 MongoDB...");
    targetConn = await mongoose.connect(targetUri);
    console.log("✓ Connected to 1.0\n");

    // ─── Migrate Tickets ───
    const ticketsColl = portalDb.collection("tickets");
    const portalTickets = await ticketsColl.find({}).toArray();
    console.log(`Found ${portalTickets.length} tickets in Portal`);

    for (const raw of portalTickets) {
      const portal = raw as unknown as PortalTicketDoc;
      try {
        const doc = mapTicketForInsert(portal);
        await TicketModel.create(doc);
        results.tickets.success++;
      } catch (err) {
        results.tickets.errors++;
        const msg = `Ticket ${portal._id}: ${(err as Error).message}`;
        results.tickets.errorsList.push(msg);
        console.error(`  ✗ ${msg}`);
      }
    }

    console.log(`Tickets: ${results.tickets.success} migrated, ${results.tickets.errors} errors\n`);

    // ─── Migrate Assignments (includes embedded homework) ───
    const assignmentsColl = portalDb.collection("assignments");
    const portalAssignments = await assignmentsColl.find({}).toArray();
    console.log(`Found ${portalAssignments.length} assignments in Portal`);

    for (const raw of portalAssignments) {
      const portal = raw as unknown as PortalAssignmentDoc;
      try {
        const doc = mapAssignmentForInsert(portal);
        await AssignmentModel.create(doc);
        results.assignments.success++;
      } catch (err) {
        results.assignments.errors++;
        const msg = `Assignment ${portal._id}: ${(err as Error).message}`;
        results.assignments.errorsList.push(msg);
        console.error(`  ✗ ${msg}`);
      }
    }

    console.log(
      `Assignments: ${results.assignments.success} migrated, ${results.assignments.errors} errors\n`
    );
  } finally {
    if (portalClient) {
      await portalClient.close();
      console.log("Portal connection closed.");
    }
    if (targetConn) {
      await mongoose.disconnect();
      console.log("1.0 connection closed.");
    }
  }

  // ─── Summary ───
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Migration Summary");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Tickets:    ${results.tickets.success} successful, ${results.tickets.errors} errors`);
  console.log(
    `Assignments: ${results.assignments.success} successful, ${results.assignments.errors} errors`
  );
  console.log(
    `Total:      ${results.tickets.success + results.assignments.success} records migrated`
  );
  if (
    results.tickets.errorsList.length > 0 ||
    results.assignments.errorsList.length > 0
  ) {
    console.log("\nErrors:");
    results.tickets.errorsList.forEach((e) => console.log(`  - ${e}`));
    results.assignments.errorsList.forEach((e) => console.log(`  - ${e}`));
  }
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
