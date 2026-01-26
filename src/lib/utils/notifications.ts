import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/connection";
import NotificationModel, { NotificationType } from "@/lib/db/models/Notification";
import TicketModel from "@/lib/db/models/Ticket";
import AssignmentModel from "@/lib/db/models/Assignment";
import SubmissionModel from "@/lib/db/models/Submission";
import EvaluationModel from "@/lib/db/models/Evaluation";
import ConversationModel from "@/lib/db/models/Conversation";
import StudentModel from "@/lib/db/models/Student";
import TeacherModel from "@/lib/db/models/Teacher";
import UserModel from "@/lib/db/models/User";
import AttendanceModel from "@/lib/db/models/Attendance";
import { emitNotification, emitUnreadCountUpdate } from "@/lib/socket/notifications";

type CreateNotificationData = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
};

/**
 * Create a notification and emit WebSocket event
 */
export async function createNotification(
  data: CreateNotificationData,
): Promise<any> {
  await connectToDatabase();

  const { userId, type, title, message, relatedEntity } = data;

  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const notification = await NotificationModel.create({
    userId: new Types.ObjectId(userId),
    type,
    title,
    message,
    relatedEntity: relatedEntity
      ? {
          type: relatedEntity.type,
          id: new Types.ObjectId(relatedEntity.id),
        }
      : undefined,
  });

  // Emit WebSocket event
  emitNotification(userId, notification.toObject());

  return notification;
}

/**
 * Notify all admins when a ticket is submitted for review
 */
export async function notifyRecitationReview(ticketId: string): Promise<void> {
  await connectToDatabase();

  const ticket = await TicketModel.findById(ticketId)
    .populate("studentId", "userId")
    .populate("teacherId", "userId")
    .lean();

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const student = await StudentModel.findById(ticket.studentId).populate("userId").lean();
  const studentName = (student as any)?.userId?.fullName || "Student";

  // Find all admins
  const admins = await UserModel.find({
    role: { $in: ["admin", "super_admin"] },
    isActive: true,
  }).lean();

  const notifications = await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin._id.toString(),
        type: "recitation_review",
        title: "Recitation Review Required",
        message: `${studentName} has submitted a recitation ticket for review.`,
        relatedEntity: {
          type: "Ticket",
          id: ticketId,
        },
      }),
    ),
  );

  console.log(`Notified ${notifications.length} admin(s) about ticket ${ticketId}`);
}

/**
 * Notify teacher when a student submits an assignment
 */
export async function notifyAssignmentSubmission(
  assignmentId: string,
  studentId: string,
): Promise<void> {
  await connectToDatabase();

  const assignment = await AssignmentModel.findById(assignmentId)
    .populate("assignedBy", "userId")
    .lean();
  const submission = await SubmissionModel.findOne({
    assignmentId: new Types.ObjectId(assignmentId),
    studentId: new Types.ObjectId(studentId),
  })
    .populate("studentId", "userId")
    .lean();

  if (!assignment || !submission) {
    throw new Error("Assignment or submission not found");
  }

  const teacher = await TeacherModel.findById((assignment as any).assignedBy).populate("userId").lean();
  const student = await StudentModel.findById(studentId).populate("userId").lean();

  if (!teacher || !student) {
    throw new Error("Teacher or student not found");
  }

  const studentName = (student as any).userId.fullName;

  await createNotification({
    userId: (teacher as any).userId._id.toString(),
    type: "assignment_submission",
    title: "Assignment Submitted",
    message: `${studentName} has submitted an assignment.`,
    relatedEntity: {
      type: "Submission",
      id: submission._id.toString(),
    },
  });
}

/**
 * Notify teacher and student when evaluation is reviewed
 */
export async function notifyEvaluationFeedback(
  evaluationId: string,
  action: "approved" | "rejected",
): Promise<void> {
  await connectToDatabase();

  const evaluation = await EvaluationModel.findById(evaluationId)
    .populate("studentId", "userId")
    .populate("teacherId", "userId")
    .lean();

  if (!evaluation) {
    throw new Error("Evaluation not found");
  }

  const student = await StudentModel.findById((evaluation as any).studentId).populate("userId").lean();
  const teacher = await TeacherModel.findById((evaluation as any).teacherId).populate("userId").lean();

  if (!student || !teacher) {
    throw new Error("Student or teacher not found");
  }

  const studentName = (student as any).userId.fullName;
  const teacherName = (teacher as any).userId.fullName;

  // Notify teacher
  await createNotification({
    userId: (teacher as any).userId._id.toString(),
    type: "evaluation_feedback",
    title: `Evaluation ${action === "approved" ? "Approved" : "Rejected"}`,
    message: `Your evaluation for ${studentName} has been ${action}.`,
    relatedEntity: {
      type: "Evaluation",
      id: evaluationId,
    },
  });

  // Notify student if approved
  if (action === "approved") {
    await createNotification({
      userId: (student as any).userId._id.toString(),
      type: "evaluation_feedback",
      title: "Evaluation Approved",
      message: `Your weekly evaluation has been reviewed and approved by ${teacherName}.`,
      relatedEntity: {
        type: "Evaluation",
        id: evaluationId,
      },
    });
  }
}

/**
 * Notify conversation participants when a new message is sent
 */
export async function notifyNewMessage(
  conversationId: string,
  senderId: string,
): Promise<void> {
  await connectToDatabase();

  const conversation = await ConversationModel.findById(conversationId).lean();

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const sender = await UserModel.findById(senderId).lean();
  if (!sender) {
    throw new Error("Sender not found");
  }

  // Notify all participants except sender
  const recipientIds = (conversation.participants as any[])
    .filter((p) => p.toString() !== senderId)
    .map((p) => p.toString());

  await Promise.all(
    recipientIds.map((userId) =>
      createNotification({
        userId,
        type: "message",
        title: `New message from ${sender.fullName}`,
        message: conversation.lastMessage || "You have a new message.",
        relatedEntity: {
          type: "Conversation",
          id: conversationId,
        },
      }),
    ),
  );
}

/**
 * Notify assigned teachers when a new student is registered
 */
export async function notifyStudentRegistration(
  studentId: string,
  teacherIds: string[],
): Promise<void> {
  await connectToDatabase();

  const student = await StudentModel.findById(studentId).populate("userId").lean();

  if (!student) {
    throw new Error("Student not found");
  }

  const studentName = (student as any).userId.fullName;

  await Promise.all(
    teacherIds.map((teacherId) =>
      createNotification({
        userId: teacherId,
        type: "registration",
        title: "New Student Assigned",
        message: `${studentName} has been assigned to you as a new student.`,
        relatedEntity: {
          type: "Student",
          id: studentId,
        },
      }),
    ),
  );
}

/**
 * Notify user when attendance issue is recorded (absent or late)
 */
export async function notifyAttendanceIssue(
  attendanceId: string,
  userId: string,
): Promise<void> {
  await connectToDatabase();

  const attendance = await AttendanceModel.findById(attendanceId).lean();
  const user = await UserModel.findById(userId).lean();

  if (!attendance || !user) {
    throw new Error("Attendance or user not found");
  }

  const date = new Date(attendance.date).toLocaleDateString();
  const status = attendance.status;

  await createNotification({
    userId,
    type: "attendance_issue",
    title: status === "absent" ? "Absence Recorded" : "Late Arrival Recorded",
    message: `Your attendance has been marked as ${status} for ${date}.`,
    relatedEntity: {
      type: "Attendance",
      id: attendanceId,
    },
  });
}
