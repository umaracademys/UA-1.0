import { connectToDatabase } from "@/lib/db/connection";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import AssignmentModel from "@/lib/db/models/Assignment";
import SubmissionModel from "@/lib/db/models/Submission";
import EvaluationModel from "@/lib/db/models/Evaluation";
import TicketModel from "@/lib/db/models/Ticket";
import AttendanceModel from "@/lib/db/models/Attendance";
import UserModel from "@/lib/db/models/User";
import { Types } from "mongoose";

type ReportFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  userIds?: string[];
  studentIds?: string[];
  teacherIds?: string[];
};

/**
 * Generate Student Performance Report
 */
export async function generateStudentPerformanceReport(filters: ReportFilters = {}) {
  await connectToDatabase();

  const query: any = {};
  if (filters.studentIds && filters.studentIds.length > 0) {
    query.studentId = { $in: filters.studentIds.map((id) => new Types.ObjectId(id)) };
  }
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }

  // Get assignments and submissions
  const assignments = await AssignmentModel.find(query).lean();
  const submissions = await SubmissionModel.find(query).populate("studentId", "userId").lean();

  // Calculate performance metrics
  const students = await StudentModel.find(
    filters.studentIds ? { _id: { $in: filters.studentIds.map((id) => new Types.ObjectId(id)) } } : {},
  )
    .populate("userId", "fullName email")
    .lean();

  const report = {
    summary: {
      totalStudents: students.length,
      totalAssignments: assignments.length,
      totalSubmissions: submissions.length,
      averageGrade: 0,
      completionRate: 0,
    },
    students: students.map((student: any) => {
      const studentSubmissions = submissions.filter(
        (s: any) => s.studentId._id.toString() === student._id.toString(),
      );
      const gradedSubmissions = studentSubmissions.filter((s: any) => s.grade !== undefined);
      const avgGrade =
        gradedSubmissions.length > 0
          ? gradedSubmissions.reduce((sum: number, s: any) => sum + (s.grade || 0), 0) /
            gradedSubmissions.length
          : 0;

      return {
        studentId: student._id,
        name: student.userId.fullName,
        email: student.userId.email,
        totalAssignments: assignments.filter((a: any) =>
          a.assignedTo.some((id: any) => id.toString() === student._id.toString()),
        ).length,
        completedAssignments: studentSubmissions.length,
        averageGrade: Math.round(avgGrade * 10) / 10,
        attendanceRate: 0, // Calculate from attendance data
      };
    }),
    generatedAt: new Date(),
  };

  // Calculate overall averages
  const allGrades = report.students
    .map((s) => s.averageGrade)
    .filter((g) => g > 0);
  report.summary.averageGrade =
    allGrades.length > 0 ? allGrades.reduce((sum, g) => sum + g, 0) / allGrades.length : 0;
  report.summary.completionRate =
    report.summary.totalAssignments > 0
      ? (report.summary.totalSubmissions / report.summary.totalAssignments) * 100
      : 0;

  return report;
}

/**
 * Generate Teacher Activity Report
 */
export async function generateTeacherActivityReport(filters: ReportFilters = {}) {
  await connectToDatabase();

  const query: any = {};
  if (filters.teacherIds && filters.teacherIds.length > 0) {
    query.teacherId = { $in: filters.teacherIds.map((id) => new Types.ObjectId(id)) };
  }
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }

  const teachers = await TeacherModel.find(
    filters.teacherIds ? { _id: { $in: filters.teacherIds.map((id) => new Types.ObjectId(id)) } } : {},
  )
    .populate("userId", "fullName email")
    .lean();

  const report = {
    summary: {
      totalTeachers: teachers.length,
      totalTickets: 0,
      totalEvaluations: 0,
      totalAssignments: 0,
    },
    teachers: await Promise.all(
      teachers.map(async (teacher: any) => {
        const tickets = await TicketModel.countDocuments({ teacherId: teacher._id });
        const evaluations = await EvaluationModel.countDocuments({ teacherId: teacher._id });
        const assignments = await AssignmentModel.countDocuments({ assignedBy: teacher._id });

        return {
          teacherId: teacher._id,
          name: teacher.userId.fullName,
          email: teacher.userId.email,
          assignedStudents: teacher.assignedStudents?.length || 0,
          ticketsCreated: tickets,
          evaluationsSubmitted: evaluations,
          assignmentsCreated: assignments,
        };
      }),
    ),
    generatedAt: new Date(),
  };

  report.summary.totalTickets = report.teachers.reduce((sum, t) => sum + t.ticketsCreated, 0);
  report.summary.totalEvaluations = report.teachers.reduce((sum, t) => sum + t.evaluationsSubmitted, 0);
  report.summary.totalAssignments = report.teachers.reduce((sum, t) => sum + t.assignmentsCreated, 0);

  return report;
}

