/**
 * Migration script to convert old assignment format to new Umar Academy structure
 * Run with: npx tsx scripts/migrate-assignments.ts
 */

import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/db/connection";
import AssignmentModel from "../src/lib/db/models/Assignment";
import StudentModel from "../src/lib/db/models/Student";
import TeacherModel from "../src/lib/db/models/Teacher";
import UserModel from "../src/lib/db/models/User";

interface OldAssignment {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: "homework" | "classwork";
  assignedBy: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId[];
  dueDate?: Date;
  status: "pending" | "submitted" | "graded" | "overdue";
  attachments?: Array<{ filename: string; url: string; uploadedAt: Date }>;
  instructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

async function migrateAssignments() {
  try {
    await connectToDatabase();
    console.log("Connected to database");

    // Find all old format assignments (those without studentId field)
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }

    const oldAssignments = await mongoose.connection.db
      .collection("assignments")
      .find({
        studentId: { $exists: false },
      })
      .toArray();

    console.log(`Found ${oldAssignments.length} assignments to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const oldAssignment of oldAssignments) {
      try {
        const assignment = oldAssignment as unknown as OldAssignment;

        // Get teacher info
        const teacher = await TeacherModel.findById(assignment.assignedBy);
        if (!teacher) {
          console.warn(`Teacher not found for assignment ${assignment._id}, skipping`);
          errors++;
          continue;
        }

        const teacherUser = await UserModel.findById(teacher.userId);
        if (!teacherUser) {
          console.warn(`Teacher user not found for assignment ${assignment._id}, skipping`);
          errors++;
          continue;
        }

        // Determine assignedByRole
        let assignedByRole: "admin" | "super_admin" | "teacher" = "teacher";
        if (teacherUser.role === "admin") {
          assignedByRole = "admin";
        } else if (teacherUser.role === "super_admin") {
          assignedByRole = "super_admin";
        }

        // Migrate each assigned student to a separate assignment
        for (const studentId of assignment.assignedTo) {
          const student = await StudentModel.findById(studentId);
          if (!student) {
            console.warn(`Student ${studentId} not found, skipping`);
            continue;
          }

          const studentUser = await UserModel.findById(student.userId);
          if (!studentUser) {
            console.warn(`Student user not found for ${studentId}, skipping`);
            continue;
          }

          // Convert old status to new status
          let newStatus: "active" | "completed" | "archived" = "active";
          if (assignment.status === "graded") {
            newStatus = "completed";
          } else if (assignment.status === "overdue") {
            newStatus = "archived";
          }

          // Convert type to classwork structure
          const classwork = {
            sabq: [] as any[],
            sabqi: [] as any[],
            manzil: [] as any[],
          };

          // If it was classwork, add to sabq (default)
          if (assignment.type === "classwork") {
            classwork.sabq.push({
              type: "sabq",
              assignmentRange: assignment.title,
              details: assignment.description || "",
              createdAt: assignment.createdAt,
            });
          }

          // Convert to homework structure
          const homework = {
            enabled: assignment.type === "homework",
            content: assignment.description || "",
            items: [] as any[],
            submission: undefined as any,
          };

          // If it was homework, create a basic homework item
          if (assignment.type === "homework") {
            homework.items = [
              {
                type: "sabq",
                range: {
                  mode: "surah_ayah",
                  from: { surah: 1, surahName: "Al-Fatihah", ayah: 1 },
                  to: { surah: 1, surahName: "Al-Fatihah", ayah: 7 },
                },
                source: {
                  suggestedFrom: "manual",
                  ticketIds: [],
                },
                content: assignment.instructions || assignment.description || "",
                attachments: assignment.attachments || [],
              },
            ];
          }

          // Create new assignment
          const newAssignment = await AssignmentModel.create({
            studentId: student._id,
            studentName: studentUser.fullName,
            assignedBy: teacherUser._id.toString(),
            assignedByName: teacherUser.fullName,
            assignedByRole,
            classwork,
            homework,
            comment: assignment.instructions,
            status: newStatus,
            completedAt: assignment.status === "graded" ? assignment.updatedAt : undefined,
            createdAt: assignment.createdAt,
            updatedAt: assignment.updatedAt,
          });

          console.log(`Migrated assignment ${assignment._id} -> ${newAssignment._id} for student ${studentUser.fullName}`);
          migrated++;
        }

        // Delete old assignment
        if (mongoose.connection.db) {
          await mongoose.connection.db.collection("assignments").deleteOne({ _id: assignment._id });
          console.log(`Deleted old assignment ${assignment._id}`);
        }
      } catch (error) {
        console.error(`Error migrating assignment ${oldAssignment._id}:`, error);
        errors++;
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Migrated: ${migrated} assignments`);
    console.log(`Errors: ${errors} assignments`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

migrateAssignments();
