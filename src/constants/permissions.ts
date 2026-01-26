export const PERMISSION_CATEGORIES = {
  PEOPLE_OPERATIONS: "people_operations",
  FINANCIAL_BILLING: "financial_billing",
  SCHEDULING_LOGISTICS: "scheduling_logistics",
  COMMUNICATION: "communication",
  STUDENT_INFORMATION: "student_information",
  REPORTS_ANALYTICS: "reports_analytics",
  SECURITY_GOVERNANCE: "security_governance",
} as const;

export const MODULE_PERMISSIONS = {
  MESSAGES: {
    ACCESS: "messages.access",
    SEND: "messages.send",
    VIEW_ALL: "messages.view_all",
    MODERATE: "messages.moderate",
    DELETE: "messages.delete",
  },
  PDF: {
    ACCESS: "pdf.access",
    UPLOAD: "pdf.upload",
    ANNOTATE: "pdf.annotate",
    MANAGE_LIBRARY: "pdf.manage_library",
  },
  HOMEWORK: {
    ACCESS: "homework.access",
    CREATE: "homework.create",
    GRADE: "homework.grade",
    VIEW_SUBMISSIONS: "homework.view_submissions",
    DELETE: "homework.delete",
  },
  EVALUATION: {
    ACCESS: "evaluation.access",
    CREATE: "evaluation.create",
    REVIEW: "evaluation.review",
    APPROVE: "evaluation.approve",
  },
  TICKETS: {
    ACCESS: "tickets.access",
    CREATE: "tickets.create",
    REVIEW: "tickets.review",
    APPROVE: "tickets.approve",
    FINALIZE: "tickets.finalize",
  },
  ATTENDANCE: {
    ACCESS: "attendance.access",
    RECORD: "attendance.record",
    VIEW_REPORTS: "attendance.view_reports",
    EXPORT: "attendance.export",
  },
  MUSHAF: {
    ACCESS: "mushaf.access",
    MARK_MISTAKES: "mushaf.mark_mistakes",
    VIEW_HISTORY: "mushaf.view_history",
    MANAGE_LIBRARY: "mushaf.manage_library",
  },
  QAIDAH: {
    ACCESS: "qaidah.access",
    MANAGE: "qaidah.manage",
    VIEW_PROGRESS: "qaidah.view_progress",
  },
  ASSIGNMENTS: {
    ACCESS: "assignments.access",
    CREATE: "assignments.create",
    EDIT: "assignments.edit",
    DELETE: "assignments.delete",
    BULK_OPERATIONS: "assignments.bulk_operations",
    GRADE_HOMEWORK: "assignments.grade_homework",
  },
  USERS: {
    VIEW: "users.view",
    CREATE: "users.create",
    EDIT: "users.edit",
    DELETE: "users.delete",
    MANAGE_ROLES: "users.manage_roles",
  },
} as const;

export type PermissionCategory =
  (typeof PERMISSION_CATEGORIES)[keyof typeof PERMISSION_CATEGORIES];

export type ModulePermissionMap = typeof MODULE_PERMISSIONS;

export type ModuleKey = keyof ModulePermissionMap;

export type PermissionValue =
  ModulePermissionMap[ModuleKey][keyof ModulePermissionMap[ModuleKey]];