/**
 * Generate Attendance Report
 */
export async function generateAttendanceReport(filters: ReportFilters = {}) {
  await connectToDatabase();

  const query: any = {};
  if (filters.userIds && filters.userIds.length > 0) {
    query.userId = { $in: filters.userIds.map((id) => new Types.ObjectId(id)) };
  }
  if (filters.dateFrom || filters.dateTo) {
    query.date = {};
    if (filters.dateFrom) query.date.$gte = filters.dateFrom;
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      query.date.$lte = endDate;
    }
  }

  const attendanceRecords = await AttendanceModel.find(query)
    .populate("userId", "fullName email role")
    .lean();

  const total = attendanceRecords.length;
  const present = attendanceRecords.filter((r: any) => r.status === "present").length;
  const absent = attendanceRecords.filter((r: any) => r.status === "absent").length;
  const late = attendanceRecords.filter((r: any) => r.status === "late").length;
  const excused = attendanceRecords.filter((r: any) => r.status === "excused").length;

  return {
    summary: {
      totalRecords: total,
      present,
      absent,
      late,
      excused,
      attendanceRate: total > 0 ? ((present + excused) / total) * 100 : 0,
    },
    records: attendanceRecords,
    generatedAt: new Date(),
  };
}

/**
 * Generate Assignment Report
 */
export async function generateAssignmentReport(filters: ReportFilters = {}) {
  await connectToDatabase();

  const query: any = {};
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }

  const assignments = await AssignmentModel.find(query)
    .populate("assignedBy", "userId")
    .populate("assignedTo", "userId")
    .lean();

  const submissions = await SubmissionModel.find({
    assignmentId: { $in: assignments.map((a: any) => a._id) },
  }).lean();

  const totalAssignments = assignments.length;
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter((s: any) => s.grade !== undefined).length;
  const averageGrade =
    gradedSubmissions > 0
      ? submissions
          .filter((s: any) => s.grade !== undefined)
          .reduce((sum: number, s: any) => sum + (s.grade || 0), 0) / gradedSubmissions
      : 0;

  return {
    summary: {
      totalAssignments,
      totalSubmissions,
      gradedSubmissions,
      pendingSubmissions: totalSubmissions - gradedSubmissions,
      averageGrade: Math.round(averageGrade * 100) / 100,
      completionRate: totalAssignments > 0 ? (totalSubmissions / totalAssignments) * 100 : 0,
    },
    assignments: assignments.map((assignment: any) => {
      const assignmentSubmissions = submissions.filter(
        (s: any) => s.assignmentId.toString() === assignment._id.toString(),
      );
      return {
        assignmentId: assignment._id,
        title: assignment.title,
        type: assignment.type,
        dueDate: assignment.dueDate,
        totalAssigned: assignment.assignedTo?.length || 0,
        submissions: assignmentSubmissions.length,
        completionRate:
          assignment.assignedTo?.length > 0
            ? (assignmentSubmissions.length / assignment.assignedTo.length) * 100
            : 0,
      };
    }),
    generatedAt: new Date(),
  };
}

/**
 * Generate Evaluation Report
 */
