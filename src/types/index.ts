export type UserRole = "super_admin" | "admin" | "teacher" | "student";

export type PermissionCategory =
  | "users"
  | "students"
  | "teachers"
  | "assignments"
  | "attendance"
  | "reports"
  | "settings"
  | "billing";

export type PermissionAction = "create" | "read" | "update" | "delete" | "manage";

export type ModulePermission = {
  category: PermissionCategory;
  actions: PermissionAction[];
};

export type EntityStatus = "active" | "inactive" | "pending";

export type ProgramType = "Full-Time HQ" | "Part-Time HQ" | "After School";

export type RecitationType = "sabq" | "sabqi" | "manzil" | "other";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  contactNumber?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Student {
  id: string;
  userId: string;
  parentName?: string;
  parentContact?: string;
  programType?: ProgramType;
  enrollmentDate?: Date;
  status: EntityStatus;
  assignedTeachers: string[];
  schedule?: {
    days: string[];
    times: string[];
  };
  siblings: string[];
  currentSabq?: string;
  currentSabqi?: string;
  currentManzil?: string;
  recitationHistory: Array<{
    date: Date;
    type: RecitationType;
    details: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Teacher {
  id: string;
  userId: string;
  assignedStudents: string[];
  specialization?: string;
  joinDate?: Date;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id: string;
  studentId: string;
  teacherId?: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: "assigned" | "submitted" | "graded" | "overdue";
  createdAt: Date;
  updatedAt: Date;
}