export async function generateEvaluationReport(filters: ReportFilters = {}) {
  await connectToDatabase();

  const query: any = {};
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }

  const evaluations = await EvaluationModel.find(query)
    .populate("studentId", "userId")
    .populate("teacherId", "userId")
    .lean();

  const total = evaluations.length;
  const submitted = evaluations.filter((e: any) => e.status === "submitted").length;
  const approved = evaluations.filter((e: any) => e.status === "approved").length;
  const rejected = evaluations.filter((e: any) => e.status === "rejected").length;

  // Calculate average ratings
  const allRatings = evaluations
    .map((e: any) => {
      if (e.categories && e.categories.length > 0) {
        return e.categories.reduce((sum: number, cat: any) => sum + (cat.rating || 0), 0) / e.categories.length;
      }
      return 0;
    })
    .filter((r) => r > 0);

  const averageRating = allRatings.length > 0 ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length : 0;

  return {
    summary: {
      total,
      submitted,
      approved,
      rejected,
      draft: total - submitted - approved - rejected,
      averageRating: Math.round(averageRating * 100) / 100,
      approvalRate: submitted > 0 ? (approved / submitted) * 100 : 0,
    },
    evaluations: evaluations.map((evaluation: any) => ({
      evaluationId: evaluation._id,
      studentName: evaluation.studentId?.userId?.fullName || "Unknown",
      teacherName: evaluation.teacherId?.userId?.fullName || "Unknown",
      weekStartDate: evaluation.weekStartDate,
      status: evaluation.status,
      averageRating:
        evaluation.categories && evaluation.categories.length > 0
          ? evaluation.categories.reduce((sum: number, cat: any) => sum + (cat.rating || 0), 0) /
            evaluation.categories.length
          : 0,
    })),
    generatedAt: new Date(),
  };
}

/**
 * Generate System Usage Report
 */
export async function generateSystemUsageReport(filters: ReportFilters = {}) {
  await connectToDatabase();

  const dateQuery: any = {};
  if (filters.dateFrom || filters.dateTo) {
    dateQuery.$gte = filters.dateFrom || new Date(0);
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      dateQuery.$lte = endDate;
    }
  }

  const [
    totalUsers,
    totalStudents,
    totalTeachers,
    totalAssignments,
    totalTickets,
    totalEvaluations,
    totalAttendance,
  ] = await Promise.all([
    UserModel.countDocuments({ createdAt: dateQuery }),
    StudentModel.countDocuments({ createdAt: dateQuery }),
    TeacherModel.countDocuments({ createdAt: dateQuery }),
    AssignmentModel.countDocuments({ createdAt: dateQuery }),
    TicketModel.countDocuments({ createdAt: dateQuery }),
    EvaluationModel.countDocuments({ createdAt: dateQuery }),
    AttendanceModel.countDocuments({ createdAt: dateQuery }),
  ]);

  return {
    summary: {
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAssignments,
      totalTickets,
      totalEvaluations,
      totalAttendance,
    },
    moduleUsage: {
      assignments: totalAssignments,
      tickets: totalTickets,
      evaluations: totalEvaluations,
      attendance: totalAttendance,
    },
    generatedAt: new Date(),
  };
}

/**
 * Export report data to CSV
 */
export function exportToCSV(reportData: any, filename: string): void {
  if (typeof window === "undefined") return;

  const headers = Object.keys(reportData.summary || {});
  const csvContent = [
    headers.join(","),
    headers.map((h) => reportData.summary[h] || "").join(","),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Export report data to Excel (placeholder - requires xlsx library)
 */
export async function exportToExcel(reportData: any, filename: string): Promise<void> {
  // This would require the xlsx library
  // For now, return the data structure that can be used with xlsx
  console.log("Excel export data:", reportData);
  // Implementation would use xlsx library to create workbook and download
}

/**
 * Export report data to PDF (placeholder - requires pdf-lib or similar)
 */
export async function exportToPDF(reportData: any, filename: string): Promise<void> {
  // This would require pdf-lib or similar library
  // For now, return the data structure
  console.log("PDF export data:", reportData);
  // Implementation would use pdf-lib to create PDF and download
}
